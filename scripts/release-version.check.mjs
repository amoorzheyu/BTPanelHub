import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  cpSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { assertVersions, validateVersion } from "./release-version.mjs";
const metadata = (version) => [
  { version },
  { version, packages: { "": { version } } },
  { version },
];
test("正式版本的标签与全部元数据必须一致", () => {
  assert.equal(assertVersions(...metadata("1.2.3"), "v1.2.3"), "1.2.3");
  assert.throws(() => assertVersions(...metadata("1.2.3"), "v1.2.4"), /标签/);
  const [pkg, lock] = metadata("1.2.3");
  assert.throws(
    () => assertVersions(pkg, lock, { version: "1.2.2" }),
    /不一致/,
  );
  assert.throws(
    () =>
      assertVersions(
        pkg,
        { version: "1.2.3", packages: { "": { version: "1.2.2" } } },
        { version: "1.2.3" },
      ),
    /不一致/,
  );
});
test("拒绝无法写入 Chrome manifest 的版本", () => {
  for (const v of [
    "0.0.0",
    "01.2.3",
    "1.2",
    "1.2.3-beta.1",
    "1.2.65536",
    "v1.2.3",
    "1.2.3/../bad",
  ])
    assert.throws(() => validateVersion(v));
});
test("npm version hook 将 manifest 一并写入版本提交与标签", () => {
  const root = mkdtempSync(join(tmpdir(), "btpanelhub-version-"));
  try {
    mkdirSync(join(root, "public"));
    cpSync(new URL("./", import.meta.url), join(root, "scripts"), {
      recursive: true,
    });
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        name: "version-fixture",
        version: "0.1.0",
        private: true,
        type: "module",
        scripts: {
          version:
            "node scripts/sync-version.mjs && git add public/manifest.json",
        },
      }),
    );
    writeFileSync(
      join(root, "package-lock.json"),
      JSON.stringify({
        name: "version-fixture",
        version: "0.1.0",
        lockfileVersion: 3,
        packages: { "": { name: "version-fixture", version: "0.1.0" } },
      }),
    );
    writeFileSync(
      join(root, "public/manifest.json"),
      JSON.stringify({
        manifest_version: 3,
        name: "fixture",
        version: "0.1.0",
      }),
    );
    const git = (args) =>
      execFileSync("git", args, { cwd: root, stdio: "pipe" }).toString().trim();
    git(["init"]);
    git(["config", "user.name", "Release Test"]);
    git(["config", "user.email", "release@example.com"]);
    git(["add", "."]);
    git(["commit", "-m", "fixture"]);
    execFileSync("npm", ["version", "patch", "-m", "chore: 发布版本 %s"], {
      cwd: root,
      stdio: "pipe",
    });
    assert.equal(
      JSON.parse(readFileSync(join(root, "public/manifest.json"))).version,
      "0.1.1",
    );
    assert.equal(git(["status", "--porcelain"]), "");
    assert.equal(
      JSON.parse(git(["show", "v0.1.1:public/manifest.json"])).version,
      "0.1.1",
    );
    assert.equal(
      JSON.parse(git(["show", "v0.1.1:package-lock.json"])).packages[""]
        .version,
      "0.1.1",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
