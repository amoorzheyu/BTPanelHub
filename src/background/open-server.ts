import {readConfig} from '../services/storage'
import {groupTab} from './tab-group-manager'
let recentLock:Promise<unknown>=Promise.resolve()
export async function openServer(serverId:string,active=true,onCreated?:(tab:chrome.tabs.Tab)=>Promise<void>){
  const config=await readConfig(),server=config.nodes.find(n=>n.id===serverId)
  if(!server||server.type!=='server')throw new Error('服务器配置不存在')
  const tab=await chrome.tabs.create({url:server.panelUrl,active})
  if(tab.id===undefined)throw new Error('未能创建标签页')
  await onCreated?.(tab)
  if(config.settings.grouping)await groupTab(tab,server)
  const update=recentLock.catch(()=>{}).then(async()=>{const recent=((await chrome.storage.local.get('recent')).recent||{}) as Record<string,number>;await chrome.storage.local.set({recent:{...recent,[serverId]:Date.now()}})});recentLock=update;await update
  return tab
}
