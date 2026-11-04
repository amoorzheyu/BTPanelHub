// @vitest-environment jsdom
import { beforeEach, describe, it, expect } from "vitest";
import {
  descendants,
  folderOptions,
  saveNode,
  removeNode,
  state,
  validateUrl,
} from "../src/services/repository";
import { emptyConfig, type Folder, type Server } from "../src/types";
const folder = (id: string, parentId: string | null = null): Folder => ({
  id,
  parentId,
  name: id,
  type: "folder",
  createdAt: 0,
  updatedAt: 0,
  sortOrder: 0,
});
const server = (id: string, parentId: string | null): Server => ({
  ...folder(id, parentId),
  type: "server",
  panelUrl: "http://example.com:8888/secret",
  username: "u",
  passwordRef: id,
  note: "",
  color: "green",
  favorite: false,
  autoLogin: false,
  tabGroupTitle: "",
});
beforeEach(() => {
  state.config = emptyConfig();
  localStorage.clear();
});
describe("目录与凭据", () => {
  it("递归收集并禁止循环移动", async () => {
    state.config.nodes = [folder("a"), folder("b", "a"), server("s", "b")];
    expect(descendants(state.config.nodes, "a")).toEqual(["b", "s"]);
    expect(folderOptions(state.config.nodes, "a")).toEqual([]);
    await expect(saveNode(folder("a", "b"))).rejects.toThrow("不能移动");
  });
  it("删除目录同时删除后代凭据和访问记录", async () => {
    state.config.nodes = [folder("a"), folder("b", "a"), server("s", "b")];
    state.config.credentials.s = "secret";
    state.config.recent.s = 1;
    await removeNode("a");
    expect(state.config.nodes).toEqual([]);
    expect(state.config.credentials).toEqual({});
    expect(state.config.recent).toEqual({});
  });
  it("保留安全入口且拒绝危险协议及内嵌凭据", () => {
    expect(validateUrl("http://example.com:8888/secret")).toBe(
      "http://example.com:8888/secret",
    );
    expect(() => validateUrl("javascript:alert(1)")).toThrow();
    expect(() => validateUrl("http://user:pass@example.com")).toThrow();
  });
});
