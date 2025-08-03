import { NextResponse } from 'next/server'
import { playerHeadshots, teamLogos } from '@/lib/images'

type SleeperPlayer = { player_id:string, full_name?:string, first_name?:string, last_name?:string, team?:string, position?:string, search_full_name?:string }
type SleeperADP = { player_id:string, adp:number }

let cache: { at:number, payload:any } | null = null
export const dynamic='force-dynamic'; export const revalidate=0; export const fetchCache='force-no-store'

export async function GET(){
  try{
    if (cache && Date.now() - cache.at < 1000*60*60*6) return NextResponse.json(cache.payload)

    const season = new Date().getFullYear()
    const playersUrl = 'https://api.sleeper.app/v1/players/nfl'

    const playersRes = await fetch(playersUrl, { cache: 'no-store' })
    if (!playersRes.ok) return NextResponse.json({ error: 'Failed to fetch players' }, { status: 502 })
    const playersJson = await playersRes.json() as Record<string, SleeperPlayer>

    const formats = ['ppr','half_ppr','std']
    const seasons = [season, season-1]
    let adpList: SleeperADP[] | null = null
    for (const s of seasons){
      for (const f of formats){
        try{
          const url = `https://api.sleeper.app/v1/adp/nfl/${s}?season_type=regular&format=${f}`
          const r = await fetch(url, { cache: 'no-store' })
          if (r.ok){
            const j = await r.json()
            if (Array.isArray(j) && j.length){ adpList = j; break }
          }
        }catch{}
      }
      if (adpList) break
    }

    const adpMap = new Map<string, number>()
    if (adpList) for (const row of adpList) if (row && row.player_id && typeof row.adp === 'number') adpMap.set(row.player_id, row.adp)

    const keepPos = new Set(['QB','RB','WR','TE','K','DEF'])
    const players:any[] = []
    const nameIndex:Record<string,string> = {}
    const norm=(s?:string)=> (s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
    function approxProj(pos:string, adp?:number){
      if (!adp) return ({QB:18,RB:12,WR:12,TE:9,K:7,DEF:7} as any)[pos] || 10
      const base=({QB:23,RB:20,WR:19,TE:14,K:9,DEF:8} as any)[pos] || 15
      const decay=({QB:3.2,RB:4.0,WR:3.6,TE:2.8,K:1.2,DEF:1.0} as any)[pos] || 3.0
      const proj=Math.max(base - decay * Math.log(Math.max(1, adp)), ({QB:12,RB:8,WR:8,TE:6,K:5,DEF:5} as any)[pos] || 6)
      return Number(proj.toFixed(1))
    }

    for (const pid in playersJson){
      const p = playersJson[pid]
      if (!p) continue
      const pos = (p.position||'').toUpperCase()
      if (!keepPos.has(pos)) continue
      const name = p.full_name || `${p.first_name||''} ${p.last_name||''}`.trim()
      if (!name) continue
      const adp = adpMap.get(pid)
      const position = (pos==='DEF'?'DST':pos) as 'QB'|'RB'|'WR'|'TE'|'K'|'DST'
      const team = p.team || 'FA'
      const proj_ppg = approxProj(pos, adp)

      const headshot = playerHeadshots[name.toLowerCase()] || (teamLogos[team] ? teamLogos[team] : 'https://placehold.co/96x96?text=Player')

      players.push({ player_id: pid, name, team, position, adp, proj_ppg, headshot })

      const keys = new Set<string>([ norm(name) ])
      if (p.search_full_name) keys.add(norm(p.search_full_name))
      if (p.first_name && p.last_name) keys.add(norm(`${p.first_name} ${p.last_name}`))
      keys.forEach(k=>{ if(k) nameIndex[k]=pid })
    }

    players.sort((a,b)=> a.position===b.position ? a.name.localeCompare(b.name) : a.position.localeCompare(b.position))
    const payload = { players, nameIndex, season, format: 'ppr' }
    cache = { at: Date.now(), payload }
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
  }catch(e){
    return NextResponse.json({ error:'Bootstrap error', detail:String(e) }, { status: 502 })
  }
}
