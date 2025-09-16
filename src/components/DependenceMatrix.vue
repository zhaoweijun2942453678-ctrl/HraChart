<template>
  <div class="dep-matrix">
    <table class="matrix">
      <thead>
        <tr>
          <th></th>
          <th v-for="(t,j) in tasks" :key="j">#{{ j+1 }} {{ t }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(t,i) in tasks" :key="i">
          <th>#{{ i+1 }} {{ t }}</th>
          <td v-for="(t2,j) in tasks" :key="j">
            <template v-if="j<=i">—</template>
            <template v-else>
              <t-select v-model="inner[i][j]" :options="opts" size="small" />
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Select as TSelect } from 'tdesign-vue-next'

const props = defineProps<{ modelValue: string[][]; tasks: string[] }>()
const emit = defineEmits(['update:modelValue'])
const opts = [
  {label:'ZD',value:'ZD'},{label:'LD',value:'LD'},{label:'MD',value:'MD'},
  {label:'HD',value:'HD'},{label:'CD',value:'CD'}
]
const inner = computed({
  get: ()=> props.modelValue,
  set: (v)=> emit('update:modelValue', v)
})
</script>

<style scoped>
.matrix{ width:100%; border-collapse:collapse; }
.matrix th,.matrix td{ border:1px solid #e5e7eb; padding:6px; font-size:12px; text-align:center; }
.matrix thead th{ background:#f9fafb; }
</style>
