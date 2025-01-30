import { RuleCreator } from '@typescript-eslint/utils/eslint-utils';
export { ESLintUtils } from '@typescript-eslint/utils';
import { getExportInfo, getRuntimeExports } from './tscUtils';
import { Exports } from '@grafana/levitate';
import ts from 'typescript';
import { getMinSupportedGrafanaVersion } from './minGrafanaVersion';
import { installPackages } from './installPackages';

type InstallPackagesResult = { packagePaths: Record<string, string>; message: string; version: string };
let packageExports: Record<string, { exports: Exports; program: ts.Program }> = {};
let installPackagesResult: InstallPackagesResult;

export const createRule = RuleCreator((name) => `https://my-website.io/eslint/${name}`);

type MessageIds = 'issue:import';
export const importExists = createRule<[], MessageIds>({
  name: 'import-exists',
  meta: {
    docs: {
      description:
        'A rule that checks if the imported member is available in all Grafana runtime environments that the plugin supports.',
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
      minSupportedVersion = getMinSupportedGrafanaVersion(context);
    } catch (e) {
      console.error(e);
      return {};
    }

    if (minSupportedVersion === null) {
      console.error('Could not find minSupportedVersion');
      return {};
    }

    if (installPackagesResult?.version !== minSupportedVersion) {
      installPackagesResult = installPackages(minSupportedVersion);
      console.log(installPackagesResult.message);

      Object.entries(installPackagesResult.packagePaths).forEach(([pkg, path]) => {
        packageExports[pkg] = getExportInfo(path);
      });
    }

    return {
      ImportSpecifier: async (node) => {
        if (node?.imported?.name) {
          // @ts-ignore
          const identifier = node.parent.source.value;
          if (identifier in packageExports && Object.keys(packageExports[identifier].exports).length > 0) {
            const exportsExceptTypesAndInterfaces = getRuntimeExports(packageExports[identifier].exports);
            if (!exportsExceptTypesAndInterfaces.includes(node.imported.name)) {
              context.report({
                node,
                data: { member: node.imported.name, package: `${identifier}@${installPackagesResult?.version}` },
                messageId: 'issue:import',
              });
            }
          }
        }
      },
    };
  },
});
