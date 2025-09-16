<template>
  <div class="screen">
    <h1 class="page-title">HRA 筛选计算</h1>

    <div class="layout">
      <!-- 左侧：筛选 + A/C 表单 + 结果 -->
      <section class="left">
        <!-- 任务/场景选择 -->
        <t-card class="mb" :bordered="true">
          <div class="filters">
            <!-- 任务选择：多选 + 可排序 -->
<!-- 任务选择：C=单选；A=多选 -->
<div class="filter">
  <label>任务选择</label>

  <!-- C 类：单选 -->
  <t-select
    v-if="tab==='C'"
    v-model="selectedTaskId"
    :options="taskOptions"
    clearable
    placeholder="请选择任务（单选）"
    :keys="{ label:'label', value:'value' }"
  />

  <!-- A 类：多选 + 可排序 -->
  <template v-else>
    <t-select
      v-model="selectedTaskIds"
      :options="taskOptions"
      multiple
      filterable
      clearable
      :min-collapsed-num="2"
      placeholder="可多选（顺序即执行顺序）"
      :keys="{ label:'label', value:'value' }"
    />
    <!-- 简易排序条（保持排版简洁） -->
    <ul class="chips">
      <li v-for="(tid, idx) in selectedTaskIds" :key="tid" class="chip">
        <span class="chip__label">{{ taskLabel(tid) }}</span>
        <span class="chip__ops">
          <t-button size="small" variant="text" @click="moveTask(idx,-1)" :disabled="idx===0">上移</t-button>
          <t-button size="small" variant="text" @click="moveTask(idx, 1)" :disabled="idx===selectedTaskIds.length-1">下移</t-button>
          <t-button size="small" variant="text" theme="danger" @click="removeTask(idx)">移除</t-button>
        </span>
      </li>
    </ul>
  </template>
</div>

            <div class="filter">
              <label>场景选择（C 类）</label>
              <t-select
                v-model="selectedScenarioId"
                :options="scenarioOptions"
                clearable
                placeholder="请选择场景"
                :keys="{ label:'label', value:'value' }"
                @change="onScenarioChange"
              />
            </div>
          </div>
        </t-card>

        <!-- A/C 表单 -->
        <t-card :bordered="true" class="mb">
          <template #header>
            <t-tabs v-model:value="tab" size="large">
              <t-tab-panel value="C" label="C 类（事故后：时窗法）" />
              <t-tab-panel value="A" label="A 类（事故前：BHEP×RF）" />
            </t-tabs>
          </template>

          <!-- C 类 -->
          <div v-if="tab==='C'" class="form-grid">
            <!-- 行1：Tm/Ta -->
            <div class="grid-3">
              <div>
                <label>场景上限时间 Tm（min）</label>
                <t-input type="number" v-model.number="cForm.tm_minutes" />
              </div>
              <div>
                <label>执行时间 Ta（min）</label>
                <t-input type="number" v-model.number="cForm.ta_minutes" />
              </div>
              <div>
                <label>仪表状态</label>
                <t-select v-model="cForm.instrument_status" :options="instrumentOptions" />
              </div>
            </div>

            <!-- 行2：诊断事件次序（整行） -->
            <div class="row">
              <label class="row-label">诊断事件次序</label>
              <t-radio-group v-model="cForm.diag_order" variant="default-filled">
                <t-radio-button :value="1">首发</t-radio-button>
                <t-radio-button :value="2">第二近时</t-radio-button>
                <t-radio-button :value="3">第三及以上</t-radio-button>
              </t-radio-group>
            </div>

            <!-- 行3：动作类型/压力/复杂度(回显) -->
            <div class="grid-3">
              <div>
                <label>动作类型</label>
                <t-select v-model="cForm.action_class" :options="actionClassOptions" />
              </div>
              <div>
                <label>压力等级</label>
                <t-select v-model="cForm.stress_level" :options="stressOptions" />
              </div>
              <div>
                <label>复杂度（仅回显）</label>
                <t-select v-model="cForm.complexity" :options="complexityOptions" />
              </div>
            </div>

            <!-- 行4：多告警 / 控制室外 / 无程序 -->
            <div class="grid-3">
              <div>
                <label>多告警数量 N</label>
                <t-input type="number" v-model.number="cForm.annunciator_count" />
              </div>
              <div class="checkbox-line">
                <t-checkbox v-model="cForm.control_room_outside">控制室外（筛选短路）</t-checkbox>
              </div>
              <div class="checkbox-line">
                <t-checkbox v-model="noProcedure">无程序（筛选短路）</t-checkbox>
              </div>
            </div>

            <!-- 高级：重叠窗口（当前版本不参与计算） -->
            <div class="adv">
              <t-checkbox v-model="showAdvanced">显示高级选项</t-checkbox>
              <div v-if="showAdvanced" class="grid-3 mt-1">
                <div>
                  <label>重叠窗口 Δ（s）<span class="muted">（当前版本未参与计算）</span></label>
                  <t-input type="number" v-model.number="cForm.overlap_window_sec" />
                </div>
              </div>
            </div>

            <div class="ops">
              <t-button theme="primary" :disabled="!canComputeC" @click="onCalcC">计算 C 类</t-button>
              <t-button variant="outline" @click="resetC">清空</t-button>
            </div>
          </div>

          <!-- A 类 -->
          <div v-else class="form-grid">
            <div class="grid-2">
              <div>
                <label>BHEP（若任务库无则此处填写）</label>
                <t-input type="number" v-model.number="aForm.bhep" />
              </div>
              <div class="checkbox-line">
                <t-checkbox v-model="aForm.radiation_zone">辐射区（×2）</t-checkbox>
              </div>
            </div>

            <div class="grid-3">
  <div>
    <label>系统逻辑</label>
    <t-select v-model="aForm.system_logic" :options="systemLogicOptions" />
  </div>
  <div>
    <label>依赖输入</label>
    <t-radio-group v-model="depMode" variant="default-filled" size="small">
      <t-radio-button value="UNIFORM">统一等级</t-radio-button>
      <t-radio-button value="PAIRWISE">成对矩阵</t-radio-button>
    </t-radio-group>
  </div>
  <div v-if="depMode==='UNIFORM'">
    <label>依赖等级（统一）</label>
    <t-select v-model="aForm.dependence_level" :options="dependenceOptions" />
  </div>
