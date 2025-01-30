import semver from 'semver';
import fs from 'fs';
import { RuleContext } from '@typescript-eslint/utils/ts-eslint';

function getMinSupportedVersionFromPackageJson(): string {
  const path = process.cwd() + '/src/plugin.json';

  if (!fs.existsSync(path)) {
    throw new Error("Couldn't find src/plugin.json in the current working directory");
  }

  const pluginJson = require(path);
  const minVersion = semver.minVersion(pluginJson.dependencies.grafanaDependency);
  if (!minVersion) {
    throw new Error('Could not determine minimum supported version from package.json');
  }

  return minVersion.toString();
}

export function getMinSupportedGrafanaVersion(context: Readonly<RuleContext<'issue:import', []>>) {
  // TODO: Fix typings
  if (context.options.length && (context.options.at(0) as any).minGrafanaVersion) {
    console.debug('Using minGrafanaVersion from options');
    return (context.options.at(0) as any).minGrafanaVersion;
  }

  const packageJsonMinVersion = getMinSupportedVersionFromPackageJson();
  if (packageJsonMinVersion) {
    console.debug('Using minGrafanaVersion from package.json');
    return packageJsonMinVersion;
  }

  return null;
}
