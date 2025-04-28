import {NodeSDK} from '@opentelemetry/sdk-node'
import {
  ConsoleLogRecordExporter,
  SimpleLogRecordProcessor
} from '@opentelemetry/sdk-logs'
import {resourceFromAttributes} from '@opentelemetry/resources'
import {getNodeAutoInstrumentations} from '@opentelemetry/auto-instrumentations-node'
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions'
const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'hw-bom-github-action',
    [ATTR_SERVICE_VERSION]: '1.0.0'
  }),
  logRecordProcessors: [
    new SimpleLogRecordProcessor(new ConsoleLogRecordExporter())
  ],
  instrumentations: [getNodeAutoInstrumentations()]
})

try {
  sdk.start()
  console.log('OpenTelemetry SDK started')
} catch (error) {
  console.error('Error starting OpenTelemetry SDK:', error)
}