</div>

<!-- 成对依赖矩阵编辑（仅当选择PAIRWISE时出现） -->
<div v-if="depMode==='PAIRWISE'">
  <label>成对依赖矩阵（上三角）</label>
  <DependenceMatrix v-model="pairwiseMatrix" :tasks="selectedTaskLabels" />
</div>


            <div>
              <label>恢复因子（RF）选择</label>
              <RFSelector v-model="aForm.rf_checked" />
            </div>

            <div class="ops">
              <t-button theme="primary" :disabled="!canComputeA" @click="onCalcA">计算 A 类</t-button>
              <t-button variant="outline" @click="resetA">清空</t-button>
            </div>
          </div>
        </t-card>

        <!-- 结果与追溯 -->
        <ResultCard
          v-if="traceMd"
          :trace="traceMd"
          :refs="refs"
          :taskName="resultTaskName"
          :scenarioName="resultScenarioName"
        />
        <t-card v-if="summary" class="mb" :bordered="true">
          <template #title>数值摘要</template>
          <pre class="summary">{{ summary }}</pre>
        </t-card>
      </section>

      <!-- 右侧：图表区 -->
      <section class="right">
        <template v-if="tab === 'C'">
          <t-card class="mb" :bordered="true">
            <template #title>时窗色带（速览 0–120 min）</template>
            <TimeBandBar
              :td="cResult?.td ?? null"
              :band="cResult?.band ?? ''"
              :hepFinal="cResult?.hepFinal"
              :disabled="!(cForm.tm_minutes && cForm.tm_minutes > 0)"
            />
            <t-empty v-if="!cResult" description="计算 C 类后显示色带" class="mt-2" />
          </t-card>

          <t-card class="mb" :bordered="true">
            <template #header>
              <div class="card-head">
                <span>时序演化图（首发/第二近时/第三+ 可切换或叠加）</span>
                <div class="head-controls">
                  <t-radio-group v-model="curveMode" size="small" variant="default-filled">
                    <t-radio-button value="FIRST">首发</t-radio-button>
                    <t-radio-button value="SECOND">第二近时</t-radio-button>
                    <t-radio-button value="THIRD_PLUS">第三及以上</t-radio-button>
                  </t-radio-group>
                  <t-checkbox v-model="overlayAll" class="ml-2">叠加</t-checkbox>
                </div>
              </div>
            </template>
            <HepTimeline :markers="timelineMarkers" :curve-type="curveMode" :overlay-all="overlayAll" />
            <t-empty v-if="!timelineMarkers.length" description="计算 C 类后显示时序点" class="mt-2" />
          </t-card>

          <t-card :bordered="true">
            <template #title>场景对比</template>
            <ScenarioCompare v-if="compareMarkers.length" :markers="compareMarkers" />
            <t-empty v-else description="计算 C 类后可累积比较" />
          </t-card>
        </template>

        <template v-else>
          <t-card :bordered="true">
            <template #title>敏感性分析（A 类）</template>
            <RFSensitivity
              v-if="aResult"
              :bhep="aResult?.bhep ?? null"
              :radFactor="aResult?.radFactor ?? null"
              :hepFinal="aResult?.hepFinal ?? null"
              :rfSelected="aResult?.rfSelected ?? null"
            />
            <t-empty v-else description="计算 A 类后显示敏感性图" />
          </t-card>
        </template>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { calcCScreen, calcAScreen, calcASystem, listTasks, listScenarios } from '../api/hra'

