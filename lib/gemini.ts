import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export interface PlayerAnalysis {
  analysis: string
  grade: string
  gradeColor: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  weeklyOutlook: string
  tradeValue: string
  rosterStrategy: string
  riskFactors: string
}

export interface TeamAnalysis {
  teamPPG: number
  leagueAverage: number
  overallGrade: string
  gradeColor: string
  projectedRecord: string
  playoffOdds: string
  percentAboveAverage: number
  positionalAdvantages: string
  starPlayers: number
  benchDepth: number
  weakestPosition: string
  tradeRecommendations: string[]
  teamStrengths: string[]
  teamWeaknesses: string[]
  improvementStrategy: string
}

// Clean up text formatting
function cleanText(text: string): string {
  return text
    // Add space after periods that are followed by uppercase letters
    .replace(/\.([A-Z])/g, '. $1')
    // Add space after exclamation marks followed by uppercase letters
    .replace(/!([A-Z])/g, '! $1')
    // Add space after question marks followed by uppercase letters
    .replace(/\?([A-Z])/g, '? $1')
    // Fix any double spaces
    .replace(/\s+/g, ' ')
    .trim()
}

export async function analyzePlayerWithGemini(player: any): Promise<PlayerAnalysis> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `Analyze this fantasy football player and provide extremely detailed, specific analysis for fantasy football decision-making.

PLAYER DATA:
Name: ${player.name}
Position: ${player.position}
Team: ${player.team}
ADP: ${player.adp || 'Undrafted'}
Projected PPG: ${player.proj_ppg?.toFixed(1) || 'N/A'}
Fantasy Points: ${player.fantasy_points || 'N/A'}

Please provide an extremely detailed player analysis in this exact JSON format:

{
  "analysis": "Comprehensive analysis of the player's fantasy outlook, including recent performance, team situation, injury history, and specific fantasy implications. Be very specific about what to expect and why.",
  "grade": "A+",
  "gradeColor": "green",
  "strengths": [
    "Specific strength 1 with detailed reasoning",
    "Specific strength 2 with detailed reasoning",
    "Specific strength 3 with detailed reasoning"
  ],
  "weaknesses": [
    "Specific weakness 1 with detailed reasoning",
    "Specific weakness 2 with detailed reasoning",
    "Specific weakness 3 with detailed reasoning"
  ],
  "recommendations": [
    "Specific actionable recommendation 1 with detailed reasoning (focus on lineup/start decisions)",
    "Specific actionable recommendation 2 with detailed reasoning (focus on trade/acquisition strategy)",
    "Specific actionable recommendation 3 with detailed reasoning (focus on monitoring/risk management)"
  ],
  "weeklyOutlook": "Specific weekly floor and ceiling expectations with detailed reasoning for the numbers provided",
  "tradeValue": "Specific trade value assessment with actual player comparisons and detailed reasoning",
  "rosterStrategy": "Specific advice on how to use this player in roster construction, lineup decisions, and trade scenarios",
  "riskFactors": "Specific risk factors that could impact performance, with detailed explanations and monitoring advice"
}

ANALYSIS REQUIREMENTS:
- Be extremely specific about the player's situation, team context, and fantasy implications
- Provide detailed reasoning for all assessments and recommendations
- Include specific player comparisons and trade scenarios
- Address recent performance trends, injuries, team changes, and schedule impact
- Give specific actionable advice for roster management
- Consider ADP value, current market value, and trade scenarios
- Provide specific weekly expectations with detailed reasoning
- Include specific risk factors and monitoring advice

RECOMMENDATIONS REQUIREMENTS (CRITICAL):
- The 3 recommendations MUST be DISTINCT and cover DIFFERENT aspects of roster management
- Recommendation 1: Focus on LINEUP DECISIONS (when to start/bench, matchup considerations, weekly usage)
- Recommendation 2: Focus on TRADE/ACQUISITION STRATEGY (trade value, who to target, when to buy/sell)
- Recommendation 3: Focus on MONITORING/RISK MANAGEMENT (what to watch for, warning signs, long-term outlook)
- DO NOT repeat similar advice across recommendations - each must address a unique decision-making area
- Ensure each recommendation provides actionable, specific guidance that doesn't overlap with the others

MAKE THE ANALYSIS:
- Extremely detailed and specific to this player
- Actionable for fantasy football decision-making
- Include specific player names in comparisons
- Provide detailed reasoning for all assessments
- Focus on what makes this player unique or concerning
- Give specific advice for roster construction and trade scenarios

Make this analysis extremely detailed, specific, and useful for fantasy football decision-making. Focus on actionable insights and specific recommendations.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Clean up the response to extract just the JSON
    let jsonText = text
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0]
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0]
    }
    
    // Parse the JSON response
    const analysis = JSON.parse(jsonText.trim()) as PlayerAnalysis
    
    // Clean up text formatting for all text fields
    return {
      analysis: cleanText(analysis.analysis),
      grade: analysis.grade,
      gradeColor: analysis.gradeColor,
      strengths: analysis.strengths.map(cleanText),
      weaknesses: analysis.weaknesses.map(cleanText),
      recommendations: analysis.recommendations.map(cleanText),
      weeklyOutlook: cleanText(analysis.weeklyOutlook),
      tradeValue: cleanText(analysis.tradeValue),
      rosterStrategy: cleanText(analysis.rosterStrategy),
      riskFactors: cleanText(analysis.riskFactors)
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    
    // Fallback to rule-based analysis
    return getFallbackAnalysis(player)
  }
}

export async function analyzeTeamWithGemini(rosterPlayers: string[], dataset: any): Promise<TeamAnalysis> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    // Get player details for the roster
    const playerDetails = rosterPlayers.map(name => {
      const player = dataset.players.find((p: any) => p.name === name)
      return player ? {
        name: player.name,
        position: player.position,
        team: player.team,
        adp: player.adp,
        fantasy_points: player.fantasy_points,
        proj_ppg: player.proj_ppg
      } : null
    }).filter(Boolean)

    const prompt = `Analyze this fantasy football team roster and provide comprehensive team analysis and specific trade recommendations.

ROSTER:
${playerDetails.map(p => `- ${p.name} (${p.position}, ${p.team}, ADP: ${p.adp || 'Undrafted'}, Proj PPG: ${p.proj_ppg?.toFixed(1) || 'N/A'})`).join('\n')}

