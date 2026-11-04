<script setup lang="ts">
import { ref, computed } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { state, folderOptions, saveNode } from "@/services/repository";
import type { Folder } from "@/types";
const props = defineProps<{ folder?: Folder; parentId?: string | null }>();
const emit = defineEmits<{ done: [] }>();
const name = ref(props.folder?.name || ""),
  parent = ref(props.folder?.parentId || props.parentId || "root"),
  error = ref("");
const folders = computed(() =>
  folderOptions(state.config.nodes, props.folder?.id),
);
async function save() {
  try {
    const now = Date.now();
    await saveNode({
      id: props.folder?.id || crypto.randomUUID(),
      type: "folder",
      name: name.value,
      parentId: parent.value === "root" ? null : parent.value,
      createdAt: props.folder?.createdAt || now,
      updatedAt: now,
      sortOrder: props.folder?.sortOrder || now,
    });
    emit("done");
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>
<template>
  <form class="flex flex-1 flex-col" @submit.prevent="save">
    <div class="flex-1 space-y-5 p-5">
      <div class="space-y-2">
        <Label for="folder-name">目录名称</Label
        ><Input
          id="folder-name"
          v-model="name"
          required
          maxlength="100"
          autofocus
          placeholder="例如：生产环境"
        />
      </div>
      <div class="space-y-2">
        <Label>父目录</Label
        ><Select v-model="parent"
          ><SelectTrigger aria-label="父目录"><SelectValue /></SelectTrigger
          ><SelectContent
            ><SelectItem value="root">根目录</SelectItem
            ><SelectItem v-for="f in folders" :key="f.id" :value="f.id">{{
              f.name
            }}</SelectItem></SelectContent
          ></Select
        >
      </div>
      <p v-if="error" class="text-destructive" role="alert">{{ error }}</p>
    </div>
    <footer class="flex gap-3 border-t p-3">
      <Button
        type="button"
        variant="outline"
        class="flex-1"
        @click="emit('done')"
        >取消</Button
      ><Button type="submit" class="flex-1">保存</Button>
    </footer>
  </form>
</template>
