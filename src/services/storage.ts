import { emptyConfig, type Config } from "../types";
export const isExtension =
  typeof chrome !== "undefined" && !!chrome.runtime?.id;
export async function readConfig(): Promise<Config> {
  const stored = isExtension
    ? await chrome.storage.local.get(["config", "recent"])
    : null;
  const raw = stored
    ? stored.config
    : JSON.parse(localStorage.getItem("btpanelhub") || "null");
  return raw
    ? {
        ...emptyConfig(),
        ...raw,
        ...(stored ? { recent: stored.recent || {} } : {}),
        settings: { ...emptyConfig().settings, ...raw.settings },
      }
    : emptyConfig();
}
export async function writeConfig(config: Config) {
  if (isExtension)
    await chrome.storage.local.set({ config: { ...config, recent: {} } });
  else localStorage.setItem("btpanelhub", JSON.stringify(config));
}
