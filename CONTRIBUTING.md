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

In the eslint plugin API, there's no init hook or such that allows us to download and install the Grafana package dependencies. The [eslint rules API](https://eslint.org/docs/latest/extend/plugins#rules-in-plugins) is syncronous so the deps cannot be installed (and should not be) during rule evaluation either. So currently, Nodejs worker threads are used to install the packages upon initialization of the eslint plugin. Installation happens in the `installPackages.js` file. The dependencies stored on local disk, so download of a particular version of the package only needs to happen once.
