<template>
  <div class="ledger-page">
    <section class="hero">
      <div class="hero__content">
        <h1>事件台账</h1>
        <p>从事件台账直达 ASEP：筛选、映射、计算，一步到位。</p>
      </div>
    </section>

    <div class="container">
      <t-card class="toolbar glass" :bordered="false" hover-shadow>
        <div class="toolbar__row">
          <t-input
            v-model="query.keyword"
            placeholder="搜索：编号 / 标题 / 地点"
            clearable
            @enter="toPage(0)"
            class="toolbar__input"
          >
            <template #prefix-icon>
              <SearchIcon />
            </template>
          </t-input>

          <t-date-range-picker
            v-model="query.range"
            :placeholder="['开始日期', '结束日期']"
            :separator="'至'"
            clearable
            allow-input
            value-type="Date"
            class="toolbar__date"
          />

          <t-select
            v-model="query.plantUnit"
            :options="plantUnitOptions"
            clearable
            placeholder="机组"
            class="toolbar__select"
          />

          <div class="grow"></div>

          <t-tooltip content="刷新">
            <t-button theme="primary" variant="outline" shape="square" @click="reload">
              <template #icon>
                <RefreshIcon />
              </template>
            </t-button>
          </t-tooltip>
          <t-button variant="outline" @click="resetQuery">重置</t-button>
        </div>
      </t-card>

      <t-card class="glass" :bordered="false" body-class-name="card-body" hover-shadow>
        <template #title>
          <div class="card-header">
            <span class="title">
              <TicketIcon />
              全部事件
            </span>
            <t-tag size="small" theme="success" variant="light-filled">
              共 {{ page?.totalElements ?? 0 }} 条
            </t-tag>
          </div>
        </template>

        <t-skeleton :loading="loading" animation="gradient" :row-col="skeletonRows">
          <template #default>
            <t-table
              v-if="(page?.content ?? []).length"
              :data="page?.content ?? []"
              :columns="columns"
              row-key="eventId"
              size="medium"
              hover
              :height="tableHeight"
              @row-dblclick="onRowDblClick"
            >
              <template #eventDate="{ row }">
                {{ fmtDate(row.eventDate) }}
              </template>
              <template #actions="{ row }">
                <div class="table-actions">
                  <t-button size="small" variant="text" theme="primary" @click="openDetail(row.eventId)">
                    <template #icon>
                      <BrowseIcon />
                    </template>
                    详情
                  </t-button>
                  <t-button size="small" variant="text" theme="danger" @click="removeOne(row.eventId)">
                    <template #icon>
                      <DeleteIcon />
                    </template>
                    删除
                  </t-button>
                  <t-button size="small" variant="text" theme="success" @click="goAsep(row.eventId)">
                    <template #icon>
                      <CpuIcon />
                    </template>
                    ASEP
                  </t-button>
                </div>
              </template>
            </t-table>
            <t-empty v-else description="暂无数据" />
          </template>
        </t-skeleton>

        <div class="pager" v-if="(page?.totalElements ?? 0) > 0">
          <t-pagination
            :total="page?.totalElements ?? 0"
            :page-size="pageSize"
            :current="pageIndex + 1"
            :show-page-size="false"
            :show-first-and-last-page-btn="false"
            :show-jumper="true"
            size="small"
            @current-change="onPageChange"
          />
        </div>
      </t-card>
    </div>

    <t-dialog
      v-model:visible="dlgVisible"
      width="820px"
      :close-on-overlay-click="false"
      :dialog-class-name="'glass-dialog'"
      destroy-on-close
    >
      <template #header>
        <div class="dialog-title">
          <BrowseIcon />
          <span>事件详情</span>
        </div>
      </template>

      <t-skeleton :loading="detailLoading" animation="gradient" :row-col="detailSkeletonRows">
        <template #default>
          <t-descriptions
            v-if="detail"
            :column="2"
            bordered
            size="small"
            class="mb-3"
            title="基本信息"
          >
            <t-descriptions-item label="编号">{{ detail.event.eventCode }}</t-descriptions-item>
            <t-descriptions-item label="时间">{{ fmtDate(detail.event.eventDate) }}</t-descriptions-item>
            <t-descriptions-item label="机组">{{ detail.event.plantUnit || '-' }}</t-descriptions-item>
            <t-descriptions-item label="地点">{{ detail.event.location || '-' }}</t-descriptions-item>
            <t-descriptions-item label="触发事件" :span="2">
              {{ detail.event.initiatingEvent || '-' }}
            </t-descriptions-item>
            <t-descriptions-item label="后果摘要" :span="2">
              {{ detail.event.consequenceSummary || '-' }}
            </t-descriptions-item>
            <t-descriptions-item label="报告来源" :span="2">
              {{ detail.event.reportRef || '-' }}
            </t-descriptions-item>
          </t-descriptions>

          <t-card class="mb-3 inner-card" :bordered="false">
            <template #title>
              <div class="card-header">
                <span class="title">
                  <ListIcon /> 动作序列
                </span>
                <t-tag size="small" theme="primary" variant="light">
                  {{ detail?.actions?.length ?? 0 }}
                </t-tag>
              </div>
            </template>
            <div class="scroll-block">
              <ol class="actions">
                <li v-for="a in (detail?.actions ?? [])" :key="a.actionId">
                  <b>#{{ a.stepNo ?? '-' }}</b>
                  {{ a.actionDesc || '(无描述)' }}
                  <span class="muted">
                    执行者：{{ a.actorRole || a.actorId || '-' }}；成功：{{ a.successFlag ? '是' : '否' }}
                  </span>
                </li>
              </ol>
            </div>
          </t-card>

          <t-card class="inner-card" :bordered="false">
            <template #title>
              <div class="card-header">
                <span class="title">
                  <MapRoutePlanningIcon /> 事件-任务-场景映射
                </span>
                <t-tag size="small" theme="warning" variant="light">
                  {{ detail?.mappings?.length ?? 0 }}
                </t-tag>
              </div>
            </template>
            <div class="scroll-block">
              <ul class="mappings">
                <li v-for="m in (detail?.mappings ?? [])" :key="m.id">
                  <t-tag size="small" theme="primary" variant="light-filled">
                    task_id={{ m.task?.id ?? m.taskId }}
                  </t-tag>
                  <t-tag size="small" class="ml-2" variant="light">
                    scenario_id={{ m.scenario?.id ?? m.scenarioId ?? '—' }}
                  </t-tag>
                  <span v-if="m.dependenceLevel" class="muted ml-2">依赖：{{ m.dependenceLevel }}</span>
                  <span v-if="m.systemLogic" class="muted ml-2">系统逻辑：{{ m.systemLogic }}</span>
                </li>
              </ul>
            </div>
          </t-card>
        </template>
      </t-skeleton>

      <template #footer>
        <t-button theme="primary" variant="base" @click="dlgVisible = false">关闭</t-button>
      </template>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin, DialogPlugin, type PrimaryTableCol } from 'tdesign-vue-next'
