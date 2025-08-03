import { NextRequest, NextResponse } from 'next/server'
import { analyzeTeamWithGemini } from '../../../../lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { rosterPlayers, dataset } = await request.json()
    
    if (!rosterPlayers || !dataset) {
      return NextResponse.json(
        { error: 'Missing roster players or dataset' },
        { status: 400 }
      )
    }

    const analysis = await analyzeTeamWithGemini(rosterPlayers, dataset)
    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Team analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze team' },
      { status: 500 }
    )
  }
} 