import type {Server} from '../types'
let lock:Promise<void>=Promise.resolve()
export async function groupTab(tab:chrome.tabs.Tab,server:Server){
  if(tab.id===undefined)return
  const key=`${tab.windowId}:${server.id}`
  const previous=lock
  const work=previous.catch(()=>{}).then(async()=>{
    const stored=await chrome.storage.session.get('groups'),groups=(stored.groups||{}) as Record<string,number>
    let groupId=groups[key]
    if(groupId!==undefined){try{const g=await chrome.tabGroups.get(groupId);if(g.windowId!==tab.windowId)groupId=undefined as unknown as number}catch{groupId=undefined as unknown as number}}
    let id:number
    try{id=await chrome.tabs.group({tabIds:[tab.id!],...(groupId===undefined?{}:{groupId})})}catch{id=await chrome.tabs.group({tabIds:[tab.id!]})}
    await chrome.tabGroups.update(id,{title:server.tabGroupTitle||server.name,color:server.color,collapsed:false})
    // Read again to preserve unrelated server mappings updated by concurrent jobs.
    const latest=((await chrome.storage.session.get('groups')).groups||{}) as Record<string,number>
    await chrome.storage.session.set({groups:{...latest,[key]:id}})
  })
  lock=work
  await work
}
