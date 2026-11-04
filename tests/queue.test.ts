import { beforeEach, it, expect, vi } from "vitest";
import { emptyConfig, type OpenTask } from "../src/types";
const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  login: vi.fn(),
  config: vi.fn(),
}));
vi.mock("../src/background/open-server", () => ({ openServer: mocks.open }));
vi.mock("../src/background/login-runner", () => ({ runLogin: mocks.login }));
vi.mock("../src/services/storage", () => ({ readConfig: mocks.config }));
import {
  enqueue,
  cancelTask,
  remainingItems,
  recover,
} from "../src/background/open-queue";
let data: { tasks: OpenTask[] };
let resolveLogin: ((value: { status: string }) => void)[] = [];
beforeEach(() => {
  data = { tasks: [] };
  resolveLogin = [];
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async () => structuredClone(data)),
        set: vi.fn(async (v) => {
          data = structuredClone({ ...data, ...v });
        }),
      },
    },
  });
  const c = emptyConfig();
  c.settings.concurrency = 1;
  c.nodes = ["a", "b", "c"].map(
    (id) => ({ id, type: "server", name: id }) as never,
  );
  mocks.config.mockResolvedValue(c);
  mocks.open.mockImplementation(async (_id, _active, cb) => {
    const t = { id: 42 };
    await cb(t);
    return t;
  });
  mocks.login.mockImplementation(
    () => new Promise((r) => resolveLogin.push(r)),
  );
});
it("按全局并发调度，取消只影响尚未开始的项目", async () => {
  const id = await enqueue(["a", "b", "c"], "batch");
  await vi.waitFor(() => expect(resolveLogin).toHaveLength(1));
  expect(data.tasks[0].items.map((i) => i.status)).toEqual([
    "waiting_page",
    "queued",
    "queued",
  ]);
  await cancelTask(id);
  expect(data.tasks[0].items.map((i) => i.status)).toEqual([
    "waiting_page",
    "cancelled",
    "cancelled",
  ]);
  resolveLogin[0]({ status: "success" });
  await vi.waitFor(() => expect(data.tasks[0].items[0].status).toBe("success"));
  expect(mocks.open).toHaveBeenCalledTimes(1);
});
it("恢复时不再次创建未确认的标签或重复提交", async () => {
  mocks.open.mockClear();
  data.tasks = [
    {
      id: "t",
      name: "t",
      createdAt: 0,
      updatedAt: 0,
      cancelled: false,
      items: [
        {
          id: "i",
          serverId: "a",
          name: "a",
          status: "creating_tab",
          startedAt: Date.now(),
        },
        {
          id: "j",
          serverId: "b",
          name: "b",
          status: "injecting",
          tabId: 3,
          startedAt: Date.now(),
        },
      ],
    },
  ];
  await recover();
  expect(data.tasks[0].items.map((i) => i.status)).toEqual([
    "failed",
    "needs_user_action",
  ]);
  expect(mocks.open).not.toHaveBeenCalled();
});
it("并发名额跨任务计算", () => {
  const t = {
    items: [
      { status: "waiting_page" },
      { status: "queued" },
      { status: "queued" },
    ],
  } as OpenTask;
  expect(remainingItems([t], 1)).toHaveLength(0);
  expect(remainingItems([t], 3)).toHaveLength(2);
});
