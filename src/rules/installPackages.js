const workerData = require('worker_threads').workerData;
const semver = require('semver');

const { shared, port } = workerData;
const pluginJson = require(process.cwd() + '/src/plugin.json');
const minVersion = semver.minVersion(pluginJson.dependencies.grafanaDependency);
const packages = {
  '@grafana/ui': [],
  '@grafana/data': [],
  '@grafana/runtime': [],
};

const installPackages = async () => {
  const levitate = await import('@grafana/levitate');
  return Promise.all(
    Object.keys(packages).map((key) => {
      return new Promise((resolve) => {
        levitate
          .resolvePackage(key + '@' + minVersion)
          .then((p) => {
            packages[key] = Object.keys(levitate.getExportInfo(p).exports).sort();
            resolve();
          })
          .catch(console.error);
      });
    })
  );
};

installPackages().then((paths) => {
  port.postMessage(packages);
  const int32 = new Int32Array(shared);
  Atomics.notify(int32, 0);
});