import {
  SearchIcon,
  RefreshIcon,
  BrowseIcon,
  DeleteIcon,
  CpuIcon,
  TicketIcon,
  ListIcon,
  MapRoutePlanningIcon,
} from 'tdesign-icons-vue-next'

const API = import.meta.env.VITE_API_BASE ?? 'http://localhost:8089'

const tableHeight = 'calc(70vh - 190px)'
const skeletonRows = [
  { type: 'rect', height: '24px', width: '100%' },
  { type: 'rect', height: '24px', width: '100%' },
  { type: 'rect', height: '24px', width: '100%' },
  { type: 'rect', height: '24px', width: '100%' },
  { type: 'rect', height: '24px', width: '100%' },
]
const detailSkeletonRows = [
  { type: 'rect', height: '22px', width: '70%' },
  { type: 'rect', height: '140px', width: '100%' },
  { type: 'rect', height: '160px', width: '100%' },
]

const columns: PrimaryTableCol<EventRow>[] = [
  { colKey: 'eventCode', title: '事件编号', width: 160 },
  { colKey: 'eventTitle', title: '事件名称', minWidth: 260, ellipsis: true },
  { colKey: 'plantUnit', title: '机组', width: 120 },
  { colKey: 'location', title: '地点', minWidth: 160, ellipsis: true },
  { colKey: 'eventDate', title: '发生时间', width: 200 },
  { colKey: 'actions', title: '操作', width: 220, fixed: 'right' },
]

