import { RuleCreator } from '@typescript-eslint/utils/eslint-utils';
import path from 'path';
import fs from 'fs';
import { Worker, MessageChannel, receiveMessageOnPort } from 'worker_threads';
import { getExportInfo } from './utils';
export { ESLintUtils } from '@typescript-eslint/utils';

const { port1: localPort, port2: workerPort } = new MessageChannel();
const shared = new SharedArrayBuffer(4);
const workerData = { shared, port: workerPort };
// the bundle does currently not include the worker code module, so this is a temporary workaround for that
const workerModule = fs.existsSync(path.join(__dirname, '/rules/installPackages.js'))
  ? path.join(__dirname, '/rules/installPackages.js')
  : path.join(__dirname, '/installPackages.js');
new Worker(workerModule, {
  workerData,
  transferList: [workerPort],
});
const int32 = new Int32Array(shared);
console.log('Installing lower bound of grafana packages in worker thread...');
Atomics.wait(int32, 0, 0);
console.log('Done!');

const packagePaths: Record<string, string> = receiveMessageOnPort(localPort)?.message;

const packageExports: Record<string, string[]> = {};
Object.entries(packagePaths).forEach(([pkg, path]) => {
  packageExports[pkg] = Object.keys(getExportInfo(path).exports).sort();
});

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
      'issue:import': 'The member "{{member}}" is not available in all runtime environments that this plugin supports.',
    },
    schema: [
      {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    ],
    type: 'suggestion',
  },
  defaultOptions: [],
  create: (context) => {
    return {
      ImportSpecifier: async (node) => {
        if (node?.imported?.name) {
          // @ts-ignore
          const from = node.parent.source.value as string;
          if (from in packagePaths) {
            const exportInfo = getExportInfo(packagePaths[from]);
            // const runtimeExports = getRuntimeExports(exportInfo.exports);
            const exports = Object.keys(exportInfo.exports).sort();
            if (!exports.includes(node.imported.name)) {
              context.report({
                node,
                data: { member: node.imported.name },
                messageId: 'issue:import',
              });
            }
          }
        }
      },
    };
  },
});
