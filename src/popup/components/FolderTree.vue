<script setup lang="ts">
import { computed } from "vue";
import {
  ChevronRight,
  Folder as FolderIcon,
  Server as ServerIcon,
  Star,
  ExternalLink,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import NodeMenu from "./NodeMenu.vue";
import {
  state,
  toggleFolder,
  descendants,
  favorite,
} from "@/services/repository";
import type { TreeNode, Server } from "@/types";
const props = defineProps<{
  parentId: string | null;
  selected: string;
  visibleIds?: Set<string>;
  depth?: number;
}>();
const emit = defineEmits<{
  select: [id: string];
  action: [action: string, node: TreeNode];
}>();
const nodes = computed(() =>
  state.config.nodes
    .filter(
      (n) =>
        n.parentId === props.parentId &&
        (!props.visibleIds || props.visibleIds.has(n.id)),
    )
    .sort((a, b) => a.sortOrder - b.sortOrder),
);
const count = (id: string) => {
  const ids = descendants(state.config.nodes, id);
  return state.config.nodes.filter(
    (n) => n.type === "server" && ids.includes(n.id),
  ).length;
};
</script>
<template>
  <div>
    <template v-for="node in nodes" :key="node.id"
      ><div
        class="group flex h-9 items-center gap-1 rounded-lg pr-1 transition-colors"
        :class="
          selected === node.id
            ? 'bg-blue-100/80 hover:bg-blue-100/80'
            : 'hover:bg-black/[.035]'
        "
        :style="{ paddingLeft: `${8 + (depth || 0) * 18}px` }"
      >
        <Button
          v-if="node.type === 'folder'"
          variant="ghost"
          class="h-9 min-w-0 flex-1 justify-start gap-2 px-0 text-[13px] font-medium hover:bg-transparent"
          @click="toggleFolder(node.id)"
          ><ChevronRight
            class="size-3.5 shrink-0 transition-transform"
            :class="
              state.config.expanded.includes(node.id) || visibleIds
                ? 'rotate-90'
                : ''
            "
          /><FolderIcon
            class="size-4 shrink-0 fill-amber-100 text-amber-500"
          /><span class="truncate">{{ node.name }}</span
          ><span
            class="ml-auto rounded-full bg-slate-200/60 px-1.5 text-[11px] text-slate-500"
            >{{ count(node.id) }}</span
          ></Button
        >
        <template v-else
          ><Button
            variant="ghost"
            class="h-9 min-w-0 flex-1 justify-start gap-2 px-0 text-[13px] font-medium hover:bg-transparent"
            @click="emit('select', node.id)"
            ><ServerIcon class="ml-5 size-4 shrink-0 text-emerald-600" /><span
              class="truncate"
              >{{ node.name }}</span
            ></Button
          ><Button
            variant="ghost"
            size="icon"
            class="size-7 shrink-0"
            :aria-label="
              node.favorite ? '取消收藏' + node.name : '收藏' + node.name
            "
            @click="favorite(node as Server)"
            ><Star
              class="size-3.5"
              :class="
                node.favorite
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-slate-400'
              " /></Button
          ><Button
            variant="ghost"
            size="icon"
            class="size-7 shrink-0"
            :aria-label="'打开' + node.name"
            @click="emit('action', 'open', node)"
            ><ExternalLink class="size-3.5 text-slate-500" /></Button
        ></template>
        <NodeMenu :node="node" @action="(a, n) => emit('action', a, n)" />
      </div>
      <FolderTree
        v-if="
          node.type === 'folder' &&
          (state.config.expanded.includes(node.id) || visibleIds)
        "
        :parent-id="node.id"
        :selected="selected"
        :depth="(depth || 0) + 1"
        :visible-ids="visibleIds"
        @select="(id) => emit('select', id)"
        @action="(a, n) => emit('action', a, n)"
      />
    </template>
  </div>
</template>
