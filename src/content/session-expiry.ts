/** Runs in the authorized page. Never reads or receives credentials. */
export function isExpiredPanelPage(): boolean {
  const heading = document.querySelector("h1");
  if (!heading || heading.getClientRects().length === 0) return false;
  if (document.querySelector("input,form,iframe,nav")) return false;
  const title = document.title.trim();
  const headingText = heading.textContent?.replace(/\s+/g, "").trim();
  const text = (document.body?.textContent || "").replace(/\s+/g, " ").trim();

  // BT may send /login to its own entrance-check failure page instead of
  // nginx's minimal 404 document. Require the built-in title and heading,
  // plus the entrance-specific explanation; a normal login form never matches.
  if (
    title === "安全入口校验失败" &&
    headingText === "请使用正确的入口登录面板" &&
    text.includes("安全入口登录") &&
    text.includes("查看面板入口")
  )
    return true;

  // Match the minimal nginx error document, not a panel's own 404 view.
  if (heading.textContent?.trim() !== "404 Not Found") return false;
  if (document.querySelector("button,a")) return false;
  return /^404 Not Found\s*nginx(?:\/[\w.-]+)?(?: \([\w .-]+\))?$/i.test(text);
}
