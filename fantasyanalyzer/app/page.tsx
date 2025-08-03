'use client'
import { useEffect, useMemo, useState } from 'react'
import { analyzeRoster, DEFAULT_SETTINGS, type Dataset } from '@/lib/analyzer'
import { PlayerCard } from '@/components/PlayerCard'
import { gradeColor } from '@/lib/grades'

type ImportTeam = { roster_id:number, owner_id:string, owner_name:string, starters:string[], players:string[] }
type ImportResponse = { league:any, teams: ImportTeam[] }

function Bar({label, value, max}:{label:string, value:number, max:number}){
  const pct = Math.max(0, Math.min(100, (max>0 ? (value/max)*100 : 0)))
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm text-[var(--muted)]"><span>{label}</span><span>{value.toFixed(1)}</span></div>
      <div className="h-2 bg-white/10 rounded"><div className="h-2 rounded bg-[var(--accent)]" style={{width: pct+'%'}} /></div>
    </div>
  )
}
function Stat({label,value}:{label:string,value:string}){
  return (<div className="p-3 rounded bg-[#0c1326] border border-white/10"><div className="text-xs text-[var(--muted)]">{label}</div><div className="text-lg font-semibold">{value}</div></div>)
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

  // Import UI
  const [leagueId, setLeagueId] = useState('')
  const [importing, setImporting] = useState(false)
  const [importErr, setImportErr] = useState<string| null>(null)
  const [teams, setTeams] = useState<ImportTeam[]|null>(null)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('')

  useEffect(()=>{
    const fetchData = async ()=>{
      try{ setLoading(true); const res = await fetch('/api/data/bootstrap'); if(!res.ok) throw new Error('Failed to load data'); const json=await res.json(); setDataset(json) }
      catch(e:any){ setError(e?.message || 'Failed to load') } finally{ setLoading(false) }
    }; fetchData()
  }, [])

  const names = useMemo(()=> input.split(/\n+/).map(s=>s.trim()).filter(Boolean), [input])
  const result = useMemo(()=> dataset ? analyzeRoster(names, dataset, DEFAULT_SETTINGS) : null, [names, dataset])

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

  if (loading) return <main className="max-w-6xl mx-auto p-6"><div className="card p-6">Loading Sleeper data…</div></main>
  if (error || !dataset) return <main className="max-w-6xl mx-auto p-6"><div className="card p-6 text-red-300">Error: {error || 'Could not load dataset'}</div></main>

  const sumProj = result!.team.sumProj, sumBaseline = result!.team.sumBaseline
  const teamPctAbove = sumBaseline>0 ? ((sumProj - sumBaseline)/sumBaseline)*100 : 0
  const gradeColorClass = gradeColor(result!.team.overallGrade)

  return (
    <main className="max-w-6xl mx-auto p-6">
      <header className="sticky top-0 z-10 mb-6 backdrop-blur supports-[backdrop-filter]:bg-[rgba(11,16,32,0.6)] rounded-xl">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold">Fantasy Team Analyzer</h1>
          <p className="text-[var(--muted)]">League import + images • Live names/ADP from Sleeper • 12-team PPR defaults • Scrollable detailed analysis</p>
        </div>
      </header>

      <section className="grid lg:grid-cols-3 gap-6">
        {/* Left: Import & roster input */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-4 space-y-3">
            <h2 className="font-semibold">Import from Sleeper</h2>
            <div className="flex gap-2 flex-wrap">
              <input value={leagueId} onChange={e=>setLeagueId(e.target.value)} placeholder="Enter League ID (e.g., 123456789012345678)"
                className="flex-1 min-w-[260px] rounded bg-[#0c1326] border border-white/10 p-2 outline-none focus:ring-2 focus:ring-brand-500" />
              <button disabled={!leagueId || importing} onClick={doImport} className="px-3 py-2 rounded bg-brand-500 hover:opacity-90 disabled:opacity-50">Fetch Teams</button>
            </div>
            {importErr && <div className="text-sm text-red-300">{importErr}</div>}
            {teams && (
              <div className="space-y-2">
                <div className="text-sm text-[var(--muted)]">Select your team to auto-fill the roster box:</div>
                <div className="grid md:grid-cols-2 gap-2">
                  {teams.map(t=> (
                    <button key={t.roster_id} onClick={()=>useTeam(t.owner_id)}
                      className={"p-2 rounded border " + (selectedOwnerId===t.owner_id?'border-brand-500 bg-brand-500/10':'border-white/10 bg-[#0c1326]')}>
                      {t.owner_name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-semibold">Your Roster (one per line)</h2>
              <button className="px-3 py-1.5 rounded bg-brand-500 hover:opacity-90 text-white text-sm" onClick={()=> setShowDetail(s=>!s)}>
                {showDetail ? 'Hide' : 'View'} Player-by-Player Analysis
              </button>
            </div>
            <textarea value={input} onChange={e=>setInput(e.target.value)} rows={12}
              className="w-full rounded bg-[#0c1326] border border-white/10 p-3 outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Type or paste players..."/>
            <p className="text-xs text-[var(--muted)]">Matching uses Sleeper's player list (lowercased, punctuation-insensitive). Unknown names show a placeholder.</p>
          </div>
        </div>

        {/* Right: Team Summary */}
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold">Team Summary</h2>
          <div className="grid grid-cols-2 gap-4">
            <Bar label="Your Team (PPG sum)" value={sumProj} max={Math.max(sumProj, sumBaseline)} />
            <Bar label="League Avg (Sum of baselines)" value={sumBaseline} max={Math.max(sumProj, sumBaseline)} />
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="% Above Avg" value={`${teamPctAbove>=0?'+':''}${teamPctAbove.toFixed(1)}%`} />
            <Stat label="Positional Advantages" value={`${result!.team.advantagesCount}/8`} />
            <Stat label="Star Players" value={`${result!.team.starCount}`} />
            <Stat label="Bench Depth" value={`${result!.team.benchDepthCount}`} />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="space-y-0.5">
              <div className="text-sm text-[var(--muted)]">Overall Team Grade</div>
              <div className={"text-2xl font-extrabold " + gradeColor(result!.team.overallGrade)}>{result!.team.overallGrade}</div>
            </div>
            <div className="space-y-0.5 text-right">
              <div className="text-sm text-[var(--muted)]">Projected Record</div>
              <div className="text-xl font-bold">{result!.team.projectedRecord}</div>
              <div className="text-sm text-[var(--muted)]">Playoff Odds: <span className="font-semibold">{result!.team.playoffOddsPct}%</span></div>
            </div>
          </div>
        </div>
      </section>

      {showDetail && result && (
        <section className="mt-6 grid grid-cols-1">
          <div className="card p-4">
            <h3 className="font-semibold mb-3">Detailed Player Analysis</h3>
            <div className="h-[60vh] overflow-y-auto space-y-3 pr-1">
              {result.starters.map((s, i)=>(
                <PlayerCard key={i}
                  name={s.player.name}
                  team={s.player.team}
                  position={s.player.position}
                  headshot={s.player.headshot}
                  adp={s.player.adp}
                  proj_ppg={s.player.proj_ppg}
                  slot={s.slot}
                  baseline={s.baseline}
                  delta={s.delta}
                  grade={s.grade}
                />
              ))}
              {result.bench.length>0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-[var(--muted)] mb-2">Bench</h4>
                  <div className="grid gap-3">
                    {result.bench.map((p,i)=>(
                      <PlayerCard key={'b'+i}
                        name={p.name} team={p.team} position={p.position}
                        headshot={p.headshot} adp={p.adp} proj_ppg={p.proj_ppg}
                        slot="BENCH" baseline={result.baselines.FLEX} delta={p.proj_ppg - result.baselines.FLEX}
                        grade={'C'}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="mt-10 text-center text-xs text-[var(--muted)]">
        <p>Free-data MVP: Names/ADP via Sleeper; headshots via Wikimedia where available, else team logos, else placeholder. Replace approximate projections with a licensed feed when ready.</p>
      </footer>
    </main>
  )
}
