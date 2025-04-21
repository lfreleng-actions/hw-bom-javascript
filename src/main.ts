#!/usr/bin/env ts-node

// SPDX-FileCopyrightText: 2025 2025 The Linux Foundation
//
// SPDX-License-Identifier: Apache-2.0

import {execSync} from 'child_process'
import * as core from '@actions/core'

export async function getAwsToken(): Promise<string> {
  try {
    const response = await fetch('http://169.254.169.254/latest/api/token', {
      method: 'PUT',
      headers: {'X-aws-ec2-metadata-token-ttl-seconds': '21600'}
    })
    return await response.text()
  } catch (error) {
    console.error('Failed to fetch AWS token:', error)
    return ''
  }
}

export async function getInstanceType(
  cloud: string,
  awsToken: string = ''
): Promise<string> {
  try {
    switch (cloud) {
      case 'aws': {
        const awsResponse = await fetch(
          'http://169.254.169.254/latest/meta-data/instance-type',
          {headers: {'X-aws-ec2-metadata-token': awsToken}}
        )
        return await awsResponse.text()
      }
      case 'azure': {
        const azureResponse = await fetch(
          'http://169.254.169.254/metadata/instance/compute/vmSize?api-version=2021-02-01&format=text',
          {headers: {Metadata: 'true'}}
        )
        const azureData = await azureResponse.text()
        return azureData
      }
      case 'gce': {
        const gceResponse = await fetch(
          'http://metadata.google.internal/computeMetadata/v1/instance/machine-type',
          {headers: {'Metadata-Flavor': 'Google'}}
        )
        const gceData = (await gceResponse.text()).split('/').pop() || ''
        return gceData
      }
      case 'openstack': {
        const openstackResponse = await fetch(
          'http://169.254.169.254/2009-04-04/meta-data/instance-type'
        )
        return await openstackResponse.text()
      }
      default:
        return 'Unknown Instance Type'
    }
  } catch (error) {
    console.error(`Failed to fetch instance type for ${cloud}:`, error)
    return 'Error fetching instance type'
  }
}

export function runCommand(command: string): string {
  try {
    return execSync(command).toString().trim()
  } catch (error) {
    console.error(`Command failed: ${command}`, error)
    return 'Error executing command'
  }
}

export function processDisplay(display: string, section: string): string {
  try {
    const result = display
      .split('\n') // split by newline
      .map(line => line.trim()) // trim spaces on start and end
      .filter(line => line.startsWith(section)) // find the line that starts with section
      .pop() // remove the only element in array
      ?.replace(`${section}: `, '') // remove the "product: " prefix
    return result ?? ''
  } catch (error) {
    console.error('Error processing display string:', error)
    return ''
  }
}

export async function run(): Promise<void> {
  try {
    const display = runCommand('sudo lshw -C display')
    const cloud = runCommand('cloud-init query cloud-name')
    const awsToken = cloud === 'aws' ? await getAwsToken() : ''
    const instanceType = await getInstanceType(cloud, awsToken)
    const uname = runCommand('uname -a')
    const cpu = runCommand(
      'cat /proc/cpuinfo |grep "model name"|sort -u|cut -d ":" -f2|awk \'{$1=$1};1\''
    )
    const cpuVendor = runCommand("lscpu | grep Vendor | awk '{print $NF}'")
    const cpuNumProc = runCommand('getconf _NPROCESSORS_ONLN')
    const hostname = runCommand('hostname')
    const memTotal = runCommand(
      "grep MemTotal /proc/meminfo|awk '{print $(NF-1),$NF}'"
    )
    const diskTotal = runCommand("df -h --total | awk 'END{print $2}'")
    const diskUsed = runCommand("df -h --total | awk 'END{print $3}'")
    const diskFree = runCommand("df -h --total | awk 'END{print $4}'")
    const gpuVendor = processDisplay(display, 'vendor')
    const gpuModel = processDisplay(display, 'product')

    core.setOutput('cloud', cloud)
    core.setOutput('instanceType', instanceType)
    core.setOutput('uname', uname)
    core.setOutput('display', display)
    core.setOutput('cpu', cpu)
    core.setOutput('cpuVendor', cpuVendor)
    core.setOutput('cpuNumProc', cpuNumProc)
    core.setOutput('hostname', hostname)
    core.setOutput('gpuVendor', gpuVendor)
    core.setOutput('gpuModel', gpuModel)
    core.setOutput('memTotal', memTotal)
    core.setOutput('diskTotal', diskTotal)
    core.setOutput('diskUsed', diskUsed)
    core.setOutput('diskFree', diskFree)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
