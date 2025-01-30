import fs from 'fs';
import path from 'path';
import { Worker, MessageChannel, receiveMessageOnPort } from 'worker_threads';

export function installPackages(packageVersion: string) {
  const { port1: localPort, port2: workerPort } = new MessageChannel();
  const shared = new SharedArrayBuffer(4);
  const workerData = { shared, port: workerPort, packageVersion };

  // the bundle does currently not include the worker module, so this is a temporary workaround for that
  // todo: handle this in a better way
  const workerFile = fs.existsSync(path.join(__dirname, '/rules/workers/downloadPackages.js'))
    ? '/rules/workers/downloadPackages.js'
    : '/downloadPackages.js';
  new Worker(path.join(__dirname, workerFile), {
    workerData,
    transferList: [workerPort],
  });
  const int32 = new Int32Array(shared);
  console.log(`Installing version ${packageVersion} of grafana packages...`);
  Atomics.wait(int32, 0, 0);

  return receiveMessageOnPort(localPort)?.message;
}
