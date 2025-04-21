// SPDX-FileCopyrightText: 2025 2025 The Linux Foundation
//
// SPDX-License-Identifier: Apache-2.0

import {jest} from '@jest/globals'
import {execSync} from 'child_process'
import * as core from '@actions/core'
import {
  run,
  getAwsToken,
  getInstanceType,
  runCommand,
  processDisplay
} from '../src/main'

// Mock the dependencies
jest.mock('child_process')
jest.mock('@actions/core')

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch

describe('GitHub Action Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAwsToken', () => {
    it('should return AWS token when successful', async () => {
      const mockToken = 'test-token'
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.resolve(mockToken)
      } as Response)

      const token = await getAwsToken()
      expect(token).toBe(mockToken)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://169.254.169.254/latest/api/token',
        {
          method: 'PUT',
          headers: {'X-aws-ec2-metadata-token-ttl-seconds': '21600'}
        }
      )
    })

    it('should return empty string on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'))

      const token = await getAwsToken()
      expect(token).toBe('')
    })
  })

  describe('getInstanceType', () => {
    it('should return AWS instance type', async () => {
      const mockInstanceType = 't2.micro'
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.resolve(mockInstanceType)
      } as Response)

      const instanceType = await getInstanceType('aws', 'test-token')
      expect(instanceType).toBe(mockInstanceType)
    })

    it('should return Azure instance type', async () => {
      const mockInstanceType = 'Standard_D2s_v3'
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.resolve(mockInstanceType)
      } as Response)

      const instanceType = await getInstanceType('azure')
      expect(instanceType).toEqual(mockInstanceType)
    })

    it('should return GCE instance type', async () => {
      const mockInstanceType = 'n1-standard-1'
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.resolve(mockInstanceType)
      } as Response)

      const instanceType = await getInstanceType('gce')
      expect(instanceType).toBe(mockInstanceType)
    })

    it('should return OpenStack instance type', async () => {
      const mockInstanceType = 'm1.small'
      mockFetch.mockResolvedValueOnce({
        text: () => Promise.resolve(mockInstanceType)
      } as Response)

      const instanceType = await getInstanceType('openstack')
      expect(instanceType).toBe(mockInstanceType)
    })

    it('should return error message on failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Failed to fetch'))

      const instanceType = await getInstanceType('aws')
      expect(instanceType).toBe('Error fetching instance type')
    })
  })

  describe('runCommand', () => {
    it('should execute command and return output', () => {
      const mockOutput = 'test output'
      ;(execSync as jest.Mock).mockReturnValue(Buffer.from(mockOutput))

      const result = runCommand('test command')
      expect(result).toBe(mockOutput)
      expect(execSync).toHaveBeenCalledWith('test command')
    })

    it('should return error message on command failure', () => {
      ;(execSync as jest.Mock).mockImplementation(() => {
        throw new Error('Command failed')
      })

      const result = runCommand('test command')
      expect(result).toBe('Error executing command')
    })
  })

  describe('processDisplay', () => {
    it('should extract vendor from display info', () => {
      const displayInfo = `
        vendor: NVIDIA Corporation
        product: Tesla T4
      `
      const result = processDisplay(displayInfo, 'vendor')
      expect(result).toBe('NVIDIA Corporation')
    })

    it('should extract product from display info', () => {
      const displayInfo = `
        vendor: NVIDIA Corporation
        product: Tesla T4
      `
      const result = processDisplay(displayInfo, 'product')
      expect(result).toBe('Tesla T4')
    })

    it('should return empty string if section not found', () => {
      const displayInfo = `
        vendor: NVIDIA Corporation
        product: Tesla T4
      `
      const result = processDisplay(displayInfo, 'nonexistent')
      expect(result).toBe('')
    })
  })

  describe('run', () => {
    it('should collect and set all outputs successfully', async () => {
      // Mock all the command outputs
      const commandOutputs: Record<string, string> = {
        'cloud-init query cloud-name': 'aws',
        'uname -a': 'Linux test-host 5.4.0-1045-aws #47-Ubuntu SMP',
        'cat /proc/cpuinfo |grep "model name"|sort -u|cut -d ":" -f2|awk \'{$1=$1};1\'':
          'Intel(R) Xeon(R) CPU',
        "lscpu | grep Vendor | awk '{print $NF}'": 'Intel',
        'getconf _NPROCESSORS_ONLN': '2',
        hostname: 'test-host',
        'sudo lshw -C display': 'vendor: NVIDIA Corporation\nproduct: Tesla T4',
        "grep MemTotal /proc/meminfo|awk '{print $(NF-1),$NF}'": '8192 MB',
        "df -h --total | awk 'END{print $2}'": '100G',
        "df -h --total | awk 'END{print $3}'": '50G',
        "df -h --total | awk 'END{print $4}'": '50G'
      }
      const mockExecSync = execSync as jest.Mock
      mockExecSync.mockImplementation((command: unknown) => {
        return Buffer.from(commandOutputs[command as string] || '')
      })

      // Mock AWS token and instance type responses
      mockFetch
        .mockResolvedValueOnce({
          text: () => Promise.resolve('test-token')
        } as Response)
        .mockResolvedValueOnce({
          text: () => Promise.resolve('t2.micro')
        } as Response)

      await run()

      // Verify all outputs were set
      expect(core.setOutput).toHaveBeenCalledWith('cloud', 'aws')
      expect(core.setOutput).toHaveBeenCalledWith('instanceType', 't2.micro')
      expect(core.setOutput).toHaveBeenCalledWith(
        'uname',
        'Linux test-host 5.4.0-1045-aws #47-Ubuntu SMP'
      )
      expect(core.setOutput).toHaveBeenCalledWith('cpu', 'Intel(R) Xeon(R) CPU')
      expect(core.setOutput).toHaveBeenCalledWith('cpuVendor', 'Intel')
      expect(core.setOutput).toHaveBeenCalledWith('cpuNumProc', '2')
      expect(core.setOutput).toHaveBeenCalledWith('hostname', 'test-host')
      expect(core.setOutput).toHaveBeenCalledWith(
        'gpuVendor',
        'NVIDIA Corporation'
      )
      expect(core.setOutput).toHaveBeenCalledWith('gpuModel', 'Tesla T4')
      expect(core.setOutput).toHaveBeenCalledWith('memTotal', '8192 MB')
      expect(core.setOutput).toHaveBeenCalledWith('diskTotal', '100G')
      expect(core.setOutput).toHaveBeenCalledWith('diskUsed', '50G')
      expect(core.setOutput).toHaveBeenCalledWith('diskFree', '50G')
    })
    it('should handle errors and set failed status', async () => {
      ;(core.setOutput as jest.Mock).mockImplementation(() => {
        throw new Error('Command failed')
      })

      await run()

      expect(core.setFailed).toHaveBeenCalledWith(
        expect.stringContaining('Command failed')
      )
    })
  })
})
