export const colors = ['green','blue','purple','cyan','orange','red','pink','yellow','grey'] as const
export type GroupColor = typeof colors[number]
export interface BaseNode { id:string; parentId:string|null; name:string; sortOrder:number; createdAt:number; updatedAt:number }
export interface Folder extends BaseNode { type:'folder' }
export interface Server extends BaseNode { type:'server'; panelUrl:string; username:string; passwordRef:string; note:string; color:GroupColor; favorite:boolean; autoLogin:boolean; tabGroupTitle:string }
export type TreeNode = Folder|Server
export interface Settings { autoFill:boolean; autoSubmit:boolean; submitDelay:number; concurrency:1|3|5; grouping:boolean; shortcuts:boolean }
export interface Config { version:1; nodes:TreeNode[]; credentials:Record<string,string>; recent:Record<string,number>; expanded:string[]; settings:Settings }
export type ItemStatus = 'queued'|'creating_tab'|'waiting_page'|'injecting'|'submitting'|'success'|'needs_user_action'|'failed'|'cancelled'
export interface TaskItem { id:string; serverId:string; name:string; status:ItemStatus; reason?:string; tabId?:number; startedAt?:number; waitForPermission?:boolean }
export interface OpenTask { id:string; name:string; createdAt:number; updatedAt:number; cancelled:boolean; items:TaskItem[] }
export const terminal:ItemStatus[]=['success','needs_user_action','failed','cancelled']
export const statusLabels:Record<ItemStatus,string>={queued:'等待中',creating_tab:'创建标签',waiting_page:'等待页面',injecting:'填充中',submitting:'登录中',success:'成功',needs_user_action:'需要人工处理',failed:'失败',cancelled:'已取消'}
export const defaults:Settings={autoFill:true,autoSubmit:true,submitDelay:500,concurrency:3,grouping:true,shortcuts:true}
export const emptyConfig=():Config=>({version:1,nodes:[],credentials:{},recent:{},expanded:[],settings:{...defaults}})
