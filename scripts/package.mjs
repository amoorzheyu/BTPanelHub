import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readReleaseVersion } from "./release-version.mjs";
import { readFileSync } from "node:fs";
const rootUrl = new URL("../", import.meta.url);
const version = readReleaseVersion(rootUrl);
const builtManifest = JSON.parse(
  readFileSync(new URL("dist/manifest.json", rootUrl), "utf8"),
);
if (builtManifest.version !== version)
  throw new Error("构建产物的扩展版本不正确");
const root = fileURLToPath(rootUrl);
const output = fileURLToPath(
  new URL(`release/BTPanelHub-${version}.zip`, rootUrl),
);
mkdirSync(`${root}release`, { recursive: true });
rmSync(output, { force: true });
execFileSync("zip", ["-qr", output, ...readdirSync(`${root}dist`)], {
  cwd: `${root}dist`,
});
console.log(output);
