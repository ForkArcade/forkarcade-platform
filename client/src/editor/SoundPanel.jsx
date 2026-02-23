import { useState, useRef } from 'react'
import { T } from '../theme'

export default function SoundPanel({ soundDefs }) {
  const [playing, setPlaying] = useState(null)
  const audioCtxRef = useRef(null)

  if (!soundDefs) return (
    <div style={{ fontSize: T.fontSize.xs, color: T.muted, padding: T.sp[3] }}>
      No sound data. Add "sounds" section to _narrative.json.
    </div>
  )

  const playSound = (key, def) => {
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
    const ctx = audioCtxRef.current
    const t = ctx.currentTime
    const v = def.vol || 0.03, a = def.attack || 0.01, r = def.release || 0.2
    const playTone = (freq) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'; o.frequency.value = freq
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(v, t + a)
      g.gain.linearRampToValueAtTime(0, t + a + r)
      o.connect(g); g.connect(ctx.destination)
      o.start(t); o.stop(t + a + r + 0.05)
    }
    if (def.chord) def.chord.forEach(f => playTone(f))
    else if (def.freqStart) {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.type = 'sine'
      o.frequency.setValueAtTime(def.freqStart, t)
      o.frequency.linearRampToValueAtTime(def.freqEnd, t + a + r * 0.8)
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(v, t + a)
      g.gain.linearRampToValueAtTime(0, t + a + r)
      o.connect(g); g.connect(ctx.destination)
      o.start(t); o.stop(t + a + r + 0.05)
    } else {
      playTone(def.freq || 300)
      if (def.freq2) playTone(def.freq2)
    }
    setPlaying(key)
    setTimeout(() => setPlaying(p => p === key ? null : p), (a + r) * 1000 + 100)
  }

  return (<>
    <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase', marginBottom: T.sp[2] }}>
      One-shot sounds
    </div>
    {soundDefs.oneshot && Object.entries(soundDefs.oneshot).map(([key, def]) => (
      <div key={key} style={{
        display: 'flex', alignItems: 'center', gap: T.sp[2],
        padding: `${T.sp[1]}px ${T.sp[2]}px`, borderRadius: T.radius.sm,
        background: playing === key ? T.elevated : 'transparent',
        border: `1px solid ${playing === key ? T.accentColor : 'transparent'}`,
        marginBottom: 2,
      }}>
        <button
          onClick={() => playSound(key, def)}
          style={{
            background: 'none', border: `1px solid ${T.border}`, borderRadius: T.radius.sm,
            color: T.accentColor, cursor: 'pointer', padding: '1px 6px',
            fontSize: 10, fontFamily: T.mono, flexShrink: 0,
          }}
        >&#9654;</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontFamily: T.mono, color: T.textBright, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{key}</div>
          <div style={{ fontSize: 8, fontFamily: T.mono, color: T.muted }}>{def.label} · {def.trigger}</div>
        </div>
        <div style={{ fontSize: 8, fontFamily: T.mono, color: T.muted, flexShrink: 0 }}>
          {def.freq || def.freqStart || (def.chord && def.chord[0]) || '?'}Hz
        </div>
      </div>
    ))}

    <div style={{ fontSize: T.fontSize.xs, color: T.text, textTransform: 'uppercase', marginTop: T.sp[4], marginBottom: T.sp[2] }}>
      Ambient sounds
    </div>
    {soundDefs.ambient && Object.entries(soundDefs.ambient).map(([key, def]) => (
      <div key={key} style={{
        display: 'flex', alignItems: 'center', gap: T.sp[2],
        padding: `${T.sp[1]}px ${T.sp[2]}px`, borderRadius: T.radius.sm, marginBottom: 2,
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: def.target?.startsWith('zone:') ? '#4ef' : '#f80',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontFamily: T.mono, color: T.textBright, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{key}</div>
          <div style={{ fontSize: 8, fontFamily: T.mono, color: T.muted }}>{def.label} · {def.target}</div>
        </div>
        <div style={{ fontSize: 8, fontFamily: T.mono, color: T.muted, flexShrink: 0 }}>
          {def.type === 'noise' ? 'noise' : `${def.freq}Hz`}
        </div>
      </div>
    ))}
  </>)
}
