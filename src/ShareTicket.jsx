import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { renderTicket } from './ticket'
import { longDate, timeStr } from './format'

// The words that go with the picture (or on their own, if the picture can't be made).
export function shareText(e) {
  return (
    `${e.title}\n${longDate(e.starts_at)}, ${timeStr(e.starts_at)}` +
    `${e.location ? ' at ' + e.location : ''}\n${window.location.origin}`
  )
}
const whatsappLink = e => 'https://wa.me/?text=' + encodeURIComponent(shareText(e))

const fileName = e =>
  ((e.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'event') +
  '-ticket.png'

function ShareDialog({ event, onClose }) {
  const dialogRef = useRef(null)
  const [status, setStatus] = useState('making') // making | ready | error
  const [blob, setBlob] = useState(null)
  const [url, setUrl] = useState('')
  const [canShareFile, setCanShareFile] = useState(false)
  const [canCopy, setCanCopy] = useState(false)
  const [note, setNote] = useState('')

  // open as a real modal (traps focus, Escape closes, page behind can't be clicked)
  useEffect(() => {
    const d = dialogRef.current
    if (d && !d.open) d.showModal()
  }, [])

  // draw the ticket
  useEffect(() => {
    let cancelled = false
    let objectUrl = ''
    renderTicket(event, window.location.origin)
      .then(b => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(b)
        const file = new File([b], fileName(event), { type: 'image/png' })
        setCanShareFile(Boolean(navigator.canShare && navigator.canShare({ files: [file] })))
        setCanCopy(Boolean(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem))
        setBlob(b)
        setUrl(objectUrl)
        setStatus('ready')
      })
      .catch(() => { if (!cancelled) setStatus('error') })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [event])

  // Phones: hand the picture to the share sheet. This runs straight from a tap, which browsers require.
  const shareImage = async () => {
    setNote('')
    try {
      const file = new File([blob], fileName(event), { type: 'image/png' })
      await navigator.share({ files: [file], title: event.title, text: shareText(event) })
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        setNote("Couldn't open the share sheet. Download the image and send it from WhatsApp instead.")
      }
    }
  }

  const copyImage = async () => {
    setNote('')
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setNote('Image copied. Open WhatsApp and paste it into a chat.')
    } catch {
      setNote("Couldn't copy the image. Use Download image instead.")
    }
  }

  const download = () => {
    const a = document.createElement('a')
    a.href = url
    a.download = fileName(event)
    document.body.appendChild(a)
    a.click()
    a.remove()
    setNote('Image downloaded. Attach it to a WhatsApp chat.')
  }

  return (
    <dialog
      ref={dialogRef}
      className="sharebox"
      aria-labelledby="share-title"
      onClose={onClose}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="sharebox__inner">
        <div className="sharebox__head">
          <h2 id="share-title" className="sharebox__title display">Share this event</h2>
          <button type="button" className="sharebox__x" aria-label="Close" onClick={onClose}>×</button>
        </div>

        <div className="sharebox__stage">
          {status === 'making' && <p className="muted" role="status">Making your ticket…</p>}
          {status === 'ready' && (
            <img className="sharebox__img" src={url} alt={`Ticket for ${event.title}`} />
          )}
          {status === 'error' && (
            <p className="error" role="alert">
              Couldn't make the ticket image on this device. You can still send the details as text.
            </p>
          )}
        </div>

        <div className="sharebox__actions">
          {status === 'ready' && canShareFile && (
            <button type="button" className="btn" onClick={shareImage}>Share image</button>
          )}
          {status === 'ready' && !canShareFile && canCopy && (
            <button type="button" className="btn" onClick={copyImage}>Copy image</button>
          )}
          {status === 'ready' && (
            <button type="button" className="btn btn--ghost" onClick={download}>Download image</button>
          )}
          {(status === 'error' || (status === 'ready' && !canShareFile)) && (
            <a className="btn btn--ghost" href={whatsappLink(event)} target="_blank" rel="noreferrer">
              Open WhatsApp
            </a>
          )}
        </div>

        {status === 'ready' && (
          <p className="sharebox__hint muted">
            {canShareFile
              ? 'Tap Share image, then choose WhatsApp from the list.'
              : canCopy
                ? 'Copy the image, open WhatsApp, then paste it into a chat.'
                : 'Download the image, open WhatsApp, then attach it to a chat.'}
          </p>
        )}
        {note && <p className="sharebox__note" role="status">{note}</p>}
      </div>
    </dialog>
  )
}

// The button people tap in the event list and the top banner. variant "button" = bold, "link" = text link.
export default function ShareTicket({ event, variant = 'link' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        className={variant === 'button' ? 'btn' : 'textlink textbtn'}
        onClick={() => setOpen(true)}
      >
        Share on WhatsApp
      </button>
      {open && createPortal(<ShareDialog event={event} onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}
