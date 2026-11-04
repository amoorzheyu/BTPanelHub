import {terminal,type OpenTask,type TaskItem,type ItemStatus} from '../types'
import {readConfig} from '../services/storage'
import {openServer} from './open-server'
import {runLogin} from './login-runner'
let lock:Promise<unknown>=Promise.resolve()
const inflight=new Set<string>()
async function readTasks():Promise<OpenTask[]>{return ((await chrome.storage.local.get('tasks')).tasks||[]) as OpenTask[]}
function mutate<T>(fn:(tasks:OpenTask[])=>T|Promise<T>):Promise<T>{
 const work=lock.catch(()=>{}).then(async()=>{const tasks=await readTasks();const result=await fn(tasks);await chrome.storage.local.set({tasks});return result})
 lock=work;return work
}
async function patch(id:string,changes:Partial<TaskItem>){await mutate(tasks=>{for(const t of tasks){const item=t.items.find(i=>i.id===id);if(item&&!terminal.includes(item.status)){Object.assign(item,changes);t.updatedAt=Date.now()}}})}
export function remainingItems(tasks:OpenTask[],concurrency:number){const all=tasks.flatMap(t=>t.items);const count=all.filter(i=>!terminal.includes(i.status)&&i.status!=='queued').length;return all.filter(i=>i.status==='queued').slice(0,Math.max(0,concurrency-count))}
export async function enqueue(serverIds:string[],name:string,active=false){
 if(!serverIds.length)throw new Error('当前目录没有服务器')
 if(serverIds.length>1000)throw new Error('单次最多打开 1000 台服务器')
 const c=await readConfig(),nodes=serverIds.map(id=>c.nodes.find(n=>n.id===id&&n.type==='server'))
 if(nodes.some(n=>!n))throw new Error('服务器配置已变更，请重新选择')
 const task:OpenTask={id:crypto.randomUUID(),name:name.slice(0,100),createdAt:Date.now(),updatedAt:Date.now(),cancelled:false,items:[...new Set(serverIds)].map(id=>({id:crypto.randomUUID(),serverId:id,name:c.nodes.find(n=>n.id===id)!.name,status:'queued'}))}
 await mutate(tasks=>{const keep=tasks.filter(t=>t.items.some(i=>!terminal.includes(i.status)));const history=tasks.filter(t=>t.items.every(i=>terminal.includes(i.status))).slice(-29);tasks.splice(0,tasks.length,...history,...keep,task)})
 void pump(active?task.id:undefined)
 return task.id
}
export async function cancelTask(id:string){await mutate(tasks=>{const task=tasks.find(t=>t.id===id);if(!task)throw new Error('任务不存在');task.cancelled=true;task.updatedAt=Date.now();for(const i of task.items)if(i.status==='queued')i.status='cancelled'});void pump()}
export async function retryTask(taskId:string,itemId?:string){const t=(await readTasks()).find(t=>t.id===taskId);if(!t)throw new Error('任务不存在');const ids=t.items.filter(i=>(!itemId||i.id===itemId)&&['failed','needs_user_action'].includes(i.status)).map(i=>i.serverId);return enqueue(ids,`${t.name} · 重试`)}
async function execute(item:TaskItem,active:boolean){
 if(inflight.has(item.id))return;inflight.add(item.id)
 try{
  const tab=await openServer(item.serverId,active,async tab=>{await patch(item.id,{tabId:tab.id,status:'waiting_page'})})
  const result=await runLogin(tab.id!,item.serverId,status=>patch(item.id,{status}))
  await patch(item.id,result)
 }catch{await patch(item.id,{status:'failed',reason:'打开面板失败，已创建的标签将保留'})}
 finally{inflight.delete(item.id);void pump()}
}
export async function pump(activeTaskId?:string){
 const config=await readConfig()
 const jobs=await mutate(tasks=>{const items=remainingItems(tasks,config.settings.concurrency);for(const i of items){i.status='creating_tab';i.startedAt=Date.now()}return items.map(i=>({...i,active:tasks.some(t=>t.id===activeTaskId&&t.items.some(x=>x.id===i.id))}))})
 for(const job of jobs)void execute(job,job.active)
}
async function resumeItem(item:TaskItem){
 if(inflight.has(item.id)||item.tabId===undefined)return
 inflight.add(item.id)
 try{const result=await runLogin(item.tabId,item.serverId,status=>patch(item.id,{status}),item.status==='submitting');await patch(item.id,result)}
 catch{await patch(item.id,{status:'failed',reason:'无法恢复任务，请重试'})}
 finally{inflight.delete(item.id);void pump()}
}
export async function onTabUpdated(tabId:number){const tasks=await readTasks();for(const i of tasks.flatMap(t=>t.items))if(i.tabId===tabId&&['waiting_page','submitting'].includes(i.status))void resumeItem(i)}
export async function onTabRemoved(tabId:number){await mutate(tasks=>{for(const t of tasks)for(const i of t.items)if(i.tabId===tabId&&!terminal.includes(i.status)){i.status='failed';i.reason='标签页已关闭';t.updatedAt=Date.now()}});void pump()}
export async function recover(){
 const now=Date.now()
 await mutate(tasks=>{for(const i of tasks.flatMap(t=>t.items)){
  if(inflight.has(i.id))continue
  if(i.status==='creating_tab'&&!i.tabId){i.status='failed';i.reason='后台执行曾中断，避免重复打开，请手动重试'}
  if(i.status==='injecting'){i.status='needs_user_action';i.reason='填充期间后台中断，请手动检查页面'}
  if(!terminal.includes(i.status)&&i.status!=='queued'&&now-(i.startedAt||now)>90_000){i.status='failed';i.reason='任务超时，标签已保留'}
 }})
 for(const i of (await readTasks()).flatMap(t=>t.items))if(['waiting_page','submitting'].includes(i.status))void resumeItem(i)
 await pump()
}
