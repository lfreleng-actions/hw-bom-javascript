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

// Bundling inlines third-party code, so collect the licence and NOTICE
// files of every package that contributed to the bundle.
const packageRoots = new Set()
for (const input of Object.keys(result.metafile.inputs)) {
  const match = input.match(/^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//)
  if (match) packageRoots.add(match[1])
}

// Packages that ship their licence only inside the README, mapped to the
// heading its licence section starts at. Each entry was checked by hand
// for that exact version: the section must be the last in the README, as
// it is copied to the end. Keying by version makes an upgrade fail the
// build until the new README has been checked too.
const README_LICENCES = new Map([['safe-json-stringify@1.2.0', 'License']])

// Licence, COPYING and NOTICE files at the package root. A matching
// directory, such as @opentelemetry/instrumentation's LICENSES/ covering
// vendored code, contributes every file beneath it.
function noticeFiles(root) {
  const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
  const expand = (dir, entries) =>
    entries.sort(byName).flatMap(entry => {
      const path = join(dir, entry.name)
      return entry.isDirectory()
        ? expand(path, readdirSync(path, {withFileTypes: true}))
        : [path]
    })
  return expand(
    root,
    readdirSync(root, {withFileTypes: true}).filter(entry =>
      /^(licen[cs]e|copying|notice)/i.test(entry.name)
    )
  )
}

function noticeText(root, manifest) {
  const files = noticeFiles(root)
  if (files.length > 0) {
    return files.map(path => readFileSync(path, 'utf8').trim()).join('\n\n')
  }
  const id = `${manifest.name}@${manifest.version}`
  const heading = README_LICENCES.get(id)
  if (heading === undefined) {
    throw new Error(
      `${id} ships no licence file; check its README for the notice and ` +
        'add it to README_LICENCES in scripts/build.mjs'
    )
  }
  const lines = readFileSync(join(root, 'README.md'), 'utf8').split('\n')
  const start = lines.findIndex(line => line.trim() === heading)
  if (start === -1) {
    throw new Error(`${id}: no '${heading}' heading in README.md`)
  }
  return lines.slice(start).join('\n').trim()
}

// Many packages ship an identical licence text, so each distinct text is
// written once, preceded by every package that carries it.
const packagesByText = new Map()
for (const root of packageRoots) {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const text = noticeText(root, manifest)
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