AVAILABLE PLAYERS FOR TRADE TARGETS:
${dataset.players.filter((p: any) => p.proj_ppg >= 8).sort((a: any, b: any) => b.proj_ppg - a.proj_ppg).slice(0, 20).map(p => `- ${p.name} (${p.position}, ${p.team}, Proj PPG: ${p.proj_ppg?.toFixed(1)})`).join('\n')}

Please provide a detailed team analysis in this exact JSON format:

{
  "teamPPG": 82.0,
  "leagueAverage": 91.8,
  "overallGrade": "C-",
  "gradeColor": "yellow",
  "projectedRecord": "4-10",
  "playoffOdds": "2%",
  "percentAboveAverage": -10.7,
  "positionalAdvantages": "7/8",
  "starPlayers": 0,
  "benchDepth": 0,
  "weakestPosition": "FLEX",
  "tradeRecommendations": [
    "Trade [specific player from roster] for [specific available player] - [specific reasoning about why this trade improves the team]",
    "Target [specific available player name] to address [specific weakness] - [detailed reasoning]",
    "Consider trading [specific overvalued player from roster] for [specific undervalued available player] to improve [specific position]"
  ],
  "teamStrengths": [
    "Key team strength 1",
    "Key team strength 2",
    "Key team strength 3"
  ],
  "teamWeaknesses": [
    "Key team weakness 1",
    "Key team weakness 2",
    "Key team weakness 3"
  ],
  "improvementStrategy": "Specific actionable strategy: [1] Target [specific position] upgrades, [2] Trade [specific players] for [specific targets], [3] Focus on [specific strategy] to improve [specific weakness]"
}

ANALYSIS REQUIREMENTS:
- Calculate realistic team PPG based on player projections
- Assess team grade (A+ to F) based on overall roster quality
- Identify weakest position that needs upgrading
- Provide SPECIFIC trade recommendations using ONLY players from the roster and available players list
- Analyze what positions you have too much of vs. what you're missing
- Identify specific players to target in trades with clear reasoning
- Suggest trades that address specific roster weaknesses
- Analyze positional advantages (how many positions are above average)
- Count star players (top 24 overall players)
- Assess bench depth quality
- Provide actionable improvement strategy with specific targets
- Consider team construction, bye weeks, and roster balance

TRADE RECOMMENDATIONS MUST:
- Use ONLY actual player names from the roster and available players list
- Address clear roster weaknesses with specific reasoning
- Explain why each trade improves the team with detailed analysis
- Consider ADP value and current market value
- Focus on positions of need vs. positions of strength
- Include specific player names from both the roster and available players
- Provide detailed reasoning for why each trade makes sense
- CRITICAL: Each of the 3 trade recommendations must target a DIFFERENT player - do not repeat the same target player across multiple recommendations
- Ensure each recommendation addresses a different aspect: (1) critical position need, (2) roster upgrade opportunity, (3) depth improvement
- CRITICAL: Only reference players that ACTUALLY EXIST in the roster - do not use placeholder text like "your RB2" or "your WR3" if those players don't exist
- If the roster is missing players at a position, suggest acquiring them via free agency or package trades rather than referencing non-existent players
- Make logical recommendations based on the actual roster composition - if there are only 3 players, don't suggest trading "your RB2" if there is no RB2
- NEVER suggest trading draft picks - fantasy football trades are player-for-player only (or player packages for players). Draft picks are only relevant during the draft, not during the season
- Package trades should involve multiple actual players (e.g., "Player A + Player B for Player C"), never draft picks or future considerations

Make the analysis extremely detailed and actionable for fantasy football decision-making. Focus on specific players to target and clear reasoning for each recommendation.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Clean up the response to extract just the JSON
    let jsonText = text
    if (text.includes('```json')) {
      jsonText = text.split('```json')[1].split('```')[0]
    } else if (text.includes('```')) {
      jsonText = text.split('```')[1].split('```')[0]
    }
    
    // Parse the JSON response
    const analysis = JSON.parse(jsonText.trim()) as TeamAnalysis
    
    // Clean up text formatting for all text fields
    return {
      teamPPG: analysis.teamPPG,
      leagueAverage: analysis.leagueAverage,
      overallGrade: cleanText(analysis.overallGrade),
      gradeColor: analysis.gradeColor,
      projectedRecord: cleanText(analysis.projectedRecord),
      playoffOdds: cleanText(analysis.playoffOdds),
      percentAboveAverage: analysis.percentAboveAverage,
      positionalAdvantages: cleanText(analysis.positionalAdvantages),
      starPlayers: analysis.starPlayers,
      benchDepth: analysis.benchDepth,
      weakestPosition: cleanText(analysis.weakestPosition),
      tradeRecommendations: analysis.tradeRecommendations.map(cleanText),
      teamStrengths: analysis.teamStrengths.map(cleanText),
      teamWeaknesses: analysis.teamWeaknesses.map(cleanText),
      improvementStrategy: cleanText(analysis.improvementStrategy)
    }
  } catch (error) {
    console.error('Gemini API error:', error)
    
    // Fallback to rule-based analysis
    return getFallbackTeamAnalysis(rosterPlayers, dataset)
  }
}

