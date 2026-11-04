<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Search,
  Star,
  Clock,
  Server as ServerIcon,
  ExternalLink,
  Pencil,
  FolderOpen,
  Database,
  ClipboardList,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FolderTree from "../components/FolderTree.vue";
import { state, favorite, folderOptions } from "@/services/repository";
import { tasks, loadTasks } from "@/services/tasks";
import { terminal } from "@/types";
import type { TreeNode, Server } from "@/types";
const emit = defineEmits<{ action: [action: string, node?: TreeNode] }>();
const search = ref(""),
  filter = ref("all"),
  selectedId = ref(""),
  searchInput = ref<InstanceType<typeof Input>>();
const servers = computed(() =>
  state.config.nodes.filter((n): n is Server => n.type === "server"),
);
const selected = computed(() =>
  servers.value.find(
    (n) =>
      n.id === selectedId.value &&
      (!visibleIds.value || visibleIds.value.has(n.id)),
  ),
);
const visibleIds = computed(() => {
  if (!search.value && filter.value === "all") return undefined;
  const q = search.value.trim().toLowerCase(),
    ids = new Set<string>();
  const addParents = (n: TreeNode) => {
    ids.add(n.id);
    let p = n.parentId;
    while (p) {
      ids.add(p);
      p = state.config.nodes.find((n) => n.id === p)?.parentId || null;
    }
  };
  for (const s of servers.value) {
    let p = s.parentId;
    const path: string[] = [];
    while (p) {
      const n = state.config.nodes.find((n) => n.id === p);
      if (!n) break;
      path.push(n.name);
      p = n.parentId;
    }
    if (
      (filter.value !== "favorites" || s.favorite) &&
      (filter.value !== "recent" || state.config.recent[s.id]) &&
      [s.name, s.panelUrl, s.note, ...path].join(" ").toLowerCase().includes(q)
    )
      addParents(s);
  }
  if (q && filter.value === "all")
    for (const f of state.config.nodes.filter(
      (n) => n.type === "folder" && n.name.toLowerCase().includes(q),
    ))
      addParents(f);
  return ids;
});
const recent = computed(() =>
  servers.value
    .filter((s) => visibleIds.value?.has(s.id))
    .sort(
      (a, b) =>
        (state.config.recent[b.id] || 0) - (state.config.recent[a.id] || 0),
    ),
);
function hotkey(e: KeyboardEvent) {
  if (!state.config.settings.shortcuts) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    document.querySelector<HTMLInputElement>("#search")?.focus();
  }
  if (e.key === "Enter" && e.target === document.querySelector("#search")) {
    const first = servers.value.find(
      (s) => !visibleIds.value || visibleIds.value.has(s.id),
    );
    if (first)
      emit(
        "action",
        "open",
        selected.value &&
          (!visibleIds.value || visibleIds.value.has(selected.value.id))
          ? selected.value
          : first,
      );
  }
}
import { onMounted, onUnmounted } from "vue";
onMounted(() => {
  window.addEventListener("keydown", hotkey);
  void loadTasks();
});
onUnmounted(() => window.removeEventListener("keydown", hotkey));
</script>
<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="space-y-3 px-4 pt-3">
      <div class="relative">
        <Search
          class="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400"
        /><Input
          id="search"
          ref="searchInput"
          v-model="search"
          class="h-9 bg-white pl-9 pr-12"
          placeholder="搜索服务器、目录或地址"
          aria-label="搜索服务器"
        /><kbd
          v-if="state.config.settings.shortcuts"
          class="absolute right-2.5 top-2 rounded bg-slate-100 px-1.5 text-[11px] text-slate-400"
          >⌘K</kbd
        >
      </div>
      <Tabs v-model="filter"
        ><TabsList class="grid w-full grid-cols-3"
          ><TabsTrigger value="all">全部</TabsTrigger
          ><TabsTrigger value="favorites"
            ><Star class="mr-1.5 size-3.5" />收藏</TabsTrigger
          ><TabsTrigger value="recent"
            ><Clock class="mr-1.5 size-3.5" />最近</TabsTrigger
          ></TabsList
        ></Tabs
      >
    </div>
    <div class="mx-3 mt-3 min-h-0 flex-1 overflow-auto border-t py-2">
      <template v-if="servers.length || state.config.nodes.length"
        ><template v-if="filter === 'recent'"
          ><Button
            v-for="s in recent"
            :key="s.id"
            variant="ghost"
            class="flex h-11 w-full justify-start gap-3 px-3"
            :class="selectedId === s.id ? 'bg-blue-100/80' : ''"
            @click="selectedId = s.id"
            ><ServerIcon class="size-4 text-emerald-600" /><span
              class="flex-1 truncate text-left"
              >{{ s.name }}</span
            ><span class="text-[11px] text-muted-foreground">{{
              new Date(state.config.recent[s.id]!).toLocaleDateString()
            }}</span></Button
          ></template
        ><FolderTree
          v-else
          :parent-id="null"
          :selected="selectedId"
          :visible-ids="visibleIds"
          @select="(id) => (selectedId = id)"
          @action="(a, n) => emit('action', a, n)"
        />
        <p
          v-if="visibleIds?.size === 0"
          class="py-16 text-center text-xs text-muted-foreground"
        >
          {{
            search
              ? "没有匹配的服务器或目录"
              : filter === "favorites"
                ? "还没有收藏的服务器"
                : "还没有访问记录"
          }}
        </p></template
      >
      <div
        v-else
        class="flex h-full flex-col items-center justify-center gap-3 pb-6"
      >
        <div class="rounded-2xl bg-emerald-50 p-4">
          <ServerIcon class="size-8 text-emerald-500" />
        </div>
        <div class="text-center">
          <h2 class="text-sm font-semibold">管理你的宝塔面板</h2>
          <p class="mt-1.5 text-xs text-muted-foreground">
            添加服务器，从这里便捷访问
          </p>
        </div>
        <Button size="sm" class="mt-1" @click="emit('action', 'add-server')"
          >添加第一台服务器</Button
        >
      </div>
    </div>
    <section
      v-if="selected"
      class="mx-3 mb-3 rounded-xl border bg-white p-3 shadow-sm"
    >
      <div class="flex items-center gap-3">
        <div class="rounded-lg bg-emerald-50 p-2">
          <ServerIcon class="size-6 text-emerald-500" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="truncate text-sm font-semibold">{{ selected.name }}</h2>
          <p
            class="mt-0.5 truncate text-xs text-muted-foreground"
            :title="selected.panelUrl"
          >
            {{ selected.panelUrl }}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          class="size-8"
          :aria-label="selected.favorite ? '取消收藏' : '收藏服务器'"
          @click="favorite(selected)"
          ><Star
            class="size-4"
            :class="
              selected.favorite
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-400'
            "
        /></Button>
      </div>
      <div class="my-3 flex items-center gap-2 text-[11px] text-slate-500">
        <FolderOpen class="size-3.5" /><span class="truncate">{{
          folderOptions(state.config.nodes).find(
            (f) => f.id === selected?.parentId,
          )?.name || "根目录"
        }}</span
        ><span class="ml-auto shrink-0">{{
          selected.autoLogin ? "自动登录已开启" : "手动登录"
        }}</span>
      </div>
      <p
        v-if="selected.note"
        class="mb-3 line-clamp-2 text-xs text-muted-foreground"
      >
        {{ selected.note }}
      </p>
      <div class="flex gap-2">
        <Button class="flex-1" @click="emit('action', 'open', selected)"
          ><ExternalLink class="mr-2 size-4" />打开面板</Button
        ><Button
          variant="outline"
          class="flex-1"
          @click="emit('action', 'edit', selected)"
          ><Pencil class="mr-2 size-4" />编辑</Button
        >
      </div>
    </section>
    <footer
      class="flex h-11 shrink-0 items-center justify-between border-t bg-white/60 px-4 text-xs text-slate-500"
    >
      <span class="flex items-center gap-2"
        ><Database class="size-3.5" />服务器数量：{{ servers.length }}</span
      ><Button
        variant="ghost"
        size="sm"
        class="h-8 text-xs text-slate-500"
        @click="emit('action', 'tasks')"
        ><ClipboardList class="mr-1.5 size-3.5" />{{
          tasks.some((t) => t.items.some((i) => !terminal.includes(i.status)))
            ? "任务执行中"
            : "批量任务"
        }}</Button
      >
    </footer>
  </div>
</template>
