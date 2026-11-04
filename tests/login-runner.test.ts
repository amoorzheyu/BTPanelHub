import { it, expect, vi, afterEach } from "vitest";
import { emptyConfig, type Server } from "../src/types";
const mocks = vi.hoisted(() => ({ config: vi.fn() }));
vi.mock("../src/services/storage", () => ({
  readConfig: mocks.config,
  isExtension: true,
}));
import { runLogin } from "../src/background/login-runner";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function setup(url = "http://example.com/entry") {
  const c = emptyConfig();
  c.nodes = [
    {
      id: "s",
      type: "server",
      panelUrl: "http://example.com/entry",
      autoLogin: true,
      username: "u",
      passwordRef: "s",
    } as Server,
  ];
  c.credentials.s = "test-only";
  mocks.config.mockResolvedValue(c);
  const execute = vi.fn(async ({ args }) => {
    if (args.some((a: unknown) => a === undefined))
      throw new Error("Value is unserializable");
    const status =
      args[0] === "fill"
        ? "filled"
        : args[0] === "submit"
          ? "submitting"
          : execute.mock.calls.length === 1
            ? "login"
            : "success";
    return [{ result: { status } }];
  });
  const permission = vi.fn(async () => true);
  vi.stubGlobal("chrome", {
    permissions: { contains: permission },
    tabs: { get: vi.fn(async () => ({ status: "complete", url })) },
    scripting: { executeScript: execute },
  });
  return { execute, permission };
}
it("登录填充和提交跨脚本边界成功，提交后再验证结果", async () => {
  vi.useFakeTimers();
  const { execute } = setup();
  const promise = runLogin(1, "s");
  await vi.runAllTimersAsync();
  expect((await promise).status).toBe("success");
  expect(execute.mock.calls.map((c) => c[0].args[0])).toEqual([
    "inspect",
    "fill",
    "submit",
    "inspect",
  ]);
});
it("跨域跳转时不向页面注入凭据", async () => {
  const { execute } = setup("https://other.example/login");
  expect((await runLogin(1, "s")).status).toBe("needs_user_action");
  expect(execute).not.toHaveBeenCalled();
});
it("未授权的批量任务直接转为人工处理", async () => {
  const { execute, permission } = setup();
  permission.mockResolvedValue(false);
  expect((await runLogin(1, "s")).reason).toContain("权限");
  expect(execute).not.toHaveBeenCalled();
});

it("等待已登录页面完成异步渲染，不向空壳页面填充", async () => {
  vi.useFakeTimers();
  const { execute } = setup();
  execute.mockResolvedValueOnce([{ result: { status: "needs_user_action" } }]);
  execute.mockResolvedValueOnce([{ result: { status: "success" } }]);
  const result = runLogin(1, "s");
  await vi.runAllTimersAsync();
  expect((await result).status).toBe("success");
  expect(execute.mock.calls.map((c) => c[0].args[0])).toEqual([
    "inspect",
    "inspect",
  ]);
});
