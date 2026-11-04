<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import {
  ClipboardList,
  RotateCw,
  Square,
  Server,
  ExternalLink,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { tasks, loadTasks } from "@/services/tasks";
import { request } from "@/services/client";
import { terminal, statusLabels } from "@/types";
const taskId = ref(""),
  error = ref(""),
  busy = ref(false);
onMounted(loadTasks);
const ordered = computed(() => [...tasks.value].reverse()),
  task = computed(
    () => tasks.value.find((t) => t.id === taskId.value) || ordered.value[0],
  );
const done = computed(
  () =>
    task.value?.items.filter((i) => terminal.includes(i.status)).length || 0,
);
const success = computed(
  () => task.value?.items.filter((i) => i.status === "success").length || 0,
);
const issues = computed(
  () =>
    task.value?.items.filter((i) =>
      ["failed", "needs_user_action"].includes(i.status),
    ).length || 0,
);
const queued = computed(() =>
  task.value?.items.some((i) => i.status === "queued"),
);
async function act(type: string, itemId?: string) {
  if (!task.value) return;
  busy.value = true;
  try {
    const id = await request<string>(type, { taskId: task.value.id, itemId });
    if (type === "retry") taskId.value = id;
    error.value = "";
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
async function focusTab(tabId: number) {
  try {
    await chrome.tabs.update(tabId, { active: true });
    const t = await chrome.tabs.get(tabId);
    await chrome.windows.update(t.windowId, { focused: true });
  } catch {
    error.value = "该标签页已关闭";
  }
}
</script>
<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <template v-if="task"
      ><div class="space-y-3 px-4 pb-3">
        <Select
          :model-value="task.id"
          @update:model-value="(v) => (taskId = String(v))"
          ><SelectTrigger aria-label="选择任务"><SelectValue /></SelectTrigger
          ><SelectContent
            ><SelectItem v-for="t in ordered" :key="t.id" :value="t.id"
              >{{ t.name }} ·
              {{ new Date(t.createdAt).toLocaleTimeString() }}</SelectItem
            ></SelectContent
          ></Select
        >
        <section class="rounded-xl border bg-white p-4">
          <h3 class="font-semibold">
            {{ done === task.items.length ? "任务已结束" : "正在打开面板…" }}
          </h3>
          <p class="my-2 text-xs text-muted-foreground">
            成功 {{ success }} · 需要处理 {{ issues }} · 共
            {{ task.items.length }} 台
          </p>
          <div class="flex items-center gap-3">
            <Progress
              :model-value="(done / task.items.length) * 100"
              class="h-2"
            /><span class="shrink-0 text-xs text-muted-foreground"
              >{{ done }} / {{ task.items.length }}</span
            >
          </div>
        </section>
      </div>
      <div class="min-h-0 flex-1 overflow-auto px-4">
        <div
          v-for="i in task.items"
          :key="i.id"
          class="flex items-start gap-3 border-b py-3"
        >
          <Server class="mt-0.5 size-4 shrink-0 text-emerald-500" />
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="truncate text-[13px] font-medium">{{ i.name }}</h3>
              <span
                class="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px]"
                :class="
                  i.status === 'success'
                    ? 'bg-emerald-50 text-emerald-600'
                    : ['failed', 'needs_user_action'].includes(i.status)
                      ? 'bg-amber-50 text-amber-700'
                      : i.status === 'cancelled'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-blue-50 text-blue-600'
                "
                >{{ statusLabels[i.status] }}</span
              >
            </div>
            <p
              v-if="i.reason"
              class="mt-1 text-[11px] leading-5 text-muted-foreground"
            >
              {{ i.reason }}
            </p>
            <div
              v-if="
                i.tabId || ['failed', 'needs_user_action'].includes(i.status)
              "
              class="mt-1 flex gap-2"
            >
              <Button
                v-if="i.tabId"
                variant="ghost"
                size="xs"
                class="h-6 px-0 text-xs text-muted-foreground"
                @click="focusTab(i.tabId)"
                ><ExternalLink class="size-3" />查看页面</Button
              ><Button
                v-if="['failed', 'needs_user_action'].includes(i.status)"
                variant="ghost"
                size="xs"
                class="h-6 text-xs text-primary"
                :disabled="busy"
                @click="act('retry', i.id)"
                ><RotateCw class="size-3" />重试</Button
              >
            </div>
          </div>
        </div>
      </div>
      <p v-if="error" role="alert" class="px-4 py-2 text-xs text-destructive">
        {{ error }}
      </p>
      <footer class="flex gap-3 border-t p-3">
        <Button
          variant="outline"
          class="flex-1"
          :disabled="!queued || busy"
          @click="act('cancel')"
          ><Square class="size-4" />取消剩余</Button
        ><Button
          class="flex-1"
          :disabled="!issues || busy"
          @click="act('retry')"
          ><RotateCw class="size-4" />重试失败项</Button
        >
      </footer></template
    >
    <div
      v-else
      class="flex flex-1 flex-col items-center justify-center gap-3 pb-12 text-muted-foreground"
    >
      <ClipboardList class="size-9 text-slate-300" />
      <p>还没有打开任务</p>
      <p class="text-xs">打开服务器后，可在这里查看进度</p>
    </div>
  </div>
</template>
