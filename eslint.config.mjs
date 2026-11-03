// SPDX-FileCopyrightText: 2025 2025 The Linux Foundation
//
// SPDX-License-Identifier: Apache-2.0

import { createRequire } from "node:module";
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import jest from "eslint-plugin-jest";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import prettier from "eslint-config-prettier";
import globals from "globals";

// The ES module build of eslint-plugin-import-x imports `makeRe` from
// minimatch, which minimatch 11 no longer exports, so it fails to load
// under the minimatch override. The CommonJS build looks it up only in
// no-internal-modules, a rule this config does not enable. Import the
// ES module build again once import-x supports minimatch 11.
const { flatConfigs: importX } = createRequire(import.meta.url)(
    "eslint-plugin-import-x",
);

export default defineConfig([{
    extends: [
        js.configs.recommended,
        tseslint.configs.recommended,
        importX.errors,
        importX.warnings,
        importX.typescript,
        prettierRecommended,
        prettier,
    ],

    plugins: {
        jest,
    },

    languageOptions: {
        globals: {
            ...globals.node,
            ...globals.jest,
        },

        parser: tseslint.parser,
        ecmaVersion: 9,
        sourceType: "module",
    },

    rules: {
        "import-x/no-unresolved": ["error", {"ignore": ["\\.js$"]}],
        "@typescript-eslint/no-empty-function": "off",
    },
}]);
