import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = fileURLToPath(
  new URL("../release/BTPanelHub-0.1.0.zip", import.meta.url),
);
mkdirSync(`${root}release`, { recursive: true });
rmSync(output, { force: true });
execFileSync("zip", ["-qr", output, ...readdirSync(`${root}dist`)], {
  cwd: `${root}dist`,
});
console.log(output);
