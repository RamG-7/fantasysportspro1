import { DualThreatQBs, EliteTEs, TargetHogWRs, DeepThreatWRs, WorkhorseRBs, VolatileProfiles } from './player_tags'

type PlayerLite = { name:string, team:string, position:'QB'|'RB'|'WR'|'TE'|'K'|'DST', proj_ppg:number, adp?:number }
type Baselines = { [k:string]: number }

export function buildInsights(p:PlayerLite, baselines:Baselines, roster:PlayerLite[]){
  const lines:string[] = []

  // Archetype notes
  if (p.position==='QB' && DualThreatQBs.has(p.name)){
    lines.push('Dual‑threat profile: rushing attempts add a weekly floor and spike‑week ceiling.')
  }
  if (p.position==='RB' && WorkhorseRBs.has(p.name)){
    lines.push('Workhorse usage profile: projects for strong touch share; stable weekly volume.')
  }
  if (p.position==='WR' && TargetHogWRs.has(p.name)){
    lines.push('Alpha receiver outlook: projects for top‑tier target share and consistent WR1/WR2 production.')
  }
  if (p.position==='WR' && DeepThreatWRs.has(p.name)){
    lines.push('Downfield role: boom‑bust scoring but high weekly ceiling on big plays.')
  }
  if (p.position==='TE' && EliteTEs.has(p.name)){
    lines.push('Elite TE profile: sustained target share with red‑zone involvement; positional edge most weeks.')
  }

  // Stack/correlation note
  const hasQB = roster.some(x=>x.team===p.team && x.position==='QB' && x.name!==p.name)
  const hasWRTE = roster.some(x=>x.team===p.team && (x.position==='WR'||x.position==='TE') && x.name!==p.name)
  if (p.position==='QB' && hasWRTE) lines.push('Positive correlation: QB is stacked with your pass catcher from the same team.')
  if ((p.position==='WR'||p.position==='TE') && hasQB) lines.push('Positive correlation: pass catcher stacked with your QB; raises ceiling in shootouts.')

  // Simple replacement context: FLEX vs positional baseline
  const flexBase = baselines.FLEX ?? 10
  const posKey = p.position==='QB'?'QB1':p.position==='TE'?'TE':'FLEX'
  const base = baselines[posKey] ?? flexBase
  const diff = p.proj_ppg - base
  if (Math.abs(diff) >= 1.0){
    lines.push(`${diff>=0? 'Projects +':''}${diff.toFixed(1)} PPG vs ${posKey} baseline.`)
  }

  // Risk note
  if (VolatileProfiles.has(p.name)){
    lines.push('Volatility watch: weekly range of outcomes is wider than average; consider matchup‑based usage.')
  }

  // ADP context (only if present)
  if (typeof p.adp === 'number'){
    if (p.adp <= 24) lines.push('Market price: early‑round pick by ADP.')
    else if (p.adp <= 60) lines.push('Market price: mid‑round value by ADP.')
    else lines.push('Market price: late‑round/bench value by ADP.')
  }

  return lines.length ? lines : ['Solid, startable profile. More granular stats can be added as we wire a projections feed.']
}
