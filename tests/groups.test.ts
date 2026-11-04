import { it, expect, vi } from "vitest";
import type { Server } from "../src/types";
it("同名服务器独立分组，重新加载后复用仍存在的组，删除后重建", async () => {
  const registry: Record<string, unknown> = {};
  const groups = new Map<number, { id: number; windowId: number }>(),
    tabs = new Map<
      number,
      { id: number; windowId: number; groupId: number; url: string }
    >();
  let next = 10;
  const group = vi.fn(
    async ({ tabIds, groupId }: { tabIds: number[]; groupId?: number }) => {
      const id = groupId ?? next++;
      groups.set(id, { id, windowId: 1 });
      for (const t of tabIds)
        tabs.set(t, {
          id: t,
          windowId: 1,
          groupId: id,
          url: "https://example.com/home",
        });
      return id;
    },
  );
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: async () => ({ groupRegistry: structuredClone(registry) }),
        set: async ({ groupRegistry }: any) =>
          Object.assign(registry, groupRegistry),
      },
    },
    tabGroups: {
      get: async (id: number) => {
        if (!groups.has(id)) throw Error();
        return groups.get(id);
      },
      update: async () => {},
    },
    tabs: {
      group,
      query: async ({ groupId }: any) =>
        [...tabs.values()].filter((t) => t.groupId === groupId),
    },
  });
  const s = {
    id: "s",
    name: "same",
    panelUrl: "https://example.com/entry",
    color: "green",
    tabGroupTitle: "",
  } as Server;
  let { groupTab } = await import("../src/background/tab-group-manager");
  await groupTab({ id: 1, windowId: 1 } as chrome.tabs.Tab, s);
  await groupTab({ id: 2, windowId: 1 } as chrome.tabs.Tab, {
    ...s,
    id: "other",
  });
  expect(group.mock.results).toHaveLength(2);
  expect(tabs.get(1)!.groupId).not.toBe(tabs.get(2)!.groupId);
  vi.resetModules();
  ({ groupTab } = await import("../src/background/tab-group-manager"));
  await groupTab({ id: 3, windowId: 1 } as chrome.tabs.Tab, s);
  expect(tabs.get(3)!.groupId).toBe(tabs.get(1)!.groupId);
  groups.delete(tabs.get(1)!.groupId);
  await groupTab({ id: 4, windowId: 1 } as chrome.tabs.Tab, s);
  expect(tabs.get(4)!.groupId).not.toBe(tabs.get(1)!.groupId);
  vi.unstubAllGlobals();
});
