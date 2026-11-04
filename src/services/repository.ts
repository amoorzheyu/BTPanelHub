import { reactive } from "vue";
import { emptyConfig, type TreeNode, type Server, type Config } from "../types";
import { readConfig, writeConfig, isExtension } from "./storage";
export const state = reactive({
  config: emptyConfig(),
  ready: false,
  error: "",
});
export async function load() {
  state.config = await readConfig();
  state.ready = true;
}
export async function persist() {
  await writeConfig(JSON.parse(JSON.stringify(state.config)));
}
export function descendants(nodes: TreeNode[], id: string): string[] {
  const result: string[] = [];
  const visit = (parent: string) => {
    for (const n of nodes.filter((n) => n.parentId === parent)) {
      result.push(n.id);
      visit(n.id);
    }
  };
  visit(id);
  return result;
}
export function folderOptions(nodes: TreeNode[], exclude?: string) {
  const blocked = exclude ? [exclude, ...descendants(nodes, exclude)] : [];
  const rows: { id: string; name: string }[] = [];
  const visit = (p: string | null, path: string) => {
    for (const n of nodes
      .filter((n) => n.type === "folder" && n.parentId === p)
      .sort((a, b) => a.sortOrder - b.sortOrder)) {
      if (blocked.includes(n.id)) continue;
      const name = path ? `${path} / ${n.name}` : n.name;
      rows.push({ id: n.id, name });
      visit(n.id, name);
    }
  };
  visit(null, "");
  return rows;
}
export { validateUrl } from "./validation";
import { validateUrl } from "./validation";
export async function saveNode(node: TreeNode, password?: string) {
  const c = state.config;
  if (!node.name.trim()) throw new Error("请填写名称");
  if (
    node.parentId &&
    !c.nodes.some((n) => n.id === node.parentId && n.type === "folder")
  )
    throw new Error("所属目录不存在");
  if (
    node.parentId &&
    [node.id, ...descendants(c.nodes, node.id)].includes(node.parentId)
  )
    throw new Error("不能移动到自身或子目录");
  node.name = node.name.trim();
  node.updatedAt = Date.now();
  if (node.type === "server") {
    node.panelUrl = validateUrl(node.panelUrl);
    if (!node.username.trim() || !password)
      throw new Error("请填写用户名和密码");
    c.credentials[node.passwordRef] = password;
  }
  const i = c.nodes.findIndex((n) => n.id === node.id);
  if (i < 0) c.nodes.push(node);
  else c.nodes[i] = node;
  let parent = node.parentId;
  while (parent) {
    if (!c.expanded.includes(parent)) c.expanded.push(parent);
    parent = c.nodes.find((n) => n.id === parent)?.parentId || null;
  }
  await persist();
}
export async function removeNode(id: string) {
  const ids = [id, ...descendants(state.config.nodes, id)];
  for (const n of state.config.nodes)
    if (ids.includes(n.id) && n.type === "server") {
      delete state.config.credentials[n.passwordRef];
      delete state.config.recent[n.id];
    }
  state.config.nodes = state.config.nodes.filter((n) => !ids.includes(n.id));
  state.config.expanded = state.config.expanded.filter(
    (id) => !ids.includes(id),
  );
  await persist();
}
export async function favorite(server: Server) {
  server.favorite = !server.favorite;
  await persist();
}
export async function toggleFolder(id: string) {
  const a = state.config.expanded;
  state.config.expanded = a.includes(id)
    ? a.filter((v) => v !== id)
    : [...a, id];
  await persist();
}
export async function replaceConfig(c: Config) {
  state.config = c;
  await persist();
}
if (isExtension)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (changes.config?.newValue)
      state.config = {
        ...(changes.config.newValue as Config),
        recent: state.config.recent,
      };
    if (changes.recent)
      state.config.recent = (changes.recent.newValue || {}) as Record<
        string,
        number
      >;
  });
