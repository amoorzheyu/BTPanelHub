<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  Keyboard,
  Send,
  Clock,
  Layers,
  Shield,
  Globe,
  X,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DataSettings from "../components/DataSettings.vue";
import { state, persist } from "@/services/repository";
import { isExtension } from "@/services/storage";
import { ensurePermission, originPattern } from "@/services/permission-service";
import { loadTasks } from "@/services/tasks";
const origins = ref<string[]>([]),
  error = ref(""),
  saved = ref(false);
async function refresh() {
  if (isExtension)
    origins.value = (await chrome.permissions.getAll()).origins || [];
}
onMounted(() => {
  void refresh();
  void loadTasks();
});
async function save() {
  try {
    await persist();
    saved.value = true;
    error.value = "";
  } catch {
    error.value = "设置保存失败，请重试";
  }
}
async function remove(origin: string) {
  try {
    await chrome.permissions.remove({ origins: [origin] });
    await refresh();
  } catch {
    error.value = "无法撤销站点权限";
  }
}
async function grant(url: string) {
  try {
    await ensurePermission(url);
    await refresh();
  } catch (e) {
    error.value = (e as Error).message;
  }
}
const host = (url: string) => new URL(url).host;
const configured = () => [
  ...new Map(
    state.config.nodes
      .filter((n) => n.type === "server" && n.autoLogin)
      .map((n) =>
        n.type === "server"
          ? [originPattern(n.panelUrl), n.panelUrl]
          : ["", ""],
      ),
  ).entries(),
];
</script>
<template>
  <div class="min-h-0 flex-1 space-y-6 overflow-auto px-5 pb-5 pt-2">
    <section>
      <h3 class="mb-2 font-semibold">登录与提交</h3>
      <div class="settings-row">
        <Keyboard class="size-4 text-slate-500" />
        <div class="flex-1">
          <Label for="autofill">自动填充</Label>
          <p>打开时填充已配置的账号密码</p>
        </div>
        <Switch
          id="autofill"
          v-model="state.config.settings.autoFill"
          @update:model-value="save"
        />
      </div>
      <div class="settings-row">
        <Send class="size-4 text-slate-500" />
        <div class="flex-1">
          <Label for="autosubmit">自动提交</Label>
          <p>验证码或动态口令需手动处理</p>
        </div>
        <Switch
          id="autosubmit"
          v-model="state.config.settings.autoSubmit"
          @update:model-value="save"
        />
      </div>
      <div class="settings-row">
        <Clock class="size-4 text-slate-500" /><Label class="flex-1"
          >提交延迟</Label
        ><Select
          :model-value="String(state.config.settings.submitDelay)"
          @update:model-value="
            (v) => {
              state.config.settings.submitDelay = Number(v);
              save();
            }
          "
          ><SelectTrigger class="!w-28" aria-label="提交延迟"
            ><SelectValue /></SelectTrigger
          ><SelectContent
            ><SelectItem
              v-for="v in [0, 500, 1000, 2000, 5000]"
              :key="v"
              :value="String(v)"
              >{{ v }} ms</SelectItem
            ></SelectContent
          ></Select
        >
      </div>
    </section>
    <section>
      <h3 class="mb-2 font-semibold">标签与任务</h3>
      <div class="settings-row">
        <Layers class="size-4 text-slate-500" />
        <div class="flex-1">
          <Label for="grouping">按服务器分组</Label>
          <p>同台服务器的标签加入同一组</p>
        </div>
        <Switch
          id="grouping"
          v-model="state.config.settings.grouping"
          @update:model-value="save"
        />
      </div>
      <div class="settings-row">
        <Layers class="size-4 text-slate-500" /><Label class="flex-1"
          >批量并发数量</Label
        ><Select
          :model-value="String(state.config.settings.concurrency)"
          @update:model-value="
            (v) => {
              state.config.settings.concurrency = Number(v) as 1 | 3 | 5;
              save();
            }
          "
          ><SelectTrigger class="!w-28" aria-label="批量并发数量"
            ><SelectValue /></SelectTrigger
          ><SelectContent
            ><SelectItem v-for="v in [1, 3, 5]" :key="v" :value="String(v)">{{
              v
            }}</SelectItem></SelectContent
          ></Select
        >
      </div>
      <p class="mt-2 text-[11px] text-muted-foreground">
        取消任务只取消等待中的项目，已打开的标签会保留。
      </p>
    </section>
    <div class="settings-row rounded-xl border bg-white px-3">
      <Keyboard class="size-4 text-slate-500" />
      <div class="flex-1">
        <Label for="shortcuts">键盘快捷键</Label>
        <p>⌘ / Ctrl + K 搜索，Enter 打开结果</p>
      </div>
      <Switch
        id="shortcuts"
        v-model="state.config.settings.shortcuts"
        @update:model-value="save"
      />
    </div>
    <DataSettings />
    <section class="space-y-3">
      <h3 class="flex items-center gap-2 font-semibold">
        <Shield class="size-4" />安全与站点权限
      </h3>
      <p class="text-xs leading-5 text-muted-foreground">
        密码仅保存在此浏览器本地，不会上传。本地存储不是系统密码保险柜。自动登录仅在你授权的站点运行。
      </p>
      <p class="text-xs leading-5 text-muted-foreground">
        Chrome
        按站点授权，权限会覆盖该主机的所有端口。扩展仅向配置入口的同源页面填充凭据。
      </p>
      <div
        v-for="o in origins"
        :key="o"
        class="flex items-center gap-2 rounded-lg border bg-white px-3 py-2"
      >
        <Globe class="size-3.5 shrink-0 text-slate-400" /><span
          class="min-w-0 flex-1 truncate text-xs"
          :title="o"
          >{{ o }}</span
        ><Button
          variant="ghost"
          size="xs"
          class="text-xs text-destructive"
          :aria-label="'撤销' + o"
          @click="remove(o)"
          ><X class="size-3" />撤销</Button
        >
      </div>
      <p v-if="!origins.length" class="text-xs text-muted-foreground">
        尚未授予任何站点权限。
      </p>
      <template v-for="[pattern, url] in configured()" :key="pattern"
        ><Button
          v-if="!origins.includes(pattern)"
          variant="outline"
          size="sm"
          class="max-w-full text-xs"
          @click="grant(url)"
          ><Globe class="size-3.5" /><span class="truncate"
            >授权 {{ host(url) }}</span
          ></Button
        ></template
      >
    </section>
    <p v-if="error" role="alert" class="text-xs text-destructive">
      {{ error }}
    </p>
    <p v-else-if="saved" role="status" class="text-xs text-emerald-600">
      设置已保存
    </p>
    <p class="border-t pt-4 text-center text-[11px] text-slate-400">
      BTPanelHub · 0.1.0
    </p>
  </div>
</template>
