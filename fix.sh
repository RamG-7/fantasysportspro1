#!/usr/bin/env bash
set -euo pipefail

# sanity: make sure we're in a Node project
test -f package.json || { echo "package.json not found. Run this from your repo root."; exit 1; }

mkdir -p app app/api/data/bootstrap app/api/import/sleeper components lib

# tsconfig without alias (use relative imports)
cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "es2020"],
    "jsx": "preserve",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": false,
    "noEmit": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "baseUrl": "."
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
JSON

# next/image allowlist for logos
cat > next.config.mjs <<'JS'
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' }
    ]
  }
};
export default nextConfig;
JS

# minimal layout & globals (if they don't exist yet)
[ -f app/layout.tsx ] || cat > app/layout.tsx <<'TSX'
import './globals.css'
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>)
}
TSX

[ -f app/globals.css ] || cat > app/globals.css <<'CSS'
html,body{height:100%;margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
*{box-sizing:border-box}
:root{--muted:#9aa4bf}
.card{background:#0c1326;border:1px solid rgba(255,255,255,.1);border-radius:12px}
CSS

# team logos
cat > lib/images.ts <<'TS'
export const teamLogos: Record<string, string> = {
  'ARI': 'https://upload.wikimedia.org/wikipedia/en/7/72/Arizona_Cardinals_logo.svg',
  'ATL': 'https://upload.wikimedia.org/wikipedia/en/c/c5/Atlanta_Falcons_logo.svg',
  'BAL': 'https://upload.wikimedia.org/wikipedia/en/1/16/Baltimore_Ravens_logo.svg',
  'BUF': 'https://upload.wikimedia.org/wikipedia/en/7/77/Buffalo_Bills_logo.svg',
  'CAR': 'https://upload.wikimedia.org/wikipedia/en/1/1c/Carolina_Panthers_logo.svg',
  'CHI': 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Chicago_Bears_logo.svg',
  'CIN': 'https://upload.wikimedia.org/wikipedia/commons/8/81/Cincinnati_Bengals_logo.svg',
  'CLE': 'https://upload.wikimedia.org/wikipedia/en/d/d9/Cleveland_Browns_logo.svg',
  'DAL': 'https://upload.wikimedia.org/wikipedia/commons/1/15/Dallas_Cowboys.svg',
  'DEN': 'https://upload.wikimedia.org/wikipedia/en/4/44/Denver_Broncos_logo.svg',
  'DET': 'https://upload.wikimedia.org/wikipedia/en/7/71/Detroit_Lions_logo.svg',
  'GB':  'https://upload.wikimedia.org/wikipedia/commons/5/50/Green_Bay_Packers_logo.svg',
  'HOU': 'https://upload.wikimedia.org/wikipedia/en/2/28/Houston_Texans_logo.svg',
  'IND': 'https://upload.wikimedia.org/wikipedia/commons/0/00/Indianapolis_Colts_logo.svg',
  'JAX': 'https://upload.wikimedia.org/wikipedia/en/7/74/Jacksonville_Jaguars_logo.svg',
  'KC':  'https://upload.wikimedia.org/wikipedia/en/e/e1/Kansas_City_Chiefs_logo.svg',
  'LV':  'https://upload.wikimedia.org/wikipedia/en/5/5c/Las_Vegas_Raiders_logo.svg',
  'LAC': 'https://upload.wikimedia.org/wikipedia/en/7/72/Los_Angeles_Chargers_logo.svg',
  'LAR': 'https://upload.wikimedia.org/wikipedia/en/8/8a/Los_Angeles_Rams_logo.svg',
  'MIA': 'https://upload.wikimedia.org/wikipedia/en/3/37/Miami_Dolphins_logo.svg',
  'MIN': 'https://upload.wikimedia.org/wikipedia/en/4/48/Minnesota_Vikings_logo.svg',
  'NE':  'https://upload.wikimedia.org/wikipedia/en/b/b9/New_England_Patriots_logo.svg',
  'NO':  'https://upload.wikimedia.org/wikipedia/commons/5/50/New_Orleans_Saints_logo.svg',
  'NYG': 'https://upload.wikimedia.org/wikipedia/commons/6/60/New_York_Giants_logo.svg',
  'NYJ': 'https://upload.wikimedia.org/wikipedia/en/6/6b/New_York_Jets_logo_2019.svg',
  'PHI': 'https://upload.wikimedia.org/wikipedia/en/8/8e/Philadelphia_Eagles_logo.svg',
  'PIT': 'https://upload.wikimedia.org/wikipedia/en/d/de/Pittsburgh_Steelers_logo.svg',
  'SEA': 'https://upload.wikimedia.org/wikipedia/en/8/8e/Seattle_Seahawks_logo.svg',
  'SF':  'https://upload.wikimedia.org/wikipedia/en/3/3a/San_Francisco_49ers_logo.svg',
  'TB':  'https://upload.wikimedia.org/wikipedia/en/a/a2/Tampa_Bay_Buccaneers_logo.svg',
  'TEN': 'https://upload.wikimedia.org/wikipedia/en/c/c1/Tennessee_Titans_logo.svg',
  'WAS': 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Washington_Commanders_logo.svg'
};
TS

# small utils
cat > lib/utils.ts <<'TS'
export function cn(...classes:(string|false|undefined)[]){ return classes.filter(Boolean).join(' ') }
TS

# grades
cat > lib/grades.ts <<'TS'
export type Grade='A+'|'A'|'A-'|'B+'|'B'|'B-'|'C+'|'C'|'C-'|'D'|'F';
export function gradeFromDeltaPct(x:number):Grade{
  if(x>=0.25)return'A+'; if(x>=0.18)return'A'; if(x>=0.12)return'A-'; if(x>=0.08)return'B+'; if(x>=0.04)return'B'; if(x>=0.00)return'B-';
  if(x>=-0.04)return'C+'; if(x>=-0.08)return'C'; if(x>=-0.12)return'C-'; if(x>=-0.20)return'D'; return'F';
}
export function gradeColor(g:Grade){
  switch(g){case'A+':case'A':case'A-':return'text-teal-300';case'B+':case'B':case'B-':return'text-emerald-300';
  case'C+':case'C':case'C-':return'text-yellow-300';case'D':return'text-orange-300';case'F':return'text-red-400';}
}
TS

# analyzer (relative imports only)
cat > lib/analyzer.ts <<'TS'
import { gradeFromDeltaPct, type Grade } from './grades'
export type Position='QB'|'RB'|'WR'|'TE'|'K'|'DST'
export type Slot='QB1'|'RB1'|'RB2'|'WR1'|'WR2'|'TE'|'FLEX'|'K'|'DST'|'BENCH'
export type Player={player_id:string,name:string,team:string,position:Position,adp?:number,proj_ppg:number,headshot?:string}
export type LeagueSettings={teams:number, roster:{QB:number;RB:number;WR:number;TE:number;FLEX:number;K:number;DST:number;BENCH:number}, scoring:'PPR'|'HALF_PPR'|'STANDARD'}
export type StarterAssignment={slot:Slot,player:Player,baseline:number,delta:number,deltaPct:number,grade:Grade}
export type Analysis={starters:StarterAssignment[],bench:Player[],baselines:Record<Slot,number>,team:{sumProj:number,sumBaseline:number,delta:number,advantagesCount:number,starCount:number,benchDepthCount:number,overallGrade:Grade,projectedRecord:string,playoffOddsPct:number}}
export const DEFAULT_SETTINGS:LeagueSettings={teams:12, roster:{QB:1,RB:2,WR:2,TE:1,FLEX:1,K:1,DST:1,BENCH:6}, scoring:'PPR'}
export type Dataset={players:Player[]; nameIndex:Record<string,string>}
function sortByProj(ps:Player[]){ return [...ps].sort((a,b)=> b.proj_ppg - a.proj_ppg) }
function computeBaselines(players:Player[], teams:number){
  const pos={QB:sortByProj(players.filter(p=>p.position==='QB')), RB:sortByProj(players.filter(p=>p.position==='RB')),
             WR:sortByProj(players.filter(p=>p.position==='WR')), TE:sortByProj(players.filter(p=>p.position==='TE')),
             K:sortByProj(players.filter(p=>p.position==='K')), DST:sortByProj(players.filter(p=>p.position==='DST'))}
  const qb1=pos.QB[Math.min(pos.QB.length-1,teams-1)]?.proj_ppg ?? 15
  const rb1=pos.RB[Math.min(pos.RB.length-1,teams-1)]?.proj_ppg ?? 12
  const rb2=pos.RB[Math.min(pos.RB.length-1,teams*2-1)]?.proj_ppg ?? 10
  const wr1=pos.WR[Math.min(pos.WR.length-1,teams-1)]?.proj_ppg ?? 12
  const wr2=pos.WR[Math.min(pos.WR.length-1,teams*2-1)]?.proj_ppg ?? 10
  const te1=pos.TE[Math.min(pos.TE.length-1,teams-1)]?.proj_ppg ?? 8
  const k1= pos.K[Math.min(pos.K.length-1,teams-1)]?.proj_ppg ?? 7
  const d1= pos.DST[Math.min(pos.DST.length-1,teams-1)]?.proj_ppg ?? 7
  const flexPool=[...pos.RB.slice(teams*2),...pos.WR.slice(teams*2),...pos.TE.slice(teams)].sort((a,b)=>b.proj_ppg-a.proj_ppg)
  const flex=flexPool[Math.min(flexPool.length-1,teams-1)]?.proj_ppg ?? 9
  return {QB1:qb1,RB1:rb1,RB2:rb2,WR1:wr1,WR2:wr2,TE:te1,FLEX:flex,K:k1,DST:d1} as Record<Slot,number>
}
function pickBestLineup(roster:Player[], settings:LeagueSettings){
  const chosen:Partial<Record<Slot,Player[]>>={}, pool=[...roster]
  const take=(pos:'QB'|'RB'|'WR'|'TE'|'K'|'DST',n:number,slot:Slot)=>{
    const c=pool.filter(p=>p.position===pos).sort((a,b)=>b.proj_ppg-a.proj_ppg).slice(0,n); chosen[slot]=c
    for(const x of c){ const i=pool.findIndex(pp=>pp.player_id===x.player_id); if(i>=0) pool.splice(i,1) }
  }
  take('QB',settings.roster.QB,'QB1'); take('RB',settings.roster.RB,'RB1'); take('WR',settings.roster.WR,'WR1'); take('TE',settings.roster.TE,'TE')
  const flex=pool.filter(p=>p.position==='RB'||p.position==='WR'||p.position==='TE').sort((a,b)=>b.proj_ppg-a.proj_ppg).slice(0,settings.roster.FLEX)
  chosen['FLEX']=flex; for(const x of flex){ const i=pool.findIndex(pp=>pp.player_id===x.player_id); if(i>=0) pool.splice(i,1) }
  if(settings.roster.K>0) take('K',settings.roster.K,'K'); if(settings.roster.DST>0) take('DST',settings.roster.DST,'DST')
  const rb=(chosen['RB1']||[]), wr=(chosen['WR1']||[])
  return { starters:{QB1:chosen['QB1']||[], RB1:rb[0]?[rb[0]]:[], RB2:rb[1]?[rb[1]]:[], WR1:wr[0]?[wr[0]]:[], WR2:wr[1]?[wr[1]]:[], TE:chosen['TE']||[], FLEX:chosen['FLEX']||[], K:chosen['K']||[], DST:chosen['DST']||[]}, bench:pool }
}
export function analyzeRoster(inputNames:string[], dataset:Dataset, settings:LeagueSettings=DEFAULT_SETTINGS){
  const playersById=new Map(dataset.players.map(p=>[p.player_id,p]))
  const norm=(s:string)=> s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
  const nameIndex=new Map(Object.entries(dataset.nameIndex))
  const resolved:Player[]=[]
  for(const raw of inputNames){
    const k=norm(raw); const pid=nameIndex.get(k)
    if(pid){ const p=playersById.get(pid); if(p){ resolved.push(p); continue; } }
    resolved.push({player_id:'unknown_'+k,name:raw.trim(),team:'—',position:'WR',proj_ppg:7.0})
  }
  const baselines=computeBaselines(dataset.players, settings.teams)
  const lineup=pickBestLineup(resolved, settings)
  const slots:Slot[]=['QB1','RB1','RB2','WR1','WR2','TE','FLEX','K','DST']
  const assignments:StarterAssignment[]=[]
  for(const s of slots){
    const ps=(lineup.starters as any)[s] as Player[]
    for(const p of ps){
      const base=(baselines as any)[s] as number
      const delta=p.proj_ppg-base, deltaPct= base>0 ? delta/base : 0, grade=gradeFromDeltaPct(deltaPct)
      assignments.push({slot:s, player:p, baseline:base, delta, deltaPct, grade})
    }
  }
  const sumProj=assignments.reduce((a,b)=>a+b.player.proj_ppg,0)
  const sumBaseline=Object.values(baselines).reduce((a,b)=>a+b,0)
  const advantagesCount=assignments.filter(a=>a.delta>=0).length
  const starCount=assignments.filter(a=>a.deltaPct>=0.18).length
  const benchDepthCount=lineup.bench.filter(b=> b.proj_ppg >= (baselines as any).FLEX * 0.9).length
  const teamDeltaPct= sumBaseline>0 ? (sumProj - sumBaseline)/sumBaseline : 0
  const overallGrade=gradeFromDeltaPct(teamDeltaPct)
  const muTeam=sumProj, muLeague=sumBaseline, sigma=muLeague*0.18
  const z= sigma>0 ? (muTeam-muLeague)/(Math.sqrt(2)*sigma) : 0
  const cdf=0.5*(1+erf(z))
  const seasonWeeks=14, expWins=cdf*seasonWeeks
  const projectedRecord=`${Math.round(expWins)}-${seasonWeeks-Math.round(expWins)}`
  const odds=1/(1+Math.exp(-(expWins-8)))
  const playoffOddsPct=Math.round(100*odds)
  return { starters:assignments, bench:lineup.bench, baselines:baselines as any, team:{sumProj,sumBaseline,delta:sumProj-sumBaseline,advantagesCount,starCount,benchDepthCount,overallGrade,projectedRecord,playoffOddsPct} }
}
function erf(x:number){ const a1=0.254829592,a2=-0.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=0.3275911; const s=x<0?-1:1, ax=Math.abs(x), t=1/(1+p*ax); const y=1-(((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t)*Math.exp(-ax*ax); return s*y }
TS

# PlayerCard (relative imports)
cat > components/PlayerCard.tsx <<'TSX'
'use client'
import Image from 'next/image'
import { Grade, gradeColor } from '../lib/grades'
import { cn } from '../lib/utils'
export function PlayerCard(props:{
  name:string, team:string, position:string, headshot?:string, adp?:number, proj_ppg:number,
  slot:string, baseline:number, delta:number, grade:Grade, onClick?:()=>void
}){
  const delta = props.delta, sign = delta>=0?'+':'-', abs = Math.abs(delta).toFixed(1)
  const pct = props.baseline>0 ? ((props.proj_ppg-props.baseline)/props.baseline)*100 : 0
  const pctStr = (pct>=0?'+':'') + pct.toFixed(1) + '% vs avg'
  return (
    <button onClick={props.onClick} className="text-left w-full">
      <div className="card" style={{padding:16, display:'flex', alignItems:'center', gap:16}}>
        <div className="relative" style={{width:48,height:48,borderRadius:'9999px',overflow:'hidden',background:'rgba(255,255,255,0.06)'}}>
          <Image src={props.headshot || 'https://placehold.co/96x96?text=Team'} alt={props.name} fill sizes="48px" />
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{color:'#2b86ff',fontSize:14,fontWeight:600}}>{props.slot}</div>
            <div style={{fontSize:12,color:'var(--muted)'}}>baseline {props.baseline.toFixed(1)} ppg</div>
          </div>
          <div style={{fontSize:16,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
            {props.name} <span style={{color:'var(--muted)'}}>— {props.team} · {props.position}</span>
          </div>
          <div style={{fontSize:13,color:'var(--muted)'}}>
            ADP: {props.adp ?? '—'} · Proj PPG: {props.proj_ppg.toFixed(1)} · <span className={cn(pct>=0?'text-teal-300':'text-red-400')}>{pctStr}</span>
          </div>
        </div>
        <div style={{textAlign:'right'}}>
          <div className={cn('text-xl font-bold', delta>=0?'text-teal-300':'text-red-400')}>{sign}{abs}</div>
          <div className={cn('text-sm font-semibold', gradeColor(props.grade))}>{props.grade}</div>
        </div>
      </div>
    </button>
  )
}
TSX

# Typeahead
cat > components/Typeahead.tsx <<'TSX'
'use client'
import { useMemo, useRef, useState, useEffect } from 'react'
type Option = { id:string, label:string }
export default function Typeahead({ options, onSelect, placeholder }:{
  options: Option[],
  onSelect: (opt:Option)=>void,
  placeholder?: string
}){
  const [q,setQ]=useState(''); const [open,setOpen]=useState(false); const [hi,setHi]=useState(0); const box=useRef<HTMLDivElement>(null)
  const filtered = useMemo(()=>{ const k=q.toLowerCase().trim(); if(!k) return options.slice(0,8); return options.filter(o=>o.label.toLowerCase().includes(k)).slice(0,8) },[q,options])
  useEffect(()=>{ function onDoc(e:MouseEvent){ if(!box.current) return; if(!box.current.contains(e.target as any)) setOpen(false) } document.addEventListener('mousedown', onDoc); return ()=>document.removeEventListener('mousedown', onDoc)},[])
  function choose(i:number){ const opt=filtered[i]; if(!opt)return; onSelect(opt); setQ(''); setOpen(false) }
  return (<div className="relative" ref={box}>
    <input value={q} onChange={e=>{setQ(e.target.value); setOpen(true)}} onFocus={()=>setOpen(true)}
      onKeyDown={e=>{ if(e.key==='ArrowDown'){e.preventDefault(); setHi(h=>Math.min(h+1,filtered.length-1))} else if(e.key==='ArrowUp'){e.preventDefault(); setHi(h=>Math.max(h-1,0))} else if(e.key==='Enter'){e.preventDefault(); choose(hi)} }}
      placeholder={placeholder||'Add player…'}
      className="w-full rounded"
      style={{background:'#0c1326',border:'1px solid rgba(255,255,255,.1)',padding:'.5rem',color:'#e8ecf7',outline:'none'}} />
    {open && filtered.length>0 && (<div className="absolute z-20 mt-1 w-full max-height-64 overflow-auto rounded" style={{border:'1px solid rgba(255,255,255,.1)',background:'#0c1326'}}>
      {filtered.map((o,i)=>(
        <button key={o.id} onMouseEnter={()=>setHi(i)} onClick={()=>choose(i)} className="block w-full text-left px-3 py-2 text-sm" style={i===hi?{background:'rgba(43,134,255,.15)'}:{}}>{o.label}</button>
      ))}
    </div>)}
  </div>)
}
TSX

# Sleeper bootstrap API (logos only; no-store fetch)
cat > app/api/data/bootstrap/route.ts <<'TS'
import { NextResponse } from 'next/server'
import { teamLogos } from '../../../../lib/images'
type SleeperPlayer = { player_id:string, full_name?:string, first_name?:string, last_name?:string, team?:string, position?:string, search_full_name?:string }
type SleeperADP = { player_id:string, adp:number }
let cache: { at:number, payload:any } | null = null
export const dynamic='force-dynamic'; export const revalidate=0; export const fetchCache='force-no-store'
export async function GET(){
  try{
    if (cache && Date.now() - cache.at < 1000*60*60*6) return NextResponse.json(cache.payload)
    const season = new Date().getFullYear()
    const playersRes = await fetch('https://api.sleeper.app/v1/players/nfl', { cache: 'no-store' })
    if (!playersRes.ok) return NextResponse.json({ error: 'Failed to fetch players' }, { status: 502 })
    const playersJson = await playersRes.json() as Record<string, SleeperPlayer>
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
        }catch{}
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
      const logo = teamLogos[team] || 'https://placehold.co/96x96?text=Team'
      players.push({ player_id: pid, name, team, position, adp, proj_ppg, headshot: logo })
      const k1 = norm(name); if (k1) nameIndex[k1]=pid
      if (p.search_full_name){ const k2=norm(p.search_full_name); if(k2) nameIndex[k2]=pid }
      if (p.first_name && p.last_name){ const k3=norm(`${p.first_name} ${p.last_name}`); if(k3) nameIndex[k3]=pid }
    }
    players.sort((a,b)=> a.position===b.position ? a.name.localeCompare(b.name) : a.position.localeCompare(b.position))
    const payload = { players, nameIndex, season, format: 'ppr' }
    cache = { at: Date.now(), payload }
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
  }catch(e){
    return NextResponse.json({ error:'Bootstrap error', detail:String(e) }, { status: 502 })
  }
}
TS

# Sleeper league import API
cat > app/api/import/sleeper/route.ts <<'TS'
import { NextResponse } from 'next/server'
export const dynamic='force-dynamic'; export const revalidate=0; export const fetchCache='force-no-store'
export async function GET(req: Request){
  const { searchParams } = new URL(req.url)
  const leagueId = searchParams.get('leagueId')
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
  try{
    const [leagueRes, usersRes, rostersRes] = await Promise.all([
      fetch(`https://api.sleeper.app/v1/league/${leagueId}`, { cache: 'no-store' }),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, { cache: 'no-store' }),
      fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, { cache: 'no-store' }),
    ])
    if (!leagueRes.ok) return NextResponse.json({ error:'League fetch failed' }, { status: 502 })
    if (!usersRes.ok)  return NextResponse.json({ error:'Users fetch failed' }, { status: 502 })
    if (!rostersRes.ok)return NextResponse.json({ error:'Rosters fetch failed' }, { status: 502 })
    const league = await leagueRes.json()
    const users = await usersRes.json()
    const rosters = await rostersRes.json()
    const userById = new Map(users.map((u:any)=>[u.user_id, u]))
    const teams = rosters.map((r:any)=>{
      const u = userById.get(r.owner_id) || {}
      const ownerName = u.display_name || (u.username || 'Unknown')
      const starters: string[] = Array.isArray(r.starters) ? r.starters.filter((id:any)=> typeof id === 'string') : []
      const players: string[] = Array.isArray(r.players) ? r.players.filter((id:any)=> typeof id === 'string') : []
      return { roster_id: r.roster_id, owner_id: r.owner_id, owner_name: ownerName, starters, players }
    })
    return NextResponse.json({ league, teams }, { headers: { 'Cache-Control': 'no-store' } })
  }catch(e:any){
    return NextResponse.json({ error:'Import error', detail: String(e) }, { status: 502 })
  }
}
TS

# Full page (relative imports)
cat > app/page.tsx <<'TSX'
'use client'
import { useEffect, useMemo, useState } from 'react'
import { analyzeRoster, DEFAULT_SETTINGS, type Dataset } from '../lib/analyzer'
import { PlayerCard } from '../components/PlayerCard'
import Typeahead from '../components/Typeahead'
type ImportTeam = { roster_id:number, owner_id:string, owner_name:string, starters:string[], players:string[] }
type ImportResponse = { league:any, teams: ImportTeam[] }
function Bar({label, value, max}:{label:string, value:number, max:number}){
  const pct = Math.max(0, Math.min(100, (max>0 ? (value/max)*100 : 0)))
  return (
    <div style={{marginBottom:6}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--muted)'}}><span>{label}</span><span>{value.toFixed(1)}</span></div>
      <div style={{height:8, background:'rgba(255,255,255,0.1)', borderRadius:6}}><div style={{height:8, width:`${pct}%`, background:'#2b86ff', borderRadius:6}} /></div>
    </div>
  )
}
function Stat({label,value}:{label:string,value:string}){
  return (<div style={{padding:12, border:'1px solid rgba(255,255,255,.1)', borderRadius:10, background:'#0c1326'}}>
    <div style={{fontSize:12,color:'var(--muted)'}}>{label}</div><div style={{fontWeight:700}}>{value}</div>
  </div>)
}
export default function Page(){
  const [dataset, setDataset] = useState<Dataset|null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string| null>(null)
  const [input, setInput] = useState(`Patrick Mahomes
Christian McCaffrey
Jahmyr Gibbs
Justin Jefferson
Puka Nacua
Travis Kelce
Justin Tucker
Cowboys D/ST`)
  const [showDetail, setShowDetail] = useState(false)
  const [leagueId, setLeagueId] = useState('')
  const [importing, setImporting] = useState(false)
  const [importErr, setImportErr] = useState<string| null>(null)
  const [teams, setTeams] = useState<ImportTeam[]|null>(null)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('')
  const [modal, setModal] = useState<{open:boolean, pid?:string}>({open:false})
  useEffect(()=>{
    const fetchData = async ()=>{
      try{ setLoading(true); const res = await fetch('/api/data/bootstrap'); if(!res.ok) throw new Error('Failed to load data'); const json=await res.json(); setDataset(json) }
      catch(e:any){ setError(e?.message || 'Failed to load') } finally{ setLoading(false) }
    }; fetchData()
  }, [])
  const names = useMemo(()=> input.split(/\n+/).map(s=>s.trim()).filter(Boolean), [input])
  const result = useMemo(()=> dataset ? analyzeRoster(names, dataset, DEFAULT_SETTINGS) : null, [names, dataset])
  const typeaheadOptions = useMemo(()=> dataset ? dataset.players.map(p=>({ id:p.player_id, label:`${p.name} — ${p.team} · ${p.position}` })) : [], [dataset])
  function addPlayer(opt:{id:string, label:string}){
    if(!dataset) return
    const p = dataset.players.find(pp=> pp.player_id===opt.id)
    if (!p) return
    const lines = new Set(input.split(/\n+/).map(s=>s.trim()).filter(Boolean))
    lines.add(p.name)
    setInput(Array.from(lines).join('\n'))
  }
  async function doImport(){
    try{
      setImporting(true); setImportErr(null); setTeams(null); setSelectedOwnerId('')
      const res = await fetch(`/api/import/sleeper?leagueId=${encodeURIComponent(leagueId)}`)
      if (!res.ok) throw new Error('Import failed')
      const json: ImportResponse = await res.json()
      setTeams(json.teams)
    }catch(e:any){
      setImportErr(e?.message || 'Import failed')
    }finally{
      setImporting(false)
    }
  }
  function useTeam(ownerId: string){
    if (!dataset || !teams) return
    setSelectedOwnerId(ownerId)
    const team = teams.find(t=>t.owner_id===ownerId)
    if (!team) return
    const idToName = new Map(dataset.players.map(p=>[p.player_id, p.name]))
    const starterNames = (team.starters || []).map(id=> idToName.get(id)).filter(Boolean) as string[]
    const rosterNames = (team.players || []).map(id=> idToName.get(id)).filter(Boolean) as string[]
    const benchOnly = rosterNames.filter(n=> !starterNames.includes(n))
    const combined = [...starterNames, ...benchOnly]
    if (combined.length){
      setInput(combined.join('\n'))
      setShowDetail(true)
    }
  }
  const trade = useMemo(()=>{
    if(!result || !dataset) return null
    const worst = [...result.starters].sort((a,b)=> a.delta - b.delta)[0]
    if(!worst || worst.delta>=0) return null
    const pos = worst.player.position
    const options = dataset.players
      .filter(p=>p.position===pos && p.proj_ppg > worst.baseline + 0.5)
      .sort((a,b)=> b.proj_ppg - a.proj_ppg)
      .slice(0,5)
    return { slot: worst.slot, current: worst.player, targets: options }
  }, [result, dataset])
  if (loading) return <main style={{maxWidth:1100, margin:'0 auto', padding:24}}><div className="card" style={{padding:24}}>Loading Sleeper data…</div></main>
  if (error || !dataset) return <main style={{maxWidth:1100, margin:'0 auto', padding:24}}><div className="card" style={{padding:24,color:'#f87171'}}>Error: {error || 'Could not load dataset'}</div></main>
  const sumProj = result!.team.sumProj, sumBaseline = result!.team.sumBaseline
  const teamPctAbove = sumBaseline>0 ? ((sumProj - sumBaseline)/sumBaseline)*100 : 0
  const byId = new Map(dataset.players.map(p=>[p.player_id, p]))
  const modalPlayer = modal.pid ? byId.get(modal.pid) : undefined
  return (
    <main style={{maxWidth:1100, margin:'0 auto', padding:24, color:'#e8ecf7', background:'#0b1020', minHeight:'100vh'}}>
      <header style={{marginBottom:24}}>
        <h1 style={{fontSize:24, fontWeight:800}}>Fantasy Team Analyzer</h1>
        <p style={{color:'var(--muted)'}}>League import + logos • Live names/ADP from Sleeper • 12-team PPR defaults • Scrollable detailed analysis</p>
      </header>
      <section style={{display:'grid', gap:24, gridTemplateColumns:'2fr 1fr'}}>
        <div style={{display:'grid', gap:24}}>
          <div className="card" style={{padding:16}}>
            <h2 style={{fontWeight:600}}>Import from Sleeper</h2>
            <div style={{display:'flex', gap:8, marginTop:8, flexWrap:'wrap'}}>
              <input value={leagueId} onChange={e=>setLeagueId(e.target.value)} placeholder="Enter League ID"
                style={{flex:1, minWidth:260, background:'#0c1326', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, padding:'8px 10px', color:'#e8ecf7', outline:'none'}} />
              <button disabled={!leagueId || importing} onClick={doImport}
                style={{padding:'8px 12px', borderRadius:8, background:'#2b86ff', color:'#fff', opacity:(!leagueId||importing)?0.6:1}}>Fetch Teams</button>
            </div>
            {importErr && <div style={{color:'#f87171', fontSize:14, marginTop:8}}>{importErr}</div>}
            {teams && (
              <div style={{marginTop:10}}>
                <div style={{fontSize:12, color:'var(--muted)'}}>Select your team to auto-fill the roster box:</div>
                <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:8, marginTop:6}}>
                  {teams.map(t=> (
                    <button key={t.roster_id} onClick={()=>useTeam(t.owner_id)}
                      style={{padding:'8px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,.1)', background:selectedOwnerId===t.owner_id?'rgba(43,134,255,.1)':'#0c1326', color:'#e8ecf7'}}>
                      {t.owner_name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="card" style={{padding:16}}>
            <h2 style={{fontWeight:600, marginBottom:8}}>Your Roster</h2>
            <div style={{marginBottom:8}}>
              <Typeahead options={dataset.players.map(p=>({id:p.player_id,label:`${p.name} — ${p.team} · ${p.position}`}))} onSelect={addPlayer} placeholder="Search & add player…" />
              <div style={{fontSize:12,color:'var(--muted)', marginTop:4}}>Select a suggestion to append. You can still edit the list below.</div>
            </div>
            <textarea value={input} onChange={e=>setInput(e.target.value)} rows={10}
              style={{width:'100%', background:'#0c1326', border:'1px solid rgba(255,255,255,.1)', borderRadius:8, padding:12, color:'#e8ecf7', outline:'none'}} />
            <div style={{display:'flex', justifyContent:'flex-end', marginTop:8}}>
              <button onClick={()=> setShowDetail(s=>!s)} style={{padding:'8px 12px', borderRadius:8, background:'#2b86ff', color:'#fff'}}>
                {showDetail ? 'Hide' : 'View'} Player-by-Player Analysis
              </button>
            </div>
          </div>
        </div>
        <div className="card" style={{padding:16}}>
          <h2 style={{fontWeight:600}}>Team Summary</h2>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:8}}>
            <Bar label="Your Team (PPG sum)" value={result!.team.sumProj} max={Math.max(result!.team.sumProj, result!.team.sumBaseline)} />
            <Bar label="League Avg (baselines sum)" value={result!.team.sumBaseline} max={Math.max(result!.team.sumProj, result!.team.sumBaseline)} />
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:8}}>
            <Stat label="% Above Avg" value={`${teamPctAbove>=0?'+':''}${teamPctAbove.toFixed(1)}%`} />
            <Stat label="Positional Advantages" value={`${result!.team.advantagesCount}/8`} />
            <Stat label="Star Players" value={`${result!.team.starCount}`} />
            <Stat label="Bench Depth" value={`${result!.team.benchDepthCount}`} />
          </div>
          {trade && (
            <div style={{marginTop:12, padding:12, border:'1px solid rgba(255,255,255,.1)', borderRadius:8, background:'#0c1326'}}>
              <div style={{fontWeight:600, fontSize:14, marginBottom:6}}>Trade ideas (biggest need: {trade.slot})</div>
              <div style={{fontSize:12, color:'var(--muted)', marginBottom:8}}>Targets with clearly higher projected PPG at the same position:</div>
              <ul style={{marginLeft:18}}>
                {trade.targets.map(opt=>(
                  <li key={opt.player_id} style={{fontSize:14}}>{opt.name} — {opt.team} · {opt.position} · {opt.proj_ppg.toFixed(1)} PPG</li>
                ))}
              </ul>
              <div style={{fontSize:11, color:'var(--muted)', marginTop:8}}>Tip: Offer a bench piece + your current {trade.current.position} to reach one of these tiers.</div>
            </div>
          )}
        </div>
      </section>
      {showDetail && result && (
        <section style={{marginTop:24}}>
          <div className="card" style={{padding:16}}>
            <h3 style={{fontWeight:600, marginBottom:8}}>Detailed Player Analysis</h3>
            <div style={{height:'60vh', overflowY:'auto', display:'grid', gap:12, paddingRight:6}}>
              {result.starters.map((s,i)=>(
                <PlayerCard key={i}
                  name={s.player.name} team={s.player.team} position={s.player.position}
                  headshot={s.player.headshot} adp={s.player.adp} proj_ppg={s.player.proj_ppg}
                  slot={s.slot} baseline={s.baseline} delta={s.delta} grade={s.grade}
                  onClick={()=> setModal({open:true, pid:s.player.player_id})}
                />
              ))}
              {result.bench.length>0 && (
                <div style={{marginTop:8}}>
                  <div style={{fontSize:13, fontWeight:600, color:'var(--muted)', marginBottom:6}}>Bench</div>
                  <div style={{display:'grid', gap:12}}>
                    {result.bench.map((p,i)=>(
                      <PlayerCard key={'b'+i}
                        name={p.name} team={p.team} position={p.position}
                        headshot={p.headshot} adp={p.adp} proj_ppg={p.proj_ppg}
                        slot="BENCH" baseline={result.baselines.FLEX} delta={p.proj_ppg - result.baselines.FLEX}
                        grade={'C'} onClick={()=> setModal({open:true, pid:p.player_id})}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
      {modal.open && modalPlayer && (
        <div style={{position:'fixed', inset:0, zIndex:50}}>
          <div onClick={()=>setModal({open:false})} style={{position:'absolute', inset:0, background:'rgba(0,0,0,.6)'}} />
          <div style={{position:'absolute', right:0, top:0, height:'100%', width:'100%', maxWidth:460, background:'#0c1326', borderLeft:'1px solid rgba(255,255,255,.1)', padding:20, overflowY:'auto'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
              <div style={{fontSize:18, fontWeight:700}}>{modalPlayer.name} <span style={{color:'var(--muted)', fontWeight:400}}>— {modalPlayer.team} · {modalPlayer.position}</span></div>
              <button onClick={()=>setModal({open:false})} style={{padding:'6px 10px', borderRadius:8, background:'#2b86ff', color:'#fff'}}>Close</button>
            </div>
            <div style={{display:'grid', gap:8, fontSize:14}}>
              <div><span style={{color:'var(--muted)'}}>ADP:</span> {modalPlayer.adp ?? '—'}</div>
              <div><span style={{color:'var(--muted)'}}>Projected PPG:</span> {modalPlayer.proj_ppg.toFixed(1)}</div>
              <div style={{marginTop:6, fontWeight:600}}>More insights coming next:</div>
              <ul style={{marginLeft:18}}>
                <li>ADP percentile within position</li>
                <li>Value above replacement (vs FLEX baseline)</li>
                <li>Stack notes (QB–WR/TE on your roster)</li>
              </ul>
            </div>
            <div style={{marginTop:12, fontSize:12, color:'var(--muted)'}}>Note: projections are ADP‑informed (free). When ready, we can swap in a consensus projections feed.</div>
          </div>
        </div>
      )}
      <footer style={{marginTop:40, textAlign:'center', fontSize:12, color:'var(--muted)'}}>
        Free-data MVP: Names/ADP via Sleeper; images use team logos (Wikimedia).
      </footer>
    </main>
  )
}
TSX
