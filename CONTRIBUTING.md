# Contributing

## Local development

Start a tsc watcher in a terminal window:

```shell
npm run watch
```

Bundle the plugin with tsup:

```shell
npm run tsup:watch
```

Run unit tests:

```shell
npm run test
```

### Testing the eslint plugin in a Grafana plugin

Install the local eslint plugin inside the Grafana plugin working directory:

```shell
npm install <path-to-the-eslint-plugin>
#e.g
npm install /Users/<user>/code/eslint-plugin-is-compatible
```

Follow instructions in [README.md](README.md) to configure the is-compatible rule.

For your Grafana plugin to pickup your local changes, you may need to disable eslint caching. Open `package.json` and remove the `--cache` arg from the `lint` script.

## Publish to NPM

```shell
npm run version patch|minor|major
npm run build
npm run tsup
# to publish, you need to be login to the Grafana org at NPM
npm publish
```

## How the Grafana package dependencies are being installed

The `import-exist` rule requires the minimum supported version of the Grafana packages to be installed in order to check compatibility. Installing these packages is an asynchronous action (unless they are retrieved from the cache). However, the [`createRule`](https://eslint.org/docs/latest/extend/custom-rules) API, which is used to define custom rules for imports, is synchronous.

To work around this issue, Node.js worker threads are used to lock the main thread while installing the packages the first time the `import-exist` rule is executed.
