import type { Server, OpenTask } from "../types";
interface GroupRecord {
  groupId: number;
  tabIds: number[];
}
let lock: Promise<void> = Promise.resolve();
export async function groupTab(tab: chrome.tabs.Tab, server: Server) {
  if (tab.id === undefined) return;
  const key = `${tab.windowId}:${server.id}`;
  const work = lock
    .catch(() => {})
    .then(async () => {
      const registry = ((await chrome.storage.local.get("groupRegistry"))
        .groupRegistry || {}) as Record<string, GroupRecord>;
      let record = registry[key];
      if (!record) {
        const tasks = ((await chrome.storage.local.get("tasks")).tasks ||
          []) as OpenTask[];
        const candidates = tasks
          .flatMap((t) => t.items)
          .filter(
            (i) =>
              i.serverId === server.id &&
              i.tabId !== undefined &&
              i.tabId !== tab.id,
          )
          .reverse();
        for (const item of candidates) {
          try {
            const previous = await chrome.tabs.get(item.tabId!);
            if (
              previous.windowId === tab.windowId &&
              previous.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE &&
              previous.url &&
              new URL(previous.url).origin === new URL(server.panelUrl).origin
            ) {
              record = { groupId: previous.groupId, tabIds: [previous.id!] };
              break;
            }
          } catch {
            /* Old task tabs may already be closed. */
          }
        }
      }
      let groupId: number | undefined;
      if (record) {
        try {
          const group = await chrome.tabGroups.get(record.groupId);
          const tabs = await chrome.tabs.query({ groupId: record.groupId });
          const origin = new URL(server.panelUrl).origin;
          if (
            group.windowId === tab.windowId &&
            tabs.some(
              (t) =>
                t.id !== undefined &&
                record.tabIds.includes(t.id) &&
                t.url &&
                new URL(t.url).origin === origin,
            )
          )
            groupId = record.groupId;
        } catch {
          /* Removed or restored groups must be created again. */
        }
      }
      let id: number;
      try {
        id = await chrome.tabs.group({
          tabIds: [tab.id!],
          ...(groupId === undefined ? {} : { groupId }),
        });
      } catch {
        id = await chrome.tabs.group({ tabIds: [tab.id!] });
      }
      await chrome.tabGroups.update(id, {
        title: server.tabGroupTitle || server.name,
        color: server.color,
        collapsed: false,
      });
      const grouped = await chrome.tabs.query({ groupId: id });
      registry[key] = {
        groupId: id,
        tabIds: grouped.flatMap((t) => (t.id === undefined ? [] : [t.id])),
      };
      await chrome.storage.local.set({ groupRegistry: registry });
    });
  lock = work;
  await work;
}
