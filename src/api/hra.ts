import client from './client'
import { CScreenReq, CScreenResp, AScreenReq, AScreenResp } from './types'

// Raw types（服务端可能的字段）
type RawScenario = { id: number; scenCode?: string; scenName?: string; tmMinutes?: number; tm_minutes?: number; [k:string]: any }
type RawTask = { id: number; name?: string; taskName?: string; scenName?: string; scenCode?: string; bhep?: number; acc_class?: string; accClass?: string; [k:string]: any }

export async function calcCScreen(payload: CScreenReq) {
  const { data } = await client.post<CScreenResp>('api/calc/c_screen', payload)
  return data
}

export async function calcAScreen(payload: AScreenReq) {
  const { data } = await client.post<AScreenResp>('api/calc/a_screen', payload)
  return data
}
export interface HraScenarioLocal {
  id: number
  name: string
  tmMinutes: number | null
}
export interface HraTaskLocal {
  id: number
  name: string
  acc_class?: string
  bhep?: number | null
}

export async function listScenarios(): Promise<HraScenarioLocal[]> {
  const { data } = await client.get<RawScenario[]>('/scenarios')
  return (data || []).map(s => ({
    id: s.id,
    name: (s as any).scenName ?? (s as any).name ?? (s as any).scen_name ?? `scenario#${s.id}`,
    tmMinutes: (s as any).tmMinutes ?? (s as any).tm_minutes ?? null
  }))
}

export async function listTasks(): Promise<HraTaskLocal[]> {
  const { data } = await client.get<RawTask[]>('/tasks')
  return (data || []).map(t => ({
    id: t.id,
    name: (t as any).name ?? (t as any).taskName ?? (t as any).scenName ?? (t as any).scenCode ?? `task#${t.id}`,
    acc_class: (t as any).acc_class ?? (t as any).accClass,
    bhep: (t as any).bhep ?? null
  }))
}
// 追加在 src/api/hra.ts 尾部（保持 client 复用）:contentReference[oaicite:20]{index=20}
export interface EventItem { eventId:number; eventCode:string; eventTitle:string; eventDate:string; plantUnit?:string; location?:string }
export interface EventAction { actionId:number; stepNo?:number; actionDesc?:string; actorRole?:string }
export interface EventMapping {
  id:number;
  task:{ id:number; taskCode:string; taskName:string; accidentClass:string; bhep?:number|null };
  scenario?:{ id:number; scenCode:string; scenName:string; tmMinutes:number|null; taMinutes?:number|null };
  roleNote?:string;
}
export interface EventDetailDTO { event:EventItem; actions:EventAction[]; mappings:EventMapping[] }

export async function listEvents(page=0,size=10){
  const { data } = await client.get('/events', { params: { page, size } })
  return data // Page<Event>
  content: (data?.content ?? []).map(normalizeEvent)
}

export async function getEventDetail(id:number): Promise<EventDetailDTO>{
  const { data } = await client.get(`/events/${id}`)
  return data
}
export async function calcASystem(body:any){
  const { data } = await client.post('/api/calc/a_system', body)
  return data
}

function normalizeEvent(e:any){
  return {
    eventId:   e.eventId   ?? e.event_id,
    eventCode: e.eventCode ?? e.event_code,
    eventTitle:e.eventTitle?? e.event_title,
    eventDate: e.eventDate ?? e.event_date,
    plantUnit: e.plantUnit ?? e.plant_unit,
    location:  e.location,
  }

}
// ✅ 系统级 A 类计算（多任务 + 依赖 + 串/并）
