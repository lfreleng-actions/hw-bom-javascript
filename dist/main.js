#!/usr/bin/env ts-node
// SPDX-FileCopyrightText: 2025 2025 The Linux Foundation
//
// SPDX-License-Identifier: Apache-2.0
import { execSync } from 'child_process';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import bunyan from 'bunyan';
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
// Cloud Instance Metadata Service (IMDS) endpoints. These are fixed,
// provider-defined addresses rather than environment-specific configuration:
// 169.254.169.254 is the link-local IMDS address used by AWS, Azure and
// OpenStack; metadata.google.internal is the GCP metadata server.
const IMDS_LINK_LOCAL = 'http://169.254.169.254';
const GCP_METADATA_SERVER = 'http://metadata.google.internal';
const serviceName = core.getInput('otel_service_name') || 'github-actions-hw-bom';
const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: '1.0.0'
});
const otelExporterOTLPEndpoint = core.getInput('otel_exporter_otlp_endpoint') ||
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    'http://localhost:4317';
const otelExporterOTLPHeaders = core.getInput('otel_exporter_otlp_headers') ||
    process.env.OTEL_EXPORTER_OTLP_HEADERS ||
    'key:value';
const otlpExporter = new OTLPLogExporter({
    url: otelExporterOTLPEndpoint + '/v1/logs',
    headers: { otelExporterOTLPHeaders }
});
const loggerProvider = new LoggerProvider({
    resource: resource,
    processors: [new SimpleLogRecordProcessor({ exporter: otlpExporter })]
});
const logger = bunyan.createLogger({
    name: serviceName,
    streams: [
        {
            level: 'info',
            stream: process.stdout
        }
    ]
});
// Add a custom stream for OpenTelemetry
logger.addStream({
    level: 'info',
    type: 'raw',
    stream: {
        write: (obj) => {
            const record = obj;
            const attributes = {};
            // Convert Bunyan record to OpenTelemetry attributes
            Object.entries(record).forEach(([key, value]) => {
                if (typeof value === 'string' ||
                    typeof value === 'number' ||
                    typeof value === 'boolean') {
                    attributes[key] = value;
                }
            });
            loggerProvider.getLogger('hw-bom').emit({
                severityText: 'INFO',
                body: record.msg,
                attributes
            });
        }
    }
});
export async function getAwsToken() {
    try {
        const response = await fetch(`${IMDS_LINK_LOCAL}/latest/api/token`, {
            method: 'PUT',
            headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '21600' }
        });
        return await response.text();
    }
    catch (error) {
        console.error('Failed to fetch AWS token:', error);
        return '';
    }
}
export async function getInstanceType(cloud, awsToken = '') {
    try {
        switch (cloud) {
            case 'aws': {
                const awsResponse = await fetch(`${IMDS_LINK_LOCAL}/latest/meta-data/instance-type`, { headers: { 'X-aws-ec2-metadata-token': awsToken } });
                return await awsResponse.text();
            }
            case 'azure': {
                const azureResponse = await fetch(`${IMDS_LINK_LOCAL}/metadata/instance/compute/vmSize?api-version=2021-02-01&format=text`, { headers: { Metadata: 'true' } });
                const azureData = await azureResponse.text();
                return azureData;
            }
            case 'gce': {
                const gceResponse = await fetch(`${GCP_METADATA_SERVER}/computeMetadata/v1/instance/machine-type`, { headers: { 'Metadata-Flavor': 'Google' } });
                const gceData = (await gceResponse.text()).split('/').pop() || '';
                return gceData;
            }
            case 'openstack': {
                const openstackResponse = await fetch(`${IMDS_LINK_LOCAL}/2009-04-04/meta-data/instance-type`);
                return await openstackResponse.text();
            }
            default:
                return 'Unknown Instance Type';
        }
    }
    catch (error) {
        console.error(`Failed to fetch instance type for ${cloud}:`, error);
        return 'Error fetching instance type';
    }
}
export function runCommand(command) {
    try {
        return execSync(command).toString().trim();
    }
    catch (error) {
        console.error(`Command failed: ${command}`, error);
        return 'Error executing command';
    }
}
export function processDisplay(display, section) {
    try {
        const result = display
            .split('\n') // split by newline
            .map(line => line.trim()) // trim spaces on start and end
            .filter(line => line.startsWith(section)) // find the line that starts with section
            .pop() // remove the only element in array
            ?.replace(`${section}: `, ''); // remove the "product: " prefix
        return result ?? '';
    }
    catch (error) {
        console.error('Error processing display string:', error);
        return '';
    }
}
export async function run() {
    try {
        const display = runCommand('sudo lshw -C display');
        const cloud = runCommand('cloud-init query cloud-name');
        const awsToken = cloud === 'aws' ? await getAwsToken() : '';
        const instanceType = await getInstanceType(cloud, awsToken);
        const uname = runCommand('uname -a');
        const workflowRun = github.context.runId.toString();
        const cpu = runCommand('cat /proc/cpuinfo |grep "model name"|sort -u|cut -d ":" -f2|awk \'{$1=$1};1\'');
        const cpuVendor = runCommand("lscpu | grep Vendor | awk '{print $NF}'");
        const cpuNumProc = runCommand('getconf _NPROCESSORS_ONLN');
        const hostname = runCommand('hostname');
        const memTotal = runCommand("grep MemTotal /proc/meminfo|awk '{print $(NF-1),$NF}'");
        const diskTotal = runCommand("df -h --total | awk 'END{print $2}'");
        const diskUsed = runCommand("df -h --total | awk 'END{print $3}'");
        const diskFree = runCommand("df -h --total | awk 'END{print $4}'");
        const gpuVendor = processDisplay(display, 'vendor');
        const gpuModel = processDisplay(display, 'product');
        core.setOutput('cloud', cloud);
        core.setOutput('instanceType', instanceType);
        core.setOutput('uname', uname);
        core.setOutput('display', display);
        core.setOutput('cpu', cpu);
        core.setOutput('cpuVendor', cpuVendor);
        core.setOutput('cpuNumProc', cpuNumProc);
        core.setOutput('hostname', hostname);
        core.setOutput('gpuVendor', gpuVendor);
        core.setOutput('gpuModel', gpuModel);
        core.setOutput('memTotal', memTotal);
        core.setOutput('diskTotal', diskTotal);
        core.setOutput('diskUsed', diskUsed);
        core.setOutput('diskFree', diskFree);
        core.setOutput('workflowRun', workflowRun);
        const hwBom = {
            [workflowRun]: {
                cloud: cloud,
                instanceType: instanceType,
                uname: uname,
                cpu: cpu,
                cpuVendor: cpuVendor,
                cpuNumProc: cpuNumProc,
                hostname: hostname,
                gpuVendor: gpuVendor,
                gpuModel: gpuModel,
                memTotal: memTotal,
                diskTotal: diskTotal,
                diskUsed: diskUsed,
                diskFree: diskFree
            }
        };
        logger.info(hwBom, 'Hardware Bill of Materials for Workflow Run ' + workflowRun);
    }
    catch (error) {
        if (error instanceof Error)
            core.setFailed(error.message);
    }
}
