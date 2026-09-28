// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 The Linux Foundation

/**
 * Bundle the action into a self-contained dist/.
 *
 * GitHub runs the action from its own copy of this repository, which has
 * no node_modules, so every runtime dependency must be inlined. esbuild
 * strips the TypeScript types itself; `tsc --noEmit` remains the type
 * checker.
 *
 * Output is deterministic, which the check-dist CI job relies on: it
 * rebuilds and fails if the result differs from the committed bundle.
 */

import {build} from 'esbuild'
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import {join} from 'node:path'

const OUT_DIR = 'dist'

rmSync(OUT_DIR, {recursive: true, force: true})
mkdirSync(OUT_DIR)

const result = await build({
  entryPoints: ['src/index.ts'],
  outfile: `${OUT_DIR}/index.js`,
  bundle: true,
  platform: 'node',
  target: 'node24',
  format: 'esm',
  minify: true,
  legalComments: 'none',
  metafile: true,
  logLevel: 'warning',
  // bunyan loads this optional native addon inside a try/catch and runs
  // without it; there is nothing to bundle.
  external: ['dtrace-provider'],
  // Bundled CommonJS dependencies call require() for Node built-ins, which
  // an ES module does not provide.
  banner: {
    js: "import {createRequire} from 'node:module';const require=createRequire(import.meta.url);"
  }
})

// Bundling inlines third-party code, so collect the licence of every
// package that contributed to the bundle.
const packageRoots = new Set()
for (const input of Object.keys(result.metafile.inputs)) {
  const match = input.match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//)
  if (match) packageRoots.add(match[1])
}

// Many packages ship an identical licence text, so each distinct text is
// written once, preceded by every package that carries it.
const packagesByText = new Map()
for (const root of packageRoots) {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const licenceFile = readdirSync(root)
    .sort()
    .find(name => /^(licen[cs]e|copying)/i.test(name))
  const text = licenceFile
    ? readFileSync(join(root, licenceFile), 'utf8').trim()
    : `No licence file shipped; package.json declares ${manifest.license ?? 'no licence'}.`
  const packages = packagesByText.get(text) ?? []
  packages.push(
    `${manifest.name}@${manifest.version} (${manifest.license ?? 'UNKNOWN'})`
  )
  packagesByText.set(text, packages)
}

const notices = [...packagesByText]
  .map(([text, packages]) => [packages.sort(), text])
  .sort(([a], [b]) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  .map(([packages, text]) => `${packages.join('\n')}\n\n${text}`)

writeFileSync(`${OUT_DIR}/licenses.txt`, `${notices.join('\n\n---\n\n')}\n`)

process.stdout.write(`bundled src/index.ts -> ${OUT_DIR}/index.js\n`)
