import type { Server, TreeNode, OpenTask } from "../types";
import { readConfig } from "../services/storage";
import { originPattern } from "../services/permission-service";
import { isExpiredPanelPage } from "../content/session-expiry";
import { runLogin, type LoginResult } from "./login-runner";
import { recordRecoveryResult } from "./open-queue";

interface Attempt {
  serverId: string;
  entryUrl: string;
  attemptedAt: number;
  phase: "redirecting" | "login" | "done";
}
const inflight = new Set<number>();
const cooldown = 2 * 60_000;
const key = (tabId: number) => `sessionRecovery:${tabId}`;

export function selectRecoveryServer(
  nodes: TreeNode[],
  pageUrl: string,
  preferredId?: string,
): Server | undefined {
  let page: URL;
  try {
    page = new URL(pageUrl);
  } catch {
    return;
  }
  if (!["http:", "https:"].includes(page.protocol)) return;
  const candidates = nodes.filter((n): n is Server => {
    if (n.type !== "server") return false;
    try {
      const entry = new URL(n.panelUrl);
      return (
        entry.origin === page.origin &&
        (entry.pathname !== "/" || !!entry.search)
      );
    } catch {
      return false;
    }
  });
  return (
    candidates.find((s) => s.id === preferredId) ||
    (candidates.length === 1 ? candidates[0] : undefined)
  );
}
function sameDocument(a: string, b: string) {
  const left = new URL(a),
    right = new URL(b);
  left.hash = "";
  right.hash = "";
  return left.href === right.href;
}
async function readAttempt(tabId: number): Promise<Attempt | undefined> {
  return (await chrome.storage.session.get(key(tabId)))[key(tabId)] as
    Attempt | undefined;
}
async function saveAttempt(tabId: number, attempt: Attempt) {
  await chrome.storage.session.set({ [key(tabId)]: attempt });
}
async function preferredServer(
  tab: chrome.tabs.Tab,
): Promise<string | undefined> {
  const data = await chrome.storage.local.get(["groupRegistry", "tasks"]);
  const registry = (data.groupRegistry || {}) as Record<
    string,
    { groupId: number; tabIds: number[] }
  >;
  for (const [name, record] of Object.entries(registry)) {
    if (
      name.startsWith(`${tab.windowId}:`) &&
      tab.groupId !== -1 &&
      record.groupId === tab.groupId &&
      record.tabIds.includes(tab.id!)
    )
      return name.slice(name.indexOf(":") + 1);
  }
  const tasks = (data.tasks || []) as OpenTask[];
  return tasks
    .flatMap((t) => t.items)
    .reverse()
    .find((i) => i.tabId === tab.id)?.serverId;
}

/** Inspect only saved, authorized panel origins, and recover in the same tab. */
export async function checkSession(tabId: number) {
  if (inflight.has(tabId)) return;
  inflight.add(tabId);
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status !== "complete" || !tab.url || !/^https?:/.test(tab.url))
      return;
    const config = await readConfig();
    const attempt = await readAttempt(tabId);
    const preferred =
      attempt && attempt.phase !== "done"
        ? attempt.serverId
        : await preferredServer(tab);
    const server = selectRecoveryServer(config.nodes, tab.url, preferred);
    if (!server) return;
    if (
      !(await chrome.permissions.contains({
        origins: [originPattern(server.panelUrl)],
      }))
    )
      return;

    if (
      attempt &&
      attempt.serverId === server.id &&
      attempt.entryUrl === server.panelUrl &&
      attempt.phase !== "done"
    ) {
      if (Date.now() - attempt.attemptedAt > 90_000) {
        await saveAttempt(tabId, { ...attempt, phase: "done" });
        await recordRecoveryResult(server, tabId, {
          status: "needs_user_action",
          reason: "安全入口恢复超时，请检查当前面板页面",
        });
        return;
      }
      // Persist before injection. After worker interruption, inspect only;
      // never automatically repeat a possibly submitted login request.
      await saveAttempt(tabId, { ...attempt, phase: "login" });
      let result: LoginResult;
      try {
        result = await runLogin(
          tabId,
          server.id,
          async () => {},
          attempt.phase === "login",
        );
      } catch {
        result = {
          status: "needs_user_action",
          reason: "无法完成登录恢复，请检查面板页面",
        };
      }
      await saveAttempt(tabId, { ...attempt, phase: "done" });
      await recordRecoveryResult(server, tabId, result);
      return;
    }
    if (sameDocument(tab.url, server.panelUrl)) return;
    if (attempt && Date.now() - attempt.attemptedAt < cooldown) return;
    const result = await chrome.scripting.executeScript({
      target: { tabId },
      func: isExpiredPanelPage,
    });
    if (result[0]?.result !== true) return;
    // Recheck after asynchronous inspection so a user navigation is not overwritten.
    const latest = await chrome.tabs.get(tabId);
    if (latest.status !== "complete" || latest.url !== tab.url) return;
    await saveAttempt(tabId, {
      serverId: server.id,
      entryUrl: server.panelUrl,
      attemptedAt: Date.now(),
      phase: "redirecting",
    });
    try {
      await chrome.tabs.update(tabId, { url: server.panelUrl });
    } catch {
      const saved = await readAttempt(tabId);
      if (saved) await saveAttempt(tabId, { ...saved, phase: "done" });
      await recordRecoveryResult(server, tabId, {
        status: "failed",
        reason: "无法返回安全入口，标签可能已关闭",
      });
    }
  } catch {
    // Closed/restricted tabs and revoked permissions are normal browser events.
  } finally {
    inflight.delete(tabId);
  }
}
export async function forgetSession(tabId: number) {
  await chrome.storage.session.remove(key(tabId));
}
export async function scanSessions() {
  const config = await readConfig();
  const origins = new Set(
    config.nodes
      .filter((n): n is Server => n.type === "server")
      .map((n) => new URL(n.panelUrl).origin),
  );
  const tabs = await chrome.tabs.query({ status: "complete" });
  for (const tab of tabs) {
    if (tab.id === undefined || !tab.url) continue;
    try {
      if (origins.has(new URL(tab.url).origin)) void checkSession(tab.id);
    } catch {
      /* Non-web tabs. */
    }
  }
}
