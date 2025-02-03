import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { execSync } from "child_process";
import { getExportInfo } from "./tscUtils";
import { ExportInfo } from "./types";

const packages = ["@grafana/data", "@grafana/ui", "@grafana/runtime"];

export function downloadPackages(tempDir: string, version: string) {
  console.log(
    `Please wait... downloading Grafana NPM packages for version ${version}`
  );
  mkdirSync(tempDir, { recursive: true });
  execSync("npm init -y", { cwd: tempDir });
  execSync(
    `npm install ${packages.join(
      `@${version} `
    )} --legacy-peer-deps --ignore-scripts --no-save --loglevel=error`,
    {
      cwd: tempDir,
    }
  );
}

function getPackageExportPaths(tempDir: string): Record<string, string> {
  return packages.reduce(
    (acc, pkg) => ({
      ...acc,
      [pkg]: join(tempDir, "node_modules", pkg, "dist", "index.d.ts"),
    }),
    {}
  );
}

export function getPackageExports(
  minGrafanaVersion: string
): Record<string, ExportInfo> {
  const tempDir = join(
    tmpdir(),
    `gf-eslint-plugin-compatible-${minGrafanaVersion}`
  );

  if (!existsSync(tempDir)) {
    downloadPackages(tempDir, minGrafanaVersion);
  }

  const packagePaths = getPackageExportPaths(tempDir);

  return Object.entries(packagePaths).reduce(
    (acc, [pkg, path]) => ({
      ...acc,
      [pkg]: getExportInfo(path),
    }),
    {}
  );
}