import type { CScreenReq, CScreenResp, AScreenReq, AScreenResp } from '../api/types'

import TimeBandBar from '../components/TimeBandBar.vue'
import RFSelector from '../components/RFSelector.vue'
import ResultCard from '../components/ResultCard.vue'
import ScenarioCompare from '../components/ScenarioCompare.vue'
import RFSensitivity from '../components/RFSensitivity.vue'
import HepTimeline from '../components/HepTimeline.vue'


import {
  Tabs as TTabs, TabPanel as TTabPanel, Card as TCard, Select as TSelect, Input as TInput,
  Checkbox as TCheckbox, Button as TButton, Empty as TEmpty, MessagePlugin,
  RadioGroup as TRadioGroup, RadioButton as TRadioButton
} from 'tdesign-vue-next'

/** —— API 基址（避免 /api 重复） —— */
const API_EVENTS = (import.meta as any).env?.VITE_API_EVENTS?.replace(/\/$/, '')
 || 'http://localhost:8089/api/events';
 const API_CALC   = (import.meta as any).env?.VITE_API_CALC?.replace(/\/$/, '')
|| 'http://localhost:8089/api/calc';
/** 路由中的事件上下文（若存在则走 /api/events/{id}/compute/c） */
const route = useRoute()
const eventId = computed<number | null>(() => {
  const v = route.query?.eventId
  if (v==null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
})

/** Tabs */
const tab = ref<'A'|'C'>('C')

/** 曲线切换 */
type CurveMode = 'FIRST' | 'SECOND' | 'THIRD_PLUS'
const curveMode = ref<CurveMode>('FIRST')
const overlayAll = ref<boolean>(false)

/** 高级选项：重叠窗口Δ */
const showAdvanced = ref(false)

/** 选项常量 */
const actionClassOptions = [
  { label: '逐步（STEP）', value: 'STEP' },
  { label: '动态（DYNAMIC）', value: 'DYNAMIC' },
  { label: '立即应急（IMMEDIATE+书面备份）', value: 'IMMEDIATE' },
]
const stressOptions = [
  { label: '中‑高（MOD_HIGH）', value: 'MOD_HIGH' },
  { label: '极高（EXTREME）', value: 'EXTREME' },
]
const complexityOptions = [
  { label: 'SIMPLE（简单）', value: 'SIMPLE' },
  { label: 'COMPLEX（复杂）', value: 'COMPLEX' },
]
const instrumentOptions = [
  { label: '正常（NOMINAL/OK）', value: 'NOMINAL' },
  { label: 'FAILED（失效）', value: 'FAILED' },
  { label: 'MISLEADING（误导）', value: 'MISLEADING' },
]
const dependenceOptions = [
  { label: 'ZD', value: 'ZD' }, { label: 'LD', value: 'LD' },
  { label: 'MD', value: 'MD' }, { label: 'HD', value: 'HD' },
  { label: 'CD', value: 'CD' },
]
const systemLogicOptions = [
  { label: 'SERIES（串联）', value: 'SERIES' },
  { label: 'PARALLEL（并联）', value: 'PARALLEL' },
]

/** 下拉：任务与场景 */
const tasks = ref<Array<{id:number; taskName?:string; name?:string; acc_class?:string; accidentClass?:string; bhep?:number|null}>>([])
const scenarios = ref<Array<{id:number; scenName?:string; name?:string; tmMinutes:number|null; plantArea?:string}>>([])
const selectedTaskId = ref<number | undefined>(undefined)
const selectedScenarioId = ref<number | undefined>(undefined)

const taskOptions = computed(() => tasks.value.map(t => ({
  label: `${t.taskName ?? t.name ?? ''}${(t.accidentClass ?? t.acc_class) ? `（${t.accidentClass ?? t.acc_class}）` : ''}`,
  value: (t as any).id
})))
const scenarioOptions = computed(() => scenarios.value.map(s => ({
  label: s.scenName ?? s.name ?? '', value: (s as any).id
})))
function onScenarioChange() {
  const s = scenarios.value.find(x => (x as any).id === selectedScenarioId.value)
  if (s && s.tmMinutes) cForm.tm_minutes = s.tmMinutes
}

/** C 类表单（含动作/压力/事件次序） */
const cForm = reactive<CScreenReq & {
  diag_order: 1|2|3
  action_class: 'STEP'|'DYNAMIC'|'IMMEDIATE'
  stress_level: 'MOD_HIGH'|'EXTREME'
}>({
  tm_minutes: 45,
  ta_minutes: 10,
  diag_order: 1,
  action_class: 'STEP',
  stress_level: 'MOD_HIGH',
  control_room_outside:false,
  complexity:'SIMPLE',
  annunciator_count: 2,
  overlap_window_sec: undefined, // 高级选项；当前版本未参与计算
  procedure_available: true,
  instrument_status: 'NOMINAL',
  travel_path_id: undefined,
  travel_time_sec_lb: undefined,
  travel_time_sec_ub: undefined
})
/** “无程序” 与 procedure_available 的对偶绑定 */
const noProcedure = computed({
  get: ()=> cForm.procedure_available === false,
  set: (v:boolean)=>{ cForm.procedure_available = !v }
})

/** A 类表单 */
const aForm = reactive<AScreenReq>({
  bhep: undefined, rf_checked: [], radiation_zone:false,
  dependence_group_id: undefined, dependence_level:'ZD', system_logic:'SERIES',
  group_items: undefined
})

/** 结果态 */
const cResult = ref<CScreenResp|null>(null)
const aResult = ref<AScreenResp|null>(null)
const traceMd = ref<string|null>(null)
const refs = ref<Array<{id:string, desc:string, source:string, filecite?:string}>|undefined>(undefined)
const summary = ref<string|null>(null)
const resultTaskName = ref<string|undefined>(undefined)
const resultScenarioName = ref<string|undefined>(undefined)

/** 比较/时序点 */
const compareMarkers = ref<Array<{name:string; td:number; hepFinal:number; fcx:1|3}>>([])
const timelineMarkers = computed(() =>
  compareMarkers.value.map(m => ({ name:m.name, td:m.td, hep:m.hepFinal, fcx:m.fcx }))
)

/** 能否计算 */
const canComputeC = computed(()=> cForm.tm_minutes!=null && Number(cForm.tm_minutes)>0 )
const canComputeA = computed(()=> true )

/** 加载下拉 */
onMounted(async ()=>{
  try { tasks.value = await listTasks() } catch(e){ console.error('加载任务失败', e) }
  try { scenarios.value = await listScenarios() } catch(e){ console.error('加载场景失败', e) }
})

/** 实际调用：带 eventId 走事件接口，否则走通用代理 */
async function callCalcC(){
  if (!selectedTaskId.value){
    throw new Error('taskId 不能为空（请选择任务）')
  }
  if (eventId.value){
    // 事件态：驼峰 taskId / scenarioId
    const reqBody:any = {
      ...cForm,
      taskId: selectedTaskId.value,
      scenarioId: selectedScenarioId.value ?? null
    }
    const resp = await fetch(`${API_EVENTS}/${eventId.value}/compute/c`, {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(reqBody)
    })
    if(!resp.ok){
      const txt = await resp.text().catch(()=> '')
      throw new Error(txt || `HTTP ${resp.status}`)
    }
    return await resp.json()
  }else{
    // 通用代理：下划线 task_id / scenario_id（Flask 期望）
    const body = { ...cForm, task_id: selectedTaskId.value, scenario_id: selectedScenarioId.value ?? undefined }
    return await calcCScreen(body as any)
  }
}

/** 计算 C 类 */
async function onCalcC(){
  cResult.value = aResult.value = null
  traceMd.value = summary.value = null
  refs.value = undefined
  resultTaskName.value = resultScenarioName.value = undefined

  try{
    const resp:any = await callCalcC()
    cResult.value = resp
    traceMd.value = resp.traceMd
    refs.value = resp.refs

 summary.value = [
  `Td = ${resp.td} min`,
  `Band = ${resp.band}`,
  `HEP_diag = ${resp.hepDiag}`,
  `HEP_final(point) = ${resp.hepFinal}`,
  (resp.hepMean!=null) ? `HEP_mean = ${resp.hepMean}` : '',
  (resp.hepLb!=null && resp.hepUb!=null) ? `区间(5%-95%) = [${resp.hepLb}, ${resp.hepUb}], EF≈${resp.ef}` : ''
].filter(Boolean).join('\n')

    const t = tasks.value.find(x=> (x as any).id===selectedTaskId.value)
    const s = scenarios.value.find(x=> (x as any).id===selectedScenarioId.value)
    resultTaskName.value = (t as any)?.taskName ?? (t as any)?.name
    resultScenarioName.value = (s as any)?.scenName ?? (s as any)?.name

    if (typeof resp.td==='number' && !isNaN(resp.td)){
      compareMarkers.value.push({
        name: resultScenarioName.value ?? resultTaskName.value ?? `计算#${resp.id}`,
        td: Number(resp.td),
        hepFinal: Number(resp.hepFinal),
        fcx: 1
      })
      if (compareMarkers.value.length > 6) compareMarkers.value.shift()
    }
  }catch(e:any){
    console.error(e)
    MessagePlugin.error(`计算 C 类失败：${e?.message ?? ''}`)
  }
}

/** 计算 A 类 */
async function onCalcA(){
  cResult.value = aResult.value = null
  traceMd.value = summary.value = null
  refs.value = undefined
  resultTaskName.value = resultScenarioName.value = undefined

  // 单任务：兼容原行为
  if (selectedTaskIds.value.length <= 1){
    // （原始逻辑保留不变）
    const t = tasks.value.find(x=> (x as any).id===selectedTaskId.value)
    const bhepFromTask = (t as any)?.bhep
    if (bhepFromTask!=null && aForm.bhep==null) aForm.bhep = bhepFromTask
    const payload = JSON.parse(JSON.stringify({ ...aForm, task_id: selectedTaskId.value ?? undefined }))
    try{
      const resp:any = await calcAScreen(payload)
      aResult.value = resp
      cResult.value = { td:null, band:'', hepFinal: resp.hepFinal } as any
      traceMd.value = resp.traceMd; refs.value = resp.refs
      summary.value = `HEP_final = ${resp.hepFinal}`
    }catch(e:any){ MessagePlugin.error(`计算 A 类失败：${e?.message ?? ''}`) }
    return
  }

  // 多任务：系统级
  const group_items = selectedTaskIds.value.map(tid=>{
    const t = tasks.value.find(x => (x as any).id === tid) as any
    return { bhep: t?.bhep ?? aForm.bhep ?? 0.03, rf_checked: aForm.rf_checked, radiation_zone: aForm.radiation_zone }
  })
  const body:any = {
    group_items,
    system_logic: aForm.system_logic,
    dep_mode: depMode.value,
    rf_checked: aForm.rf_checked,
    radiation_zone: aForm.radiation_zone
  }
  if (depMode.value === 'UNIFORM'){
    body.dependence_level = aForm.dependence_level
  }else{
    body.pairwise = pairwiseMatrix.value
  }

  try{
    const resp:any = await calcASystem(body)
    aResult.value = { ...resp, hepFinal: resp.systemFail }  // 让右侧敏感性图复用
    cResult.value = { td:null, band:'', hepFinal: resp.systemFail } as any
    traceMd.value = resp.traceMd; refs.value = resp.refs
    summary.value = [
      `系统逻辑：${resp.logic}；依赖：${resp.depMode}${resp.depLevel?('='+resp.depLevel):''}`,
      `子项q = ${resp.qList?.map((x:number)=>x.toExponential(2)).join(', ')}`,
      `系统失败（HEP_final） = ${resp.systemFail}`
    ].join('\n')
  }catch(e:any){ console.error(e); MessagePlugin.error(`系统级 A 类失败：${e?.message ?? ''}`) }
}


/** 重置 */
function resetC(){
  cForm.tm_minutes=45; cForm.ta_minutes=10; cForm.diag_order=1
  cForm.action_class='STEP'; cForm.stress_level='MOD_HIGH'
  cForm.control_room_outside=false; cForm.complexity='SIMPLE'
  cForm.annunciator_count=2; cForm.overlap_window_sec=undefined
  cForm.procedure_available=true; cForm.instrument_status='NOMINAL'
  cResult.value = traceMd.value = summary.value = null; refs.value = undefined
}
function resetA(){
  aForm.bhep=undefined; aForm.rf_checked=[]; aForm.radiation_zone=false
  aForm.dependence_group_id=undefined; aForm.dependence_level='ZD'; aForm.system_logic='SERIES'
  aResult.value = traceMd.value = summary.value = null; refs.value = undefined
}
const selectedTaskIds = ref<number[]>([])
function taskLabel(id:number){
  const t = tasks.value.find(x => (x as any).id === id)
  return `${(t as any)?.taskName ?? (t as any)?.name ?? id}`
}
function moveTask(i:number, step:number){
  const j = i + step
  if (j<0 || j>=selectedTaskIds.value.length) return
  const a = [...selectedTaskIds.value]
  const [x] = a.splice(i,1)
  a.splice(j,0,x)
  selectedTaskIds.value = a
}
function removeTask(i:number){ selectedTaskIds.value = selectedTaskIds.value.filter((_,k)=>k!==i) }
const depMode = ref<'UNIFORM'|'PAIRWISE'>('UNIFORM')
const selectedTaskLabels = computed(()=> selectedTaskIds.value.map(taskLabel))
const pairwiseMatrix = ref<string[][]>([])
// 当多选任务变化时，重建上三角矩阵（默认 ZD）
watch(selectedTaskIds, (ids)=>{
  const n = ids.length
  pairwiseMatrix.value = Array.from({length:n}, (_,i)=>
    Array.from({length:n}, (_,j)=> j<=i ? '-' : 'ZD')
  )
})
// Tab 切换时，同步单/多选的初始值
watch(tab, (nv) => {
  if (nv === 'A') {
    // 切到 A：如果多选还空，而单选已有值 → 用单选种子填入
    if (selectedTaskIds.value.length === 0 && selectedTaskId.value != null) {
      selectedTaskIds.value = [selectedTaskId.value]
    }
  } else {
    // 切到 C：如果单选还空，而多选有值 → 取多选第一项
    if ((selectedTaskId.value == null) && selectedTaskIds.value.length > 0) {
      selectedTaskId.value = selectedTaskIds.value[0]
    }
  }
})

// A 类多选变化时，重建成对依赖矩阵（仅在 A 下生效，避免 C 类也触发）
watch(selectedTaskIds, (ids: number[]) => {
  if (tab.value !== 'A') return
  const n = ids.length
  pairwiseMatrix.value = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (j <= i ? '-' : 'ZD'))
  )
})

