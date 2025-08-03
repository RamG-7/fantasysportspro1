import { NextResponse } from 'next/server'
import { teamLogos } from '../../../../lib/images'
type SleeperPlayer = { player_id:string, full_name?:string, first_name?:string, last_name?:string, team?:string, position?:string, search_full_name?:string }
type SleeperADP = { player_id:string, adp:number }
let cache: { at:number, payload:any } | null = null
export const dynamic='force-dynamic'; export const revalidate=0; export const fetchCache='force-no-store'
export async function GET(){
  try{
    // Clear cache to force fresh data with updated team logos
    cache = null
    
    if (cache && Date.now() - cache.at < 1000*60*60*6) return NextResponse.json(cache.payload)
    const season = new Date().getFullYear()
    console.log('Fetching players from Sleeper API...')
    const playersRes = await fetch('https://api.sleeper.app/v1/players/nfl', { cache: 'no-store' })
    if (!playersRes.ok) {
      console.error('Failed to fetch players:', playersRes.status, playersRes.statusText)
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 502 })
    }
    const playersJson = await playersRes.json() as Record<string, SleeperPlayer>
    console.log('Players fetched successfully, count:', Object.keys(playersJson).length)
    
    const formats = ['ppr','half_ppr','std'], seasons = [season, season-1]
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
        }catch(e){
          console.log('ADP fetch failed for', s, f, e)
        }
      } if (adpList) break
    }
    const adpMap = new Map<string, number>()
    if (adpList) for (const row of adpList) if (row && row.player_id && typeof row.adp === 'number') adpMap.set(row.player_id, row.adp)
    const keepPos = new Set(['QB','RB','WR','TE','K','DEF'])
    const players:any[] = []
    const nameIndex:Record<string,string> = {}
    const norm=(s?:string)=> (s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
    function approxProj(pos:string, adp?:number){
      const P=(pos==='DEF'?'DST':pos).toUpperCase()
      const baseByPos:any={QB:24,RB:20,WR:19,TE:14,K:9,DST:8}, floorByPos:any={QB:12,RB:8,WR:8,TE:6,K:5,DST:5}, curveByPos:any={QB:0.55,RB:0.62,WR:0.60,TE:0.58,K:0.45,DST:0.40}
      const base=baseByPos[P]??16, floor=floorByPos[P]??6, curve=curveByPos[P]??0.55
      if (!adp || !isFinite(adp)) return Math.round((base*0.6)*10)/10
      const pct = Math.min(1, Math.max(0, Math.log(adp+1)/Math.log(250)))
      const val = floor + (base-floor) * Math.pow(1 - pct, 1 + curve)
      return Math.round(val*10)/10
    }
    for (const pid in playersJson){
      const p = playersJson[pid]; if (!p) continue
      const pos = (p.position||'').toUpperCase(); if (!keepPos.has(pos)) continue
      const name = p.full_name || `${p.first_name||''} ${p.last_name||''}`.trim(); if (!name) continue
      const adp = adpMap.get(pid)
      const position = (pos==='DEF'?'DST':pos) as 'QB'|'RB'|'WR'|'TE'|'K'|'DST'
      const team = p.team || 'FA'
      const proj_ppg = approxProj(pos, adp)
      const logo = teamLogos[team] || 'https://placehold.co/96x96/png?text=Team'
      
      // Debug logging for specific players
      if (name.includes('Christian McCaffrey') || name.includes('Puka Nacua')) {
        console.log(`Player: ${name}, Team: ${team}, Logo: ${logo}`)
      }
      
      players.push({ player_id: pid, name, team, position, adp, proj_ppg, headshot: logo })
      const k1 = norm(name); if (k1) nameIndex[k1]=pid
      if (p.search_full_name){ const k2=norm(p.search_full_name); if(k2) nameIndex[k2]=pid }
      if (p.first_name && p.last_name){ const k3=norm(`${p.first_name} ${p.last_name}`); if(k3) nameIndex[k3]=pid }
    }
    players.sort((a,b)=> a.position===b.position ? a.name.localeCompare(b.name) : a.position.localeCompare(b.position))
    const payload = { players, nameIndex, season, format: 'ppr' }
    console.log('Processed players:', players.length)
    cache = { at: Date.now(), payload }
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
  }catch(e){
    console.error('Bootstrap error:', e)
    return NextResponse.json({ error:'Bootstrap error', detail:String(e) }, { status: 502 })
  }
}
