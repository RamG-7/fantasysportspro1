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