</script>

<style scoped>
.screen{ max-width:1280px; margin:0 auto; padding:16px; }
.page-title{ font-size:20px; font-weight:700; margin-bottom:12px; }
.layout{ display:grid; grid-template-columns: 440px 1fr; gap:16px; }
.left, .right{ display:flex; flex-direction:column; }
.mb{ margin-bottom:12px; }

.filters{ display:grid; grid-template-columns: 1fr; gap:12px; }
.filter label{ display:block; font-size:12px; color:#6b7280; margin-bottom:6px; }

.form-grid{ display:flex; flex-direction:column; gap:12px; }
.grid-2{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.grid-3{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
.row{ display:grid; grid-template-columns: 140px 1fr; gap:12px; align-items:center; }
.row-label{ font-size:12px; color:#6b7280; text-align:right; }
.checkbox-line{ display:flex; align-items:center; gap:8px; padding-top:6px; }
.adv{ border-top:1px dashed #e5e7eb; padding-top:8px; }
.muted{ color:#9ca3af; font-size:12px; margin-left:6px; }
.ops{ display:flex; gap:8px; margin-top:4px; }

.summary{ margin:0; white-space:pre-wrap; font-size:13px; color:#1f2937; }

/* 卡片标题右侧控制条 */
.card-head{ display:flex; align-items:center; justify-content:space-between; }
.head-controls{ display:flex; align-items:center; }
.ml-2{ margin-left:8px; }

@media (max-width: 1080px){
  .layout{ grid-template-columns: 1fr; }
  .row{ grid-template-columns: 100px 1fr; }
}
.chips{ list-style:none; padding:6px 0 0; margin:0; display:flex; flex-wrap:wrap; gap:6px; }
.chip{ display:flex; align-items:center; gap:8px; border:1px solid #e5e7eb; border-radius:6px; padding:4px 6px; }
.chip__label{ font-size:12px; }
.chip__ops .t-button{ padding:0 4px; }

</style>
