// SPDX-FileCopyrightText: 2025 2025 The Linux Foundation
//
// SPDX-License-Identifier: Apache-2.0
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleLogRecordExporter, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { resourceFromAttributes } from '@opentelemetry/resources';
import * as core from '@actions/core';
import { BunyanInstrumentation } from '@opentelemetry/instrumentation-bunyan';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
const otelExporterOTLPEndpoint = core.getInput('otel_exporter_otlp_endpoint') ||
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    'http://localhost:4317';
const otelExporterOTLPHeaders = core.getInput('otel_exporter_otlp_headers') ||
    process.env.OTEL_EXPORTER_OTLP_HEADERS ||
    'key:value';
const sdk = new NodeSDK({
    resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: core.getInput('otel_service_name') || 'github-actions-hw-bom',
        [ATTR_SERVICE_VERSION]: '1.0.0'
    }),
    logRecordProcessors: [
        new SimpleLogRecordProcessor({
            exporter: new OTLPLogExporter({
                url: otelExporterOTLPEndpoint + '/v1/logs',
                headers: { otelExporterOTLPHeaders }
            })
        }),
        new SimpleLogRecordProcessor({ exporter: new ConsoleLogRecordExporter() })
    ],
    instrumentations: [new BunyanInstrumentation()]
});
try {
    sdk.start();
    core.info('OpenTelemetry SDK started');
    core.info(`Sending logs to: ${otelExporterOTLPEndpoint}`);
}
catch (error) {
    core.error(`Error starting OpenTelemetry SDK: ${error instanceof Error ? error.message : String(error)}`);
}
