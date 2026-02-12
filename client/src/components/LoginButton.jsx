import { T } from '../theme'
import { API } from '../api'

export default function LoginButton() {
  return (
    <button
      onClick={() => { window.location.href = `${API}/auth/github` }}
      style={{
        background: T.elevated,
        border: `1px solid ${T.borderLight}`,
        color: T.textBright,
        padding: '6px 14px',
        borderRadius: T.radius,
        cursor: 'pointer',
        fontSize: 12,
        fontFamily: T.font,
      }}
    >
      Login with GitHub
    </button>
  )
}
