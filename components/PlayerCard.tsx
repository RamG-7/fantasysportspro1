'use client'
import { Grade, gradeColor } from '../lib/grades'

function PlayerCard(props:{
  name:string, team:string, position:string, headshot?:string, adp?:number, proj_ppg:number,
  slot:string, baseline:number, delta:number, grade:Grade, onClick?:()=>void
}) {
  const delta = props.delta
  const sign = delta>=0?'+':'-'
  const abs = Math.abs(delta).toFixed(1)
  const pct = props.baseline>0 ? ((props.proj_ppg-props.baseline)/props.baseline)*100 : 0
  const pctStr = (pct>=0?'+':'') + pct.toFixed(1) + '% vs avg'

  return (
    <button 
      onClick={props.onClick} 
      style={{ 
        textAlign: 'left', 
        width: '100%',
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer'
      }}
    >
      <div className="player-card fade-in" style={{
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        borderRadius: 12,
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid var(--border)',
        transition: 'all 0.2s ease-in-out',
        overflow: 'hidden'
      }}>
        {/* Player Avatar */}
        <div style={{
          width: 48, 
          height: 48, 
          borderRadius: 12, 
          overflow: 'hidden',
          background: 'rgba(148, 163, 184, 0.1)', 
          display: 'grid', 
          placeItems: 'center', 
          flexShrink: 0,
          border: '1px solid var(--border)'
        }}>
          <img
            src={props.headshot || 'https://placehold.co/96x96/png?text=Team'}
            alt={props.name}
            width={40}
            height={40}
            style={{ 
              objectFit: 'contain', 
              display: 'block',
              borderRadius: 8
            }}
          />
        </div>

        {/* Player Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Slot and Baseline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ 
              color: 'var(--primary)', 
              fontSize: 12, 
              fontWeight: 700,
              padding: '2px 6px',
              background: 'rgba(59, 130, 246, 0.1)',
              borderRadius: 4,
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              {props.slot}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              baseline {props.baseline.toFixed(1)} ppg
            </div>
          </div>

          {/* Player Name and Team */}
          <div style={{ 
            fontSize: 16, 
            fontWeight: 700, 
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            color: 'var(--text-primary)',
            marginBottom: 4
          }}>
            {props.name}
          </div>
          <div style={{ 
            fontSize: 13, 
            color: 'var(--text-muted)',
            marginBottom: 6
          }}>
            {props.team} • {props.position}
          </div>

          {/* Stats Row */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12,
            fontSize: 12,
            color: 'var(--text-muted)'
          }}>
            <span>ADP: {props.adp ?? '—'}</span>
            <span>•</span>
            <span>Proj: {props.proj_ppg.toFixed(1)} PPG</span>
            <span>•</span>
            <span style={{ 
              color: pct >= 0 ? 'var(--success)' : 'var(--danger)',
              fontWeight: 600
            }}>
              {pctStr}
            </span>
          </div>
        </div>

        {/* Delta and Grade */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ 
            fontSize: 20, 
            fontWeight: 800, 
            color: delta >= 0 ? 'var(--success)' : 'var(--danger)',
            marginBottom: 4
          }}>
            {sign}{abs}
          </div>
          <div style={{ 
            fontSize: 14, 
            fontWeight: 700, 
            color: gradeColor(props.grade),
            padding: '2px 6px',
            background: `rgba(${props.grade === 'A' ? '16, 185, 129' : props.grade === 'B' ? '59, 130, 246' : props.grade === 'C' ? '245, 158, 11' : '239, 68, 68'}, 0.1)`,
            borderRadius: 4,
            border: `1px solid rgba(${props.grade === 'A' ? '16, 185, 129' : props.grade === 'B' ? '59, 130, 246' : props.grade === 'C' ? '245, 158, 11' : '239, 68, 68'}, 0.2)`
          }}>
            {props.grade}
          </div>
        </div>
      </div>
    </button>
  )
}

export default PlayerCard




