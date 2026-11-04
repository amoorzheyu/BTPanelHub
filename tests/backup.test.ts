import { it, expect } from "vitest";
import {
  backup,
  parseBackup,
  mergeBackup,
} from "../src/services/export-import";
import { emptyConfig, type Server } from "../src/types";
function sample() {
  const c = emptyConfig();
  c.nodes = [
    {
      id: "s",
      type: "server",
      name: "test",
      parentId: null,
      sortOrder: 0,
      createdAt: 0,
      updatedAt: 0,
      panelUrl: "https://example.com/secret",
      username: "u",
      passwordRef: "s",
      color: "green",
      favorite: false,
      autoLogin: true,
      note: "",
      tabGroupTitle: "",
    } as Server,
  ];
  c.credentials.s = "secret";
  return c;
}
it("默认导出不含密码，完整导出可恢复", () => {
  const c = sample();
  expect(JSON.parse(backup(c)).credentials).toEqual({});
  expect(parseBackup(JSON.parse(backup(c, false))).credentials.s).toBe(
    "secret",
  );
});
it("脱敏备份合并保留已保存的密码", () => {
  const c = sample(),
    incoming = parseBackup(JSON.parse(backup(c)));
  incoming.nodes[0].name = "changed";
  const merged = mergeBackup(c, incoming);
  expect(merged.credentials.s).toBe("secret");
  expect(merged.nodes[0].name).toBe("changed");
});
it("拒绝重复 ID、孤儿节点、循环目录和恶意协议", () => {
  const c = sample();
  expect(() => parseBackup({ ...c, nodes: [...c.nodes, ...c.nodes] })).toThrow(
    "重复",
  );
  expect(() =>
    parseBackup({ ...c, nodes: [{ ...c.nodes[0], parentId: "missing" }] }),
  ).toThrow("父目录");
  expect(() =>
    parseBackup({
      ...c,
      nodes: [{ ...c.nodes[0], type: "folder", parentId: "s" }],
    }),
  ).toThrow("循环");
  expect(() =>
    parseBackup({
      ...c,
      nodes: [{ ...c.nodes[0], panelUrl: "javascript:alert(1)" }],
    }),
  ).toThrow();
});
it("拒绝多个服务器共享凭据引用", () => {
  const c = sample();
  expect(() =>
    parseBackup({ ...c, nodes: [c.nodes[0], { ...c.nodes[0], id: "other" }] }),
  ).toThrow("凭据引用");
});
