import { Link } from 'react-router-dom'
import { SITE } from './config'

function ArchIcon() {
  return (
    <svg className="brand__icon" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="4" width="28" height="5" fill="currentColor" />
      <rect x="2" y="4" width="5" height="26" fill="currentColor" />
      <rect x="25" y="4" width="5" height="26" fill="currentColor" />
      <path d="M7 30V19c0-6 4-8 9-8s9 2 9 8v11z" fill="#F0A800" />
    </svg>
  )
}

export default function Header({ admin = false }) {
  return (
    <header className="top">
      <Link to="/" className="brand">
        <ArchIcon />
        <span>{SITE.name}</span>
      </Link>
      {admin && (
        <Link to="/" className="textlink">
          View site
        </Link>
      )}
    </header>
  )
}
