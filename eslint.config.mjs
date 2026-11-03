// SPDX-FileCopyrightText: 2025 2025 The Linux Foundation
//
// SPDX-License-Identifier: Apache-2.0

import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { flatConfigs as importX } from "eslint-plugin-import-x";
import jest from "eslint-plugin-jest";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import prettier from "eslint-config-prettier";
import globals from "globals";

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
