<script setup lang="ts">
import { Search } from "@lucide/vue";
import { Input } from "@/components/ui/input";
const model = defineModel<string>({ default: "" });
</script>

<template>
  <div class="relative min-w-0 flex-1">
    <Search
      class="pointer-events-none absolute left-2 top-2 size-4 text-slate-400"
    />
    <Input
      id="search"
      v-model="model"
      class="h-8 w-full bg-white pl-7 pr-2"
      placeholder="搜索…"
      aria-label="搜索服务器"
      title="搜索服务器、目录或地址（⌘ / Ctrl + K）"
    />
  </div>
</template>
