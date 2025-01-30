import { RuleCreator } from '@typescript-eslint/utils/eslint-utils';
import path from 'path';
import fs from 'fs';
import { Worker, MessageChannel, receiveMessageOnPort } from 'worker_threads';
export { ESLintUtils } from '@typescript-eslint/utils';
import { getExportInfo, getMinSupportedVersionFromPackageJson, getRuntimeExports } from './utils';
import { Exports } from '@grafana/levitate';
import ts from 'typescript';

let packageExports: Record<string, { exports: Exports; program: ts.Program }> = {};
let currentMinSupportedVersion: string;

export const createRule = RuleCreator((name) => `https://my-website.io/eslint/${name}`);

type MessageIds = 'issue:import';
export const importExists = createRule<[], MessageIds>({
  name: 'import-exists',
  meta: {
    docs: {
      description: 'An example ESLint rule',
    },
    hasSuggestions: true,
    messages: {
      'issue:import':
        'The member "{{member}}" is not available in all runtime environments that this plugin supports. Make sure to check if the member is undefined before accessing it, or it may cause runtime errors. "{{package}}" does not export member "{{member}}".',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minGrafanaVersion: {
            type: 'string',
          },
        },
        additionalProperties: false,
      },
    ],
    type: 'suggestion',
  },
  defaultOptions: [],
  create: (context) => {
    let minSupportedVersion;

    try {
      minSupportedVersion = getMinSupportedVersionFromPackageJson();
    } catch (e) {
      console.error(e);
      return {};
    }

    if (minSupportedVersion === null) {
      console.error('Could not find minSupportedVersion');
      return {};
    }

    if (currentMinSupportedVersion !== minSupportedVersion) {
      currentMinSupportedVersion = minSupportedVersion;
      console.log('Installing packages');
      const { port1: localPort, port2: workerPort } = new MessageChannel();
      const shared = new SharedArrayBuffer(4);
      const workerData = { shared, port: workerPort };
      // the bundle does currently not include the worker module, so this is a temporary workaround for that
      const workerFile = fs.existsSync(path.join(__dirname, '/rules/installPackages.js'))
        ? '/rules/installPackages.js'
        : '/installPackages.js';
      new Worker(path.join(__dirname, workerFile), {
        workerData,
        transferList: [workerPort],
      });
      const int32 = new Int32Array(shared);
      console.log(`Installing version ${currentMinSupportedVersion} of grafana packages...`);
      Atomics.wait(int32, 0, 0);

      const { packagePaths, message }: { packagePaths: Record<string, string>; message: string } =
        receiveMessageOnPort(localPort)?.message;
      console.log(message);

      Object.entries(packagePaths).forEach(([pkg, path]) => {
        packageExports[pkg] = getExportInfo(path);
      });
    }

    return {
      ImportSpecifier: async (node) => {
        console.log('Import specifier');
        if (node?.imported?.name) {
          // @ts-ignore
          const identifier = node.parent.source.value;
          if (identifier in packageExports && Object.keys(packageExports[identifier].exports).length > 0) {
            const exportsExceptTypesAndInterfaces = getRuntimeExports(packageExports[identifier].exports);
            if (!exportsExceptTypesAndInterfaces.includes(node.imported.name)) {
              context.report({
                node,
                data: { member: node.imported.name, package: `${identifier}@${currentMinSupportedVersion}` },
                messageId: 'issue:import',
              });
            }
          }
        }
      },
    };
  },
});
