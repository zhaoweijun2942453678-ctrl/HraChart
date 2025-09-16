<!-- src/components/TimeBandBar.vue — 推荐替换版本 -->
<template>
  <div class="timeband-root">
    <div class="ticks">
      <span>0</span><span>15</span><span>30</span><span>60</span><span>120</span>
    </div>

    <div class="band-wrap" :class="{disabled: disabled}">
      <div class="band seg seg-a"></div>
      <div class="band seg seg-b"></div>
      <div class="band seg seg-c"></div>
      <div class="band seg seg-d"></div>

      <!-- td marker -->
      <div v-if="showMarker" class="marker" :style="{ left: pct(clampedTd) }" @mouseenter="hover=true" @mouseleave="hover=false">
        <div class="triangle"></div>
        <div v-if="hover" class="tooltip">
          <div><strong>Td:</strong> {{ td!.toFixed(1) }} min</div>
          <div v-if="band"><strong>Band:</strong> {{ band }}</div>
          <div v-if="hepFinal !== undefined"><strong>HEP_final:</strong> {{ formatSci(hepFinal) }}</div>
        </div>
      </div>
    </div>

    <div class="legend">
      <div><span class="box a"></span> (0,15] — 1.0</div>
      <div><span class="box b"></span> (15,30] — 1E-1</div>
      <div><span class="box c"></span> (30,60] — 1E-2</div>
      <div><span class="box d"></span> (60,120] — 1E-3</div>
    </div>

    <div class="summary">
      
      <div v-if="showMarker">Td: {{ td!.toFixed(1) }} min · Band: {{ band || '—' }} · HEP_final: {{ hepFinal!==undefined ? formatSci(hepFinal) : '—' }}</div>
      <div v-else-if="hepFinal !== undefined" class="muted">A类 HEP_final：{{ formatSci(hepFinal) }}</div>
      <div v-else class="muted">尚无 Td，请先执行计算</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
const props = defineProps<{
  td: number | null,
  band?: string,
  hepFinal?: number | null,
  disabled?: boolean
}>()

const hover = ref(false)

// 严格判断是否显示 marker（必须是 number 且非 NaN）
const showMarker = computed(() => typeof props.td === 'number' && !isNaN(props.td))
const td = computed<number | null>(() => showMarker.value ? Number(props.td) : null)
const clampedTd = computed(()=> Math.max(0, Math.min(120, Number(td.value ?? 0))))
const band = computed(()=> props.band ?? '')
const hepFinal = computed(()=> props.hepFinal)

watch(()=> props.td, v => console.debug('[TimeBandBar] td prop ->', v))
watch(()=> props.band, v => console.debug('[TimeBandBar] band prop ->', v))
watch(()=> props.hepFinal, v => console.debug('[TimeBandBar] hepFinal prop ->', v))

function pct(n:number){ return `${(n / 120 * 100).toFixed(4)}%` }
function formatSci(x:number|null|undefined){
  if (x === null || x === undefined) return '—'
  if (x === 0) return '0'
  return Number(x).toExponential(3)
}
</script>

<style scoped>
.timeband-root{ width:100%; max-width:760px }
.ticks{ display:flex; justify-content:space-between; font-size:12px; color:#555; margin-bottom:6px }
.band-wrap{ position:relative; height:24px; border-radius:6px; overflow:visible; background:#eee; } /* overflow:visible */
.band{ position:absolute; top:0; height:100% }
.seg-a{ left:0; width:12.5%; background:linear-gradient(90deg,#ff8a80,#ff5252) }
.seg-b{ left:12.5%; width:12.5%; background:linear-gradient(90deg,#ffcc80,#ffab40) }
.seg-c{ left:25%; width:25%; background:linear-gradient(90deg,#fff59d,#ffee58) }
.seg-d{ left:50%; width:50%; background:linear-gradient(90deg,#c8e6c9,#66bb6a) }

.marker{ position:absolute; top:-14px; transform:translateX(-50%); cursor:pointer; z-index:50; } /* z-index 提高，top 调整 */
.triangle{ width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:10px solid #111; }
.tooltip{ position:absolute; top:-70px; left:50%; transform:translateX(-50%); background:white; border:1px solid #ddd; padding:8px; border-radius:6px; box-shadow:0 4px 12px rgba(0,0,0,0.08); min-width:160px; font-size:13px }
.legend{ display:flex; gap:12px; margin-top:8px; font-size:13px; color:#333 }
.box{ display:inline-block; width:14px; height:12px; border-radius:3px; margin-right:6px; vertical-align:middle }
.box.a{ background:#ff5252 } .box.b{ background:#ffab40 } .box.c{ background:#ffee58 } .box.d{ background:#66bb6a }
.summary{ margin-top:8px; font-size:13px; color:#222 }
.muted{ color:#888 }
.band-wrap.disabled{ opacity:0.5; filter:grayscale(0.6) }
</style>
