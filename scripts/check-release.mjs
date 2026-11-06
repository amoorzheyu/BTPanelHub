import { readReleaseVersion } from "./release-version.mjs";
const version = readReleaseVersion(
  new URL("../", import.meta.url),
  process.env.RELEASE_TAG || "",
);
console.log(`版本校验通过：v${version}`);
