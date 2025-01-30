import path from "path";
import { Worker, MessageChannel, receiveMessageOnPort } from "worker_threads";

export function installPackages(packageVersion: string) {
  const { port1: localPort, port2: workerPort } = new MessageChannel();
  const shared = new SharedArrayBuffer(4);
  const workerData = { shared, port: workerPort, packageVersion };
  // This path looks odd because it's relative to index.js file where
  // this code ends up being bundled to.
  new Worker(path.join(__dirname, "rules/workers/downloadPackages"), {
    workerData,
    transferList: [workerPort],
  });
  const int32 = new Int32Array(shared);
  console.log(`Installing version ${packageVersion} of grafana packages...`);
  Atomics.wait(int32, 0, 0);

  return receiveMessageOnPort(localPort)?.message;
}
