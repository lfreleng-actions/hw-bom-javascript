<!--
SPDX-FileCopyrightText: 2025 2025 The Linux Foundation

SPDX-License-Identifier: Apache-2.0
-->

# Hardware Bill of Materials (HW-BOM) GitHub Action

This GitHub Action collects detailed hardware information from cloud provider instances and makes it available as workflow outputs. It's particularly useful for:
- Documenting hardware specifications in CI/CD pipelines
- Validating instance types and hardware capabilities
- Generating hardware inventory reports

## Features

- Supports multiple cloud providers (AWS, Azure, GCE, OpenStack)
- Collects comprehensive hardware information:
  - Cloud provider and instance type
  - CPU information (model, vendor, core count)
  - GPU information (vendor, model)
  - Memory and disk information
  - System information (hostname, uname)
- Provides all information as workflow outputs
- Handles errors gracefully with appropriate error messages

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
        id: hw-info
        uses: jordanconway/hw-bom@v1
        
      - name: Display Hardware Information
        run: |
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

The action handles errors gracefully:
- Failed commands return "Error executing command"
- Failed metadata queries return appropriate error messages
- All errors are logged and the action fails with a descriptive message

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.