type EventRow = {
  eventId: number
  eventCode: string
  eventTitle: string
  plantUnit?: string
  location?: string
  eventDate?: string
}

type Page<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
}

const loading = ref(false)
const page = ref<Page<EventRow> | null>(null)
const pageIndex = ref(0)
const pageSize = 10

const query = reactive({
  keyword: '',
  range: [] as [Date, Date] | [],
  plantUnit: '' as string | '',
})

const plantUnits = ref<string[]>(['I', 'II', 'III', 'IV'])
const plantUnitOptions = computed(() => plantUnits.value.map((u) => ({ label: u, value: u })))

function fmtDate(s?: string) {
  return s ? new Date(s).toLocaleString() : '-'
}

function camelEvent(e: any): EventRow {
  return {
    eventId: e.eventId ?? e.event_id,
    eventCode: e.eventCode ?? e.event_code,
    eventTitle: e.eventTitle ?? e.event_title,
    eventDate: e.eventDate ?? e.event_date,
    plantUnit: e.plantUnit ?? e.plant_unit,
    location: e.location,
  }
}

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(pageIndex.value), size: String(pageSize) })
    if (query.keyword) params.set('q', query.keyword)
    if (query.plantUnit) params.set('unit', query.plantUnit)
    if (query.range.length === 2) {
      params.set('from', query.range[0].toISOString())
      params.set('to', query.range[1].toISOString())
    }
    const res = await fetch(`${API}/events?${params.toString()}`)
    if (!res.ok) throw new Error(await res.text())
    const data = await res.json()
    page.value = { ...data, content: (data?.content ?? []).map(camelEvent) }
  } catch (e: any) {
    MessagePlugin.error('加载失败：' + (e?.message ?? ''))
    page.value = { content: [], totalElements: 0, totalPages: 1, number: 0 }
  } finally {
    loading.value = false
  }
}

function toPage(p: number) {
  pageIndex.value = Math.max(0, p)
  load()
}

function reload() {
  load()
}

function resetQuery() {
  query.keyword = ''
  query.range = []
  query.plantUnit = ''
  toPage(0)
}

const dlgVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<any | null>(null)

function camelAction(a: any) {
  return {
    actionId: a.actionId ?? a.action_id,
    stepNo: a.stepNo ?? a.step_no,
    actionDesc: a.actionDesc ?? a.action_desc,
    actorRole: a.actorRole ?? a.actor_role,
    actorId: a.actorId ?? a.actor_id,
    successFlag: a.successFlag ?? a.success_flag,
  }
}

function camelDetail(raw: any) {
  return {
    event: {
      ...camelEvent(raw.event ?? {}),
      initiatingEvent: raw.event?.initiatingEvent ?? raw.event?.initiating_event,
      consequenceSummary: raw.event?.consequenceSummary ?? raw.event?.consequence_summary,
      reportRef: raw.event?.reportRef ?? raw.event?.report_ref,
    },
    actions: (raw.actions ?? []).map(camelAction),
    mappings: (raw.mappings ?? raw.eventTaskScenes ?? []).map((m: any) => ({
      ...m,
      taskId: m.taskId ?? m.task_id,
      scenarioId: m.scenarioId ?? m.scenario_id,
    })),
  }
}

async function openDetail(id: number) {
  dlgVisible.value = true
  detailLoading.value = true
  try {
    const res = await fetch(`${API}/events/${id}`)
    if (!res.ok) throw new Error(await res.text())
    const raw = await res.json()
    detail.value = camelDetail(raw)
  } catch (e: any) {
    MessagePlugin.error('详情加载失败：' + (e?.message ?? ''))
  } finally {
    detailLoading.value = false
  }
}

