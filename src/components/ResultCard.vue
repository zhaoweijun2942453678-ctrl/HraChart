<template>
  <div v-if="trace" class="border rounded p-4 bg-white shadow-sm">
    <div class="flex items-center justify-between">
      
      <h3 class="font-semibold">计算结果</h3>
      <button class="text-sm text-blue-600 hover:underline" @click="downloadTrace">导出计算轨迹.md</button>
    </div>
 <!-- 新增：任务/场景上下文显示 -->
    <div v-if="taskName || scenarioName" class="mt-2 text-sm text-gray-700">
      <span v-if="taskName"><strong>任务：</strong>{{ taskName }}</span>
      <span v-if="taskName && scenarioName" class="mx-2 text-gray-300">|</span>
      <span v-if="scenarioName"><strong>场景：</strong>{{ scenarioName }}</span>
    </div>
    <div class="mt-3">
      <div class="prose prose-sm max-w-none" v-html="html"></div>
    </div>

    <div v-if="refs?.length" class="mt-4">
      <h4 class="font-medium text-sm">引用（证据链）</h4>
      <ul class="list-disc ml-5 text-sm text-gray-700">
        <li v-for="r in refs" :key="r.id">
          <span class="font-mono">{{ r.id }}</span>：{{ r.desc }}，
          <span class="text-gray-500">{{ r.source }}</span>
          <span v-if="r.filecite" class="text-gray-400">（{{ r.filecite }}）</span>
        </li>
      </ul>
    </div>
  </div>
  <div v-else class="text-gray-400 text-sm">尚无结果</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// 为了零依赖，使用极简 Markdown→HTML（仅处理常见符号；生产可换 marked.js）
function simpleMd(md:string){
  // 行内 LaTeX 不渲染，这里原样显示（后续可集成 KaTeX）
  let h = md
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm,  '<h2>$1</h2>')
    .replace(/^# (.*)$/gm,   '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>')
  return h
}

const props = defineProps<{
  trace: string | null,
  refs?: {id:string, desc:string, source:string, filecite?:string}[],
  taskName?: string,        // 新增
  scenarioName?: string     // 新增
}>()


const html = computed(()=> props.trace ? simpleMd(props.trace) : '')

function downloadTrace(){
  if(!props.trace) return
  const blob = new Blob([props.trace], {type:'text/markdown;charset=utf-8'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'hra_calc_trace.md'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.prose :deep(code){ background: #f5f5f5; padding: 2px 4px; border-radius: 3px; }
</style>
