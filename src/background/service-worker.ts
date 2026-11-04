import {openServer} from './open-server'
import {runLogin} from './login-runner'
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.id!==chrome.runtime.id)return
 if(message?.type==='open'&&typeof message.serverId==='string'){
  openServer(message.serverId).then(async tab=>respond({ok:true,data:await runLogin(tab.id!,message.serverId)})).catch(()=>respond({ok:false,error:'打开面板失败，请检查浏览器标签状态'}));return true
 }
})
