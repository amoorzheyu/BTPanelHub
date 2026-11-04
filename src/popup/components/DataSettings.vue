<script setup lang="ts">
import { ref, computed } from "vue";
import { Download, Upload, Trash2 } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { state, replaceConfig } from "@/services/repository";
import { parseBackup, backup, mergeBackup } from "@/services/export-import";
import { isExtension } from "@/services/storage";
import { emptyConfig, type Config } from "@/types";
import { tasks } from "@/services/tasks";
import { terminal } from "@/types";
const exclude = ref(true),
  incoming = ref<Config>(),
  mode = ref("merge"),
  error = ref(""),
  notice = ref(""),
  clearing = ref(false),
  confirmText = ref(""),
  busy = ref(false);
const conflicts = computed(
  () =>
    incoming.value?.nodes.filter((n) =>
      state.config.nodes.some((x) => x.id === n.id),
    ).length || 0,
);
const missing = computed(
  () =>
    incoming.value?.nodes.filter(
      (n) => n.type === "server" && !incoming.value?.credentials[n.passwordRef],
    ).length || 0,
);
const hasRunning = computed(() =>
  tasks.value.some((t) => t.items.some((i) => !terminal.includes(i.status))),
);
function chooseFile() {
  document.getElementById("backup-file")?.click();
}
async function readFile(e: Event) {
  error.value = "";
  try {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) throw new Error("备份文件不能超过 5 MB");
    incoming.value = parseBackup(JSON.parse(await file.text()));
    mode.value = "merge";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "无法读取备份文件";
  } finally {
    (e.target as HTMLInputElement).value = "";
  }
}
async function importData() {
  if (!incoming.value) return;
  busy.value = true;
  try {
    if (hasRunning.value) throw new Error("请等待当前打开任务结束后再导入");
    const next =
      mode.value === "merge"
        ? mergeBackup(state.config, incoming.value)
        : incoming.value;
    await replaceConfig(next);
    if (isExtension) await chrome.storage.local.set({ recent: next.recent });
    incoming.value = undefined;
    notice.value = "数据已导入";
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}
function exportData() {
  const blob = new Blob([backup(state.config, exclude.value)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `BTPanelHub-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notice.value = "备份已导出";
}
async function clear() {
  if (confirmText.value !== "清空") return;
  try {
    if (hasRunning.value) throw new Error("请等待当前打开任务结束");
    await replaceConfig(emptyConfig());
    if (isExtension) await chrome.storage.local.set({ tasks: [], recent: {}, groupRegistry: {} });
    tasks.value = [];
    clearing.value = false;
    confirmText.value = "";
    notice.value = "本地配置已清空";
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>
<template>
  <section class="space-y-3">
    <h3 class="font-semibold">数据管理</h3>
    <div class="flex items-center justify-between text-xs">
      <Label for="exclude-password">导出时排除密码</Label
      ><Switch id="exclude-password" v-model="exclude" />
    </div>
    <p v-if="!exclude" class="text-xs text-amber-700">
      备份将包含明文密码，请妥善保管。
    </p>
    <div class="grid grid-cols-3 gap-2">
      <Input
        id="backup-file"
        type="file"
        accept=".json,application/json"
        class="sr-only"
        aria-label="选择备份文件"
        @change="readFile"
      /><Button variant="outline" :disabled="hasRunning" @click="chooseFile()"
        ><Download class="size-4" />导入</Button
      ><Button variant="outline" @click="exportData"
        ><Upload class="size-4" />导出</Button
      ><Button
        variant="outline"
        class="text-destructive"
        :disabled="hasRunning"
        @click="
          clearing = true;
          confirmText = '';
        "
        ><Trash2 class="size-4" />清空</Button
      >
    </div>
    <p v-if="hasRunning" class="text-xs text-muted-foreground">
      任务结束后可导入或清空数据。
    </p>
    <p v-if="error" role="alert" class="text-xs text-destructive">
      {{ error }}
    </p>
    <p v-if="notice" role="status" class="text-xs text-emerald-600">
      {{ notice }}
    </p>
    <Dialog
      :open="!!incoming"
      @update:open="
        (v) => {
          if (!v) incoming = undefined;
        }
      "
      ><DialogContent class="max-w-[380px]"
        ><DialogHeader
          ><DialogTitle>导入备份</DialogTitle
          ><DialogDescription
            >请检查备份内容并选择导入方式。</DialogDescription
          ></DialogHeader
        >
        <div class="space-y-3 text-xs">
          <p>
            {{
              incoming?.nodes.filter((n) => n.type === "folder").length
            }}
            个目录 ·
            {{
              incoming?.nodes.filter((n) => n.type === "server").length
            }}
            台服务器
          </p>
          <p>
            {{ conflicts }} 个 ID 与现有配置重复，{{
              missing
            }}
            台服务器未包含密码。
          </p>
          <Select v-model="mode"
            ><SelectTrigger aria-label="导入方式"><SelectValue /></SelectTrigger
            ><SelectContent
              ><SelectItem value="merge">合并，重复 ID 更新配置</SelectItem
              ><SelectItem value="replace"
                >覆盖全部现有配置</SelectItem
              ></SelectContent
            ></Select
          >
          <p class="text-muted-foreground">
            {{
              mode === "merge"
                ? "合并时保留现有密码，不同 ID 分别保存。"
                : "覆盖会替换全部配置，缺少密码的服务器需重新填写密码。"
            }}
          </p>
          <p v-if="error" role="alert" class="text-destructive">{{ error }}</p>
        </div>
        <DialogFooter
          ><Button variant="outline" @click="incoming = undefined">取消</Button
          ><Button :disabled="busy || hasRunning" @click="importData"
            >确认导入</Button
          ></DialogFooter
        ></DialogContent
      ></Dialog
    >
    <AlertDialog v-model:open="clearing"
      ><AlertDialogContent class="max-w-[380px]"
        ><AlertDialogHeader
          ><AlertDialogTitle>清空全部本地数据？</AlertDialogTitle
          ><AlertDialogDescription
            >将删除所有目录、服务器、密码、最近访问和任务记录。不会关闭已打开的面板。此操作无法撤销，请先导出备份。</AlertDialogDescription
          ></AlertDialogHeader
        ><Label for="confirm-clear">输入“清空”以确认</Label
        ><Input
          id="confirm-clear"
          v-model="confirmText"
          placeholder="清空"
        /><AlertDialogFooter
          ><AlertDialogCancel>取消</AlertDialogCancel
          ><AlertDialogAction
            :disabled="confirmText !== '清空' || hasRunning"
            class="bg-destructive hover:bg-destructive/90"
            @click="clear"
            >清空数据</AlertDialogAction
          ></AlertDialogFooter
        ></AlertDialogContent
      ></AlertDialog
    >
  </section>
</template>
