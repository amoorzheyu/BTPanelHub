import {openServer} from './open-server'
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.id!==chrome.runtime.id)return
 if(message?.type==='open'&&typeof message.serverId==='string'){
  openServer(message.serverId).then(tab=>respond({ok:true,data:{tabId:tab.id}})).catch(()=>respond({ok:false,error:'打开面板失败，请检查浏览器标签状态'}));return true
 }
})
