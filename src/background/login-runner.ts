import {baotaAdapter} from '../content/baota-adapter'
import {readConfig} from '../services/storage'
import {originPattern} from '../services/permission-service'
import type {ItemStatus} from '../types'
export type LoginResult={status:ItemStatus;reason?:string}
export async function runLogin(tabId:number,serverId:string,stage:(status:ItemStatus)=>Promise<void>=async()=>{},resumeOnly=false):Promise<LoginResult>{
 const config=await readConfig(),server=config.nodes.find(n=>n.id===serverId)
 if(!server||server.type!=='server')return {status:'failed',reason:'服务器配置已删除'}
 if(!server.autoLogin||!config.settings.autoFill)return {status:'success',reason:'面板已打开，自动填充未启用'}
 if(!await chrome.permissions.contains({origins:[originPattern(server.panelUrl)]}))return {status:'needs_user_action',reason:'尚未授予站点权限，请重新点击打开并授权'}
 try{
  for(let i=0;i<35;i++){const t=await chrome.tabs.get(tabId);if(t.status==='complete')break;if(i===34)return {status:'failed',reason:'页面加载超时，标签已保留'};await new Promise(r=>setTimeout(r,750))}
  const inspect=async(action:'inspect'|'fill'|'submit')=>{
   const tab=await chrome.tabs.get(tabId)
   if(!tab.url||new URL(tab.url).origin!==new URL(server.panelUrl).origin)throw new Error('origin')
   const result=await chrome.scripting.executeScript({target:{tabId},func:baotaAdapter,args:[action,action==='fill'?{username:server.username,password:config.credentials[server.passwordRef]||''}:undefined,config.settings.submitDelay]})
   if(!result[0]?.result)throw new Error('empty')
   return result[0].result
  }
  let result=await inspect('inspect')
  if(result.status==='success')return result as LoginResult
  if(!resumeOnly){
   if(result.status!=='login')return result as LoginResult
   await stage('injecting');result=await inspect('fill')
   if(result.status!=='filled')return result as LoginResult
   if(!config.settings.autoSubmit)return {status:'needs_user_action',reason:'已填充账号密码，请在面板中手动提交'}
   await stage('submitting');result=await inspect('submit');if(result.status!=='submitting')return result as LoginResult
  }
  for(let i=0;i<15;i++){
   await new Promise(r=>setTimeout(r,700))
   try{result=await inspect('inspect');if(result.status==='success')return result as LoginResult;if(result.reason?.includes('验证码')||result.reason?.includes('动态口令'))return result as LoginResult}catch{/* Navigation may replace the document. Never resubmit. */}
  }
  return {status:'needs_user_action',reason:'未能确认登录成功，请在面板中检查登录结果'}
 }catch{return {status:'needs_user_action',reason:'页面不可访问、已关闭或跳转到其他站点，请手动检查'}}
}
