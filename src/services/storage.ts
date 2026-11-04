import { emptyConfig, type Config } from '../types'
export const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id
export async function readConfig():Promise<Config> {
  const raw=isExtension?(await chrome.storage.local.get('config')).config:JSON.parse(localStorage.getItem('btpanelhub')||'null')
  return raw ? {...emptyConfig(),...raw,settings:{...emptyConfig().settings,...raw.settings}} : emptyConfig()
}
export async function writeConfig(config:Config){
  if(isExtension) await chrome.storage.local.set({config})
  else localStorage.setItem('btpanelhub',JSON.stringify(config))
}
