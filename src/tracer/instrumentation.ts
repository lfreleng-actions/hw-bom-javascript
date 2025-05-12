import {NodeSDK} from '@opentelemetry/sdk-node'
import {ConsoleLogRecordExporter, SimpleLogRecordProcessor} from '@opentelemetry/sdk-logs'
import {resourceFromAttributes} from '@opentelemetry/resources'
import * as core from '@actions/core'
import {getNodeAutoInstrumentations} from '@opentelemetry/auto-instrumentations-node'
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions'
import {OTLPLogExporter} from '@opentelemetry/exporter-logs-otlp-http'

const otelExporterOTLPEndpoint = core.getInput('otel_exporter_otlp_endpoint') || 'http://localhost:4317'
const otelExporterOTLPHeaders = core.getInput('otel_exporter_otlp_headers') || ''

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'hw-bom-github-action',
    [ATTR_SERVICE_VERSION]: '1.0.0'
  }),
  logRecordProcessors: [
    new SimpleLogRecordProcessor(new OTLPLogExporter(
      {
        url: otelExporterOTLPEndpoint + "/v1/logs",
        headers: {otelExporterOTLPHeaders}
      }
    )),
    new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())
  ],
  instrumentations: [getNodeAutoInstrumentations()]
});

try {
  sdk.start()
  console.log('OpenTelemetry SDK started')
} catch (error) {
  console.error('Error starting OpenTelemetry SDK:', error)
}
