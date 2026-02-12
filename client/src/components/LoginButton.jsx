import { API } from '../api'
import { Button } from './ui'

export default function LoginButton() {
  return (
    <Button onClick={() => { window.location.href = `${API}/auth/github` }}>
      Login with GitHub
    </Button>
  )
}