function getFallbackAnalysis(player: any): PlayerAnalysis {
  const ppg = player.proj_ppg || 0
  const position = player.position
  const name = player.name
  const team = player.team
  
  let analysis = ''
  let grade = 'C'
  let gradeColor = 'var(--warning)'
  let strengths: string[] = []
  let weaknesses: string[] = []
  let recommendations: string[] = []
  let weeklyOutlook = ''
  let tradeValue = ''
  let rosterStrategy = ''
  let riskFactors = ''
  
  if (position === 'QB') {
    if (ppg >= 20) {
      analysis = `${name} is an elite QB1 with exceptional fantasy production. His dual-threat ability and high-volume passing make him a weekly must-start. Expect consistent top-5 QB production with weekly upside for 30+ point games.`
      grade = 'A+'
      gradeColor = 'var(--success)'
      strengths = [
        `${name} has elite rushing upside that provides a high floor even in tough matchups`,
        `His team's pass-heavy offense and lack of running game ensures high volume`,
        `Dual-threat QBs like ${name} have proven to be fantasy gold with rushing TDs`
      ]
      weaknesses = [
        `${name} faces tough defensive matchups in weeks 3, 7, and 12 that could limit upside`,
        `His aggressive playing style increases injury risk compared to pocket passers`,
        `The team's improved defense could lead to more conservative game scripts`
      ]
      recommendations = [
        `Start ${name} every week regardless of matchup - his rushing floor is too valuable`,
        `Consider trading for a top-tier RB or WR if you have QB depth - ${name} is a premium asset`,
        `Monitor his rushing attempts - if they decrease, his value could drop significantly`
      ]
      weeklyOutlook = `Weekly floor: ${Math.max(18, ppg - 3).toFixed(1)} PPG, ceiling: ${(ppg + 8).toFixed(1)} PPG. ${name} has the highest rushing upside of any QB, making him matchup-proof.`
      tradeValue = `${name} is worth a top-5 RB or WR1. His rushing floor makes him more valuable than pure passers like Josh Allen.`
      rosterStrategy = `Use ${name} as your QB1 every week. His rushing upside provides a weekly advantage over most QBs. Consider trading him only for elite RB/WR assets.`
      riskFactors = `Injury risk from rushing attempts, potential for conservative game scripts if team leads, and tough defensive matchups in weeks 3, 7, 12.`
    } else if (ppg >= 16) {
      analysis = `${name} is a solid QB2 with good fantasy potential. His consistent production and favorable team situation make him a reliable starter.`
      grade = 'B'
      gradeColor = 'var(--primary)'
      strengths = [
        `${name} has a favorable schedule with weak pass defenses in weeks 2, 5, and 9`,
        `His team's offensive line improvements should provide better protection`,
        `The addition of a new WR should increase his passing volume`
      ]
      weaknesses = [
        `${name} struggles against pressure and faces strong pass rushes in weeks 4 and 8`,
        `His conservative playing style limits ceiling compared to dual-threat QBs`,
        `The team's run-first approach could limit passing volume in some games`
      ]
      recommendations = [
        `Start ${name} in favorable matchups but consider benching against strong pass rushes`,
        `Trade ${name} for a mid-tier RB2 if you have QB depth - his value is replaceable`,
        `Monitor his new WR connection - if it clicks, his value could increase significantly`
      ]
      weeklyOutlook = `Weekly floor: ${Math.max(12, ppg - 4).toFixed(1)} PPG, ceiling: ${(ppg + 6).toFixed(1)} PPG. ${name} is a safe but unspectacular option.`
      tradeValue = `${name} is worth a mid-tier RB2 or WR2. His consistent but unspectacular production makes him replaceable.`
      rosterStrategy = `Use ${name} as a matchup-based starter. His safe floor makes him a good backup QB option.`
      riskFactors = `Struggles against pressure, conservative playing style limits upside, and run-first game scripts could hurt value.`
    } else {
      analysis = `${name} is a low-end QB3 with limited fantasy upside. His poor team situation and lack of rushing ability make him a desperation play only.`
      grade = 'D'
      gradeColor = 'var(--danger)'
      strengths = [
        `${name} has a few favorable matchups against weak secondaries`,
        `His team's lack of running game could force more passing volume`,
        `He has shown flashes of competence in garbage time situations`
      ]
      weaknesses = [
        `${name} faces one of the toughest schedules with multiple elite pass rushes`,
        `His team's poor offensive line will lead to constant pressure and sacks`,
        `Lack of rushing ability severely limits his fantasy ceiling`
      ]
      recommendations = [
        `Avoid starting ${name} except in 2QB leagues or as a desperation play`,
        `Trade ${name} for any RB3 or WR3 - his value is minimal`,
        `Drop ${name} if you need roster space - he's easily replaceable`
      ]
      weeklyOutlook = `Weekly floor: ${Math.max(8, ppg - 6).toFixed(1)} PPG, ceiling: ${(ppg + 4).toFixed(1)} PPG. ${name} is a desperation play only.`
      tradeValue = `${name} has minimal trade value. Consider dropping him for a high-upside RB or WR.`
      rosterStrategy = `Avoid ${name} except in 2QB leagues. His poor situation and lack of upside make him droppable.`
      riskFactors = `Poor offensive line, tough schedule, lack of rushing upside, and team's overall offensive struggles.`
    }
  } else if (position === 'RB') {
    if (ppg >= 15) {
      analysis = `${name} is an elite RB1 with exceptional fantasy production. His combination of rushing volume, receiving work, and goal-line opportunities make him a weekly must-start.`
      grade = 'A+'
      gradeColor = 'var(--success)'
      strengths = [
        `${name} has elite volume with 20+ touches per game and goal-line work`,
        `His receiving ability provides a high floor even in tough rushing matchups`,
        `The team's offensive line improvements should create better running lanes`
      ]
      weaknesses = [
        `${name} faces tough run defenses in weeks 2, 6, and 11 that could limit production`,
        `His heavy workload increases injury risk compared to committee backs`,
        `The team's improved passing game could reduce rushing volume in some games`
      ]
      recommendations = [
        `Start ${name} every week - his volume and receiving work make him matchup-proof`,
        `Trade ${name} only for elite WR1 or QB1 assets - he's a premium fantasy commodity`,
        `Monitor his workload - if it decreases, his value could drop significantly`
      ]
      weeklyOutlook = `Weekly floor: ${Math.max(12, ppg - 4).toFixed(1)} PPG, ceiling: ${(ppg + 8).toFixed(1)} PPG. ${name} is a weekly RB1 with elite upside.`
      tradeValue = `${name} is worth a top-3 WR or elite QB. His volume and receiving work make him extremely valuable.`
      rosterStrategy = `Use ${name} as your RB1 every week. His volume and receiving floor make him a premium asset.`
      riskFactors = `Heavy workload injury risk, tough run defense matchups, and potential for reduced volume if team passes more.`
    } else if (ppg >= 10) {
      analysis = `${name} is a solid RB2 with good fantasy potential. His consistent production and favorable role make him a reliable starter.`
      grade = 'B'
      gradeColor = 'var(--primary)'
      strengths = [
        `${name} has a clear role as the team's primary back with goal-line work`,
        `His receiving ability provides a solid floor in PPR leagues`,
        `The team's offensive improvements should create better running opportunities`
      ]
      weaknesses = [
        `${name} shares touches with a backup RB which limits his ceiling`,
        `He faces some tough run defenses that could limit his production`,
        `The team's pass-first approach could reduce rushing volume in some games`
      ]
      recommendations = [
        `Start ${name} in most matchups but consider benching against elite run defenses`,
        `Trade ${name} for a mid-tier WR2 if you have RB depth - his value is solid but replaceable`,
        `Monitor the backup RB's role - if it increases, ${name}'s value could drop`
      ]
      weeklyOutlook = `Weekly floor: ${Math.max(8, ppg - 4).toFixed(1)} PPG, ceiling: ${(ppg + 6).toFixed(1)} PPG. ${name} is a reliable RB2 option.`
      tradeValue = `${name} is worth a mid-tier WR2 or QB2. His consistent production makes him a solid trade asset.`
      rosterStrategy = `Use ${name} as a weekly RB2. His receiving floor makes him a good PPR option.`
      riskFactors = `Committee role limits upside, tough run defense matchups, and potential for reduced volume in pass-heavy game scripts.`
    } else {
      analysis = `${name} is a low-end RB3 with limited fantasy upside. His committee role and poor team situation make him a desperation play only.`
      grade = 'D'
      gradeColor = 'var(--danger)'
      strengths = [
        `${name} has a few favorable matchups against weak run defenses`,
        `He occasionally gets goal-line work which provides TD upside`,
        `The team's lack of passing game could force more rushing volume`
      ]
      weaknesses = [
        `${name} is in a committee backfield that severely limits his volume`,
        `He faces one of the toughest schedules with multiple elite run defenses`,
        `Poor offensive line play will limit his rushing efficiency`
      ]
      recommendations = [
        `Avoid starting ${name} except in deep leagues or as a desperation flex play`,
        `Trade ${name} for any WR3 or QB3 - his value is minimal`,
        `Drop ${name} if you need roster space - he's easily replaceable`
      ]
      weeklyOutlook = `Weekly floor: ${Math.max(4, ppg - 6).toFixed(1)} PPG, ceiling: ${(ppg + 4).toFixed(1)} PPG. ${name} is a desperation play only.`
      tradeValue = `${name} has minimal trade value. Consider dropping him for a high-upside WR or QB.`
      rosterStrategy = `Avoid ${name} except in deep leagues. His committee role and poor situation make him droppable.`
      riskFactors = `Committee role limits volume, tough schedule, poor offensive line, and team's overall offensive struggles.`
    }
  } else if (position === 'WR') {
    if (ppg >= 12) {
      analysis = `${name} is an elite WR1 with exceptional fantasy production. His combination of volume, talent, and team situation make him a weekly must-start.`
      grade = 'A+'
      gradeColor = 'var(--success)'
      strengths = [
        `${name} has elite volume with 10+ targets per game and red-zone work`,
        `His exceptional route-running and hands make him a reliable target`,
        `The team's pass-heavy offense ensures consistent volume and opportunities`
      ]
      weaknesses = [
        `${name} faces tough cornerback matchups in weeks 3, 7, and 12 that could limit production`,
        `His high target share makes him vulnerable to defensive attention`,
        `The team's improved running game could reduce passing volume in some games`
      ]
      recommendations = [
        `Start ${name} every week - his volume and talent make him matchup-proof`,
        `Trade ${name} only for elite RB1 or QB1 assets - he's a premium fantasy commodity`,
        `Monitor his target share - if it decreases, his value could drop significantly`
      ]
      weeklyOutlook = `Weekly floor: ${Math.max(10, ppg - 4).toFixed(1)} PPG, ceiling: ${(ppg + 8).toFixed(1)} PPG. ${name} is a weekly WR1 with elite upside.`
      tradeValue = `${name} is worth a top-3 RB or elite QB. His volume and talent make him extremely valuable.`
      rosterStrategy = `Use ${name} as your WR1 every week. His volume and talent make him a premium asset.`
      riskFactors = `Tough cornerback matchups, high defensive attention, and potential for reduced volume if team runs more.`
    } else if (ppg >= 8) {
      analysis = `${name} is a solid WR2 with good fantasy potential. His consistent production and favorable role make him a reliable starter.`
      grade = 'B'
      gradeColor = 'var(--primary)'
      strengths = [
        `${name} has a clear role as the team's primary receiver with good target share`,
        `His route-running ability provides a solid floor in most matchups`,
        `The team's pass-first approach ensures consistent volume`
      ]
      weaknesses = [
        `${name} shares targets with other receivers which limits his ceiling`,
        `He faces some tough cornerback matchups that could limit his production`,
        `The team's improved running game could reduce passing volume in some games`
      ]
      recommendations = [
        `Start ${name} in most matchups but consider benching against elite cornerbacks`,
        `Trade ${name} for a mid-tier RB2 if you have WR depth - his value is solid but replaceable`,
        `Monitor his target share - if it decreases, ${name}'s value could drop`
      ]
      weeklyOutlook = `Weekly floor: ${Math.max(6, ppg - 4).toFixed(1)} PPG, ceiling: ${(ppg + 6).toFixed(1)} PPG. ${name} is a reliable WR2 option.`
      tradeValue = `${name} is worth a mid-tier RB2 or QB2. His consistent production makes him a solid trade asset.`
      rosterStrategy = `Use ${name} as a weekly WR2. His consistent volume makes him a good PPR option.`
      riskFactors = `Committee role limits upside, tough cornerback matchups, and potential for reduced volume in run-heavy game scripts.`
    } else {
      analysis = `${name} is a low-end WR3 with limited fantasy upside. His committee role and poor team situation make him a desperation play only.`
      grade = 'D'
      gradeColor = 'var(--danger)'
      strengths = [
        `${name} has a few favorable matchups against weak secondaries`,
        `He occasionally gets red-zone targets which provides TD upside`,
        `The team's lack of running game could force more passing volume`
      ]
      weaknesses = [
        `${name} is in a committee receiving corps that severely limits his volume`,
        `He faces one of the toughest schedules with multiple elite cornerbacks`,
        `Poor quarterback play will limit his receiving efficiency`
      ]
      recommendations = [
        `Avoid starting ${name} except in deep leagues or as a desperation flex play`,
        `Trade ${name} for any RB3 or QB3 - his value is minimal`,
        `Drop ${name} if you need roster space - he's easily replaceable`
      ]
      weeklyOutlook = `Weekly floor: ${Math.max(3, ppg - 6).toFixed(1)} PPG, ceiling: ${(ppg + 4).toFixed(1)} PPG. ${name} is a desperation play only.`
      tradeValue = `${name} has minimal trade value. Consider dropping him for a high-upside RB or QB.`
      rosterStrategy = `Avoid ${name} except in deep leagues. His committee role and poor situation make him droppable.`
      riskFactors = `Committee role limits volume, tough schedule, poor quarterback play, and team's overall offensive struggles.`
    }
  } else if (position === 'TE') {
    if (ppg >= 10) {
      analysis = `${name} is an elite TE1 with exceptional fantasy production. His combination of volume, talent, and team situation make him a weekly must-start.`
      grade = 'A+'
      gradeColor = 'var(--success)'
      strengths = [
        `${name} has elite volume with 8+ targets per game and red-zone work`,
        `His exceptional size and hands make him a reliable red-zone target`,
        `The team's pass-heavy offense ensures consistent volume and opportunities`
      ]
      weaknesses = [
        `${name} faces tough linebacker matchups in weeks 4, 8, and 12 that could limit production`,
        `His high target share makes him vulnerable to defensive attention`,
        `The team's improved running game could reduce passing volume in some games`
      ]
      recommendations = [
        `Start ${name} every week - his volume and talent make him matchup-proof`,
        `Trade ${name} only for elite RB1 or WR1 assets - he's a premium fantasy commodity`,
        `Monitor his target share - if it decreases, his value could drop significantly`
      ]
      weeklyOutlook = `Weekly floor: ${Math.max(8, ppg - 4).toFixed(1)} PPG, ceiling: ${(ppg + 8).toFixed(1)} PPG. ${name} is a weekly TE1 with elite upside.`
      tradeValue = `${name} is worth a top-5 RB or WR. His volume and talent make him extremely valuable.`
      rosterStrategy = `Use ${name} as your TE1 every week. His volume and talent make him a premium asset.`
      riskFactors = `Tough linebacker matchups, high defensive attention, and potential for reduced volume if team runs more.`
    } else if (ppg >= 6) {
      analysis = `${name} is a solid TE2 with good fantasy potential. His consistent production and favorable role make him a reliable starter.`
      grade = 'B'
      gradeColor = 'var(--primary)'
      strengths = [
        `${name} has a clear role as the team's primary tight end with good target share`,
        `His size and hands make him a reliable red-zone target`,
        `The team's pass-first approach ensures consistent volume`
      ]
      weaknesses = [
        `${name} shares targets with other receivers which limits his ceiling`,
        `He faces some tough linebacker matchups that could limit his production`,
        `The team's improved running game could reduce passing volume in some games`
      ]
      recommendations = [
        `Start ${name} in most matchups but consider benching against elite linebackers`,
        `Trade ${name} for a mid-tier RB2 or WR2 if you have TE depth - his value is solid but replaceable`,
        `Monitor his target share - if it decreases, ${name}'s value could drop`
      ]
      weeklyOutlook = `Weekly floor: ${Math.max(4, ppg - 4).toFixed(1)} PPG, ceiling: ${(ppg + 6).toFixed(1)} PPG. ${name} is a reliable TE2 option.`
      tradeValue = `${name} is worth a mid-tier RB2 or WR2. His consistent production makes him a solid trade asset.`
      rosterStrategy = `Use ${name} as a weekly TE2. His consistent volume makes him a good PPR option.`
      riskFactors = `Committee role limits upside, tough linebacker matchups, and potential for reduced volume in run-heavy game scripts.`
    } else {
      analysis = `${name} is a low-end TE3 with limited fantasy upside. His committee role and poor team situation make him a desperation play only.`
      grade = 'D'
      gradeColor = 'var(--danger)'
      strengths = [
        `${name} has a few favorable matchups against weak linebackers`,
        `He occasionally gets red-zone targets which provides TD upside`,
        `The team's lack of running game could force more passing volume`
      ]
      weaknesses = [
        `${name} is in a committee receiving corps that severely limits his volume`,
        `He faces one of the toughest schedules with multiple elite linebackers`,
        `Poor quarterback play will limit his receiving efficiency`
      ]
      recommendations = [
        `Avoid starting ${name} except in deep leagues or as a desperation flex play`,
        `Trade ${name} for any RB3 or WR3 - his value is minimal`,
        `Drop ${name} if you need roster space - he's easily replaceable`
      ]
      weeklyOutlook = `Weekly floor: ${Math.max(2, ppg - 6).toFixed(1)} PPG, ceiling: ${(ppg + 4).toFixed(1)} PPG. ${name} is a desperation play only.`
      tradeValue = `${name} has minimal trade value. Consider dropping him for a high-upside RB or WR.`
      rosterStrategy = `Avoid ${name} except in deep leagues. His committee role and poor situation make him droppable.`
      riskFactors = `Committee role limits volume, tough schedule, poor quarterback play, and team's overall offensive struggles.`
    }
  } else {
    // Kicker or Defense
    analysis = `${name} is a ${position} with limited fantasy impact. His role and team situation provide minimal fantasy value.`
    grade = 'C'
    gradeColor = 'var(--warning)'
    strengths = [
      `${name} has a consistent role in the team's ${position} unit`,
      `His experience and reliability provide a stable floor`,
      `The team's situation provides some favorable opportunities`
    ]
    weaknesses = [
      `${name} has limited fantasy upside due to his ${position} role`,
      `His production is heavily dependent on team performance`,
      `The position generally has low fantasy value and high variance`
    ]
    recommendations = [
      `Use ${name} only as a matchup-based starter in deep leagues`,
      `Consider streaming ${position} options based on weekly matchups`,
      `Don't invest significant draft capital in ${position} positions`
    ]
    weeklyOutlook = `Weekly floor: ${Math.max(2, ppg - 4).toFixed(1)} PPG, ceiling: ${(ppg + 4).toFixed(1)} PPG. ${name} is a low-value fantasy option.`
    tradeValue = `${name} has minimal trade value. ${position} positions are generally not worth trading for.`
    rosterStrategy = `Use ${name} only as a desperation play. ${position} positions have minimal fantasy value.`
    riskFactors = `High variance, dependent on team performance, and generally low fantasy value.`
  }

  return {
    analysis,
    grade,
    gradeColor,
    strengths,
    weaknesses,
    recommendations,
    weeklyOutlook,
    tradeValue,
    rosterStrategy,
    riskFactors
  }
}

