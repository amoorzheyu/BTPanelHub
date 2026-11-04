import {
  colors,
  emptyConfig,
  defaults,
  type Config,
  type TreeNode,
} from "../types";
import { validateUrl } from "./validation";
function object(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("备份格式不正确");
  return v as Record<string, unknown>;
}
function text(v: unknown, max = 1000) {
  if (typeof v !== "string" || v.length > max)
    throw new Error("备份包含无效文本字段");
  return v;
}
function id(v: unknown) {
  const s = text(v, 100);
  if (
    !/^[\w-]+$/.test(s) ||
    ["__proto__", "constructor", "prototype"].includes(s)
  )
    throw new Error("备份包含无效 ID");
  return s;
}
export function parseBackup(raw: unknown): Config {
  const data = object(raw);
  if (
    data.version !== 1 ||
    !Array.isArray(data.nodes) ||
    data.nodes.length > 10000
  )
    throw new Error("不支持的备份版本或节点数量");
  const c = emptyConfig(),
    ids = new Set<string>(),
    credentials = object(data.credentials || {});
  c.nodes = data.nodes.map((value): TreeNode => {
    const n = object(value),
      key = id(n.id);
    if (ids.has(key)) throw new Error("备份包含重复 ID");
    ids.add(key);
    const name = text(n.name, 100).trim();
    if (!name) throw new Error("节点名称不能为空");
    const base = {
      id: key,
      name,
      parentId: n.parentId === null ? null : id(n.parentId),
      sortOrder:
        typeof n.sortOrder === "number" && Number.isFinite(n.sortOrder)
          ? n.sortOrder
          : 0,
      createdAt: typeof n.createdAt === "number" ? n.createdAt : Date.now(),
      updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : Date.now(),
    };
    if (n.type === "folder") return { ...base, type: "folder" };
    if (n.type !== "server") throw new Error("备份包含未知节点类型");
    const ref = id(n.passwordRef),
      password = Object.hasOwn(credentials, ref)
        ? text(credentials[ref], 10000)
        : "";
    if (password) c.credentials[ref] = password;
    return {
      ...base,
      type: "server",
      panelUrl: validateUrl(text(n.panelUrl, 4000)),
      username: text(n.username, 1000),
      passwordRef: ref,
      note: text(n.note || "", 1000),
      color: colors.includes(n.color as never)
        ? (n.color as (typeof colors)[number])
        : "green",
      favorite: n.favorite === true,
      autoLogin: n.autoLogin === true,
      tabGroupTitle: text(n.tabGroupTitle || "", 100),
    };
  });
  const map = new Map(c.nodes.map((n) => [n.id, n]));
  const refs = new Set<string>();
  for (const n of c.nodes) {
    if (n.type === "server") {
      if (refs.has(n.passwordRef)) throw new Error("服务器不能共享凭据引用");
      refs.add(n.passwordRef);
    }
    const visited = new Set([n.id]);
    let p = n.parentId;
    while (p) {
      const parent = map.get(p);
      if (!parent || parent.type !== "folder")
        throw new Error("备份包含不存在的父目录");
      if (visited.has(p)) throw new Error("备份包含循环目录");
      visited.add(p);
      p = parent.parentId;
    }
  }
  const settings = object(data.settings || {});
  c.settings = {
    ...defaults,
    autoFill: settings.autoFill !== false,
    autoSubmit: settings.autoSubmit !== false,
    grouping: settings.grouping !== false,
    shortcuts: settings.shortcuts !== false,
    submitDelay: [0, 500, 1000, 2000, 5000].includes(
      Number(settings.submitDelay),
    )
      ? Number(settings.submitDelay)
      : 500,
    concurrency: [1, 3, 5].includes(Number(settings.concurrency))
      ? (Number(settings.concurrency) as 1 | 3 | 5)
      : 3,
  };
  c.expanded = Array.isArray(data.expanded)
    ? data.expanded.filter(
        (x): x is string =>
          typeof x === "string" && map.get(x)?.type === "folder",
      )
    : [];
  const recent = object(data.recent || {});
  for (const n of c.nodes)
    if (n.type === "server" && typeof recent[n.id] === "number")
      c.recent[n.id] = recent[n.id] as number;
  return c;
}
export function backup(config: Config, excludePasswords = true) {
  return JSON.stringify(
    { ...config, credentials: excludePasswords ? {} : config.credentials },
    null,
    2,
  );
}
export function mergeBackup(current: Config, incoming: Config): Config {
  const nodes = new Map(current.nodes.map((n) => [n.id, n]));
  for (const n of incoming.nodes) nodes.set(n.id, n);
  const credentials = { ...current.credentials, ...incoming.credentials };
  for (const n of incoming.nodes)
    if (n.type === "server" && !incoming.credentials[n.passwordRef]) {
      const old = current.nodes.find(
        (x) => x.id === n.id && x.type === "server",
      );
      if (old?.type === "server" && current.credentials[old.passwordRef])
        credentials[n.passwordRef] = current.credentials[old.passwordRef];
    }
  return parseBackup({
    ...current,
    nodes: [...nodes.values()],
    credentials,
    recent: { ...current.recent, ...incoming.recent },
    expanded: [...new Set([...current.expanded, ...incoming.expanded])],
  });
}
