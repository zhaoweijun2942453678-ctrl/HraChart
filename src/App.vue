<!-- src/App.vue -->
<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <h1 class="text-lg font-semibold text-gray-800">HRA 工程工具</h1>
        <span class="text-sm text-gray-500">科学 · 可追溯 · 工程可用</span>
      </div>
    </header>

    <main class="py-6">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
// 不再手动 import 任意页面组件
</script>
