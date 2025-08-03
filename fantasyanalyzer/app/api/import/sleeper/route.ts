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
      const u = userById.get(r.owner_id) || {} as any
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
