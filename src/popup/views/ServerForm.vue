<script setup lang="ts">
import {ref,computed} from 'vue'
import {Eye,EyeOff} from 'lucide-vue-next'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Textarea} from '@/components/ui/textarea'
import {Switch} from '@/components/ui/switch'
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select'
import {colors,type Server} from '@/types'
import {state,saveNode,folderOptions} from '@/services/repository'
const props=defineProps<{server?:Server;parentId?:string|null}>();const emit=defineEmits<{done:[]}>()
const id=crypto.randomUUID(),now=Date.now()
const form=ref<Server>(props.server?{...props.server}:{id,parentId:props.parentId||null,type:'server',name:'',sortOrder:now,createdAt:now,updatedAt:now,panelUrl:'',username:'',passwordRef:id,note:'',color:'green',favorite:false,autoLogin:false,tabGroupTitle:''})
const password=ref(state.config.credentials[form.value.passwordRef]||''),reveal=ref(false),error=ref(''),saving=ref(false)
const folders=computed(()=>folderOptions(state.config.nodes))
const colorNames:Record<string,string>={green:'绿色',blue:'蓝色',purple:'紫色',cyan:'青色',orange:'橙色',red:'红色',pink:'粉色',yellow:'黄色',grey:'灰色'}
function colorLabel(c:string){return colorNames[c]}
async function save(){error.value='';saving.value=true;try{await saveNode({...form.value},password.value);emit('done')}catch(e){error.value=e instanceof Error?e.message:'保存失败，请重试'}finally{saving.value=false}}
</script>
<template><form class="flex min-h-0 flex-1 flex-col" @submit.prevent="save"><div class="flex-1 space-y-4 overflow-y-auto px-5 py-3">
<div class="space-y-1.5"><Label for="name">名称 <span class="text-destructive">*</span></Label><Input id="name" v-model="form.name" placeholder="例如：Web 服务器" required maxlength="100" autofocus/></div>
<div class="space-y-1.5"><Label for="url">宝塔入口 <span class="text-destructive">*</span></Label><Input id="url" v-model="form.panelUrl" placeholder="https://面板地址:8888/安全入口" required type="url"/></div>
<div class="grid grid-cols-2 gap-3"><div class="space-y-1.5"><Label for="username">用户名 <span class="text-destructive">*</span></Label><Input id="username" v-model="form.username" autocomplete="off" required/></div><div class="space-y-1.5"><Label for="password">密码 <span class="text-destructive">*</span></Label><div class="relative"><Input id="password" v-model="password" :type="reveal?'text':'password'" class="pr-9" autocomplete="new-password" required/><Button type="button" variant="ghost" size="icon" class="absolute right-0 top-0 size-9" :aria-label="reveal?'隐藏密码':'显示密码'" @click="reveal=!reveal"><EyeOff v-if="reveal" class="size-4"/><Eye v-else class="size-4"/></Button></div></div></div>
<div class="space-y-1.5"><Label>所属目录</Label><Select :model-value="form.parentId||'root'" @update:model-value="v=>form.parentId=String(v)==='root'?null:String(v)"><SelectTrigger aria-label="所属目录"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="root">根目录</SelectItem><SelectItem v-for="f in folders" :key="f.id" :value="f.id">{{f.name}}</SelectItem></SelectContent></Select></div>
<div class="grid grid-cols-2 gap-3"><div class="space-y-1.5"><Label>标签颜色</Label><Select v-model="form.color"><SelectTrigger aria-label="标签颜色"><SelectValue/></SelectTrigger><SelectContent><SelectItem v-for="c in colors" :key="c" :value="c"><span class="mr-2 inline-block size-2.5 rounded-full" :style="{background:c}"/>{{colorLabel(c)}}</SelectItem></SelectContent></Select></div><div class="space-y-1.5"><Label for="group">分组名称</Label><Input id="group" v-model="form.tabGroupTitle" placeholder="默认使用服务器名称" maxlength="100"/></div></div>
<div class="space-y-1.5"><Label for="note">备注</Label><Textarea id="note" v-model="form.note" placeholder="可选，添加说明" class="min-h-16" maxlength="1000"/></div>
<div class="flex items-center justify-between"><div><Label for="auto-login">自动登录</Label><p class="mt-1 text-xs text-muted-foreground">打开时填充账号密码，需授予站点权限</p></div><Switch id="auto-login" v-model="form.autoLogin"/></div>
<p v-if="error" role="alert" class="text-xs text-destructive">{{error}}</p></div><footer class="flex gap-3 border-t p-3"><Button type="button" variant="outline" class="flex-1" @click="emit('done')">取消</Button><Button class="flex-1" :disabled="saving" type="submit">{{saving?'保存中…':'保存'}}</Button></footer></form></template>
