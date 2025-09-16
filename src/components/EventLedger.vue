<template>
  <div class="ledger-page">
    <!-- 顶部视觉区 -->
    <section class="hero">
      <div class="hero__content">
        <h1>事件台账</h1>
        <p>从事件台账直达 ASEP：筛选、映射、计算，一步到位。</p>
      </div>
    </section>

    <div class="container">
      <!-- 工具条 -->
      <el-card class="toolbar glass" shadow="hover">
        <div class="toolbar__row">
          <el-input
            v-model="query.keyword"
            placeholder="搜索：编号 / 标题 / 地点"
            clearable
            class="w-64"
            :prefix-icon="Search"
            @keyup.enter="toPage(0)"
          />
          <el-date-picker
            v-model="query.range"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            unlink-panels
            class="w-80"
          />
          <el-select v-model="query.plantUnit" placeholder="机组" clearable class="w-36">
            <el-option v-for="u in plantUnits" :key="u" :label="u" :value="u" />
          </el-select>
          <div class="grow"></div>
          <el-tooltip content="刷新">
            <el-button :icon="RefreshRight" @click="reload" />
          </el-tooltip>
          <el-button plain @click="resetQuery">重置</el-button>
        </div>
      </el-card>

      <!-- 表格卡片 -->
      <el-card class="glass" shadow="never" body-class="p-0">
        <template #header>
          <div class="card-header">
            <span class="title">
              <el-icon><Tickets /></el-icon>
              全部事件
            </span>
            <el-tag size="small" effect="dark" type="success">共 {{ page?.totalElements ?? 0 }} 条</el-tag>
          </div>
        </template>

        <el-skeleton :loading="loading" animated :count="5" class="!p-4">
          <template #template>
            <div class="skeleton-row" />
          </template>

          <template #default>
            <el-table
              v-if="(page?.content ?? []).length"
              :data="page?.content ?? []"
              height="calc(70vh - 190px)"
              table-layout="auto"
              border
              highlight-current-row
              @row-dblclick="onRowDblClick"
            >
              <el-table-column prop="eventCode"  label="事件编号" width="160" />
              <el-table-column prop="eventTitle" label="事件名称" min-width="260" show-overflow-tooltip />
              <el-table-column prop="plantUnit"  label="机组" width="120" />
              <el-table-column prop="location"   label="地点" width="160" show-overflow-tooltip />
              <el-table-column label="发生时间" width="200">
                <template #default="{ row }">{{ fmtDate(row.eventDate) }}</template>
              </el-table-column>
              <el-table-column label="操作" fixed="right" width="220">
                <template #default="{ row }">
                  <el-button size="small" type="primary" text :icon="View" @click="openDetail(row.eventId)">
                    详情
                  </el-button>
                  <el-button size="small" type="danger"  text :icon="Delete" @click="removeOne(row.eventId)">
                    删除
                  </el-button>
                  <el-button size="small" type="success" text :icon="Cpu" @click="goAsep(row.eventId)">
                    ASEP
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <el-empty v-else description="暂无数据" />
          </template>
        </el-skeleton>

        <div class="pager">
          <el-pagination
            background
            layout="prev, pager, next, jumper"
            :total="page?.totalElements ?? 0"
            :page-size="pageSize"
            :current-page="pageIndex + 1"
           @current-change="onPageChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="dlgVisible" width="820px" :close-on-click-modal="false" class="glass">
      <template #header>
        <div class="dialog-title">
          <el-icon><View /></el-icon>
          <span>事件详情</span>
        </div>
      </template>

      <el-skeleton :loading="detailLoading" animated>
        <template #template><div class="skeleton-row" /></template>
        <template #default>
          <el-descriptions
            v-if="detail"
            :column="2"
            border
            size="small"
            class="mb-3"
            title="基本信息"
          >
            <el-descriptions-item label="编号">{{ detail.event.eventCode }}</el-descriptions-item>
            <el-descriptions-item label="时间">{{ fmtDate(detail.event.eventDate) }}</el-descriptions-item>
            <el-descriptions-item label="机组">{{ detail.event.plantUnit || '-' }}</el-descriptions-item>
            <el-descriptions-item label="地点">{{ detail.event.location || '-' }}</el-descriptions-item>
            <el-descriptions-item label="触发事件" :span="2">{{ detail.event.initiatingEvent || '-' }}</el-descriptions-item>
            <el-descriptions-item label="后果摘要"  :span="2">{{ detail.event.consequenceSummary || '-' }}</el-descriptions-item>
            <el-descriptions-item label="报告来源"  :span="2">{{ detail.event.reportRef || '-' }}</el-descriptions-item>
          </el-descriptions>

          <el-card class="mb-3" shadow="never">
            <template #header>
              <div class="card-header">
                <span class="title"><el-icon><List /></el-icon> 动作序列</span>
                <el-tag size="small" type="info">{{ detail?.actions?.length ?? 0 }}</el-tag>
              </div>
            </template>
            <el-scrollbar height="160px">
              <ol class="actions">
                <li v-for="a in (detail?.actions ?? [])" :key="a.actionId">
                  <b>#{{ a.stepNo ?? '-' }}</b>
                  {{ a.actionDesc || '(无描述)' }}
                  <span class="muted">执行者：{{ a.actorRole || a.actorId || '-' }}；成功：{{ a.successFlag ? '是' : '否' }}</span>
                </li>
              </ol>
            </el-scrollbar>
          </el-card>

          <el-card shadow="never">
            <template #header>
              <div class="card-header">
                <span class="title"><el-icon><Guide /></el-icon> 事件-任务-场景映射</span>
                <el-tag size="small" type="warning">{{ detail?.mappings?.length ?? 0 }}</el-tag>
              </div>
            </template>
            <el-scrollbar height="180px">
              <ul class="mappings">
                <li v-for="m in (detail?.mappings ?? [])" :key="m.id">
                  <el-tag size="small" type="primary" effect="dark">task_id={{ m.task?.id ?? m.taskId }}</el-tag>
                  <el-tag size="small" class="ml-2">scenario_id={{ m.scenario?.id ?? m.scenarioId ?? '—' }}</el-tag>
                  <span v-if="m.dependenceLevel" class="muted ml-2">依赖：{{ m.dependenceLevel }}</span>
                  <span v-if="m.systemLogic"    class="muted ml-2">系统逻辑：{{ m.systemLogic }}</span>
                </li>
              </ul>
            </el-scrollbar>
          </el-card>
        </template>
      </el-skeleton>

      <template #footer>
        <el-button @click="dlgVisible=false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, RefreshRight, View, Delete, Cpu, Tickets, List, Guide } from '@element-plus/icons-vue'

