import {readConfig} from '../services/storage'
import {groupTab} from './tab-group-manager'
export async function openServer(serverId:string,active=true){
  const config=await readConfig(),server=config.nodes.find(n=>n.id===serverId)
  if(!server||server.type!=='server')throw new Error('服务器配置不存在')
  const tab=await chrome.tabs.create({url:server.panelUrl,active})
  if(tab.id===undefined)throw new Error('未能创建标签页')
  if(config.settings.grouping)await groupTab(tab,server)
  const recent=((await chrome.storage.local.get('recent')).recent||{}) as Record<string,number>
  await chrome.storage.local.set({recent:{...recent,[serverId]:Date.now()}})
  return tab
}
