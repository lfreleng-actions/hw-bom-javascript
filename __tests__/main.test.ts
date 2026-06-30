// SPDX-FileCopyrightText: 2025 2025 The Linux Foundation
//
// SPDX-License-Identifier: Apache-2.0

import {jest} from '@jest/globals'
const mockExecSync = jest.fn()
const mockGetInput = jest.fn(() => '')
const mockSetOutput = jest.fn()
const mockSetFailed = jest.fn()
const mockGithubContext: {runId: number} = {runId: 0}

jest.unstable_mockModule('child_process', () => ({
  execSync: mockExecSync
}))
jest.unstable_mockModule('@actions/core', () => ({
  getInput: mockGetInput,
  setOutput: mockSetOutput,
  setFailed: mockSetFailed
}))
jest.unstable_mockModule('@actions/github', () => ({
  context: mockGithubContext
}))

const {run, getAwsToken, getInstanceType, runCommand, processDisplay} =
  await import('../src/main.js')

// Mock fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch

describe('GitHub Action Tests', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mockGetInput.mockReturnValue('')
    mockGithubContext.runId = 0
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
      mockExecSync.mockReturnValue(Buffer.from(mockOutput))

      const result = runCommand('test command')
      expect(result).toBe(mockOutput)
      expect(mockExecSync).toHaveBeenCalledWith('test command')
    })

    it('should return error message on command failure', () => {
      mockExecSync.mockImplementation(() => {
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
      mockExecSync.mockImplementation((command: unknown) => {
        return Buffer.from(commandOutputs[command as string] || '')
      })

      // Mock Github context
      mockGithubContext.runId = 1234567890
      expect(mockGithubContext.runId).toBe(1234567890)

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
      expect(mockSetOutput).toHaveBeenCalledWith('cloud', 'aws')
      expect(mockSetOutput).toHaveBeenCalledWith('instanceType', 't2.micro')
      expect(mockSetOutput).toHaveBeenCalledWith(
        'uname',
        'Linux test-host 5.4.0-1045-aws #47-Ubuntu SMP'
      )
      expect(mockSetOutput).toHaveBeenCalledWith('cpu', 'Intel(R) Xeon(R) CPU')
      expect(mockSetOutput).toHaveBeenCalledWith('cpuVendor', 'Intel')
      expect(mockSetOutput).toHaveBeenCalledWith('cpuNumProc', '2')
      expect(mockSetOutput).toHaveBeenCalledWith('hostname', 'test-host')
      expect(mockSetOutput).toHaveBeenCalledWith(
        'gpuVendor',
        'NVIDIA Corporation'
      )
      expect(mockSetOutput).toHaveBeenCalledWith('gpuModel', 'Tesla T4')
      expect(mockSetOutput).toHaveBeenCalledWith('gpuModel', 'Tesla T4')
      expect(mockSetOutput).toHaveBeenCalledWith('memTotal', '8192 MB')
      expect(mockSetOutput).toHaveBeenCalledWith('diskTotal', '100G')
      expect(mockSetOutput).toHaveBeenCalledWith('diskUsed', '50G')
      expect(mockSetOutput).toHaveBeenCalledWith('diskFree', '50G')
      expect(mockSetOutput).toHaveBeenCalledWith('workflowRun', '1234567890')
    })
    it('should handle errors and set failed status', async () => {
      mockSetOutput.mockImplementation(() => {
        throw new Error('Command failed')
      })

      await run()

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining('Command failed')
      )
    })
  })
})