function getFallbackTeamAnalysis(rosterPlayers: string[], dataset: any): TeamAnalysis {
  const teamPPG = rosterPlayers.reduce((sum, name) => {
    const player = dataset.players.find((p: any) => p.name === name)
    return sum + (player?.proj_ppg || 0)
  }, 0)
  const leagueAverage = dataset.league_average_ppg || 0
  const percentAboveAverage = teamPPG - leagueAverage

  // Analyze roster composition
  const rosterDetails = rosterPlayers.map(name => {
    const player = dataset.players.find((p: any) => p.name === name)
    return player ? {
      name: player.name,
      position: player.position,
      team: player.team,
      adp: player.adp,
      proj_ppg: player.proj_ppg
    } : null
  }).filter(Boolean)

  // Count positions
  const positionCounts: { [key: string]: number } = {}
  rosterDetails.forEach(player => {
    positionCounts[player!.position] = (positionCounts[player!.position] || 0) + 1
  })

  // Find weakest position (position with fewest players or lowest PPG)
  const positionPPG: { [key: string]: number } = {}
  rosterDetails.forEach(player => {
    positionPPG[player!.position] = (positionPPG[player!.position] || 0) + player!.proj_ppg
  })

  let weakestPosition = 'FLEX'
  let lowestPPG = Infinity
  Object.entries(positionPPG).forEach(([pos, ppg]) => {
    if (ppg < lowestPPG) {
      lowestPPG = ppg
      weakestPosition = pos
    }
  })

  // Generate specific trade recommendations based on roster analysis
  let tradeRecommendations: string[] = []
  let teamStrengths: string[] = []
  let teamWeaknesses: string[] = []
  let improvementStrategy = ''

  // Analyze specific roster composition for targeted recommendations
  const qbCount = positionCounts['QB'] || 0
  const rbCount = positionCounts['RB'] || 0
  const wrCount = positionCounts['WR'] || 0
  const teCount = positionCounts['TE'] || 0

  // Find specific players for recommendations
  const qbs = rosterDetails.filter(p => p!.position === 'QB')
  const rbs = rosterDetails.filter(p => p!.position === 'RB')
  const wrs = rosterDetails.filter(p => p!.position === 'WR')
  const tes = rosterDetails.filter(p => p!.position === 'TE')

  // Sort by projected PPG to identify best/worst players
  const sortedQBs = qbs.sort((a, b) => (b!.proj_ppg || 0) - (a!.proj_ppg || 0))
  const sortedRBs = rbs.sort((a, b) => (b!.proj_ppg || 0) - (a!.proj_ppg || 0))
  const sortedWRs = wrs.sort((a, b) => (b!.proj_ppg || 0) - (a!.proj_ppg || 0))
  const sortedTEs = tes.sort((a, b) => (b!.proj_ppg || 0) - (a!.proj_ppg || 0))

  // Find specific players to target based on available players in dataset
  const findTradeTargets = (position: string, minPPG: number) => {
    return dataset.players
      .filter((p: any) => p.position === position && p.proj_ppg >= minPPG)
      .sort((a: any, b: any) => b.proj_ppg - a.proj_ppg)
      .slice(0, 3)
      .map((p: any) => p.name)
  }

  if (percentAboveAverage > 10) {
    // Strong team - focus on depth and upside
    if (rbCount > 4 && wrCount < 3) {
      const wrTargets = findTradeTargets('WR', 12)
      tradeRecommendations = [
        `Trade ${sortedRBs[3]?.name || 'your RB4'} for ${wrTargets[0] || 'Stefon Diggs'} to improve WR depth`,
        `Target ${wrTargets[1] || 'Tyreek Hill'} for ${sortedRBs[2]?.name || 'your RB3'} - WR scarcity is more valuable`,
        `Consider trading ${sortedRBs[1]?.name || 'your RB2'} for ${wrTargets[2] || 'Davante Adams'} - elite WR upgrade`
      ]
    } else if (wrCount > 4 && rbCount < 3) {
      const rbTargets = findTradeTargets('RB', 12)
      tradeRecommendations = [
        `Trade ${sortedWRs[3]?.name || 'your WR4'} for ${rbTargets[0] || 'Saquon Barkley'} to improve RB depth`,
        `Target ${rbTargets[1] || 'Christian McCaffrey'} for ${sortedWRs[2]?.name || 'your WR3'} - RB scarcity wins`,
        `Consider trading ${sortedWRs[1]?.name || 'your WR2'} for ${rbTargets[2] || 'Jonathan Taylor'} - elite RB upgrade`
      ]
    } else if (teCount === 0 || (sortedTEs[0]?.proj_ppg || 0) < 8) {
      const teTargets = findTradeTargets('TE', 8)
      tradeRecommendations = [
        `Trade ${sortedWRs[2]?.name || 'your WR3'} for ${teTargets[0] || 'Travis Kelce'} to dominate TE position`,
        `Target ${teTargets[1] || 'Mark Andrews'} for ${sortedRBs[2]?.name || 'your RB3'} - TE upgrade needed`,
        `Consider trading ${sortedWRs[1]?.name || 'your WR2'} for ${teTargets[2] || 'George Kittle'} - elite TE upgrade`
      ]
    } else {
      const wrTargets = findTradeTargets('WR', 10)
      const rbTargets = findTradeTargets('RB', 10)
      tradeRecommendations = [
        `Trade ${sortedRBs[2]?.name || 'your RB3'} for ${wrTargets[0] || 'Tyreek Hill'} to improve WR depth`,
        `Target ${rbTargets[0] || 'Breece Hall'} for ${sortedWRs[2]?.name || 'your WR3'} - undervalued RB upgrade`,
        `Consider trading ${sortedWRs[1]?.name || 'your WR2'} for ${rbTargets[1] || 'Austin Ekeler'} - RB depth improvement`
      ]
    }
    teamStrengths = ['Elite team PPG', 'Strong positional balance', 'Excellent star power']
    teamWeaknesses = ['High ADP cost for stars', 'Limited bench upside', 'Bye week challenges']
    improvementStrategy = 'Focus on acquiring undervalued stars and improving bench depth for playoff push.'
  } else if (percentAboveAverage > 5) {
    // Good team - target specific upgrades
    if (rbCount < 2) {
      const rbTargets = findTradeTargets('RB', 10)
      tradeRecommendations = [
        `Trade ${sortedWRs[1]?.name || 'your WR2'} for ${rbTargets[0] || 'Saquon Barkley'} to upgrade RB2 position`,
        `Target ${rbTargets[1] || 'Derrick Henry'} for ${sortedWRs[2]?.name || 'your WR3'} - RB depth critical`,
        `Consider trading ${sortedTEs[0]?.name || 'your TE'} for ${rbTargets[2] || 'Nick Chubb'} - RB upgrade needed`
      ]
    } else if (wrCount < 2) {
      const wrTargets = findTradeTargets('WR', 10)
      tradeRecommendations = [
        `Trade ${sortedRBs[1]?.name || 'your RB2'} for ${wrTargets[0] || 'Stefon Diggs'} to upgrade WR2 position`,
        `Target ${wrTargets[1] || 'Cooper Kupp'} for ${sortedRBs[2]?.name || 'your RB3'} - WR depth critical`,
        `Consider trading ${sortedTEs[0]?.name || 'your TE'} for ${wrTargets[2] || 'CeeDee Lamb'} - WR upgrade needed`
      ]
    } else if (teCount === 0 || (sortedTEs[0]?.proj_ppg || 0) < 6) {
      const teTargets = findTradeTargets('TE', 6)
      tradeRecommendations = [
        `Trade ${sortedWRs[2]?.name || 'your WR3'} for ${teTargets[0] || 'Travis Kelce'} to dominate TE position`,
        `Target ${teTargets[1] || 'Mark Andrews'} for ${sortedRBs[2]?.name || 'your RB3'} - TE upgrade needed`,
        `Consider trading ${sortedWRs[1]?.name || 'your WR2'} for ${teTargets[2] || 'George Kittle'} - elite TE upgrade`
      ]
          } else {
        const rbTargets = findTradeTargets('RB', 8)
        const wrTargets = findTradeTargets('WR', 8)
        const teTargets = findTradeTargets('TE', 6)
        tradeRecommendations = [
          `Trade ${sortedWRs[2]?.name || 'your WR3'} for ${rbTargets[0] || 'Saquon Barkley'} to upgrade RB2 position`,
          `Target ${wrTargets[0] || 'Stefon Diggs'} for ${sortedRBs[2]?.name || 'your RB3'} - WR depth improvement`,
          `Consider trading ${sortedTEs[0]?.name || 'your TE'} for ${teTargets[0] || 'Travis Kelce'} to dominate TE position`
        ]
      }
    teamStrengths = ['Good team PPG', 'Solid positional advantages', 'Strong starting lineup']
    teamWeaknesses = ['Bench depth needs work', 'Some position scarcity', 'Limited trade flexibility']
    improvementStrategy = 'Target specific position upgrades and build bench depth for consistency.'
  } else if (percentAboveAverage > 0) {
    // Average team - need strategic improvements
    if (rbCount < 2) {
      const rbTargets = findTradeTargets('RB', 12)
      tradeRecommendations = [
        `Trade ${sortedWRs[0]?.name || 'your WR1'} for ${rbTargets[0] || 'Christian McCaffrey'} to boost RB1 production`,
        `Target ${rbTargets[1] || 'Austin Ekeler'} for ${sortedWRs[1]?.name || 'your WR2'} - RB depth critical`,
        `Consider trading ${sortedTEs[0]?.name || 'your TE'} for ${rbTargets[2] || 'Derrick Henry'} - RB upgrade needed`
      ]
    } else if (wrCount < 2) {
      const wrTargets = findTradeTargets('WR', 12)
      tradeRecommendations = [
        `Trade ${sortedRBs[0]?.name || 'your RB1'} for ${wrTargets[0] || 'Davante Adams'} to upgrade WR1 position`,
        `Target ${wrTargets[1] || 'CeeDee Lamb'} for ${sortedRBs[1]?.name || 'your RB2'} - WR depth critical`,
        `Consider trading ${sortedTEs[0]?.name || 'your TE'} for ${wrTargets[2] || 'Stefon Diggs'} - WR upgrade needed`
      ]
    } else if (teCount === 0 || (sortedTEs[0]?.proj_ppg || 0) < 5) {
      const teTargets = findTradeTargets('TE', 5)
      tradeRecommendations = [
        `Trade ${sortedWRs[1]?.name || 'your WR2'} for ${teTargets[0] || 'Travis Kelce'} to upgrade TE position`,
        `Target ${teTargets[1] || 'Mark Andrews'} for ${sortedRBs[1]?.name || 'your RB2'} - TE upgrade needed`,
        `Consider trading ${sortedWRs[0]?.name || 'your WR1'} for ${teTargets[2] || 'George Kittle'} - elite TE upgrade`
      ]
    } else {
      const rbTargets = findTradeTargets('RB', 10)
      const wrTargets = findTradeTargets('WR', 10)
      tradeRecommendations = [
        `Trade ${sortedWRs[1]?.name || 'your WR2'} for ${rbTargets[0] || 'Christian McCaffrey'} to boost RB1 production`,
        `Target ${wrTargets[0] || 'Davante Adams'} for ${sortedRBs[1]?.name || 'your RB2'} - WR1 upgrade needed`,
        `Consider trading ${sortedTEs[0]?.name || 'your TE'} for ${findTradeTargets('QB', 18)[0] || 'Josh Allen'} to improve QB position`
      ]
    }
    teamStrengths = ['Average team PPG', 'Balanced roster', 'Some upside potential']
    teamWeaknesses = ['Lacks elite players', 'Bench depth issues', 'Positional weaknesses']
    improvementStrategy = 'Focus on acquiring elite players and addressing weakest positions.'
  } else if (percentAboveAverage > -5) {
    // Below average - need major improvements
    if (rbCount < 2) {
      const rbTargets = findTradeTargets('RB', 10)
      tradeRecommendations = [
        `Trade ${sortedWRs[0]?.name || 'your WR1'} for ${rbTargets[0] || 'Austin Ekeler'} to improve RB production`,
        `Target ${rbTargets[1] || 'Derrick Henry'} for ${sortedWRs[1]?.name || 'your WR2'} - RB depth critical`,
        `Consider trading ${sortedTEs[0]?.name || 'your TE'} for ${rbTargets[2] || 'Saquon Barkley'} - RB upgrade needed`
      ]
    } else if (wrCount < 2) {
      const wrTargets = findTradeTargets('WR', 10)
      tradeRecommendations = [
        `Trade ${sortedRBs[0]?.name || 'your RB1'} for ${wrTargets[0] || 'Cooper Kupp'} to upgrade WR1 position`,
        `Target ${wrTargets[1] || 'Stefon Diggs'} for ${sortedRBs[1]?.name || 'your RB2'} - WR depth critical`,
        `Consider trading ${sortedTEs[0]?.name || 'your TE'} for ${wrTargets[2] || 'Davante Adams'} - WR upgrade needed`
      ]
    } else if (teCount === 0 || (sortedTEs[0]?.proj_ppg || 0) < 4) {
      const teTargets = findTradeTargets('TE', 4)
      tradeRecommendations = [
        `Trade ${sortedWRs[0]?.name || 'your WR1'} for ${teTargets[0] || 'Travis Kelce'} to upgrade TE position`,
        `Target ${teTargets[1] || 'Mark Andrews'} for ${sortedRBs[0]?.name || 'your RB1'} - TE upgrade needed`,
        `Consider trading ${sortedWRs[1]?.name || 'your WR2'} for ${teTargets[2] || 'George Kittle'} - elite TE upgrade`
      ]
    } else {
      const rbTargets = findTradeTargets('RB', 8)
      const wrTargets = findTradeTargets('WR', 8)
      tradeRecommendations = [
        `Trade ${sortedWRs[0]?.name || 'your WR1'} for ${rbTargets[0] || 'Austin Ekeler'} to improve RB production`,
        `Target ${wrTargets[0] || 'Cooper Kupp'} for ${sortedRBs[0]?.name || 'your RB1'} - WR1 upgrade needed`,
        `Consider trading ${sortedTEs[0]?.name || 'your TE'} for ${findTradeTargets('QB', 16)[0] || 'Patrick Mahomes'} to boost QB scoring`
      ]
    }
    teamStrengths = ['Some upside potential', 'Balanced approach', 'Trade flexibility']
    teamWeaknesses = ['Low team PPG', 'Lacks star power', 'Bench depth issues']
    improvementStrategy = 'Aggressively target elite players and address major positional weaknesses.'
  } else {
    // Poor team - need complete overhaul
    if (rbCount < 2) {
      const rbTargets = findTradeTargets('RB', 8)
      tradeRecommendations = [
        `Trade ${sortedWRs[0]?.name || 'your WR1'} for ${rbTargets[0] || 'Derrick Henry'} to establish RB foundation`,
        `Target ${rbTargets[1] || 'Saquon Barkley'} for ${sortedWRs[1]?.name || 'your WR2'} - RB depth critical`,
        `Consider trading ${sortedTEs[0]?.name || 'your TE'} for ${rbTargets[2] || 'Christian McCaffrey'} - RB upgrade needed`
      ]
    } else if (wrCount < 2) {
      const wrTargets = findTradeTargets('WR', 8)
      tradeRecommendations = [
        `Trade ${sortedRBs[0]?.name || 'your RB1'} for ${wrTargets[0] || 'Ja\'Marr Chase'} to upgrade WR1 position`,
        `Target ${wrTargets[1] || 'Stefon Diggs'} for ${sortedRBs[1]?.name || 'your RB2'} - WR depth critical`,
        `Consider trading ${sortedTEs[0]?.name || 'your TE'} for ${wrTargets[2] || 'Davante Adams'} - WR upgrade needed`
      ]
    } else if (teCount === 0 || (sortedTEs[0]?.proj_ppg || 0) < 3) {
      const teTargets = findTradeTargets('TE', 3)
      tradeRecommendations = [
        `Trade ${sortedWRs[0]?.name || 'your WR1'} for ${teTargets[0] || 'Travis Kelce'} to upgrade TE position`,
        `Target ${teTargets[1] || 'Mark Andrews'} for ${sortedRBs[0]?.name || 'your RB1'} - TE upgrade needed`,
        `Consider trading ${sortedWRs[1]?.name || 'your WR2'} for ${teTargets[2] || 'George Kittle'} - elite TE upgrade`
      ]
    } else {
      const rbTargets = findTradeTargets('RB', 6)
      const wrTargets = findTradeTargets('WR', 6)
      tradeRecommendations = [
        `Trade ${sortedWRs[0]?.name || 'your WR1'} for ${rbTargets[0] || 'Derrick Henry'} to establish RB foundation`,
        `Target ${wrTargets[0] || 'Ja\'Marr Chase'} for ${sortedRBs[0]?.name || 'your RB1'} - WR1 upgrade needed`,
        `Consider trading ${sortedTEs[0]?.name || 'your TE'} for ${findTradeTargets('QB', 14)[0] || 'Lamar Jackson'} to improve QB production`
      ]
    }
    teamStrengths = ['Trade flexibility', 'Rebuild opportunity', 'High upside potential']
    teamWeaknesses = ['Very low team PPG', 'Lacks elite players', 'Major positional gaps']
    improvementStrategy = 'Complete roster overhaul - target elite players at every position.'
  }

  let overallGrade = 'C'
  let gradeColor = 'var(--warning)'
  let projectedRecord = 'N/A'
  let playoffOdds = 'N/A'
  let positionalAdvantages = 'N/A'
  let starPlayers = 0

  // Calculate accurate positional advantages based on actual roster size
  const totalPlayers = rosterDetails.length
  const maxAdvantages = Math.min(totalPlayers, 12) // Cap at 12 for realistic assessment
  let advantagesCount = 0

  // Count positions that are above average (simplified logic)
  if (qbCount >= 1) advantagesCount++
  if (rbCount >= 2) advantagesCount++
  if (wrCount >= 2) advantagesCount++
  if (teCount >= 1) advantagesCount++
  if (rbCount >= 3) advantagesCount++ // RB depth
  if (wrCount >= 3) advantagesCount++ // WR depth
  if (qbCount >= 2) advantagesCount++ // QB depth
  if (teCount >= 2) advantagesCount++ // TE depth

  // Ensure we don't exceed total players
  advantagesCount = Math.min(advantagesCount, totalPlayers)
  positionalAdvantages = `${advantagesCount}/${maxAdvantages}`

  if (percentAboveAverage > 10) {
    overallGrade = 'A'
    gradeColor = 'var(--success)'
    projectedRecord = '14-2'
    playoffOdds = '98%'
    starPlayers = 10
  } else if (percentAboveAverage > 5) {
    overallGrade = 'B'
    gradeColor = 'var(--primary)'
    projectedRecord = '12-4'
    playoffOdds = '80%'
    starPlayers = 8
  } else if (percentAboveAverage > 0) {
    overallGrade = 'C'
    gradeColor = 'var(--warning)'
    projectedRecord = '10-6'
    playoffOdds = '50%'
    starPlayers = 6
  } else if (percentAboveAverage > -5) {
    overallGrade = 'D'
    gradeColor = 'var(--danger)'
    projectedRecord = '8-8'
    playoffOdds = '20%'
    starPlayers = 4
  } else {
    overallGrade = 'F'
    gradeColor = 'var(--danger)'
    projectedRecord = '6-10'
    playoffOdds = '0%'
    starPlayers = 2
  }

  return {
    teamPPG,
    leagueAverage,
    overallGrade,
    gradeColor,
    projectedRecord,
    playoffOdds,
    percentAboveAverage,
    positionalAdvantages,
    starPlayers,
    benchDepth: starPlayers,
    weakestPosition,
    tradeRecommendations,
    teamStrengths,
    teamWeaknesses,
    improvementStrategy
  }
} 