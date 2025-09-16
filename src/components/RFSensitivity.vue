<!-- src/components/RFSensitivity.vue -->
<template>
  <div class="card">
    <div class="hdr">
      <h3>因子敏感性图（A类：BHEP × RF × I_rad）</h3>
      <div class="ops">
        <label class="switch">
          <input type="checkbox" v-model="useLogShare" />
          <span>显示为对数份额（log-share）</span>
        </label>
      </div>
    </div>

    <div v-if="bars.length" ref="chartEl" class="chart"></div>
    <div v-else class="empty">无可用 RF 数据（未选择 RF，或计算尚未完成）。</div>

    <div class="meta">
      <div>当前：BHEP={{ fmtSci(bhep) }} · I_rad={{ radFactor }} · HEP_final={{ fmtSci(hepFinal) }}</div>
      <div v-if="!useLogShare" class="hint">条形值 = ΔHEP（去掉该 RF 后 HEP 的增加量）；越大表示该因子对风险抑制越关键。</div>
      <div v-else class="hint">条形值 = log 份额 s_i = ln(p_i)/Σln(p_j)（仅在已选 RF 上归一）；反映“联合失败”结构中该因子份额。</div>
    </div>

    <ul class="table">
      <li v-for="r in details" :key="r.code">
        <span class="tag">{{ codeLabel(r.code) }}</span>
        <span class="mono">p_i={{ fmtSci(r.p) }}</span>
        <span v-if="!useLogShare" class="mono">ΔHEP={{ fmtSci(r.delta) }}</span>
        <span v-else class="mono">份额={{ (r.share*100).toFixed(1) }}%</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'

type RfSel = { code: 'INDICATION'|'IM_FC'|'SUPERVISION'|'ROUTINE_CHECK'|string; hep_fail: number }

const props = defineProps<{
  bhep: number | null
  radFactor: number | null
  hepFinal: number | null
  rfSelected: RfSel[] | null
}>()

// —— 显示模式：ΔHEP（默认） / log-share ——
const useLogShare = ref(false)

const chartEl = ref<HTMLDivElement|null>(null)
let chart: echarts.ECharts | null = null

// 统一标签
function codeLabel(code:string){
  switch(code){
    case 'INDICATION': return '控制室指示 (INDICATION)'
    case 'IM_FC': return '维修/标定后检查 (IM_FC)'
    case 'SUPERVISION': return '人员监督 (SUPERVISION)'
    case 'ROUTINE_CHECK': return '定期巡检 (ROUTINE_CHECK)'
    default: return code
  }
}
function fmtSci(x:number|null|undefined){
  if (x==null) return '—'
  if (x===0) return '0'
  return Number(x).toExponential(3)
}

const bhep = computed(()=> props.bhep ?? 0)
const radFactor = computed(()=> props.radFactor ?? 1)
const rf = computed(()=> Array.isArray(props.rfSelected) ? props.rfSelected : [])

const hepAll = computed(()=> {
  // 用 props.hepFinal，如果后端就按 bhep * Πp_i * I_rad 算，这里只是校对，不做重算
  if (typeof props.hepFinal === 'number') return props.hepFinal
  // 兜底重算
  const prod = rf.value.reduce((a,b)=> a * (Number(b.hep_fail)||1), 1)
  return bhep.value * prod * radFactor.value
})

// 计算两个度量
type Detail = { code:string; p:number; delta:number; share:number }
const details = computed<Detail[]>(()=> {
  if (!rf.value.length) return []
  const pList = rf.value.map(x => Math.max(Number(x.hep_fail)||0, Number.EPSILON))
  const prodAll = pList.reduce((a,b)=> a*b, 1)
  const hfAll = bhep.value * prodAll * radFactor.value

  // ΔHEP：把 p_i 置为 1（移除该RF）
  const deltas = rf.value.map((x, idx) => {
    const without = pList.reduce((a,b,i)=> a * (i===idx ? 1 : b), 1)
    const hepWithout = bhep.value * without * radFactor.value
    return hepWithout - hfAll
  })

  // log-share：对已选 RF 的 ln(p) 归一
  const logs = pList.map(p => Math.log(p))
  const sumLogs = logs.reduce((a,b)=> a + b, 0)
  const shares = logs.map(v => sumLogs===0 ? 0 : v / sumLogs)

  return rf.value.map((x, i)=> ({
    code: x.code,
    p: pList[i],
    delta: deltas[i],
    share: shares[i]
  }))
})

// 条形图数据
const bars = computed(()=> {
  if (!details.value.length) return []
  return details.value
    .map(d => ({
      name: codeLabel(d.code),
      value: useLogShare.value ? d.share : d.delta
    }))
    // ΔHEP 时，按贡献从大到小；log-share 时按份额从大到小
    .sort((a,b)=> Math.abs(b.value) - Math.abs(a.value))
})

function render(){
  if(!chartEl.value) return
  if(!chart) chart = echarts.init(chartEl.value)

  const option: echarts.EChartsOption = {
    grid: { left: 120, right: 24, top: 24, bottom: 24 },
    tooltip: {
      trigger: 'item',
      formatter: (p:any) => {
        const d = details.value.find(x => codeLabel(x.code)===p.name)
        if (!d) return p.name
        if (!useLogShare.value){
          return [
            `<b>${p.name}</b>`,
            `p_i = ${fmtSci(d.p)}`,
            `ΔHEP = ${fmtSci(d.delta)}`
          ].join('<br/>')
        } else {
          return [
            `<b>${p.name}</b>`,
            `p_i = ${fmtSci(d.p)}`,
            `log 份额 = ${(d.share*100).toFixed(1)}%`
          ].join('<br/>')
        }
      }
    },
    xAxis: {
      type: 'value',
      name: useLogShare.value ? '份额（占比）' : 'ΔHEP',
      axisLabel: {
        formatter: (v:number) => useLogShare.value ? `${(v*100).toFixed(0)}%` : Number(v).toExponential(1)
      }
    },
    yAxis: {
      type: 'category',
      data: bars.value.map(b => b.name)
    },
    series: [{
      type: 'bar',
      data: bars.value.map(b => b.value),
      itemStyle: { color: useLogShare.value ? '#1f9d8f' : '#2563eb' },
      label: {
        show: true,
        position: 'right',
        formatter: (p:any)=> {
          const v = p.value as number
          return useLogShare.value ? `${(v*100).toFixed(1)}%` : Number(v).toExponential(1)
        }
      }
    }]
  }

  chart.setOption(option, true)
  chart.resize()
}

onMounted(()=>{ render(); window.addEventListener('resize', onResize) })
onBeforeUnmount(()=>{ window.removeEventListener('resize', onResize); chart?.dispose(); chart=null })
watch([rf, bhep, radFactor, useLogShare], render, { deep:true })

function onResize(){ chart?.resize() }
</script>

<style scoped>
.card{ background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:12px; margin-top:12px }
.hdr{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px }
.hdr h3{ font-size:14px; font-weight:600; color:#111827 }
.ops{ font-size:12px; color:#374151 }
.switch{ display:flex; align-items:center; gap:6px; cursor:pointer }
.chart{ width:100%; height:300px }
.empty{ font-size:12px; color:#6b7280; padding:12px }
.meta{ margin-top:8px; font-size:12px; color:#374151 }
.meta .hint{ color:#6b7280 }
.table{ margin-top:6px; font-size:12px; color:#1f2937; list-style:none; padding:0 }
.table li{ display:flex; gap:12px; align-items:center; padding:2px 0 }
.tag{ background:#f3f4f6; padding:2px 6px; border-radius:4px }
.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace }
</style>
