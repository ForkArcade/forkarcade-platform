export default function LoginButton() {
  return (
    <button onClick={() => { window.location.href = '/auth/github' }}>
      Login with GitHub
    </button>
  )
}
