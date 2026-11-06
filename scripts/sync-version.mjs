import { readFileSync, writeFileSync } from "node:fs";
import { validateVersion } from "./release-version.mjs";
const root = new URL("../", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
const target = new URL("public/manifest.json", root);
const manifest = JSON.parse(readFileSync(target, "utf8"));
manifest.version = validateVersion(pkg.version);
writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`扩展版本已同步：${manifest.version}`);
