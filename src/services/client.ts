import {isExtension} from './storage'
export async function request<T=unknown>(type:string,payload:Record<string,unknown>={}):Promise<T>{
  if(!isExtension)throw new Error('请在 Chrome 扩展中使用此功能')
  const response=await chrome.runtime.sendMessage({type,...payload})
  if(!response?.ok)throw new Error(response?.error||'后台未响应，请重新加载扩展')
  return response.data as T
}
