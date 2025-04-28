"use strict";
// SPDX-FileCopyrightText: 2025 2025 The Linux Foundation
//
// SPDX-License-Identifier: Apache-2.0
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_node_1 = require("@opentelemetry/sdk-node");
const sdk_logs_1 = require("@opentelemetry/sdk-logs");
const resources_1 = require("@opentelemetry/resources");
const core = __importStar(require("@actions/core"));
const instrumentation_bunyan_1 = require("@opentelemetry/instrumentation-bunyan");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const exporter_logs_otlp_http_1 = require("@opentelemetry/exporter-logs-otlp-http");
const otelExporterOTLPEndpoint = core.getInput('otel_exporter_otlp_endpoint') ||
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    'http://localhost:4317';
const otelExporterOTLPHeaders = core.getInput('otel_exporter_otlp_headers') ||
    process.env.OTEL_EXPORTER_OTLP_HEADERS ||
    'key:value';
const sdk = new sdk_node_1.NodeSDK({
    resource: (0, resources_1.resourceFromAttributes)({
        [semantic_conventions_1.ATTR_SERVICE_NAME]: core.getInput('otel_service_name') || 'github-actions-hw-bom',
        [semantic_conventions_1.ATTR_SERVICE_VERSION]: '1.0.0'
    }),
    logRecordProcessors: [
        new sdk_logs_1.SimpleLogRecordProcessor(new exporter_logs_otlp_http_1.OTLPLogExporter({
            url: otelExporterOTLPEndpoint + '/v1/logs',
            headers: { otelExporterOTLPHeaders }
        })),
        new sdk_logs_1.SimpleLogRecordProcessor(new sdk_logs_1.ConsoleLogRecordExporter())
    ],
    instrumentations: [new instrumentation_bunyan_1.BunyanInstrumentation()]
});
try {
    sdk.start();
    console.log('OpenTelemetry SDK started');
    console.log('Sending logs to:', otelExporterOTLPEndpoint);
    console.log('Using headers:', otelExporterOTLPHeaders);
}
catch (error) {
    console.error('Error starting OpenTelemetry SDK:', error);
}
