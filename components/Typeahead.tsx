'use client'
import { useMemo, useRef, useState, useEffect } from 'react'
type Option = { id:string, label:string }

export default function Typeahead({
  options, onSelect, placeholder
}:{
  options: Option[],
  onSelect: (opt:Option)=>void,
  placeholder?: string
}){
  const [q,setQ] = useState('')
  const [open,setOpen] = useState(false)
  const [hi,setHi] = useState(0)
  const box = useRef<HTMLDivElement>(null)

  const filtered = useMemo(()=>{
    const k=q.toLowerCase().trim()
    if(!k) return options.slice(0,8)
    return options.filter(o=>o.label.toLowerCase().includes(k)).slice(0,8)
  },[q,options])

  useEffect(()=>{
    function onDoc(e:MouseEvent){
      if (!box.current) return
      if (!box.current.contains(e.target as any)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return ()=>document.removeEventListener('mousedown', onDoc)
  },[])

  function choose(i:number){
    const opt = filtered[i]
    if(!opt) return
    onSelect(opt)
    setQ('')
    setOpen(false)
  }

  return (
    <div ref={box} style={{ position:'relative' }}>
      <input
        value={q}
        onChange={e=>{ setQ(e.target.value); setOpen(true) }}
        onFocus={()=>setOpen(true)}
        onKeyDown={e=>{
          if(e.key==='ArrowDown'){ e.preventDefault(); setHi(h=>Math.min(h+1, filtered.length-1)) }
          else if(e.key==='ArrowUp'){ e.preventDefault(); setHi(h=>Math.max(h-1, 0)) }
          else if(e.key==='Enter'){ e.preventDefault(); choose(hi) }
          else if(e.key==='Escape'){ e.preventDefault(); setOpen(false) }
        }}
        placeholder={placeholder||'Search players...'}
        style={{
          width:'100%',
          background:'var(--surface)',
          border:'1px solid var(--border)',
          borderRadius:8,
          padding:'12px 16px',
          color:'var(--text-primary)',
          outline:'none',
          fontSize: 14,
          transition: 'all 0.2s ease-in-out'
        }}
      />
      {open && filtered.length>0 && (
        <div
          className="fade-in"
          style={{
            position:'absolute',
            zIndex:50,
            top:'calc(100% + 8px)',
            left:0,
            right:0,
            background:'var(--surface)',
            border:'1px solid var(--border)',
            borderRadius:12,
            maxHeight:280,
            overflowY:'auto',
            boxShadow:'0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            backdropFilter: 'blur(20px)'
          }}
        >
          {filtered.map((o,i)=>(
            <button
              key={o.id}
              onMouseEnter={()=>setHi(i)}
              onClick={()=>choose(i)}
              style={{
                display:'block',
                width:'100%',
                textAlign:'left',
                padding:'12px 16px',
                fontSize:14,
                color:'var(--text-primary)',
                background: i===hi ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease-in-out',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none'
              }}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8 
              }}>
                <div style={{ 
                  width: 8, 
                  height: 8, 
                  borderRadius: '50%', 
                  background: i===hi ? 'var(--primary)' : 'var(--text-muted)',
                  flexShrink: 0
                }} />
                {o.label}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
