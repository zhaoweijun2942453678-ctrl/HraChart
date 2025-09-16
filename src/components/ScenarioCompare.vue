<template>
  <div class="card">
    <div class="hdr">
      <h3>场景对比视图（ASEP 时窗法）</h3>
      <div class="hint">曲线为分段常数：HEP_diag×f_cx；标记点为各场景计算结果（Td, HEP_final）。</div>
    </div>
    <div ref="el" class="chart"></div>
    <div class="legend-tips">
      <span class="pill" :style="{background:'#1f77b4'}">f_cx=1（SIMPLE）</span>
      <span class="pill" :style="{background:'#d62728'}">f_cx=3（COMPLEX）</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, computed } from 'vue'
import * as echarts from 'echarts'
import type { EChartsOption, SeriesOption } from 'echarts'

/** 父组件传入的对比项：
 * name: 用于标注（如“场景A（MCR）”）
 * td:  该场景计算得到的 Td（分钟）
 * hepFinal: 该场景的 HEP_final（诊断×复杂度）
 * fcx: 复杂度系数（1 或 3）
 */
const props = defineProps<{
  markers: { name:string; td:number; hepFinal:number; fcx:1|3 }[]
}>()

const el = ref<HTMLElement|null>(null)
let chart: echarts.ECharts | null = null

// —— ASEP 台阶（通用）；为保证视觉连贯，我们在分界点做“横→竖”阶梯 —— //
type StepCurve = { x:number[]; y:number[] }
function genAsepCurve(fcx:number): StepCurve {
  // 段：（0,15] 1.0；(15,30] 1E-1；(30,60] 1E-2；(60,120] 1E-3
  // 绘图 x 从 0 开始，方便显示；y 为 HEP_diag×fcx
  const segs = [
    { x0: 0,   x1: 15,  y: 1.0 * fcx },
    { x0: 15,  x1: 30,  y: 1e-1 * fcx },
    { x0: 30,  x1: 60,  y: 1e-2 * fcx },
    { x0: 60,  x1: 120, y: 1e-3 * fcx },
  ]
  const xs:number[] = []
  const ys:number[] = []
  segs.forEach((s, i) => {
    // 横线
    xs.push(s.x0, s.x1)
    ys.push(s.y,  s.y)
    // 与下一段竖连（避免连成斜线）
    if (i < segs.length - 1) {
      const next = segs[i+1]
      xs.push(s.x1, s.x1)
      ys.push(s.y,  next.y)
    }
  })
  return { x: xs, y: ys }
}

const hasSimple = computed(()=> props.markers.some(m=>m.fcx===1))
const hasComplex = computed(()=> props.markers.some(m=>m.fcx===3))

function render(){
  if(!el.value) return
  if(!chart) chart = echarts.init(el.value)

  // 生成需要的曲线
  const curves: {name:string; color:string; data: [number, number][]}[] = []
  if (hasSimple.value){
    const c = genAsepCurve(1)
    curves.push({
      name: 'f_cx=1 (SIMPLE)',
      color: '#1f77b4',
      data: c.x.map((x,i)=>[x, c.y[i]])
    })
  }
  if (hasComplex.value){
    const c = genAsepCurve(3)
    curves.push({
      name: 'f_cx=3 (COMPLEX)',
      color: '#d62728',
      data: c.x.map((x,i)=>[x, c.y[i]])
    })
  }

  // 标记点
  const markerSeries = {
    type: 'scatter',
    symbolSize: 10,
    itemStyle: { color: '#2ca02c' },
    name: '场景落点',
    data: props.markers.map(m => [m.td, m.hepFinal, m.name, m.fcx])
  }

  const option: echarts.EChartsOption = {
    grid: { left: 48, right: 24, top: 36, bottom: 40 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
      valueFormatter: (v)=> (typeof v==='number' ? v.toExponential(2) : String(v)),
      // 对散点自定义 tooltip
      formatter: (params:any) => {
        // 可能同时有线和点；挑出点
        const p = Array.isArray(params) ? params.find((x:any)=>x.seriesType==='scatter') : params
        if (p && p.seriesType==='scatter') {
          const [td, hep, name, fcx] = p.value as [number, number, string, number]
          return [
            `<div style="font-size:12px"><b>${name}</b></div>`,
            `Td=${td.toFixed(1)} min`,
            `HEP_final=${hep.toExponential(3)}`,
            `f_cx=${fcx}`
          ].join('<br/>')
        }
        // 线的默认
        return (Array.isArray(params) ? params : [params]).map((x:any)=> {
          const y = (typeof x.data?.[1]==='number') ? x.data[1] : x.value
          return `${x.marker}${x.seriesName}: ${Number(y).toExponential(2)}`
        }).join('<br/>')
      }
    },
    xAxis: {
      name: 'Td (min)',
      min: 0, max: 120, splitNumber: 8, type: 'value'
    },
    yAxis: {
      name: 'HEP',
      type: 'log',
      min: 1e-3, max: 1e+0,
      minorSplitLine: { show: true }
    },
    legend: { top: 0 },
    series: [
      ...curves.map(c => ({
        type: 'line',
        name: c.name,
        data: c.data,
        showSymbol: false,
        lineStyle: { width: 2, color: c.color },
        step: false // 我们用“横+竖”显式做了台阶
      })as SeriesOption), 
      markerSeries as SeriesOption // ✅ 给散点也断言
    ]as SeriesOption[]
  }

  chart.setOption(option, true)
  chart.resize()
}

onMounted(() => {
  render()
  window.addEventListener('resize', handleResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose(); chart=null
})
watch(()=>props.markers, render, { deep:true })

function handleResize(){ chart?.resize() }
</script>

<style scoped>
.card{ background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:12px; margin-top:12px }
.hdr{ display:flex; align-items:flex-end; gap:8px; margin-bottom:8px }
.hdr h3{ font-size:14px; font-weight:600; color:#111827 }
.hint{ font-size:12px; color:#6b7280 }
.chart{ width:100%; height:320px }
.legend-tips{ margin-top:8px; display:flex; gap:8px; font-size:12px; color:#374151 }
.pill{ display:inline-block; color:#fff; padding:2px 8px; border-radius:999px }
</style>
