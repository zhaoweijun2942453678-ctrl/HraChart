export type Complexity = 'SIMPLE' | 'COMPLEX'
// types
export type ActionClass = 'STEP'|'DYNAMIC'|'IMMEDIATE'
export type StressLevel = 'MOD_HIGH'|'EXTREME'
export type Ref = {
  id: string;
  desc: string;
  source: string; // 确保 source 为 string 类型
  filecite?: string;
}
export interface CScreenReq {
task_id?: number
  scenario_id?: number
  tm_minutes: number
  ta_minutes: number
  control_room_outside?: boolean
  complexity?: 'SIMPLE'|'COMPLEX'
  // 新增：多告警/程序/仪表/旅行（可选，若传 scenario_id 会用场景值填补）
  annunciator_count?: number
  overlap_window_sec?: number
  procedure_available?: boolean
  instrument_status?: 'NOMINAL'|'FAILED'|'MISLEADING'
  travel_path_id?: number
  travel_time_sec_lb?: number
  travel_time_sec_ub?: number
    action_class?: ActionClass
  stress_level?: StressLevel
  diag_order?: 1|2|3
}



export interface AScreenReq {
 task_id?: number
  bhep?: number
  rf_checked?: string[]
  radiation_zone?: boolean
  // 新增：依赖/系统逻辑（系统级）
  dependence_group_id?: string
  dependence_level?: 'ZD'|'LD'|'MD'|'HD'|'CD'
  system_logic?: 'SERIES'|'PARALLEL'
  // 组计算（可选）
  group_items?: { bhep?:number; radiation_zone?:boolean; rf_checked?:string[]; lub?:number; uub?:number }[]
}
export type BaseResp = {
  id: number
  traceMd: string
  refs: {id:string,desc:string,source?:string,filecite?:string}[]
}

export type AScreenResp = BaseResp & {
  bhep: number, rfFail: number, radFactor: number|null,
  hepFinal: number, hepPoint: number, hepMean: number, hepLb: number, hepUb: number, ef: number,
  rfSelected: {code:string, hep_fail:number}[],
  ucb?: {
    model: 'lognormal',
    diag?:  {p50:number,ef:number,p05:number,p95:number,mu_ln:number,sigma_ln:number},
    act?:   {p50:number,ef:number,p05:number,p95:number,mu_ln:number,sigma_ln:number},
    final?: {p50:number,ef:number,p05:number,p95:number,mu_ln:number,sigma_ln:number},
  }
}

export type CScreenResp = BaseResp & {
  td: number; band: string; hepDiag: number; complexityFactor: number;
  hepFinal: number; hepPoint: number; hepMean: number;  // ← 新增
  hepLb: number; hepUb: number; ef: number;
  ucb?: { model: 'lognormal', diag?: any, act?: any, final?: any }  // 简写亦可
  refs: Ref[];
}
