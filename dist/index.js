"use strict";
// SPDX-FileCopyrightText: 2025 2025 The Linux Foundation
//
// SPDX-License-Identifier: Apache-2.0
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * The entrypoint for the action. This file simply imports and runs the action's
 * main logic.
 */
require("./instrumentation");
const main_1 = require("./main");
/* istanbul ignore next */
(0, main_1.run)();
