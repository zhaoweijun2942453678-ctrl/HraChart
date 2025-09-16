<!-- src/components/RFSelector.vue —— 修复版 -->
<template>
  <div class="space-y-2">
    <label class="flex items-center gap-2">
      <input type="checkbox" :checked="has('INDICATION')" @change="toggle('INDICATION')">
      <span>控制室指示 (INDICATION)</span>
    </label>
    <label class="flex items-center gap-2">
      <input type="checkbox" :checked="has('IM_FC')" @change="toggle('IM_FC')">
      <span>维修/标定后检查 (IM_FC)</span>
    </label>
    <label class="flex items-center gap-2">
      <input type="checkbox" :checked="has('SUPERVISION')" @change="toggle('SUPERVISION')">
      <span>人员监督 (SUPERVISION)</span>
    </label>
    <label class="flex items-center gap-2">
      <input type="checkbox" :checked="has('ROUTINE_CHECK')" @change="toggle('ROUTINE_CHECK')">
      <span>定期巡检 (ROUTINE_CHECK)</span>
    </label>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: string[]| undefined }>()
const emit = defineEmits<{'update:modelValue':[string[]]}>()

function has(code:string){ return Array.isArray(props.modelValue) && props.modelValue.includes(code) }
function toggle(code:string){
  const set = new Set(props.modelValue ?? [])
  set.has(code) ? set.delete(code) : set.add(code)
  emit('update:modelValue', Array.from(set))
}

</script>
