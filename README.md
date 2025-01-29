# eslint-plugin-is-compatible

is-compatible is a simple eslint plugin that checks whether imports from any of the Grafana packages (`@grafana/ui`, `@grafana/data` and `@grafana/runtime`) from within a Grafana plugin source code exist in all the Grafana runtimes that the plugin is supposed to support.

![Demo](./images/is-compatible.gif)

## How to install

```shell
npm install @grafana/eslint-plugin-is-compatible --save-dev
```

### Configure

Add the following to your Grafana plugin's `.eslintrc`:

```js
{
  ...
  "plugins": ["@grafana/is-compatible"],
  "rules": {
    "@grafana/is-compatible/import-exists": ["warn"]
  }
}
```

### Lint

```shell
npm run lint
```

If your IDE has an ESlint integration that displays errors and warning in the source code, you may need to restart the ESlint server. In VSCode you can run the task `ESLint: Restart ESlint Server`.

## How it works

When the ESlint plugin is loaded the first time, it will check the `grafanaDependency` property in the Grafana plugin's `plugin.json` file to find the min supported Grafana version. If for example the `grafanaDependency` is set to `>=10.0.2`, `@grafana/ui@10.0.2`, `@grafana/data@10.0.2` and `@grafana/runtime@10.0.2` will be downloaded to a temp directory on the host machine. It will then check that imports from any of these packages within the plugin source code has a corresponding export in version `10.0.2` of these packages. If not, a problem is reported. It currently ignores member that don't exist at runtime such as types, interfaces and enums.

## Known limitations

There are a few known limitations:

- This eslint plugin may not work as expected if eslint caching is enabled.
- The `import-exists` rule only checks backwards compatibility. If a member has been removed in an upcoming release of the Grafana packages, it will not be detected.
- When changing `grafanaDependency`, it may take a while to perform linting the first time as the plugin needs to download the new dependencies for the first time. After that, it will use cached dependencies.

### Rules

<!-- begin auto-generated rules list -->

💡 Manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

| Name                                         | Description            | 💡  |
| :------------------------------------------- | :--------------------- | :-- |
| [import-exists](docs/rules/import-exists.md) | An example ESLint rule | 💡  |

<!-- end auto-generated rules list -->