function confirmDelete() {
  return new Promise<void>((resolve, reject) => {
    const dialog = DialogPlugin.confirm({
      header: '请确认',
      body: '确认删除该事件？将级联删除相关动作与映射。',
      theme: 'warning',
      confirmBtn: { content: '删除', theme: 'danger' },
      cancelBtn: '取消',
      onConfirm: () => {
        resolve()
        dialog.hide()
      },
      onCancel: () => {
        dialog.hide()
        reject(new Error('cancel'))
      },
      onClose: ({ trigger }) => {
        if (trigger !== 'confirm') {
          reject(new Error('cancel'))
        }
      },
    })
  })
}

async function removeOne(id: number) {
  try {
    await confirmDelete()
    const res = await fetch(`${API}/events/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(await res.text())
    MessagePlugin.success('已删除')
    await load()
  } catch (e: any) {
    if (e?.message && e.message !== 'cancel') {
      MessagePlugin.error('删除失败：' + e.message)
    }
  }
}

const router = useRouter()

function goAsep(id: number) {
  router.push({ name: 'HraScreening', query: { eventId: String(id) } })
}

function onRowDblClick(context: { row: EventRow }) {
  if (context?.row?.eventId != null) {
    openDetail(context.row.eventId)
  }
}

function onPageChange(current: number) {
  toPage(current - 1)
}

onMounted(load)
</script>

<style scoped>
.ledger-page {
  min-height: 100vh;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(56, 189, 248, 0.18), transparent),
    radial-gradient(1200px 600px at 90% 10%, rgba(34, 211, 238, 0.18), transparent),
    linear-gradient(180deg, #0b1020 0%, #0e1327 100%);
  color: #e6f6ff;
}

:deep(:root) {
  --td-brand-color: #22d3ee;
  --td-brand-color-hover: #2dd4bf;
  --td-brand-color-active: #0891b2;
}

.container {
  max-width: 1120px;
  margin: -60px auto 80px;
  padding: 0 16px;
}

.hero {
  height: 240px;
  display: grid;
  place-items: center;
}

.hero__content {
  text-align: center;
}

.hero__content h1 {
  font-size: 28px;
  margin: 0 0 8px;
  letter-spacing: 0.4px;
}

.hero__content p {
  opacity: 0.85;
}

.glass {
  backdrop-filter: blur(10px);
  background: rgba(15, 23, 42, 0.42) !important;
  border: 1px solid rgba(148, 163, 184, 0.35) !important;
  color: #eefaff;
}

:deep(.glass .t-card__body) {
  background: transparent !important;
  color: inherit;
}

:deep(.glass .t-card__title) {
  color: inherit;
}

.toolbar__row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.toolbar__input,
.toolbar__date,
.toolbar__select {
  width: 16rem;
}

.toolbar__date {
  width: 18rem;
}

.toolbar__select {
  width: 9rem;
}

.grow {
  flex: 1;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header .title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.table-actions {
  display: flex;
  gap: 4px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
}

.dialog-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.scroll-block {
  max-height: 180px;
  overflow-y: auto;
  padding-right: 6px;
}

.actions {
  padding-left: 16px;
  margin: 0;
}

.actions li {
  margin: 6px 0;
}

.mappings {
  padding-left: 0;
  list-style: none;
  margin: 0;
}

.mappings li {
  padding: 6px 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.12);
}

.muted {
  color: #b7c7d6;
  font-size: 12px;
}

.ml-2 {
  margin-left: 8px;
}

.mb-3 {
  margin-bottom: 12px;
}

.inner-card {
  background: rgba(15, 23, 42, 0.32) !important;
  border: 1px solid rgba(148, 163, 184, 0.2) !important;
}

:deep(.inner-card .t-card__body) {
  background: transparent !important;
}

:deep(.glass-dialog .t-dialog__content) {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(148, 163, 184, 0.3);
  backdrop-filter: blur(12px);
  color: #eefaff;
}

:deep(.glass-dialog .t-dialog__footer) {
  background: transparent;
}

:deep(.glass-dialog .t-dialog__header) {
  background: transparent;
  color: inherit;
}

:deep(.glass-dialog .t-dialog__body) {
  color: inherit;
}
</style>