// === API 基址 ===
// 本地直连后端：8089；如果你使用 Vite 代理，请改成 const API = '/api'
const API = import.meta.env.VITE_API_BASE ?? 'http://localhost:8089'
// 表格双击行：Element Plus 的签名是 (row, column, event)
// 这里我们把 row 标注成你的 EventRow，column 用 any，event 是 MouseEvent
const onRowDblClick = (row: EventRow, _column: any, _event: MouseEvent) => {
  openDetail(row.eventId)
}

// 分页切换：Element Plus 的 current-change 传 number
const onPageChange = (page: number) => {
  toPage(page - 1)
}
// === 类型 ===
type EventRow = {
  eventId: number; eventCode: string; eventTitle: string;
  plantUnit?: string; location?: string; eventDate?: string;
}
type Page<T> = { content:T[]; totalElements:number; totalPages:number; number:number }

// === 状态 ===
const loading = ref(false)
const page = ref<Page<EventRow> | null>(null)
const pageIndex = ref(0)
const pageSize = 10

const query = reactive({
  keyword: '',
  range: [] as [Date, Date] | [],
  plantUnit: '' as string | ''
})
const plantUnits = ref<string[]>(['I', 'II', 'III', 'IV']) // 可从后端/字典表加载

// === 工具 ===
function fmtDate(s?:string){ return s ? new Date(s).toLocaleString() : '-' }
function camelEvent(e:any):EventRow {
  return {
    eventId: e.eventId ?? e.event_id,
    eventCode: e.eventCode ?? e.event_code,
    eventTitle: e.eventTitle ?? e.event_title,
    eventDate: e.eventDate ?? e.event_date,
    plantUnit: e.plantUnit ?? e.plant_unit,
    location: e.location
  }
}

// === 列表 ===
async function load(){
  loading.value = true
  try{
    const params = new URLSearchParams({ page: String(pageIndex.value), size: String(pageSize) })
    if(query.keyword) params.set('q', query.keyword) // 后端无此参数也不影响
    if(query.plantUnit) params.set('unit', query.plantUnit)
    if(query.range.length===2){
      params.set('from', query.range[0].toISOString())
      params.set('to',   query.range[1].toISOString())
    }
    const res = await fetch(`${API}/events?${params.toString()}`)
    if(!res.ok) throw new Error(await res.text())
    const data = await res.json()
    page.value = { ...data, content:(data?.content??[]).map(camelEvent) }
  }catch(e:any){
    ElMessage.error('加载失败：' + (e?.message ?? ''))
    page.value = { content:[], totalElements:0, totalPages:1, number:0 }
  }finally{
    loading.value = false
  }
}
function toPage(p:number){ pageIndex.value = Math.max(0,p); load() }
function reload(){ load() }
function resetQuery(){ query.keyword=''; query.range=[]; query.plantUnit=''; toPage(0) }

