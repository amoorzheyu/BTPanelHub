<script setup lang="ts">
import { MoreHorizontal, ExternalLink, FolderPlus, Server, Pencil, Trash2, ArrowUp, ArrowDown, Copy } from 'lucide-vue-next'
import {Button} from '@/components/ui/button'
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuSeparator} from '@/components/ui/dropdown-menu'
import type {TreeNode} from '@/types'
defineProps<{node:TreeNode}>()
const emit=defineEmits<{action:[action:string,node:TreeNode]}>()
</script>
<template><DropdownMenu><DropdownMenuTrigger as-child><Button variant="ghost" size="icon" class="size-7 shrink-0" :aria-label="`${node.name}的更多操作`"><MoreHorizontal class="size-4"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end" class="w-44">
<template v-if="node.type==='folder'"><DropdownMenuItem @select="emit('action','open-folder',node)"><ExternalLink/>打开当前目录</DropdownMenuItem><DropdownMenuItem @select="emit('action','open-recursive',node)"><ExternalLink/>打开所有子目录</DropdownMenuItem><DropdownMenuSeparator/><DropdownMenuItem @select="emit('action','add-folder',node)"><FolderPlus/>新建子目录</DropdownMenuItem><DropdownMenuItem @select="emit('action','add-server',node)"><Server/>添加服务器</DropdownMenuItem></template>
<template v-else><DropdownMenuItem @select="emit('action','open',node)"><ExternalLink/>新标签打开</DropdownMenuItem><DropdownMenuItem @select="emit('action','copy',node)"><Copy/>复制入口地址</DropdownMenuItem></template>
<DropdownMenuItem @select="emit('action','edit',node)"><Pencil/>{{node.type==='folder'?'重命名 / 移动':'编辑 / 移动'}}</DropdownMenuItem>
<DropdownMenuItem @select="emit('action','up',node)"><ArrowUp/>向上移动</DropdownMenuItem><DropdownMenuItem @select="emit('action','down',node)"><ArrowDown/>向下移动</DropdownMenuItem>
<DropdownMenuSeparator/><DropdownMenuItem class="text-destructive focus:text-destructive" @select="emit('action','delete',node)"><Trash2/>删除</DropdownMenuItem>
</DropdownMenuContent></DropdownMenu></template>
