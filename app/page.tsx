'use client'

import { useEffect, useMemo, useState } from 'react'
import { analyzeRoster, DEFAULT_SETTINGS, type Dataset } from '@/lib/analyzer'
import PlayerCard from '@/components/PlayerCard'
import Typeahead from '@/components/Typeahead'
import { gradeColor } from '@/lib/grades'

type ImportTeam = {
  roster_id: number
  owner_id: string
  owner_name: string
  starters: string[]
  players: string[]
}
type ImportResponse = { league: any; teams: ImportTeam[] }

// Modern UI Components
function ProgressBar({ label, value, max, color = 'var(--primary)' }: { label: string; value: number; max: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0))
  return (
    <div className="fade-in" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{value.toFixed(1)}</span>
      </div>
      <div style={{ 
        height: 8, 
        background: 'rgba(148, 163, 184, 0.1)', 
        borderRadius: 6,
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{ 
          height: '100%', 
          width: `${pct}%`, 
          background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`,
          borderRadius: 6,
          transition: 'width 0.3s ease-out'
        }} />
      </div>
    </div>
  )
}

function StatCard({ label, value, subtitle, color = 'var(--text-primary)' }: { 
  label: string; 
  value: string; 
  subtitle?: string;
  color?: string;
}) {
  return (
    <div className="card fade-in" style={{ 
      padding: 16, 
      textAlign: 'center',
      background: 'rgba(30, 41, 59, 0.6)',
      border: '1px solid var(--border)'
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color, marginBottom: subtitle ? 4 : 0 }}>{value}</div>
      {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subtitle}</div>}
    </div>
  )
}

function TradeSuggestion({ trade }: { trade: any }) {
  return (
    <div className="card slide-up" style={{ 
      marginTop: 16, 
      padding: 20, 
      background: 'rgba(30, 41, 59, 0.8)',
      border: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ 
          width: 8, 
          height: 8, 
          borderRadius: '50%', 
          background: 'var(--warning)',
          flexShrink: 0
        }} />
        <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Trade Opportunity</h4>
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
        Your weakest starter: <strong style={{ color: 'var(--text-primary)' }}>{trade.slot}</strong>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        Consider these upgrades for your team:
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {trade.targets.map((opt: any) => (
          <div key={opt.player_id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'rgba(15, 23, 42, 0.5)',
            borderRadius: 6,
            fontSize: 13
          }}>
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{opt.name}</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>— {opt.team} · {opt.position}</span>
            </div>
            <div style={{ fontWeight: 600, color: 'var(--success)' }}>
              {opt.proj_ppg.toFixed(1)} PPG
            </div>
          </div>
        ))}
      </div>
      <div style={{ 
        fontSize: 11, 
        color: 'var(--text-muted)', 
        marginTop: 12,
        padding: '8px 12px',
        background: 'rgba(59, 130, 246, 0.1)',
        borderRadius: 6,
        border: '1px solid rgba(59, 130, 246, 0.2)'
      }}>
        💡 Tip: Offer a bench piece + your current {trade.current.position} to reach one of these tiers
      </div>
    </div>
  )
}

// New Roster Component
function RosterInterface({ 
  dataset, 
  rosterPlayers, 
  onAddPlayer, 
  onRemovePlayer 
}: { 
  dataset: Dataset | null
  rosterPlayers: string[]
  onAddPlayer: (playerName: string) => void
  onRemovePlayer: (playerName: string) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPosition, setSelectedPosition] = useState('All')
  const [showSearchResults, setShowSearchResults] = useState(false)

  const positions = ['All', 'QB', 'RB', 'WR', 'TE']

  // Filter players based on search and position
  const filteredPlayers = useMemo(() => {
    if (!dataset) return []
    
    let filtered = dataset.players
    
    // Filter by position
    if (selectedPosition !== 'All') {
      filtered = filtered.filter(p => p.position === selectedPosition)
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.team.toLowerCase().includes(query)
      )
    }
    
    // Remove players already in roster
    filtered = filtered.filter(p => !rosterPlayers.includes(p.name))
    
    return filtered.slice(0, 20) // Limit results
  }, [dataset, searchQuery, selectedPosition, rosterPlayers])

  // Get roster player details
  const rosterPlayerDetails = useMemo(() => {
    if (!dataset) return []
    return rosterPlayers
      .map(name => dataset.players.find(p => p.name === name))
      .filter(Boolean)
  }, [dataset, rosterPlayers])

  const handleAddPlayer = (playerName: string) => {
    onAddPlayer(playerName)
    setSearchQuery('')
    setShowSearchResults(false)
  }

  // Get team logo URL
  const getTeamLogo = (team: string) => {
    const teamLogos: { [key: string]: string } = {
      // NFC Teams
      'SF': 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png',
      'LAR': 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png',
      'SEA': 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png',
      'ARI': 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png',
      'GB': 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png',
      'MIN': 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png',
      'CHI': 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png',
      'DET': 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png',
      'TB': 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png',
      'CAR': 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png',
      'NO': 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png',
      'ATL': 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png',
      'DAL': 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png',
      'PHI': 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png',
      'WAS': 'https://a.espncdn.com/i/teamlogos/nfl/500/was.png',
      'NYG': 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png',
      'KC': 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
      'LAC': 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png',
      'LV': 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png',
      'DEN': 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png',
      'BAL': 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png',
      'CIN': 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png',
      'PIT': 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png',
      'CLE': 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png',
      'TEN': 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png',
      'IND': 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png',
      'JAX': 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png',
      'HOU': 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png',
      'BUF': 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png',
      'MIA': 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png',
      'NE': 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png',
      'NYJ': 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png',
      
      // Additional team variations that might appear in data
      'LA': 'https://upload.wikimedia.org/wikipedia/commons/8/81/Los_Angeles_Rams_logo.svg', // LA Rams
      'OAK': 'https://upload.wikimedia.org/wikipedia/en/1/1a/Las_Vegas_Raiders_logo.svg', // Old Raiders
      'SD': 'https://upload.wikimedia.org/wikipedia/en/7/72/Los_Angeles_Chargers_logo.svg', // Old Chargers
      'STL': 'https://upload.wikimedia.org/wikipedia/commons/8/81/Los_Angeles_Rams_logo.svg', // Old Rams
      'JAC': 'https://upload.wikimedia.org/wikipedia/en/7/74/Jacksonville_Jaguars_logo.svg', // JAX alternative
      'WSH': 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Washington_Commanders_logo.svg', // Washington alternative
      'FA': 'https://placehold.co/80x80/64748b/ffffff?text=FA',
    }
    
    // Handle special cases for kickers and defenses
    if (team === 'K' || team === 'D/ST') {
      return teamLogos[team]
    }
    
    // Return team logo or FA placeholder
    return teamLogos[team] || teamLogos['FA']
  }

  return (
    <div className="card slide-up" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ position: 'relative' }}>
          <div style={{
            width: 32,
            height: 32,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 600,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            👥
          </div>
          <div style={{
            position: 'absolute',
            inset: '-4px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
            borderRadius: 12,
            filter: 'blur(8px)',
            opacity: 0.3
          }}></div>
        </div>
        <h2 style={{ margin: 0 }}>Roster</h2>
      </div>

      {/* Position Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {positions.map(pos => (
          <button
            key={pos}
            onClick={() => setSelectedPosition(pos)}
            style={{
              padding: '8px 16px',
              borderRadius: 20,
              border: 'none',
              background: selectedPosition === pos 
                ? 'var(--primary)' 
                : 'rgba(148, 163, 184, 0.1)',
              color: selectedPosition === pos 
                ? 'white' 
                : 'var(--text-primary)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {pos}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 20, position: 'relative' }}>
        <input
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setShowSearchResults(e.target.value.length > 0)
          }}
          onFocus={() => setShowSearchResults(searchQuery.length > 0)}
          placeholder="Search by player name"
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            fontSize: 14,
            outline: 'none'
          }}
        />

        {/* Search Results Dropdown */}
        {showSearchResults && filteredPlayers.length > 0 && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            maxHeight: 300,
            overflowY: 'auto',
            zIndex: 100,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            marginTop: 4
          }}>
            {filteredPlayers.map((player) => (
              <button
                key={player.player_id}
                onClick={() => handleAddPlayer(player.name)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease-in-out',
                  borderBottom: '1px solid var(--border)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'rgba(148, 163, 184, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <img
                      src={getTeamLogo(player.team)}
                      alt={player.name}
                      width={32}
                      height={32}
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                      {player.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {player.position} | {player.team}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {player.position}{player.adp || '—'}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddPlayer(player.name)
                    }}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'var(--success)',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 600
                    }}
                  >
                    +
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current Roster Section */}
      <div style={{ marginTop: 20 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 16,
          padding: '0 4px'
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            PLAYER
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            RANK
          </div>
        </div>

        <div style={{ 
          height: '100%',
          minHeight: 600,
          overflowY: 'auto',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'rgba(15, 23, 42, 0.3)'
        }}>
          {rosterPlayerDetails.length > 0 ? (
            rosterPlayerDetails.map((player, index) => (
              <div
                key={player!.player_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: index < rosterPlayerDetails.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.15s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(148, 163, 184, 0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'rgba(148, 163, 184, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <img
                      src={getTeamLogo(player!.team)}
                      alt={player!.name}
                      width={32}
                      height={32}
                      style={{ objectFit: 'contain' }}
                    />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                      {player!.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {player!.position} | {player!.team}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {player!.position}{player!.adp || '—'}
                  </div>
                  <button
                    onClick={() => onRemovePlayer(player!.name)}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: 'var(--danger)',
                      border: 'none',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 600
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ 
              padding: '40px 16px', 
              textAlign: 'center', 
              color: 'var(--text-muted)',
              fontSize: 14
            }}>
              No players in roster yet. Search and add players above.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Player Analysis Modal Component
function PlayerAnalysisModal({ 
  isOpen, 
  onClose, 
  rosterPlayers, 
  dataset 
}: { 
  isOpen: boolean
  onClose: () => void
  rosterPlayers: string[]
  dataset: Dataset | null
}) {
  const rosterPlayerDetails = useMemo(() => {
    if (!dataset) return []
    return rosterPlayers
      .map(name => dataset.players.find(p => p.name === name))
      .filter(Boolean)
  }, [dataset, rosterPlayers])

  const [playerAnalyses, setPlayerAnalyses] = useState<{[key: string]: any}>({})
  const [loadingAnalyses, setLoadingAnalyses] = useState<{[key: string]: boolean}>({})

  const getTeamLogo = (team: string) => {
    const teamLogos: { [key: string]: string } = {
      'SF': 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png',
      'LAR': 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png',
      'SEA': 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png',
      'ARI': 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png',
      'GB': 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png',
      'MIN': 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png',
      'CHI': 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png',
      'DET': 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png',
      'TB': 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png',
      'CAR': 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png',
      'NO': 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png',
      'ATL': 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png',
      'DAL': 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png',
      'PHI': 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png',
      'WAS': 'https://a.espncdn.com/i/teamlogos/nfl/500/was.png',
      'NYG': 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png',
      'KC': 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png',
      'LAC': 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png',
      'LV': 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png',
      'DEN': 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png',
      'BAL': 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png',
      'CIN': 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png',
      'PIT': 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png',
      'CLE': 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png',
      'TEN': 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png',
      'IND': 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png',
      'JAX': 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png',
      'HOU': 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png',
      'BUF': 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png',
      'MIA': 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png',
      'NE': 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png',
      'NYJ': 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png',
      'FA': 'https://placehold.co/80x80/64748b/ffffff?text=FA',
    }
    return teamLogos[team] || teamLogos['FA']
  }

  const analyzePlayer = async (player: any) => {
    const playerId = player.player_id
    
    // Check if already analyzed
    if (playerAnalyses[playerId]) return
    
    setLoadingAnalyses(prev => ({ ...prev, [playerId]: true }))
    
    try {
      const response = await fetch('/api/analysis/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ player }),
      })
      
      if (response.ok) {
        const analysis = await response.json()
        setPlayerAnalyses(prev => ({ ...prev, [playerId]: analysis }))
      } else {
        console.error('Failed to get analysis for', player.name)
      }
    } catch (error) {
      console.error('Error analyzing player:', error)
    } finally {
      setLoadingAnalyses(prev => ({ ...prev, [playerId]: false }))
    }
  }

  // Analyze all players when modal opens
  useEffect(() => {
    if (isOpen && rosterPlayerDetails.length > 0) {
      rosterPlayerDetails.forEach(player => {
        analyzePlayer(player)
      })
    }
  }, [isOpen, rosterPlayerDetails])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ 
        padding: 0, 
        width: '90vw', 
        maxWidth: 900, 
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 16px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(15, 23, 42, 0.8)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ position: 'relative' }}>
              <div style={{
                width: 40, 
                height: 40, 
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 600,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}>
                📋
              </div>
              <div style={{
                position: 'absolute',
                inset: '-4px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 50%, #6d28d9 100%)',
                borderRadius: 14,
                filter: 'blur(8px)',
                opacity: 0.3
              }}></div>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 24 }}>Player Analysis</h2>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: 14 }}>
                {rosterPlayerDetails.length} players analyzed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(148, 163, 184, 0.1)',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(148, 163, 184, 0.2)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '24px',
          display: 'grid',
          gap: 16
        }}>
          {rosterPlayerDetails.map((player, index) => {
            const playerId = player!.player_id
            const analysis = playerAnalyses[playerId]
            const isLoading = loadingAnalyses[playerId]
            
            return (
              <div
                key={playerId}
                className="card fade-in"
                style={{
                  padding: 20,
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  {/* Player Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'rgba(148, 163, 184, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid var(--border)'
                    }}>
                      <img
                        src={getTeamLogo(player!.team)}
                        alt={player!.name}
                        width={48}
                        height={48}
                        style={{ objectFit: 'contain' }}
                      />
                    </div>
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700 }}>
                        {player!.name}
                      </h3>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14 }}>
                        {player!.position} • {player!.team}
                      </p>
                    </div>
                  </div>

                  {/* Grade */}
                  <div style={{
                    marginLeft: 'auto',
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: analysis?.gradeColor || 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'white',
                    flexShrink: 0
                  }}>
                    {isLoading ? '...' : (analysis?.grade || 'C')}
                  </div>
                </div>

                {/* Stats Row */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: 12,
                  marginTop: 16,
                  padding: '16px',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: 8
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Projected PPG
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {player!.proj_ppg?.toFixed(1) || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                      ADP
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {player!.adp || 'Undrafted'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Team
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {player!.team}
                    </div>
                  </div>
                </div>

                {/* Analysis */}
                {isLoading ? (
                  <div style={{ marginTop: 16, textAlign: 'center', padding: '20px' }}>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                      🤖 Analyzing {player!.name}...
                    </div>
                  </div>
                ) : analysis ? (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
                      ANALYSIS
                    </div>
                    <p style={{ 
                      margin: '0 0 16px 0', 
                      color: 'var(--text-primary)', 
                      fontSize: 14, 
                      lineHeight: 1.5,
                      background: 'rgba(15, 23, 42, 0.3)',
                      padding: '12px 16px',
                      borderRadius: 8,
                      borderLeft: `3px solid ${analysis.gradeColor}`
                    }}>
                      {analysis.analysis}
                    </p>

                    {/* Weekly Outlook & Trade Value */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div style={{
                        padding: '12px 16px',
                        background: 'rgba(15, 23, 42, 0.4)',
                        borderRadius: 8,
                        border: '1px solid var(--border)'
                      }}>
                        <div style={{ fontSize: 12, color: 'var(--primary)', marginBottom: 6, fontWeight: 600 }}>
                          WEEKLY OUTLOOK
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          {analysis.weeklyOutlook}
                        </div>
                      </div>
                      <div style={{
                        padding: '12px 16px',
                        background: 'rgba(15, 23, 42, 0.4)',
                        borderRadius: 8,
                        border: '1px solid var(--border)'
                      }}>
                        <div style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 6, fontWeight: 600 }}>
                          TRADE VALUE
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          {analysis.tradeValue}
                        </div>
                      </div>
                    </div>

                    {/* Roster Strategy & Risk Factors */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div style={{
                        padding: '12px 16px',
                        background: 'rgba(15, 23, 42, 0.4)',
                        borderRadius: 8,
                        border: '1px solid var(--border)'
                      }}>
                        <div style={{ fontSize: 12, color: 'var(--success)', marginBottom: 6, fontWeight: 600 }}>
                          ROSTER STRATEGY
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          {analysis.rosterStrategy}
                        </div>
                      </div>
                      <div style={{
                        padding: '12px 16px',
                        background: 'rgba(15, 23, 42, 0.4)',
                        borderRadius: 8,
                        border: '1px solid var(--border)'
                      }}>
                        <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 6, fontWeight: 600 }}>
                          RISK FACTORS
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          {analysis.riskFactors}
                        </div>
                      </div>
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--success)', marginBottom: 8, fontWeight: 600 }}>
                          STRENGTHS
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'var(--text-primary)' }}>
                          {analysis.strengths.map((strength, i) => (
                            <li key={i} style={{ marginBottom: 4 }}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 8, fontWeight: 600 }}>
                          WEAKNESSES
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'var(--text-primary)' }}>
                          {analysis.weaknesses.map((weakness, i) => (
                            <li key={i} style={{ marginBottom: 4 }}>{weakness}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, color: 'var(--primary)', marginBottom: 8, fontWeight: 600 }}>
                        RECOMMENDATIONS
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'var(--text-primary)' }}>
                        {analysis.recommendations.map((rec, i) => (
                          <li key={i} style={{ marginBottom: 4 }}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 16, textAlign: 'center', padding: '20px' }}>
                    <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                      Failed to load analysis
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Page() {
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [rosterPlayers, setRosterPlayers] = useState<string[]>([])
  const [showDetail, setShowDetail] = useState(false)

  // Sleeper import controls
  const [leagueId, setLeagueId] = useState('')
  const [importing, setImporting] = useState(false)
  const [importErr, setImportErr] = useState<string | null>(null)
  const [teams, setTeams] = useState<ImportTeam[] | null>(null)
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('')

  // Player details modal
  const [modal, setModal] = useState<{ open: boolean; pid?: string }>({ open: false })
  
  // Player analysis modal
  const [showPlayerAnalysis, setShowPlayerAnalysis] = useState(false)
  const [playerAnalyses, setPlayerAnalyses] = useState<any[]>([])
  const [loadingAnalyses, setLoadingAnalyses] = useState(false)
  const [teamAnalysis, setTeamAnalysis] = useState<any>(null)
  const [loadingTeamAnalysis, setLoadingTeamAnalysis] = useState(false)

  // Bootstrap the free data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        console.log('Fetching data from bootstrap API...')
        const res = await fetch('/api/data/bootstrap')
        console.log('API response status:', res.status)
        if (!res.ok) {
          const errorText = await res.text()
          console.error('API error response:', errorText)
          throw new Error(`Failed to load data: ${res.status} ${res.statusText}`)
        }
        const json = await res.json()
        console.log('Data loaded successfully, players count:', json.players?.length || 0)
        setDataset(json)
      } catch (e: any) {
        console.error('Error loading data:', e)
        setError(e?.message || 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Main analysis result
  const result = useMemo(
    () => (dataset ? analyzeRoster(rosterPlayers, dataset, DEFAULT_SETTINGS) : null),
    [rosterPlayers, dataset],
  )

  function addPlayerToRoster(playerName: string) {
    if (!rosterPlayers.includes(playerName)) {
      setRosterPlayers(prev => [...prev, playerName])
    }
  }

  function removePlayerFromRoster(playerName: string) {
    setRosterPlayers(prev => prev.filter(name => name !== playerName))
  }

  // Sleeper: import league → teams list
  async function doImport() {
    try {
      setImporting(true)
      setImportErr(null)
      setTeams(null)
      setSelectedOwnerId('')
      const res = await fetch(`/api/import/sleeper?leagueId=${encodeURIComponent(leagueId)}`)
      if (!res.ok) throw new Error('Import failed')
      const json: ImportResponse = await res.json()
      setTeams(json.teams)
    } catch (e: any) {
      setImportErr(e?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  // Choose a team → fill roster names
  function useTeam(ownerId: string) {
    if (!dataset || !teams) return
    setSelectedOwnerId(ownerId)
    const team = teams.find((t) => t.owner_id === ownerId)
    if (!team) return
    const idToName = new Map(dataset.players.map((p) => [p.player_id, p.name]))
    const starterNames = (team.starters || []).map((id) => idToName.get(id)).filter(Boolean) as string[]
    const rosterNames = (team.players || []).map((id) => idToName.get(id)).filter(Boolean) as string[]
    const benchOnly = rosterNames.filter((n) => !starterNames.includes(n))
    const combined = [...starterNames, ...benchOnly]
    if (combined.length) {
      setRosterPlayers(combined)
      setShowDetail(true)
    }
  }

  // MVP trade ideas
  const trade = useMemo(() => {
    if (!result || !dataset) return null
    const worst = [...result.starters].sort((a, b) => a.delta - b.delta)[0]
    if (!worst || worst.delta >= 0) return null
    const pos = worst.player.position
    const options = dataset.players
      .filter((p) => p.position === pos && p.proj_ppg > worst.baseline + 0.5)
      .sort((a, b) => b.proj_ppg - a.proj_ppg)
      .slice(0, 5)
    return { slot: worst.slot, current: worst.player, targets: options }
  }, [result, dataset])

  const analyzeTeam = async () => {
    if (rosterPlayers.length === 0 || !dataset) return
    
    setLoadingTeamAnalysis(true)
    try {
      const response = await fetch('/api/analysis/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rosterPlayers, dataset })
      })
      
      if (response.ok) {
        const analysis = await response.json()
        setTeamAnalysis(analysis)
      } else {
        console.error('Failed to analyze team')
      }
    } catch (error) {
      console.error('Team analysis error:', error)
    } finally {
      setLoadingTeamAnalysis(false)
    }
  }

  useEffect(() => {
    if (dataset && rosterPlayers.length > 0) {
      analyzeTeam()
    }
  }, [rosterPlayers, dataset])

  // Loading / error states
  if (loading)
    return (
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <div className="loading">
          Loading fantasy data...
        </div>
      </main>
    )
  
  if (error || !dataset)
    return (
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        <div className="card" style={{ padding: 24, color: 'var(--danger)', textAlign: 'center' }}>
          <h2 style={{ marginBottom: 12 }}>Error Loading Data</h2>
          <p>{error || 'Could not load dataset'}</p>
        </div>
      </main>
    )

  const sumProj = result!.team.sumProj
  const sumBaseline = result!.team.sumBaseline
  const teamPctAbove = sumBaseline > 0 ? ((sumProj - sumBaseline) / sumBaseline) * 100 : 0

  // For modal lookup
  const byId = new Map(dataset.players.map((p) => [p.player_id, p]))
  const modalPlayer = modal.pid ? byId.get(modal.pid) : undefined

  // Team Summary Component
  const TeamSummary = () => {
    // Calculate dynamic metrics based on actual roster
    const calculateDynamicMetrics = () => {
      if (!dataset || rosterPlayers.length === 0) {
        return {
          teamPPG: 0,
          leagueAverage: 82.1,
          overallGrade: 'C',
          projectedRecord: '0-0',
          playoffOdds: '0%',
          percentAboveAverage: 0,
          positionalAdvantages: '0/0',
          starPlayers: 0,
          benchDepth: 0,
          weakestPosition: 'N/A',
          tradeRecommendations: [],
          improvementStrategy: 'Add players to your roster to get analysis.'
        }
      }
      
      // Require minimum 6 players for meaningful trade recommendations
      if (rosterPlayers.length < 6) {
        const teamPPG = rosterPlayers.reduce((sum, name) => {
          const player = dataset.players.find((p: any) => p.name === name)
          return sum + (player?.proj_ppg || 0)
        }, 0)
        return {
          teamPPG,
          leagueAverage: 82.1,
          overallGrade: 'N/A',
          projectedRecord: 'N/A',
          playoffOdds: 'N/A',
          percentAboveAverage: 0,
          positionalAdvantages: 'N/A',
          starPlayers: 0,
          benchDepth: 0,
          weakestPosition: 'N/A',
          tradeRecommendations: [],
          improvementStrategy: 'Add at least 6 players to your roster to receive personalized trade recommendations.'
        }
      }

      // Get player details for the roster
      const rosterDetails = rosterPlayers.map(name => {
        const player = dataset.players.find((p: any) => p.name === name)
        if (!player) {
          console.warn(`Player not found in dataset: ${name}`)
        }
        return player ? {
          name: player.name,
          position: player.position,
          team: player.team,
          adp: player.adp,
          proj_ppg: player.proj_ppg
        } : null
      }).filter(Boolean)

      console.log('Roster details:', rosterDetails)
      console.log('Available players in dataset:', dataset.players.slice(0, 5).map(p => p.name))

      // ADVANCED TEAM STRENGTH ANALYSIS
      const teamPPG = rosterDetails.reduce((sum, player) => sum + (player!.proj_ppg || 0), 0)
      
      // Calculate realistic league average based on typical fantasy team
      // Average team has: 1 QB (18 PPG) + 2 RB (10 PPG each) + 2 WR (8 PPG each) + 1 TE (6 PPG) + 1 FLEX (8 PPG) = 68 PPG
      const leagueAverage = 68
      const percentAboveAverage = teamPPG - leagueAverage
      const percentAboveAveragePercent = ((teamPPG / leagueAverage) - 1) * 100

      console.log('Team Analysis:', {
        teamPPG,
        leagueAverage,
        percentAboveAverage,
        percentAboveAveragePercent,
        rosterDetails: rosterDetails.map(p => `${p!.name}: ${p!.proj_ppg} PPG`)
      })

      // REVAMPED GRADING SYSTEM - More realistic thresholds
      let overallGrade = 'C'
      let projectedRecord = '8-8'
      let playoffOdds = '50%'
      
      if (percentAboveAveragePercent >= 25) { // 85+ PPG (25% above average)
        overallGrade = 'A+'
        projectedRecord = '14-2'
        playoffOdds = '98%'
      } else if (percentAboveAveragePercent >= 15) { // 78+ PPG (15% above average)
        overallGrade = 'A'
        projectedRecord = '13-3'
        playoffOdds = '95%'
      } else if (percentAboveAveragePercent >= 8) { // 73+ PPG (8% above average)
        overallGrade = 'B+'
        projectedRecord = '12-4'
        playoffOdds = '85%'
      } else if (percentAboveAveragePercent >= 0) { // 68+ PPG (at or above average)
        overallGrade = 'B'
        projectedRecord = '11-5'
        playoffOdds = '75%'
      } else if (percentAboveAveragePercent >= -8) { // 62+ PPG (8% below average)
        overallGrade = 'C+'
        projectedRecord = '10-6'
        playoffOdds = '60%'
      } else if (percentAboveAveragePercent >= -15) { // 58+ PPG (15% below average)
        overallGrade = 'C'
        projectedRecord = '9-7'
        playoffOdds = '45%'
      } else if (percentAboveAveragePercent >= -25) { // 51+ PPG (25% below average)
        overallGrade = 'D'
        projectedRecord = '7-9'
        playoffOdds = '25%'
      } else {
        overallGrade = 'F'
        projectedRecord = '5-11'
        playoffOdds = '10%'
      }

      // Count positions
      const positionCounts: { [key: string]: number } = {}
      rosterDetails.forEach(player => {
        positionCounts[player!.position] = (positionCounts[player!.position] || 0) + 1
      })

      // REVAMPED POSITIONAL ADVANTAGES - Quality-based scoring
      const positionQuality = {
        'QB': { min: 15, good: 18, elite: 22 },
        'RB': { min: 8, good: 12, elite: 16 },
        'WR': { min: 6, good: 10, elite: 14 },
        'TE': { min: 4, good: 7, elite: 10 },
        'K': { min: 6, good: 8, elite: 10 },
        'DEF': { min: 6, good: 8, elite: 10 },
        'DST': { min: 6, good: 8, elite: 10 }
      }

      let advantagesCount = 0
      const maxAdvantages = 8 // More realistic max

      // QB advantages
      const qbsForAdvantages = rosterDetails.filter(p => p!.position === 'QB')
      if (qbsForAdvantages.length >= 1) {
        const qb1PPG = qbsForAdvantages[0]?.proj_ppg || 0
        if (qb1PPG >= positionQuality.QB.elite) advantagesCount += 2 // Elite QB
        else if (qb1PPG >= positionQuality.QB.good) advantagesCount += 1 // Good QB
      }
      if (qbsForAdvantages.length >= 2) advantagesCount += 1 // QB depth

      // RB advantages
      const rbsForAdvantages = rosterDetails.filter(p => p!.position === 'RB')
      if (rbsForAdvantages.length >= 2) {
        const rb1PPG = rbsForAdvantages[0]?.proj_ppg || 0
        const rb2PPG = rbsForAdvantages[1]?.proj_ppg || 0
        if (rb1PPG >= positionQuality.RB.elite) advantagesCount += 1 // Elite RB1
        if (rb2PPG >= positionQuality.RB.good) advantagesCount += 1 // Good RB2
      }
      if (rbsForAdvantages.length >= 3) advantagesCount += 1 // RB depth

      // WR advantages
      const wrsForAdvantages = rosterDetails.filter(p => p!.position === 'WR')
      if (wrsForAdvantages.length >= 2) {
        const wr1PPG = wrsForAdvantages[0]?.proj_ppg || 0
        const wr2PPG = wrsForAdvantages[1]?.proj_ppg || 0
        if (wr1PPG >= positionQuality.WR.elite) advantagesCount += 1 // Elite WR1
        if (wr2PPG >= positionQuality.WR.good) advantagesCount += 1 // Good WR2
      }
      if (wrsForAdvantages.length >= 3) advantagesCount += 1 // WR depth

      // TE advantages
      const tesForAdvantages = rosterDetails.filter(p => p!.position === 'TE')
      if (tesForAdvantages.length >= 1) {
        const te1PPG = tesForAdvantages[0]?.proj_ppg || 0
        if (te1PPG >= positionQuality.TE.elite) advantagesCount += 2 // Elite TE
        else if (te1PPG >= positionQuality.TE.good) advantagesCount += 1 // Good TE
      }

      advantagesCount = Math.min(advantagesCount, maxAdvantages)
      const positionalAdvantages = `${advantagesCount}/${maxAdvantages}`

      // REVAMPED STAR PLAYERS & BENCH DEPTH - More realistic thresholds
      const starPlayers = rosterDetails.filter(p => {
        const ppg = p!.proj_ppg || 0
        const position = p!.position
        const quality = positionQuality[position as keyof typeof positionQuality]
        return quality && ppg >= quality.elite
      }).length

      const benchDepth = rosterDetails.filter(p => {
        const ppg = p!.proj_ppg || 0
        const position = p!.position
        const quality = positionQuality[position as keyof typeof positionQuality]
        return quality && ppg >= quality.good
      }).length

      // Generate trade recommendations based on actual roster
      const qbCount = positionCounts['QB'] || 0
      const rbCount = positionCounts['RB'] || 0
      const wrCount = positionCounts['WR'] || 0
      const teCount = positionCounts['TE'] || 0

      // Find weakest position (considering position scarcity and production)
      const positionPPG: { [key: string]: number } = {}
      
      rosterDetails.forEach(player => {
        positionPPG[player!.position] = (positionPPG[player!.position] || 0) + player!.proj_ppg
      })

      // Calculate position strength (PPG per player at that position)
      const positionStrength: { [key: string]: number } = {}
      Object.entries(positionPPG).forEach(([pos, ppg]) => {
        positionStrength[pos] = ppg / positionCounts[pos]
      })

      let weakestPosition = 'FLEX'
      let lowestStrength = Infinity
      Object.entries(positionStrength).forEach(([pos, strength]) => {
        if (strength < lowestStrength) {
          lowestStrength = strength
          weakestPosition = pos
        }
      })

      // Determine weakest position based on actual needs and production
      if (teCount === 0) {
        weakestPosition = 'TE'
      } else if (rbCount < 2) {
        weakestPosition = 'RB'
      } else if (wrCount < 2) {
        weakestPosition = 'WR'
      } else if (qbCount < 1) {
        weakestPosition = 'QB'
      } else {
        // If all positions are filled, find the weakest by production
        const positionAverages = {
          'QB': 18, 'RB': 10, 'WR': 8, 'TE': 6
        }
        
        let lowestScore = Infinity
        Object.entries(positionStrength).forEach(([pos, ppg]) => {
          const avg = positionAverages[pos as keyof typeof positionAverages] || 10
          const score = ppg / avg
          if (score < lowestScore && ppg > 0) {
            lowestScore = score
            weakestPosition = pos
          }
        })
      }

      const qbs = rosterDetails.filter(p => p!.position === 'QB')
      const rbs = rosterDetails.filter(p => p!.position === 'RB')
      const wrs = rosterDetails.filter(p => p!.position === 'WR')
      const tes = rosterDetails.filter(p => p!.position === 'TE')

      const sortedQBs = qbs.sort((a, b) => (b!.proj_ppg || 0) - (a!.proj_ppg || 0))
      const sortedRBs = rbs.sort((a, b) => (b!.proj_ppg || 0) - (a!.proj_ppg || 0))
      const sortedWRs = wrs.sort((a, b) => (b!.proj_ppg || 0) - (a!.proj_ppg || 0))
      const sortedTEs = tes.sort((a, b) => (b!.proj_ppg || 0) - (a!.proj_ppg || 0))

      // Find trade targets from available players (excluding players already on roster)
      const findTradeTargets = (position: string, minPPG: number) => {
        const rosterPlayerNames = rosterDetails.map(p => p!.name.toLowerCase())
        const targets = dataset.players
          .filter((p: any) => 
            p.position === position && 
            p.proj_ppg >= minPPG &&
            !rosterPlayerNames.includes(p.name.toLowerCase())
          )
          .sort((a: any, b: any) => b.proj_ppg - a.proj_ppg)
          .slice(0, 3)
          .map((p: any) => p.name)
        
        console.log(`Trade targets for ${position} (minPPG: ${minPPG}):`, targets)
        return targets
      }

      let tradeRecommendations: string[] = []
      let improvementStrategy = ''

      // Analyze what positions you need vs what you have too much of
      const needs = []
      const excess = []

      if (qbCount < 1) needs.push('QB')
      if (rbCount < 2) needs.push('RB')
      if (wrCount < 2) needs.push('WR')
      if (teCount < 1) needs.push('TE')

      if (rbCount > 3) excess.push('RB')
      if (wrCount > 4) excess.push('WR')
      if (qbCount > 2) excess.push('QB')
      if (teCount > 2) excess.push('TE')

      console.log('Team needs:', needs, 'Excess positions:', excess)

      // ADVANCED MULTI-WEAKNESS TRADE STRATEGY
      console.log('=== ADVANCED TRADE ANALYSIS ===')
      console.log('Roster:', rosterDetails.map(p => `${p!.name} (${p!.position}) - ${p!.proj_ppg} PPG`))
      console.log('Needs:', needs, 'Excess:', excess)
      
      // ANALYZE MULTIPLE TEAM WEAKNESSES
      const teamWeaknesses = []
      
      // Weakness 1: Missing positions
      if (teCount === 0) teamWeaknesses.push({ type: 'missing', position: 'TE', priority: 1 })
      if (rbCount < 2) teamWeaknesses.push({ type: 'missing', position: 'RB', priority: 2 })
      if (wrCount < 2) teamWeaknesses.push({ type: 'missing', position: 'WR', priority: 3 })
      
      // Weakness 2: Position depth issues
      if (rbCount < 3) teamWeaknesses.push({ type: 'depth', position: 'RB', priority: 4 })
      if (wrCount < 3) teamWeaknesses.push({ type: 'depth', position: 'WR', priority: 5 })
      if (qbCount < 2) teamWeaknesses.push({ type: 'depth', position: 'QB', priority: 6 })
      
      // Weakness 3: Performance gaps
      const allRosterPlayers = [...sortedQBs, ...sortedRBs, ...sortedWRs, ...sortedTEs]
      const positionAverages = { 'QB': 18, 'RB': 10, 'WR': 8, 'TE': 6 }
      
      allRosterPlayers.forEach(player => {
        const avg = positionAverages[player!.position as keyof typeof positionAverages] || 10
        const performance = (player!.proj_ppg || 0) / avg
        if (performance < 0.8) {
          teamWeaknesses.push({ 
            type: 'performance', 
            position: player!.position, 
            player: player!.name,
            priority: 7 + (1 - performance) * 10 
          })
        }
      })
      
      // Sort weaknesses by priority
      teamWeaknesses.sort((a, b) => a.priority - b.priority)
      console.log('Team Weaknesses:', teamWeaknesses)
      
      // PREMIUM TRADE RECOMMENDATIONS WITH KNOWN PLAYERS
      tradeRecommendations = []
      
      // Known elite players for each position (fallbacks)
      const elitePlayers = {
        'QB': ['Josh Allen', 'Patrick Mahomes', 'Jalen Hurts', 'Lamar Jackson', 'Justin Herbert'],
        'RB': ['Christian McCaffrey', 'Saquon Barkley', 'Derrick Henry', 'Austin Ekeler', 'Breece Hall', 'Jonathan Taylor'],
        'WR': ['Tyreek Hill', 'Stefon Diggs', 'Davante Adams', 'CeeDee Lamb', 'A.J. Brown', 'Ja\'Marr Chase'],
        'TE': ['Travis Kelce', 'Mark Andrews', 'George Kittle', 'T.J. Hockenson', 'Sam LaPorta']
      }
      
      // Get known players from dataset that match elite criteria
      const getKnownElitePlayers = (position: string, minPPG: number) => {
        const rosterPlayerNames = rosterDetails.map(p => p!.name.toLowerCase())
        const knownTargets = dataset.players
          .filter((p: any) => 
            p.position === position && 
            p.proj_ppg >= minPPG &&
            !rosterPlayerNames.includes(p.name.toLowerCase()) &&
            elitePlayers[position as keyof typeof elitePlayers]?.includes(p.name)
          )
          .sort((a: any, b: any) => b.proj_ppg - a.proj_ppg)
          .slice(0, 5) // Return more options to ensure distinct players
          .map((p: any) => p.name)
        
        // Fallback to elite players list if no matches found
        if (knownTargets.length === 0) {
          return elitePlayers[position as keyof typeof elitePlayers]?.slice(0, 5) || []
        }
        
        // Also include non-elite players from dataset if we need more options
        const additionalTargets = dataset.players
          .filter((p: any) => 
            p.position === position && 
            p.proj_ppg >= minPPG &&
            !rosterPlayerNames.includes(p.name.toLowerCase()) &&
            !knownTargets.includes(p.name)
          )
          .sort((a: any, b: any) => b.proj_ppg - a.proj_ppg)
          .slice(0, 3)
          .map((p: any) => p.name)
        
        return [...knownTargets, ...additionalTargets]
      }
      
      // Generate diverse recommendations based on team needs
      const recommendationTypes = ['position', 'upgrade', 'depth']
      let usedTypes = new Set()
      let usedTargetPlayers = new Set<string>() // Track which target players have been used
      let usedTradePlayers = new Set<string>() // Track which roster players have been used in trades
      
      // Helper to get an unused target player
      const getUnusedTarget = (targets: string[]): string | null => {
        for (const target of targets) {
          if (!usedTargetPlayers.has(target)) {
            usedTargetPlayers.add(target)
            return target
          }
        }
        return null
      }
      
      // Helper to get a tradeable player from roster (must actually exist and not be used yet)
      const getTradeablePlayer = (preferredPositions: string[], excludeNames: string[] = []): string | null => {
        // Combine excludeNames with usedTradePlayers
        const allExcluded = [...excludeNames, ...Array.from(usedTradePlayers)]
        
        // Try preferred positions first
        for (const pos of preferredPositions) {
          const players = rosterDetails.filter(p => 
            p!.position === pos && 
            !allExcluded.includes(p!.name)
          )
          if (players.length > 0) {
            // Return the lowest performing player at this position
            const sorted = players.sort((a, b) => (a!.proj_ppg || 0) - (b!.proj_ppg || 0))
            return sorted[0]!.name
          }
        }
        // Fallback: any player not in exclude list
        const available = rosterDetails.filter(p => !allExcluded.includes(p!.name))
        if (available.length > 0) {
          const sorted = available.sort((a, b) => (a!.proj_ppg || 0) - (b!.proj_ppg || 0))
          return sorted[0]!.name
        }
        return null
      }
      
      // Helper to mark a player as used in a trade
      const markPlayerAsUsed = (playerName: string) => {
        usedTradePlayers.add(playerName)
      }
      
      // Recommendation 1: Critical Position Need (acquire via trade or free agency)
      if (needs.length > 0) {
        const need = needs[0]
        const targets = getKnownElitePlayers(need, 8)
        const targetPlayer = getUnusedTarget(targets)
        
        if (targetPlayer) {
          // If we have excess at another position, suggest trading
          if (excess.length > 0) {
            const tradePlayer = getTradeablePlayer(excess)
            if (tradePlayer) {
              tradeRecommendations.push(
                `Trade ${tradePlayer} for ${targetPlayer} to fill critical ${need} position gap`
              )
              markPlayerAsUsed(tradePlayer)
              usedTypes.add('position')
            } else {
              // No tradeable players, suggest free agency
              tradeRecommendations.push(
                `Acquire ${targetPlayer} via free agency or trade to fill critical ${need} position gap`
              )
              usedTypes.add('position')
            }
          } else {
            // No excess, suggest free agency or package trade
            if (rosterDetails.length >= 2) {
              const tradePlayer = getTradeablePlayer(['QB', 'RB', 'WR', 'TE'])
              if (tradePlayer) {
                // Try to find a second player for a package trade
                const secondPlayer = getTradeablePlayer(['QB', 'RB', 'WR', 'TE'], [tradePlayer])
                if (secondPlayer && rosterDetails.length >= 3) {
                  tradeRecommendations.push(
                    `Package ${tradePlayer} + ${secondPlayer} for ${targetPlayer} to fill critical ${need} position gap`
                  )
                  markPlayerAsUsed(tradePlayer)
                  markPlayerAsUsed(secondPlayer)
                } else {
                  tradeRecommendations.push(
                    `Trade ${tradePlayer} for ${targetPlayer} to fill critical ${need} position gap`
                  )
                  markPlayerAsUsed(tradePlayer)
                }
              } else {
                tradeRecommendations.push(
                  `Acquire ${targetPlayer} via free agency to fill critical ${need} position gap`
                )
              }
            } else {
              tradeRecommendations.push(
                `Acquire ${targetPlayer} via free agency to fill critical ${need} position gap`
              )
            }
            usedTypes.add('position')
          }
        }
      }
      
      // Recommendation 2: Roster Upgrade (only if player exists to upgrade)
      if (teamWeaknesses.length > 0 && !usedTypes.has('upgrade')) {
        const weakness = teamWeaknesses[0]
        if (weakness.type === 'performance' && weakness.player) {
          const targets = getKnownElitePlayers(weakness.position, 10)
          const targetPlayer = getUnusedTarget(targets)
          if (targetPlayer && !usedTradePlayers.has(weakness.player)) {
            tradeRecommendations.push(
              `Upgrade ${weakness.player} for ${targetPlayer} to improve ${weakness.position} production`
            )
            markPlayerAsUsed(weakness.player)
            usedTypes.add('upgrade')
          }
        } else if (weakness.type === 'missing' && rosterDetails.length > 0) {
          // Missing position - suggest acquiring
          const targets = getKnownElitePlayers(weakness.position, 8)
          const targetPlayer = getUnusedTarget(targets)
          if (targetPlayer) {
            const tradePlayer = getTradeablePlayer(['QB', 'RB', 'WR', 'TE'])
            if (tradePlayer && rosterDetails.length > 1) {
              tradeRecommendations.push(
                `Trade ${tradePlayer} for ${targetPlayer} to address missing ${weakness.position} position`
              )
              markPlayerAsUsed(tradePlayer)
            } else {
              tradeRecommendations.push(
                `Acquire ${targetPlayer} via free agency to address missing ${weakness.position} position`
              )
            }
            usedTypes.add('upgrade')
          }
        }
      }
      
      // Recommendation 3: Depth Improvement (only if we have players to trade)
      if (!usedTypes.has('depth')) {
        const depthNeeds = []
        if (rbCount < 3 && rbCount > 0) depthNeeds.push('RB') // Only if we have at least 1 RB
        if (wrCount < 3 && wrCount > 0) depthNeeds.push('WR') // Only if we have at least 1 WR
        if (qbCount < 2 && qbCount > 0) depthNeeds.push('QB') // Only if we have at least 1 QB
        
        if (depthNeeds.length > 0 && rosterDetails.length > 1) {
          const depthPosition = depthNeeds[0]
          const targets = getKnownElitePlayers(depthPosition, 7)
          const targetPlayer = getUnusedTarget(targets)
          
          if (targetPlayer) {
            // Find a player from a different position to trade
            const otherPositions = ['QB', 'RB', 'WR', 'TE'].filter(p => p !== depthPosition)
            const tradePlayer = getTradeablePlayer(otherPositions)
            if (tradePlayer) {
              tradeRecommendations.push(
                `Acquire ${targetPlayer} via trade for ${tradePlayer} to improve ${depthPosition} depth`
              )
              markPlayerAsUsed(tradePlayer)
              usedTypes.add('depth')
            }
          }
        } else if (depthNeeds.length > 0 && rosterDetails.length <= 1) {
          // Very small roster - suggest free agency
          const depthPosition = depthNeeds[0]
          const targets = getKnownElitePlayers(depthPosition, 7)
          const targetPlayer = getUnusedTarget(targets)
          if (targetPlayer) {
            tradeRecommendations.push(
              `Acquire ${targetPlayer} via free agency to improve ${depthPosition} depth`
            )
            usedTypes.add('depth')
          }
        }
      }
      
      // Strategic recommendations for strong teams (only if we have enough players)
      if (tradeRecommendations.length < 3 && rosterDetails.length >= 2) {
        if (overallGrade === 'A' || overallGrade === 'A+') {
          // Championship team - suggest elite upgrades
          if (!usedTypes.has('upgrade')) {
            const eliteTargets = getKnownElitePlayers('TE', 10)
            const targetPlayer = getUnusedTarget(eliteTargets)
            if (targetPlayer) {
              const tradePlayer = getTradeablePlayer(['RB', 'WR'])
              if (tradePlayer) {
                tradeRecommendations.push(
                  `Trade ${tradePlayer} for ${targetPlayer} to gain championship-level TE advantage`
                )
                markPlayerAsUsed(tradePlayer)
              }
            }
          }
          
          if (tradeRecommendations.length < 3) {
            const rbTargets = getKnownElitePlayers('RB', 12)
            const targetPlayer = getUnusedTarget(rbTargets)
            if (targetPlayer && rosterDetails.length >= 3) {
              const firstPlayer = getTradeablePlayer(['WR'])
              if (firstPlayer) {
                const secondPlayer = getTradeablePlayer(['RB'], [firstPlayer])
                if (secondPlayer) {
                  tradeRecommendations.push(
                    `Package ${firstPlayer} + ${secondPlayer} for ${targetPlayer} to solidify championship roster`
                  )
                  markPlayerAsUsed(firstPlayer)
                  markPlayerAsUsed(secondPlayer)
                } else {
                  tradeRecommendations.push(
                    `Trade ${firstPlayer} for ${targetPlayer} to upgrade RB corps`
                  )
                  markPlayerAsUsed(firstPlayer)
                }
              } else {
                const tradePlayer = getTradeablePlayer(['RB', 'WR', 'QB'])
                if (tradePlayer) {
                  tradeRecommendations.push(
                    `Trade ${tradePlayer} for ${targetPlayer} to upgrade RB corps`
                  )
                  markPlayerAsUsed(tradePlayer)
                }
              }
            }
          }
        } else {
          // Building team - suggest foundational moves
          if (!usedTypes.has('position') && teCount === 0) {
            const teTargets = getKnownElitePlayers('TE', 6)
            const targetPlayer = getUnusedTarget(teTargets)
            if (targetPlayer) {
              const tradePlayer = getTradeablePlayer(['RB', 'WR', 'QB'])
              if (tradePlayer) {
                tradeRecommendations.push(
                  `Trade ${tradePlayer} for ${targetPlayer} to complete your starting lineup`
                )
                markPlayerAsUsed(tradePlayer)
              } else {
                tradeRecommendations.push(
                  `Acquire ${targetPlayer} via free agency to complete your starting lineup`
                )
              }
            }
          }
          
          if (tradeRecommendations.length < 3) {
            const wrTargets = getKnownElitePlayers('WR', 8)
            const targetPlayer = getUnusedTarget(wrTargets)
            if (targetPlayer) {
              const tradePlayer = getTradeablePlayer(['RB', 'QB'])
              if (tradePlayer) {
                tradeRecommendations.push(
                  `Acquire ${targetPlayer} via trade for ${tradePlayer} to improve WR depth`
                )
                markPlayerAsUsed(tradePlayer)
              } else {
                tradeRecommendations.push(
                  `Acquire ${targetPlayer} via free agency to improve WR depth`
                )
              }
            }
          }
        }
      }
      
      // Fill remaining recommendations with logical suggestions
      while (tradeRecommendations.length < 3) {
        // Find the most critical need
        const criticalNeeds = []
        if (teCount === 0) criticalNeeds.push({ pos: 'TE', priority: 1 })
        if (rbCount < 2) criticalNeeds.push({ pos: 'RB', priority: 2 })
        if (wrCount < 2) criticalNeeds.push({ pos: 'WR', priority: 3 })
        if (qbCount < 1) criticalNeeds.push({ pos: 'QB', priority: 4 })
        
        if (criticalNeeds.length > 0) {
          const need = criticalNeeds[0]
          const targets = getKnownElitePlayers(need.pos, 8)
          const targetPlayer = getUnusedTarget(targets)
          if (targetPlayer) {
            if (rosterDetails.length > 0) {
              const tradePlayer = getTradeablePlayer(['QB', 'RB', 'WR', 'TE'])
              if (tradePlayer && rosterDetails.length > 1) {
                tradeRecommendations.push(
                  `Trade ${tradePlayer} for ${targetPlayer} to address ${need.pos} position need`
                )
                markPlayerAsUsed(tradePlayer)
              } else {
                tradeRecommendations.push(
                  `Acquire ${targetPlayer} via free agency to address ${need.pos} position need`
                )
              }
            } else {
              tradeRecommendations.push(
                `Acquire ${targetPlayer} via free agency to build your ${need.pos} position`
              )
            }
          }
        } else {
          // No critical needs - suggest depth or upgrades
          const depthOptions = []
          if (rbCount < 3) depthOptions.push('RB')
          if (wrCount < 3) depthOptions.push('WR')
          if (qbCount < 2) depthOptions.push('QB')
          
          if (depthOptions.length > 0 && rosterDetails.length > 0) {
            const depthPos = depthOptions[0]
            const targets = getKnownElitePlayers(depthPos, 7)
            const targetPlayer = getUnusedTarget(targets)
            if (targetPlayer) {
              const otherPositions = ['QB', 'RB', 'WR', 'TE'].filter(p => p !== depthPos)
              const tradePlayer = getTradeablePlayer(otherPositions)
              if (tradePlayer && rosterDetails.length > 1) {
                tradeRecommendations.push(
                  `Acquire ${targetPlayer} via trade for ${tradePlayer} to improve ${depthPos} depth`
                )
                markPlayerAsUsed(tradePlayer)
              } else {
                tradeRecommendations.push(
                  `Acquire ${targetPlayer} via free agency to improve ${depthPos} depth`
                )
              }
            }
          } else {
            // No more logical recommendations - break to avoid infinite loop
            break
          }
        }
        
        // Safety check to prevent infinite loop
        if (tradeRecommendations.length >= 3) break
      }

      improvementStrategy = needs.length > 0 
        ? `🔥 CHAMPIONSHIP STRATEGY: Prioritize ${needs.join(', ')} positions immediately. ${excess.length > 0 ? `Trade excess ${excess.join(', ')} for elite ${needs[0]} upgrades.` : `Aggressively acquire ${needs[0]} via trades or free agency.`} Focus on playoff-winning moves, not just depth.`
        : '⚡ ELITE UPGRADE STRATEGY: Your roster is balanced but needs championship-level upgrades. Target undervalued stars and position-specific advantages. Every move should improve your playoff odds significantly.'
      
      console.log('Generated trade recommendations:', tradeRecommendations)

      return {
        teamPPG,
        leagueAverage,
        overallGrade,
        projectedRecord,
        playoffOdds,
        percentAboveAverage,
        positionalAdvantages,
        starPlayers,
        benchDepth,
        weakestPosition,
        tradeRecommendations,
        improvementStrategy
      }
    }

    const dynamicAnalysis = calculateDynamicMetrics()
    // Use dynamic analysis as base, merge with API insights if available
    const displayAnalysis = teamAnalysis ? {
      ...dynamicAnalysis,
      // Only use API insights for additional analysis, keep dynamic trade recommendations
      teamStrengths: teamAnalysis.teamStrengths || [],
      teamWeaknesses: teamAnalysis.teamWeaknesses || [],
      improvementStrategy: teamAnalysis.improvementStrategy || dynamicAnalysis.improvementStrategy
    } : dynamicAnalysis
    const isLoading = loadingTeamAnalysis && !teamAnalysis

    console.log('TeamSummary render:', { teamAnalysis, displayAnalysis, isLoading })

    if (isLoading) {
      return (
        <div style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 20%, #0f172a 100%)',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 50%, rgba(236, 72, 153, 0.05) 100%)'
          }}></div>
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                  <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>📊</span>
                </div>
                <div style={{
                  position: 'absolute',
                  inset: '-4px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                  borderRadius: '20px',
                  filter: 'blur(8px)',
                  opacity: 0.3
                }}></div>
              </div>
              <h2 style={{ fontSize: '30px', fontWeight: 900, color: 'white', letterSpacing: '-0.025em' }}>Team Summary</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid #3b82f6',
                  borderTop: '4px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  width: '48px',
                  height: '48px',
                  border: '4px solid #8b5cf6',
                  borderTop: '4px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  animationDelay: '-0.5s'
                }}></div>
              </div>
              <span style={{ marginLeft: '24px', color: '#d1d5db', fontSize: '18px', fontWeight: 500 }}>Analyzing your team...</span>
            </div>
          </div>
        </div>
      )
    }

    const getGradeColor = (grade: string) => {
      switch (grade) {
        case 'A+':
        case 'A':
        case 'A-':
          return { text: '#34d399', bg: 'rgba(52, 211, 153, 0.2)', border: 'rgba(52, 211, 153, 0.4)' }
        case 'B+':
        case 'B':
        case 'B-':
          return { text: '#60a5fa', bg: 'rgba(96, 165, 250, 0.2)', border: 'rgba(96, 165, 250, 0.4)' }
        case 'C+':
        case 'C':
        case 'C-':
          return { text: '#fbbf24', bg: 'rgba(251, 191, 36, 0.2)', border: 'rgba(251, 191, 36, 0.4)' }
        case 'D+':
        case 'D':
        case 'D-':
          return { text: '#fb923c', bg: 'rgba(251, 146, 60, 0.2)', border: 'rgba(251, 146, 60, 0.4)' }
        default:
          return { text: '#f87171', bg: 'rgba(248, 113, 113, 0.2)', border: 'rgba(248, 113, 113, 0.4)' }
      }
    }

    const gradeColors = getGradeColor(displayAnalysis.overallGrade)

    return (
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 20%, #0f172a 100%)',
        borderRadius: '24px',
        padding: '32px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(20px)'
      }}>
        {/* Animated background gradient */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 51, 234, 0.05) 50%, rgba(236, 72, 153, 0.05) 100%)'
        }}></div>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '128px',
          height: '128px',
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '50%',
          filter: 'blur(96px)'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '128px',
          height: '128px',
          background: 'rgba(147, 51, 234, 0.1)',
          borderRadius: '50%',
          filter: 'blur(96px)'
        }}></div>
        
        <div style={{ position: 'relative' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
              }}>
                <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>📊</span>
              </div>
              <div style={{
                position: 'absolute',
                inset: '-4px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                borderRadius: '20px',
                filter: 'blur(8px)',
                opacity: 0.3
              }}></div>
            </div>
            <h2 style={{ fontSize: '30px', fontWeight: 900, color: 'white', letterSpacing: '-0.025em' }}>Team Summary</h2>
          </div>

          {/* Performance Metrics with Elegant Progress Bars */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ color: '#d1d5db', fontWeight: 500, fontSize: '18px' }}>Your Team PPG</span>
                <span style={{ color: '#34d399', fontWeight: 700, fontSize: '24px' }}>{displayAnalysis.teamPPG.toFixed(1)}</span>
              </div>
              <div style={{
                position: 'relative',
                height: '12px',
                background: 'rgba(31, 41, 55, 0.5)',
                borderRadius: '9999px',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, rgba(52, 211, 153, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
                  borderRadius: '9999px'
                }}></div>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #34d399 0%, #10b981 100%)',
                  borderRadius: '9999px',
                  transition: 'width 1s ease-out',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  width: `${Math.min((displayAnalysis.teamPPG / Math.max(displayAnalysis.teamPPG, displayAnalysis.leagueAverage)) * 100, 100)}%`
                }}></div>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)',
                  borderRadius: '9999px'
                }}></div>
              </div>
            </div>
          </div>

          {/* Stunning Metrics Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '20px',
            marginBottom: '32px',
            padding: '0 8px'
          }}>
            <div style={{
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              height: '140px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minWidth: 0
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
                borderRadius: '16px',
                opacity: 0,
                transition: 'opacity 0.3s ease'
              }}></div>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Overall Grade</div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 900,
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: `2px solid ${gradeColors.border}`,
                  background: gradeColors.bg,
                  color: gradeColors.text,
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  textAlign: 'center',
                  width: 'fit-content',
                  margin: '0 auto'
                }}>
                  {displayAnalysis.overallGrade}
                </div>
              </div>
            </div>
            
            <div style={{
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              height: '140px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minWidth: 0
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)',
                borderRadius: '16px',
                opacity: 0,
                transition: 'opacity 0.3s ease'
              }}></div>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Projected Record</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: 'white', marginBottom: '4px', wordBreak: 'break-word', textAlign: 'center' }}>{displayAnalysis.projectedRecord}</div>
              </div>
            </div>
            
            <div style={{
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              height: '140px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minWidth: 0
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(245, 158, 11, 0.05) 100%)',
                borderRadius: '16px',
                opacity: 0,
                transition: 'opacity 0.3s ease'
              }}></div>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Playoff<br />Odds</div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 900,
                  color: '#34d399',
                  textAlign: 'center'
                }}>
                  {displayAnalysis.playoffOdds}
                </div>
              </div>
            </div>
            
            <div style={{
              position: 'relative',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              height: '140px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minWidth: 0
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                borderRadius: '16px',
                opacity: 0,
                transition: 'opacity 0.3s ease'
              }}></div>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Positional Advantages</div>
                <div style={{ fontSize: '32px', fontWeight: 900, color: '#60a5fa', textAlign: 'center' }}>{displayAnalysis.positionalAdvantages}</div>
              </div>
            </div>
            

          </div>

          {/* Elegant Trade Section */}
          <div style={{
            position: 'relative',
            background: 'linear-gradient(90deg, rgba(251, 146, 60, 0.2) 0%, rgba(251, 191, 36, 0.1) 50%, rgba(245, 101, 101, 0.2) 100%)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(251, 146, 60, 0.3)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, rgba(251, 146, 60, 0.1) 0%, rgba(251, 191, 36, 0.05) 50%, rgba(245, 101, 101, 0.1) 100%)'
            }}></div>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '96px',
              height: '96px',
              background: 'rgba(251, 146, 60, 0.2)',
              borderRadius: '50%',
              filter: 'blur(64px)'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '96px',
              height: '96px',
              background: 'rgba(251, 191, 36, 0.2)',
              borderRadius: '50%',
              filter: 'blur(64px)'
            }}></div>
            
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'linear-gradient(135deg, #fb923c 0%, #fbbf24 100%)',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                  }}>
                    <span style={{ color: 'white', fontSize: '18px' }}>💡</span>
                  </div>
                  <div style={{
                    position: 'absolute',
                    inset: '-4px',
                    background: 'linear-gradient(135deg, #fb923c 0%, #fbbf24 100%)',
                    borderRadius: '16px',
                    filter: 'blur(8px)',
                    opacity: 0.3
                  }}></div>
                </div>
                <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'white' }}>Trade Opportunities</h3>
              </div>
              
              <div style={{ color: 'white', marginBottom: '24px' }}>
                Your weakest starter: <span style={{
                  fontWeight: 900,
                  color: '#fb923c',
                  background: 'rgba(251, 146, 60, 0.3)',
                  padding: '8px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(251, 146, 60, 0.5)',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}>{displayAnalysis.weakestPosition}</span>
              </div>
              
              {displayAnalysis.tradeRecommendations.length > 0 ? (
                <>
                  <div style={{ color: '#d1d5db', marginBottom: '24px', fontSize: '18px', fontWeight: 500 }}>
                    Consider these upgrades for your team:
                  </div>
                  
                  <div style={{ marginBottom: '24px' }}>
                    {displayAnalysis.tradeRecommendations.map((rec: string, index: number) => (
                      <div key={index} style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.3s ease',
                        marginBottom: '16px',
                        cursor: 'pointer'
                      }} onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)'
                        e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.25)'
                      }} onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <span style={{ color: '#fb923c', fontSize: '18px', marginTop: '4px' }}>•</span>
                          <span style={{ color: '#d1d5db', fontSize: '16px', lineHeight: '1.6' }}>{rec}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div style={{
                    background: 'linear-gradient(90deg, rgba(251, 146, 60, 0.4) 0%, rgba(251, 191, 36, 0.3) 100%)',
                    padding: '24px',
                    borderRadius: '16px',
                    border: '2px solid rgba(251, 146, 60, 0.5)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <span style={{ color: '#fb923c', fontSize: '20px' }}>💡</span>
                      <span style={{ color: 'white', fontWeight: 900, fontSize: '18px' }}>Pro Tip:</span>
                    </div>
                    <span style={{ color: '#d1d5db', fontSize: '16px', lineHeight: '1.6', fontWeight: 500 }}>
                      {displayAnalysis.improvementStrategy}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  textAlign: 'center',
                  marginBottom: '24px'
                }}>
                  <span style={{ color: '#9ca3af', fontSize: '16px', lineHeight: '1.6' }}>
                    Please add at least 6 players to your roster to receive personalized trade recommendations.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <main style={{
      maxWidth: 1200,
      margin: '0 auto',
      padding: 24,
      minHeight: '100vh',
    }}>
      {/* Header */}
      <header className="fade-in" style={{ marginBottom: 32, textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 900, 
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 8
        }}>
          Fantasy Team Analyzer
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 16, maxWidth: 600, margin: '0 auto' }}>
          Import your Sleeper league • Analyze your roster • Get trade suggestions • View detailed player insights
        </p>
      </header>

      {/* Main Grid Layout */}
      <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr 400px' }}>
        {/* Left Column - Import & Roster */}
        <div style={{ display: 'grid', gap: 24 }}>
          {/* Import Section */}
          <div className="card slide-up" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 32, 
                  height: 32, 
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 600,
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                  ⬇️
                </div>
                <div style={{
                  position: 'absolute',
                  inset: '-4px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)',
                  borderRadius: 12,
                  filter: 'blur(8px)',
                  opacity: 0.3
                }}></div>
              </div>
              <h2 style={{ margin: 0 }}>Import from Sleeper</h2>
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
                placeholder="Enter your Sleeper League ID"
                style={{ flex: 1, minWidth: 280 }}
              />
              <button
                disabled={!leagueId || importing}
                onClick={doImport}
                className="btn-primary"
              >
                {importing ? 'Importing...' : 'Import League'}
              </button>
            </div>
            
            {importErr && (
              <div style={{ 
                color: 'var(--danger)', 
                fontSize: 14, 
                padding: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 8,
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                {importErr}
              </div>
            )}
            
            {teams && (
              <div className="fade-in">
                <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Select your team to auto-fill the roster:
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 8,
                }}>
                  {teams.map((t) => (
                    <button
                      key={t.roster_id}
                      onClick={() => useTeam(t.owner_id)}
                      className="btn-secondary"
                      style={{
                        background: selectedOwnerId === t.owner_id ? 'rgba(59, 130, 246, 0.15)' : undefined,
                        borderColor: selectedOwnerId === t.owner_id ? 'var(--primary)' : undefined,
                        color: selectedOwnerId === t.owner_id ? 'var(--primary)' : undefined,
                      }}
                    >
                      {t.owner_name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Roster Interface */}
          <RosterInterface
            dataset={dataset}
            rosterPlayers={rosterPlayers}
            onAddPlayer={addPlayerToRoster}
            onRemovePlayer={removePlayerFromRoster}
          />

          {/* Community Section */}
          <div className="card slide-up" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 32, 
                  height: 32, 
                  background: 'linear-gradient(135deg, #1db954 0%, #1ed760 50%, #1fdf64 100%)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 600,
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                  🎵
                </div>
                <div style={{
                  position: 'absolute',
                  inset: '-4px',
                  background: 'linear-gradient(135deg, #1db954 0%, #1ed760 50%, #1fdf64 100%)',
                  borderRadius: 12,
                  filter: 'blur(8px)',
                  opacity: 0.3
                }}></div>
              </div>
              <h2 style={{ margin: 0 }}>Join Our Community Today!</h2>
            </div>
            
            <div style={{ 
              textAlign: 'center', 
              padding: '40px 0 20px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              minHeight: 140
            }}>
              <div style={{ 
                width: 80, 
                height: 80, 
                margin: '0 auto 32px',
                background: 'linear-gradient(135deg, #1db954 0%, #1ed760 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                boxShadow: '0 10px 30px rgba(29, 185, 84, 0.3)'
              }}>
                🎵
              </div>
              <p style={{ 
                color: 'var(--text-muted)', 
                fontSize: 14, 
                margin: 0,
                lineHeight: 1.5,
                marginTop: 16
              }}>
                Please Listen to Our Podcast to Get the Newest Insights!
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Team Summary */}
        <div className="slide-up">
          <TeamSummary />
          
          {/* Player Analysis Button */}
          {rosterPlayers.length > 0 && (
            <button
              onClick={() => setShowPlayerAnalysis(true)}
              style={{
                width: '100%',
                padding: '16px 24px',
                marginTop: 16,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: 12,
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: 24, 
                  height: 24, 
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 600,
                  boxShadow: '0 15px 35px -8px rgba(0, 0, 0, 0.4)'
                }}>
                  🔍
                </div>
                <div style={{
                  position: 'absolute',
                  inset: '-3px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
                  borderRadius: 9,
                  filter: 'blur(6px)',
                  opacity: 0.3
                }}></div>
              </div>
              View Player-by-Player Analysis
            </button>
          )}
        </div>
      </div>

      {/* Detailed Analysis Section */}
      {showDetail && result && (
        <section className="slide-up" style={{ marginTop: 32 }}>
          <div className="card analysis-wrapper" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ 
                width: 32, 
                height: 32, 
                borderRadius: 8, 
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 600
              }}>
                🔍
              </div>
              <h3 style={{ margin: 0 }}>Detailed Player Analysis</h3>
            </div>
            
            <div style={{ height: '60vh', overflowY: 'auto', display: 'grid', gap: 12, paddingRight: 8 }}>
              {result.starters.map((s, i) => (
                <PlayerCard
                  key={i}
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
                  onClick={() => setModal({ open: true, pid: s.player.player_id })}
                />
              ))}

              {result.bench.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ 
                    fontSize: 14, 
                    fontWeight: 600, 
                    color: 'var(--text-muted)', 
                    marginBottom: 12,
                    padding: '8px 12px',
                    background: 'rgba(148, 163, 184, 0.1)',
                    borderRadius: 6
                  }}>
                    Bench Players
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {result.bench.map((p, i) => (
                      <PlayerCard
                        key={'b' + i}
                        name={p.name}
                        team={p.team}
                        position={p.position}
                        headshot={p.headshot}
                        adp={p.adp}
                        proj_ppg={p.proj_ppg}
                        slot="BENCH"
                        baseline={result.baselines.FLEX}
                        delta={p.proj_ppg - result.baselines.FLEX}
                        grade={'C'}
                        onClick={() => setModal({ open: true, pid: p.player_id })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Enhanced Player Modal */}
      {modal.open && modalPlayer && (
        <div className="modal-overlay" onClick={() => setModal({ open: false })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ padding: 24, width: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ marginBottom: 4 }}>
                  {modalPlayer.name}
                </h3>
                <p style={{ color: 'var(--text-muted)', margin: 0 }}>
                  {modalPlayer.team} • {modalPlayer.position}
                </p>
              </div>
              <button 
                onClick={() => setModal({ open: false })}
                className="btn-secondary"
                style={{ padding: '6px 10px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: 12, background: 'rgba(15, 23, 42, 0.5)', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>ADP</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{modalPlayer.adp ?? '—'}</div>
                </div>
                <div style={{ padding: 12, background: 'rgba(15, 23, 42, 0.5)', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Projected PPG</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)' }}>
                    {modalPlayer.proj_ppg.toFixed(1)}
                  </div>
                </div>
              </div>

              <div style={{ 
                padding: 16, 
                background: 'rgba(59, 130, 246, 0.1)', 
                borderRadius: 8,
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <h4 style={{ marginBottom: 8, fontSize: 14 }}>Coming Soon</h4>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                  <li>ADP percentile within position</li>
                  <li>Value above replacement analysis</li>
                  <li>Stack recommendations</li>
                  <li>Injury risk assessment</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Analysis Modal */}
      {showPlayerAnalysis && (
        <PlayerAnalysisModal
          isOpen={showPlayerAnalysis}
          onClose={() => setShowPlayerAnalysis(false)}
          rosterPlayers={rosterPlayers}
          dataset={dataset}
        />
      )}


    </main>
  )
}