// === 详情 ===
const dlgVisible = ref(false)
const detailLoading = ref(false)
const detail = ref<any|null>(null)

function camelAction(a:any){
  return {
    actionId:a.actionId??a.action_id, stepNo:a.stepNo??a.step_no,
    actionDesc:a.actionDesc??a.action_desc, actorRole:a.actorRole??a.actor_role,
    actorId:a.actorId??a.actor_id, successFlag:a.successFlag??a.success_flag
  }
}
function camelDetail(raw:any){
  return {
    event:{
      ...camelEvent(raw.event??{}),
      initiatingEvent: raw.event?.initiatingEvent ?? raw.event?.initiating_event,
      consequenceSummary: raw.event?.consequenceSummary ?? raw.event?.consequence_summary,
      reportRef: raw.event?.reportRef ?? raw.event?.report_ref
    },
    actions:(raw.actions??[]).map(camelAction),
    mappings:(raw.mappings??raw.eventTaskScenes??[]).map((m:any)=>({
      ...m, taskId: m.taskId??m.task_id, scenarioId:m.scenarioId??m.scenario_id
    }))
  }
}
async function openDetail(id:number){
  dlgVisible.value = true
  detailLoading.value = true
  try{
    const res = await fetch(`${API}/events/${id}`)
    if(!res.ok) throw new Error(await res.text())
    const raw = await res.json()
    detail.value = camelDetail(raw)
  }catch(e:any){
    ElMessage.error('详情加载失败：' + (e?.message ?? ''))
  }finally{
    detailLoading.value = false
  }
}

// === 删除 ===
async function removeOne(id:number){
  try{
    await ElMessageBox.confirm('确认删除该事件？将级联删除相关动作与映射。', '请确认', {
      type:'warning', confirmButtonText:'删除', cancelButtonText:'取消'
    }) // MessageBox 适合这种确认用途
    const res = await fetch(`${API}/events/${id}`, { method:'DELETE' })
    if(!res.ok) throw new Error(await res.text())
    ElMessage.success('已删除')
    await load()
  }catch(e){
    if((e as any)?.message) ElMessage.error('删除失败：' + (e as any).message)
  }
}

// === 跳转到 ASEP 主页面 ===
const router = useRouter()
function goAsep(id:number){
  router.push({ name:'HraScreening', query:{ eventId:String(id) }})
}

onMounted(load)
</script>

<style scoped>
/* 科技风背景 */
.ledger-page {
  min-height: 100vh;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(56, 189, 248,.18), transparent),
    radial-gradient(1200px 600px at 90% 10%, rgba(34, 211, 238,.18), transparent),
    linear-gradient(180deg, #0b1020 0%, #0e1327 100%);
  color: #e6f6ff;
}
/* 主题色微调（Element Plus 支持 CSS 变量覆盖） */
:deep(:root){
  --el-color-primary: #22d3ee; /* 青色主色 */
  --el-border-radius-base: 12px;
}
.container { max-width: 1120px; margin: -60px auto 80px; padding: 0 16px; }

/* 顶部 hero */
.hero { height: 240px; display: grid; place-items: center; }
.hero__content { text-align: center; }
.hero__content h1 { font-size: 28px; margin: 0 0 8px; letter-spacing: .4px; }
.hero__content p { opacity: .85; }

/* 玻璃拟态卡片 */
.glass{
  backdrop-filter: blur(10px);
  background: rgba(255,255,255,.06) !important;
  border: 1px solid rgba(255,255,255,.12) !important;
  color: #eefaff;
}

/* 工具条 */
.toolbar__row { display:flex; gap:12px; align-items:center; }
.grow { flex: 1; }

/* 表头 */
.card-header{ display:flex; align-items:center; justify-content:space-between; }
.card-header .title{ display:flex; align-items:center; gap:8px; font-weight:600; }

/* 骨架行 */
.skeleton-row{ height: 24px; background: rgba(255,255,255,.08); border-radius: 6px; margin: 8px 0; }

/* 列表与分页 */
.pager{ display:flex; justify-content:flex-end; padding: 12px 16px; }

/* 详情 */
.dialog-title{ display:flex; align-items:center; gap:8px; font-weight:600; }
.muted{ color: #b7c7d6; font-size: 12px; }
.actions{ padding-left: 16px; }
.actions li{ margin: 6px 0; }
.mappings{ padding-left: 0; list-style: none; }
.mappings li{ padding: 6px 0; border-bottom: 1px dashed rgba(255,255,255,.12); }
</style>
