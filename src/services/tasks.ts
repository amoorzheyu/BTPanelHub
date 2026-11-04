import {ref} from 'vue'
import {isExtension} from './storage'
import type {OpenTask} from '../types'
export const tasks=ref<OpenTask[]>([])
export async function loadTasks(){if(isExtension)tasks.value=((await chrome.storage.local.get('tasks')).tasks||[]) as OpenTask[]}
if(isExtension)chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.tasks)tasks.value=(changes.tasks.newValue||[]) as OpenTask[]})
