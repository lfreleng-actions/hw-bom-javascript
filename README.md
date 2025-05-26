<!--
SPDX-FileCopyrightText: 2025 The Linux Foundation

SPDX-License-Identifier: Apache-2.0
-->

# Hardware Bill of Materials (HW-BOM) GitHub Action

This GitHub Action collects detailed hardware information from cloud provider
instances and makes it available as workflow outputs. It's useful for:

- Documenting hardware specifications in CI/CD pipelines
- Validating instance types and hardware capabilities
- Generating hardware inventory reports

## Features

- Supports cloud providers AWS, Azure (Github Actions), GCE, OpenStack
- Collects workflow runId
- Collects comprehensive hardware information:
  - Cloud provider and instance type
  - CPU information (model, vendor, core count)
  - GPU information (vendor, model)
  - Memory and disk information
  - System information (hostname, uname)
- Provides all information as workflow outputs
- Handles errors with appropriate error messages

## OpenTelemetry Integration

This project integrates OpenTelemetry for observability. `src/instrumentation.ts`
configures the instrumentation and uses the following components:

- **NodeSDK**: Initializes the OpenTelemetry SDK with a resource, log record
   processors, and instrumentations.
- **BunyanInstrumentation**: Automatically instruments Bunyan logs.
- **OTLPLogExporter**: Exports logs to an OTLP-compatible endpoint.

### Configuration

You can configure the OpenTelemetry setup using the following inputs:

- `otel_service_name`: The name of your service (default: 'hw-bom').
- `otel_exporter_otlp_endpoint`: The OTLP endpoint URL (default: '<http://localhost:4317>').
- `otel_exporter_otlp_headers`: Headers for the OTLP exporter (default: 'key:value').

```yaml
env:
    OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:3137"
    OTEL_EXPORTER_OTLP_HEADERS:  "key=value"
  ```

You may set these inputs via GitHub Actions inputs or environment variables.

CAVEAT: There seems to be an issue setting the otlp endpoint and headers via GitHub
 Actions inputs (in the node code) but at the time of writing they work as expected
 when set as ENV vars. I suspect this may have to do with the OpenTelemetry SDK
 for node being in "development" status for logging.

## Usage

```yaml
name: Collect Hardware Information
on: [push, pull_request]

jobs:
  hardware-info:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Collect Hardware Information
        env:
          OTEL_EXPORTER_OTLP_ENDPOINT: "http://your-otlp-endpoint:4317"
          OTEL_EXPORTER_OTLP_HEADERS: "your-key=your-value"
        id: hw-info
        uses: lfreleng-actions/hw-bom-javascript@v1
        with:
          otel_service_name: 'your-service-name'
          otel_exporter_otlp_endpoint: 'http://your-otlp-endpoint:4317'
          otel_exporter_otlp_headers: 'your-key:your-value'

      - name: Display Hardware Information
        run: |
          echo "Workflow RunID: ${{ steps.hw-info.outputs.workflowRun }}"
          echo "Cloud Provider: ${{ steps.hw-info.outputs.cloud }}"
          echo "Instance Type: ${{ steps.hw-info.outputs.instanceType }}"
          echo "CPU: ${{ steps.hw-info.outputs.cpu }}"
          echo "CPU Vendor: ${{ steps.hw-info.outputs.cpuVendor }}"
          echo "CPU Cores: ${{ steps.hw-info.outputs.cpuNumProc }}"
          echo "GPU Vendor: ${{ steps.hw-info.outputs.gpuVendor }}"
          echo "GPU Model: ${{ steps.hw-info.outputs.gpuModel }}"
          echo "Memory: ${{ steps.hw-info.outputs.memTotal }}"
          echo "Disk Total: ${{ steps.hw-info.outputs.diskTotal }}"
          echo "Disk Used: ${{ steps.hw-info.outputs.diskUsed }}"
          echo "Disk Free: ${{ steps.hw-info.outputs.diskFree }}"
```

## Outputs

The action provides the following outputs:

| Output Name | Description |
|-------------|-------------|
| `cloud` | Cloud provider name (aws, azure, gce, openstack) |
| `workflowRun` | Github Action Workflow ID |
| `instanceType` | Instance type/size |
| `uname` | System information from uname -a |
| `cpu` | CPU model name |
| `cpuVendor` | CPU vendor |
| `cpuNumProc` | Number of processors |
| `hostname` | System hostname |
| `gpuVendor` | GPU vendor |
| `gpuModel` | GPU model |
| `memTotal` | Total system memory |
| `diskTotal` | Total disk space |
| `diskUsed` | Used disk space |
| `diskFree` | Free disk space |

## Requirements

- Runs on Linux-based GitHub Actions runners
- Requires sudo access for lshw command
- Cloud provider metadata service must be accessible

## Error Handling

The action handles errors :

- Failed commands return "Error executing command"
- Failed metadata queries return appropriate error messages
- Action logs all errors and the action fails with a descriptive message

## License

Licensed under the Apache v2.0 License - see the [LICENSE](LICENSE) file for details.
