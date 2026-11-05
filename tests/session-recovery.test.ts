import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { emptyConfig, type Server } from "../src/types";
const mocks = vi.hoisted(() => ({
  config: vi.fn(),
  login: vi.fn(),
  record: vi.fn(),
}));
vi.mock("../src/services/storage", () => ({
  readConfig: mocks.config,
  isExtension: true,
}));
vi.mock("../src/background/login-runner", () => ({ runLogin: mocks.login }));
vi.mock("../src/background/open-queue", () => ({
  recordRecoveryResult: mocks.record,
}));
import {
  checkSession,
  selectRecoveryServer,
} from "../src/background/session-recovery";
let session: Record<string, unknown>;
let tab: chrome.tabs.Tab;
let inspect: ReturnType<typeof vi.fn>,
  update: ReturnType<typeof vi.fn>,
  permission: ReturnType<typeof vi.fn>;
const server = {
  id: "s",
  type: "server",
  name: "Panel",
  panelUrl: "http://example.com:8888/secure-entry",
  autoLogin: true,
} as Server;
beforeEach(() => {
  vi.clearAllMocks();
  session = {};
  tab = {
    id: 7,
    url: "http://example.com:8888/site/nginx",
    windowId: 1,
    groupId: -1,
    status: "complete",
  } as chrome.tabs.Tab;
  const c = emptyConfig();
  c.nodes = [server];
  mocks.config.mockResolvedValue(c);
  mocks.login.mockResolvedValue({ status: "success" });
  mocks.record.mockResolvedValue(undefined);
  inspect = vi.fn(async () => [{ result: true }]);
  permission = vi.fn(async () => true);
  update = vi.fn(async (_id: number, changes: { url: string }) => {
    tab = { ...tab, url: changes.url, status: "loading" };
    return tab;
  });
  vi.stubGlobal("chrome", {
    permissions: { contains: permission },
    tabs: {
      get: vi.fn(async () => ({ ...tab })),
      update,
      query: vi.fn(async () => [tab]),
    },
    scripting: { executeScript: inspect },
    storage: {
      session: {
        get: vi.fn(async (key: string) => ({ [key]: session[key] })),
        set: vi.fn(async (data) =>
          Object.assign(session, structuredClone(data)),
        ),
        remove: vi.fn(async (key: string) => {
          delete session[key];
        }),
      },
      local: { get: vi.fn(async () => ({})) },
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
it("精确匹配协议主机端口，多个入口不猜测账号", () => {
  expect(selectRecoveryServer([server], "http://example.com:8888/site")).toBe(
    server,
  );
  expect(
    selectRecoveryServer([server], "http://example.com:9999/site"),
  ).toBeUndefined();
  expect(
    selectRecoveryServer([server], "https://example.com:8888/site"),
  ).toBeUndefined();
  const other = {
    ...server,
    id: "other",
    panelUrl: "http://example.com:8888/other-entry",
  };
  expect(selectRecoveryServer([server, other], tab.url!)).toBeUndefined();
  expect(selectRecoveryServer([server, other], tab.url!, "other")).toBe(other);
});
it("nginx 404 在原标签恢复保存的完整入口，随后按原有登录流程处理", async () => {
  await checkSession(7);
  expect(update).toHaveBeenCalledWith(7, { url: server.panelUrl });
  expect(mocks.login).not.toHaveBeenCalled();
  tab.status = "complete";
  await checkSession(7);
  expect(mocks.login).toHaveBeenCalledWith(7, "s", expect.any(Function), false);
  expect(mocks.record).toHaveBeenCalledWith(server, 7, { status: "success" });
  expect(update).toHaveBeenCalledTimes(1);
});
it("正常页面、未授权站点和安全入口自身不跳转", async () => {
  inspect.mockResolvedValue([{ result: false }]);
  await checkSession(7);
  expect(update).not.toHaveBeenCalled();
  permission.mockResolvedValue(false);
  inspect.mockClear();
  await checkSession(7);
  expect(inspect).not.toHaveBeenCalled();
  permission.mockResolvedValue(true);
  tab.url = server.panelUrl;
  await checkSession(7);
  expect(update).not.toHaveBeenCalled();
});
it("重复事件和返回后再次 404 不会形成跳转循环", async () => {
  await Promise.all([checkSession(7), checkSession(7)]);
  expect(update).toHaveBeenCalledTimes(1);
  tab.status = "complete";
  mocks.login.mockResolvedValue({
    status: "needs_user_action",
    reason: "验证码",
  });
  await checkSession(7);
  tab.url = "http://example.com:8888/site/nginx";
  await checkSession(7);
  expect(update).toHaveBeenCalledTimes(1);
});
it("恢复期间后台重启仅检查登录结果，不重复提交", async () => {
  session["sessionRecovery:7"] = {
    serverId: "s",
    entryUrl: server.panelUrl,
    attemptedAt: Date.now(),
    phase: "login",
  };
  tab.url = server.panelUrl;
  await checkSession(7);
  expect(mocks.login).toHaveBeenCalledWith(7, "s", expect.any(Function), true);
});
it("检测期间用户离开错误页时不覆盖用户导航", async () => {
  inspect.mockImplementation(async () => {
    tab.url = "http://example.com:8888/files";
    return [{ result: true }];
  });
  await checkSession(7);
  expect(update).not.toHaveBeenCalled();
});
