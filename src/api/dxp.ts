import config from '../config'

export interface DxpEvent {
  id: number
  start_date: string
  end_date: string
  status: 'confirmed' | 'estimated'
  source: 'wiki' | 'manual'
  days_until: number
}

export interface DxpMover {
  item_id: number
  item_name: string
  pre_lift_pct: number
  during_lift_pct: number
  post_lift_pct: number
  events_observed: number
}

export interface DxpSummary {
  generated_at: string
  next_event: DxpEvent | null
  all_events: DxpEvent[]
  top_movers: DxpMover[]
  avg_pre_lift_pct: number | null
  avg_during_lift_pct: number | null
  avg_post_lift_pct: number | null
  scored_items: number
  sync_status: {
    ok: boolean
    last_sync: string | null
    error: string | null
  }
}

export async function fetchDxpSummary(): Promise<DxpSummary> {
  if (!config.dxpScoresUrl) throw new Error('VITE_DXP_SCORES_URL is not configured')
  const resp = await fetch(config.dxpScoresUrl)
  if (!resp.ok) throw new Error(`DXP scores fetch failed: ${resp.status}`)
  return resp.json()
}
