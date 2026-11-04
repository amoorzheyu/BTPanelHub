<script setup lang="ts">
import {ref,computed,onMounted} from 'vue'
import {Server as ServerIcon,Plus,Settings,ArrowLeft,FolderPlus,Server,ClipboardList} from 'lucide-vue-next'
import {Button} from '@/components/ui/button'
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu'
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog'
import ServerHome from './views/ServerHome.vue'
import ServerForm from './views/ServerForm.vue'
import FolderForm from './views/FolderForm.vue'
import BatchTask from './views/BatchTask.vue'
import {state,load,removeNode,descendants,persist} from '@/services/repository'
import {request} from '@/services/client'
import {ensurePermission} from '@/services/permission-service'
import type {TreeNode,Server as ServerType,Folder} from '@/types'
const view=ref('home'),editing=ref<TreeNode>(),parent=ref<string|null>(null),deleting=ref<TreeNode>(),notice=ref('')
const title=computed(()=>view.value==='server'?(editing.value?'编辑服务器':'新增服务器'):view.value==='folder'?(editing.value?'编辑目录':'新建目录'):view.value==='settings'?'设置':'批量任务')
const deleteCount=computed(()=>deleting.value?state.config.nodes.filter(n=>n.type==='server'&&[deleting.value!.id,...descendants(state.config.nodes,deleting.value!.id)].includes(n.id)).length:0)
onMounted(async()=>{try{await load()}catch{state.error='读取本地数据失败，请重新打开扩展'}})
async function action(a:string,n?:TreeNode){notice.value='';try{
if(a==='add-server'||a==='add-folder'){editing.value=undefined;parent.value=n?.id||null;view.value=a==='add-server'?'server':'folder'}
else if(a==='edit'&&n){editing.value=n;view.value=n.type}
else if(a==='delete'){deleting.value=n}
else if(a==='copy'&&n?.type==='server'){await navigator.clipboard.writeText(n.panelUrl);notice.value='入口地址已复制'}
else if((a==='up'||a==='down')&&n){const siblings=state.config.nodes.filter(x=>x.parentId===n.parentId).sort((x,y)=>x.sortOrder-y.sortOrder);const i=siblings.findIndex(x=>x.id===n.id),j=i+(a==='up'?-1:1);if(siblings[j]){siblings.forEach((x,k)=>x.sortOrder=k);[siblings[i]!.sortOrder,siblings[j]!.sortOrder]=[siblings[j]!.sortOrder,siblings[i]!.sortOrder];await persist()}}
else if(a==='open'&&n?.type==='server'){if(n.autoLogin&&state.config.settings.autoFill)await ensurePermission(n.panelUrl);await request('open',{serverId:n.id});notice.value='已加入打开任务'}
else if(a.startsWith('open-')&&n?.type==='folder'){const ids=a==='open-recursive'?descendants(state.config.nodes,n.id):state.config.nodes.filter(x=>x.parentId===n.id).map(x=>x.id);const serverIds=state.config.nodes.filter(x=>x.type==='server'&&ids.includes(x.id)).map(x=>x.id);await request('batch',{serverIds,name:n.name});view.value='tasks'}
else if(a==='tasks')view.value='tasks'
}catch(e){notice.value=e instanceof Error?e.message:'操作失败'}}
async function confirmDelete(){if(deleting.value){await removeNode(deleting.value.id);deleting.value=undefined}}
</script>
<template><main class="popup-shell"><header class="flex h-[52px] shrink-0 items-center gap-2.5 border-b bg-white/70 px-4"><ServerIcon class="size-6 text-emerald-500"/><h1 class="flex-1 text-[17px] font-bold tracking-tight">BTPanelHub</h1><template v-if="view==='home'"><DropdownMenu><DropdownMenuTrigger as-child><Button variant="outline" size="icon" class="size-8 bg-transparent" aria-label="添加"><Plus class="size-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem @select="action('add-server')"><Server class="size-4"/>添加服务器</DropdownMenuItem><DropdownMenuItem @select="action('add-folder')"><FolderPlus class="size-4"/>新建目录</DropdownMenuItem></DropdownMenuContent></DropdownMenu><Button variant="outline" size="icon" class="size-8 bg-transparent" aria-label="设置" @click="view='settings'"><Settings class="size-4"/></Button></template></header>
<div v-if="view!=='home'" class="flex h-12 shrink-0 items-center gap-2 px-3"><Button variant="ghost" size="icon" class="size-8" aria-label="返回服务器列表" @click="view='home'"><ArrowLeft class="size-4"/></Button><h2 class="text-base font-semibold">{{title}}</h2></div>
<div v-if="state.error" role="alert" class="p-5 text-destructive">{{state.error}}</div><template v-else-if="state.ready"><ServerHome v-if="view==='home'" @action="action"/><ServerForm v-else-if="view==='server'" :server="editing?.type==='server'?editing as ServerType:undefined" :parent-id="parent" @done="view='home'"/><FolderForm v-else-if="view==='folder'" :folder="editing?.type==='folder'?editing as Folder:undefined" :parent-id="parent" @done="view='home'"/><BatchTask v-else-if="view==='tasks'"/><div v-else class="flex flex-1 items-center justify-center text-muted-foreground"><ClipboardList class="mr-2 size-4"/>暂无{{view==='tasks'?'任务':'设置'}}</div></template><p v-else class="p-5 text-muted-foreground">正在读取…</p>
<div v-if="notice" role="status" class="absolute bottom-14 left-4 right-4 rounded-lg border bg-white p-3 text-xs shadow-lg" @click="notice=''">{{notice}}</div>
<AlertDialog :open="!!deleting" @update:open="v=>{if(!v)deleting=undefined}"><AlertDialogContent class="max-w-[380px]"><AlertDialogHeader><AlertDialogTitle>删除{{deleting?.type==='folder'?'目录':'服务器'}}？</AlertDialogTitle><AlertDialogDescription>“{{deleting?.name}}”{{deleting?.type==='folder'?`及其子目录中的 ${deleteCount} 台服务器配置将被删除。`:'的配置和本地凭据将被删除。'}}此操作无法撤销。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction class="bg-destructive hover:bg-destructive/90" @click="confirmDelete">删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
</main></template>
