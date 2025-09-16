<template>
  <div class="hep-timeline" ref="chartEl"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import * as echarts from 'echarts'

type Marker = { name: string; td: number; hep: number; fcx?: 1|3 }
type CurveMode = 'FIRST' | 'SECOND' | 'THIRD_PLUS'

const props = defineProps<{
  /** 时序点：会在曲线上叠加为散点 */
  markers: Marker[]
  /** 曲线类型（不叠加时只显示其中之一） */
  curveType?: CurveMode
  /** 叠加显示全部三条曲线 */
  overlayAll?: boolean
}>()

const chartEl = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

/** —— 初筛诊断台阶：不叠复杂度 —— */
/** 工具：把台阶断点（x,value）转为 step:'end' 的 ECharts (x,y) 点集 */
function stepsToSeriesData(bands: Array<[number, number]>) {
  if (!bands.length) return []
  const data: Array<[number, number]> = []
  // 初点：x=0 取第一段的 y
  data.push([0, bands[0][1]])
  for (const [x, y] of bands) data.push([x, y])
  return data
}

/** 首发：10/20/30/60/1500 → 0.5 / 0.1 / 0.01 / 0.001 / 0.0001 */
function firstBands() {
  return stepsToSeriesData([
    [10, 0.5],
    [20, 0.1],
    [30, 0.01],
    [60, 0.001],
    [1500, 0.0001]
  ])
}
/** 第二近时：10/20/30/40/70/1510 → 1.0 / 0.5 / 0.1 / 0.01 / 0.001 / 0.0001 */
function secondBands() {
  return stepsToSeriesData([
    [10, 1.0],
    [20, 0.5],
    [30, 0.1],
    [40, 0.01],
    [70, 0.001],
    [1510, 0.0001]
  ])
}
/** 第三及以上：按需保守为 1.0 水平线 */
function thirdPlusBands() {
  // 水平 1.0：用两个点构成 step
  return stepsToSeriesData([
    [1500, 1.0]
  ])
}

/** 需要展示的曲线（基础系列） */
const baseCurves = computed(() => {
  const wantAll = !!props.overlayAll
  const pick = (mode?: CurveMode) => (mode ?? 'FIRST')
  const series: echarts.SeriesOption[] = []

  const first = {
    name: '首发事件',
    type: 'line',
    step: 'end',
    showSymbol: false,
    data: firstBands()
  } as echarts.SeriesOption
  const second = {
    name: '第二近时',
    type: 'line',
    step: 'end',
    showSymbol: false,
    data: secondBands()
  } as echarts.SeriesOption
  const third = {
    name: '第三及以上',
    type: 'line',
    step: 'end',
    showSymbol: false,
    data: thirdPlusBands()
  } as echarts.SeriesOption

  if (wantAll) {
    series.push(first, second, third)
  } else {
    switch (pick(props.curveType)) {
      case 'SECOND':     series.push(second); break
      case 'THIRD_PLUS': series.push(third);  break
      default:           series.push(first)
    }
  }
  return series
})

/** markers → 散点系列 */
function markerSeries(): echarts.SeriesOption | null {
  const pts = (props.markers || [])
    .filter(m => Number.isFinite(m.td) && Number.isFinite(m.hep))
    .map(m => ({ value: [Number(m.td), Number(m.hep)], name: m.name }))
  if (!pts.length) return null
  return {
    name: '场景点',
    type: 'scatter',
    data: pts,
    label: {
      show: true,
      position: 'top',
      formatter: (p: any) => (p?.data?.name ?? '')
    },
    emphasis: { focus: 'series' }
  } as echarts.SeriesOption
}

/** 渲染 */
function render() {
  if (!chartEl.value) return
  chart = chart ?? echarts.init(chartEl.value)

  const series: echarts.SeriesOption[] = [
    ...baseCurves.value,
  ]
  const m = markerSeries()
  if (m) series.push(m)

  const option: echarts.EChartsOption = {
    grid: { left: 56, right: 24, top: 28, bottom: 40 },
    tooltip: { trigger: 'axis' },
    legend: { top: 4 },
    xAxis: { type: 'value', name: 'T (min)', min: 0, max: 1500, splitNumber: 6 },
    yAxis: { type: 'log', name: '诊断 HEP', min: 1e-4, max: 1.0, logBase: 10 },
    series
  }
  chart.setOption(option, true)
}

function resize() { chart?.resize() }

onMounted(() => {
  render()
  window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart?.dispose()
  chart = null
})

watch(
  () => [props.curveType, props.overlayAll, props.markers],
  async () => { await nextTick(); render() },
  { deep: true }
)
</script>

<style scoped>
.hep-timeline{
  width: 100%;
  height: 320px;
}
</style>
