/** Runs in the authorized page. Never reads or receives credentials. */
export function isExpiredPanelPage(): boolean {
  const heading = document.querySelector("h1");
  if (!heading || heading.getClientRects().length === 0) return false;
  if (heading.textContent?.trim() !== "404 Not Found") return false;
  // Match the minimal nginx error document, not a panel's own 404 view.
  if (document.querySelector("input,button,form,iframe,nav,a")) return false;
  const text = (document.body?.textContent || "").replace(/\s+/g, " ").trim();
  return /^404 Not Found\s*nginx(?:\/[\w.-]+)?(?: \([\w .-]+\))?$/i.test(text);
}
