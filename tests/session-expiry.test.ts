// @vitest-environment jsdom
import { it, expect, vi, afterEach } from "vitest";
import { isExpiredPanelPage } from "../src/content/session-expiry";
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
