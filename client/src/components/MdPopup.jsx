import { T } from '../theme'
import { X } from 'lucide-react'
import SimpleMd from './SimpleMd'

export default function MdPopup({ title, text, onClose, footer }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius.lg, width: '90%', maxWidth: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `${T.sp[4]}px ${T.sp[5]}px`, borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontSize: T.fontSize.sm, fontFamily: T.mono, color: T.textBright, fontWeight: T.weight.medium }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: T.sp[1] }}><X size={16} /></button>
        </div>
        <div style={{ overflow: 'auto', padding: T.sp[5], flex: 1 }}><SimpleMd text={text} /></div>
        {footer && <div style={{ padding: `${T.sp[4]}px ${T.sp[5]}px`, borderTop: `1px solid ${T.border}` }}>{footer}</div>}
      </div>
    </div>
  )
}
