// @vitest-environment jsdom
import { it, expect, vi, afterEach, beforeEach } from "vitest";
import { isExpiredPanelPage } from "../src/content/session-expiry";
beforeEach(() => {
  document.title = "";
});
afterEach(() => vi.restoreAllMocks());
function page(html: string) {
  document.body.innerHTML = html;
  vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([
    {},
  ] as unknown as DOMRectList);
}
it("识别示例中的最小 nginx 404 页面", () => {
  page("<center><h1>404 Not Found</h1></center><hr><center>nginx</center>");
  expect(isExpiredPanelPage()).toBe(true);
});
it("面板内部错误、登录表单和业务页面不能触发入口恢复", () => {
  for (const html of [
    "<h1>404 Not Found</h1><nav>nginx</nav>",
    '<h1>404 Not Found</h1><input name="password">nginx',
    "<h1>404 Not Found</h1>nginx 网站不存在",
    "<h1>403 Forbidden</h1>nginx",
  ]) {
    page(html);
    expect(isExpiredPanelPage()).toBe(false);
    vi.restoreAllMocks();
  }
});

const warning =
  "<h1>请使用正确的入口登录面板</h1><p>错误原因：当前已经开启了安全入口登录</p><p>1.查看面板入口：<code>/etc/init.d/bt default</code></p>";
it("识别真实 /login 安全入口校验失败页", () => {
  document.title = "安全入口校验失败";
  page(warning);
  expect(isExpiredPanelPage()).toBe(true);
});
it("仅提到安全入口的普通页面不触发恢复", () => {
  document.title = "面板使用说明";
  page(warning);
  expect(isExpiredPanelPage()).toBe(false);
});
it("可输入凭据的正常登录页不被入口恢复打断", () => {
  document.title = "安全入口校验失败";
  page(
    warning +
      '<form><input name="username"><input name="password" type="password"><button>登录</button></form>',
  );
  expect(isExpiredPanelPage()).toBe(false);
});
