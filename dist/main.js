#!/usr/bin/env ts-node
"use strict";
// SPDX-FileCopyrightText: 2025 2025 The Linux Foundation
//
// SPDX-License-Identifier: Apache-2.0
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAwsToken = getAwsToken;
exports.getInstanceType = getInstanceType;
exports.runCommand = runCommand;
exports.processDisplay = processDisplay;
exports.run = run;
const child_process_1 = require("child_process");
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const exporter_logs_otlp_http_1 = require("@opentelemetry/exporter-logs-otlp-http");
const bunyan_1 = __importDefault(require("bunyan"));
const sdk_logs_1 = require("@opentelemetry/sdk-logs");
const serviceName = core.getInput('otel_service_name') || 'github-actions-hw-bom';
const resource = (0, resources_1.resourceFromAttributes)({
    [semantic_conventions_1.ATTR_SERVICE_NAME]: serviceName,
    [semantic_conventions_1.ATTR_SERVICE_VERSION]: '1.0.0'
});
const otelExporterOTLPEndpoint = core.getInput('otel_exporter_otlp_endpoint') ||
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    'http://localhost:4317';
const otelExporterOTLPHeaders = core.getInput('otel_exporter_otlp_headers') ||
    process.env.OTEL_EXPORTER_OTLP_HEADERS ||
    'key:value';
const otlpExporter = new exporter_logs_otlp_http_1.OTLPLogExporter({
    url: otelExporterOTLPEndpoint + '/v1/logs',
    headers: { otelExporterOTLPHeaders }
});
const loggerProvider = new sdk_logs_1.LoggerProvider({
    resource: resource
});
loggerProvider.addLogRecordProcessor(new sdk_logs_1.SimpleLogRecordProcessor(otlpExporter));
const logger = bunyan_1.default.createLogger({
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
async function getAwsToken() {
    try {
        const response = await fetch('http://169.254.169.254/latest/api/token', {
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
async function getInstanceType(cloud, awsToken = '') {
    try {
        switch (cloud) {
            case 'aws': {
                const awsResponse = await fetch('http://169.254.169.254/latest/meta-data/instance-type', { headers: { 'X-aws-ec2-metadata-token': awsToken } });
                return await awsResponse.text();
            }
            case 'azure': {
                const azureResponse = await fetch('http://169.254.169.254/metadata/instance/compute/vmSize?api-version=2021-02-01&format=text', { headers: { Metadata: 'true' } });
                const azureData = await azureResponse.text();
                return azureData;
            }
            case 'gce': {
                const gceResponse = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/machine-type', { headers: { 'Metadata-Flavor': 'Google' } });
                const gceData = (await gceResponse.text()).split('/').pop() || '';
                return gceData;
            }
            case 'openstack': {
                const openstackResponse = await fetch('http://169.254.169.254/2009-04-04/meta-data/instance-type');
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
function runCommand(command) {
    try {
        return (0, child_process_1.execSync)(command).toString().trim();
    }
    catch (error) {
        console.error(`Command failed: ${command}`, error);
        return 'Error executing command';
    }
}
function processDisplay(display, section) {
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
async function run() {
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
