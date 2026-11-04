import {isExtension} from './storage'
export function originPattern(url:string){const u=new URL(url);return `${u.protocol}//${u.hostname}/*`}
export async function ensurePermission(url:string){if(!isExtension)throw new Error('请在 Chrome 扩展中授权自动登录');return chrome.permissions.request({origins:[originPattern(url)]})}
