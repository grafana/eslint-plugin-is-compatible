const fs = require('fs');
const path = require('path');
const workerData = require('worker_threads').workerData;
const semver = require('semver');
const fetch = require('node-fetch-commonjs');
const os = require('os');
const { spawnSync } = require('child_process');
const { extract } = require('tar/x');

const { shared, port } = workerData;
const pluginJson = require(process.cwd() + '/src/plugin.json');
const minVersion = semver.minVersion(pluginJson.dependencies.grafanaDependency);
const shouldCacheExternal = true;

function pathExists(path) {
  try {
    fs.accessSync(path, fs.constants.R_OK);
    return true;
  } catch (e) {
    return false;
  }
}

function getTmpFolderName(packageName) {
  return path.resolve(path.join(os.tmpdir(), packageName));
}

async function getPackageTarBallUrl(packageName) {
  const { stdout } = spawnSync('npm', ['view', packageName, 'dist.tarball']);

  return stdout.toString().trim();
}

async function removeTmpFolder(packageName, ignoreCache = false) {
  const tmpPackageFolder = getTmpFolderName(packageName);
  if (!shouldCacheExternal || ignoreCache) {
    spawnSync('rm', ['-rf', tmpPackageFolder]);
  }
}

async function createTmpPackageFolder(packageName) {
  const tmpPackageFolder = getTmpFolderName(packageName);
  await removeTmpFolder(packageName);
  fs.mkdirSync(tmpPackageFolder, { recursive: true });

  return tmpPackageFolder;
}

async function downloadFile(url, path) {
  const res = await fetch(url);
  const fileStream = fs.createWriteStream(path);

  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve);
  });
}

async function downloadNpmPackageAsTarball(packageName) {
  const tmpFolderName = await createTmpPackageFolder(packageName);
  const url = await getPackageTarBallUrl(packageName);

  if (!url) {
    await removeTmpFolder(packageName, true);
    throw new Error(`Could not resolve package "${packageName}". Are you sure it exists?`);
  }

  const tarballPath = path.join(tmpFolderName, path.basename(url));
  const shouldDownload = !pathExists(tarballPath) || !(shouldCacheExternal && pathExists(tarballPath));

  if (shouldDownload) {
    await downloadFile(url, tarballPath);
    extract({ C: tmpFolderName, file: tarballPath, sync: true });
  } else {
    console.log('\nUsing download cache. Flag passed: LEVITATE_CACHE=true');
  }

  return path.join(tmpFolderName, 'package');
}

function readJsonFile(path) {
  const content = fs.readFileSync(path);
  return JSON.parse(content.toString());
}

function getPackageJsonPath(packagePath) {
  return path.join(packagePath, 'package.json');
}

function getPackageJson(packagePath) {
  if (!pathExists(getPackageJsonPath(packagePath))) {
    return null;
  }

  return readJsonFile(getPackageJsonPath(packagePath));
}

const TYPE_DEFINITION_FILE_NAME = 'index.d.ts';
function getTypeDefinitionFilePath(folder) {
  const packageJson = getPackageJson(folder);

  // if available use the package.json property that references a type definition file
  if (packageJson) {
    const typeProp = ['types', 'typings'].find((prop) => packageJson[prop] !== undefined);
    if (typeProp) {
      const typeDefinitionFilePath = packageJson[typeProp];
      return path.join(folder, typeDefinitionFilePath);
    }
  }

  return path.join(folder, TYPE_DEFINITION_FILE_NAME);
}

async function resolvePackage(packageName) {
  const tmpFolder = getTmpFolderName(packageName);

  if (pathExists(tmpFolder)) {
    message = `Package version ${minVersion} resolved from cache`;
    return getTypeDefinitionFilePath(tmpFolder);
  }

  const installedPackagePath = await downloadNpmPackageAsTarball(packageName);
  const typeDefinitionFilePath = getTypeDefinitionFilePath(installedPackagePath);

  if (!pathExists(typeDefinitionFilePath)) {
    const errorMsg = `Could not find type definition file at "${getTypeDefinitionFilePath(localPath)}"`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  return typeDefinitionFilePath;
}

const packagePaths = {
  '@grafana/ui': '',
  '@grafana/data': '',
  '@grafana/runtime': '',
};

let message = `Successfully installed version ${minVersion}`;

const installPackages = async () => {
  return Promise.all(
    Object.keys(packagePaths).map((key) => {
      return new Promise((resolve) => {
        resolvePackage(key + '@' + minVersion)
          .then((p) => {
            packagePaths[key] = p;
            resolve();
          })
          .catch((err) => {
            message = err.message;
            resolve();
          });
      });
    })
  );
};

installPackages().then((paths) => {
  port.postMessage({ packagePaths, message });
  const int32 = new Int32Array(shared);
  Atomics.notify(int32, 0);
});
