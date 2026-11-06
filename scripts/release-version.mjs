import { readFileSync } from "node:fs";

export function validateVersion(version) {
  if (
    typeof version !== "string" ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) ||
    version.split(".").some((v) => Number(v) > 65535) ||
    version === "0.0.0"
  ) {
    throw new Error(
      "版本必须为 Chrome 支持的正式三段版本号，例如 0.1.1（每段 0–65535，不能全为 0）",
    );
  }
  return version;
}

export function assertVersions(pkg, lock, manifest, tag = "") {
  const version = validateVersion(pkg.version);
  if (
    manifest.version !== version ||
    lock.version !== version ||
    lock.packages?.[""]?.version !== version
  ) {
    throw new Error(
      "package.json、package-lock.json 与 manifest.json 版本不一致，请使用 npm version 升版",
    );
  }
  if (tag && tag !== `v${version}`)
    throw new Error(`标签 ${tag} 与项目版本 v${version} 不一致`);
  return version;
}

export function readReleaseVersion(root, tag = "") {
  const read = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
  return assertVersions(
    read("package.json"),
    read("package-lock.json"),
    read("public/manifest.json"),
    tag,
  );
}
