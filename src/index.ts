// SPDX-FileCopyrightText: 2025 2025 The Linux Foundation
//
// SPDX-License-Identifier: Apache-2.0

/**
 * The entrypoint for the action. This file simply imports and runs the action's
 * main logic.
 */
import './instrumentation.js'
import {run} from './main.js'

/* istanbul ignore next */
run()
