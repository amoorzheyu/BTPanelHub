import {enqueue,cancelTask,retryTask,recover,onTabUpdated,onTabRemoved} from './open-queue'
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.id!==chrome.runtime.id||!sender.url?.startsWith(chrome.runtime.getURL('')))return
 ready.then(async()=>{
  if(message?.type==='open'&&typeof message.serverId==='string')return enqueue([message.serverId],'打开面板',true)
  if(message?.type==='batch'&&Array.isArray(message.serverIds)&&message.serverIds.every((id:unknown)=>typeof id==='string'))return enqueue(message.serverIds,String(message.name||'批量打开'))
  if(message?.type==='cancel'&&typeof message.taskId==='string')return cancelTask(message.taskId)
  if(message?.type==='retry'&&typeof message.taskId==='string')return retryTask(message.taskId,message.itemId)
  throw new Error('不支持的操作')
 }).then(data=>respond({ok:true,data})).catch(e=>respond({ok:false,error:e instanceof Error?e.message:'后台操作失败'}))
 return true
})
chrome.tabs.onUpdated.addListener((id,change)=>{if(change.status==='complete')void ready.then(()=>onTabUpdated(id))})
chrome.tabs.onRemoved.addListener(id=>{void ready.then(()=>onTabRemoved(id))})
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='queue-recovery')void ready.then(recover)})
chrome.runtime.onInstalled.addListener(()=>{void chrome.alarms.create('queue-recovery',{periodInMinutes:.5})})
chrome.runtime.onStartup.addListener(()=>{void chrome.alarms.create('queue-recovery',{periodInMinutes:.5})})
const ready=(async()=>{await chrome.alarms.create('queue-recovery',{periodInMinutes:.5});await recover()})()
