export function validateUrl(input: string) {
  const u = new URL(input);
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password)
    throw new Error("请输入有效的 HTTP 或 HTTPS 入口地址");
  return u.href;
}
