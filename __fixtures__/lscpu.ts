// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 The Linux Foundation

// Representative lscpu output, trimmed to the fields around the model name.

// x86_64 GitHub-hosted runner, flat layout as printed through a pipe. The
// BIOS line repeats the model name with extra text and must not be taken.
export const lscpuX86 = `Architecture:                         x86_64
CPU op-mode(s):                       32-bit, 64-bit
Byte Order:                           Little Endian
CPU(s):                               4
Vendor ID:                            AuthenticAMD
BIOS Vendor ID:                       Advanced Micro Devices, Inc.
Model name:                           AMD EPYC 7763 64-Core Processor
BIOS Model name:                      AMD EPYC 7763 64-Core Processor                 CPU @ 0.0GHz
BIOS CPU family:                      1
CPU family:                           25
Model:                                1
Thread(s) per core:                   2
`

// arm64 GitHub-hosted runner. /proc/cpuinfo has no 'model name' field on
// arm64, but lscpu decodes the CPU part into a model name.
export const lscpuArm64 = `Architecture:                         aarch64
CPU op-mode(s):                       64-bit
Byte Order:                           Little Endian
CPU(s):                               4
Vendor ID:                            ARM
Model name:                           Neoverse-N2
Model:                                0
Thread(s) per core:                   1
`

// Heterogeneous arm64 CPU in the indented layout util-linux 2.37+ prints
// on a terminal: one 'Model name:' per core type, nested under the vendor.
export const lscpuArm64Hierarchical = `Architecture:            aarch64
  CPU op-mode(s):        32-bit, 64-bit
  Byte Order:            Little Endian
CPU(s):                  8
Vendor ID:               ARM
  Model name:            Cortex-A55
    Model:               0
    Thread(s) per core:  1
    Core(s) per cluster: 4
  Model name:            Cortex-A78
    Model:               1
    Thread(s) per core:  1
    Core(s) per cluster: 4
`
