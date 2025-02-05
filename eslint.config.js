// @ts-check
const grafanaConfig = require('@grafana/eslint-config/flat');

// If you edit this config consider running `npx -y @eslint/config-inspector@latest` first.

/**
 * @type {Array<import('eslint').Linter.Config>}
 */
module.exports = [
  {
    name: 'eslint-plugin-is-compatible/ignores',
    ignores: [
      '.github',
      '**/.*', // dotfiles aren't ignored by default in FlatConfig,
    ],
  },
  {
    ...grafanaConfig,
    name: 'eslint-plugin-is-compatible/defaults',
    files: ['**/*.ts'],
  },
];
