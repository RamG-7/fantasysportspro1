import { NextRequest, NextResponse } from 'next/server'
import { analyzePlayerWithGemini } from '../../../../lib/gemini'

export async function POST(request: NextRequest) {
  try {
    const { player } = await request.json()
    
    if (!player) {
      return NextResponse.json({ error: 'Player data is required' }, { status: 400 })
    }

    const analysis = await analyzePlayerWithGemini(player)
    
    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Analysis API error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze player' }, 
      { status: 500 }
    )
  }
} 