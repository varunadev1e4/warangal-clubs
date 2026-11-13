// Draws a ticket-style picture of an event, ready to share on WhatsApp.
// Everything is drawn in the visitor's browser: nothing is uploaded and no server is involved.

import qrcode from 'qrcode-generator'
import { categoryColor, initials, SUN } from './theme'
import { dayNum, weekdayLong, monthYear, timeStr } from './format'

export const TICKET_W = 1080
export const TICKET_H = 1440

const INK = '#1C2A2D'
const INK_LIGHT = '#31484C'
const SOFT = '#4B5B5E'
const PAPER = '#F6F8F4'
const STONE = '#C9CFC6'
const GRANITE = '#E8EBE6'
const FAMILY = '"Archivo Variable", "Noto Sans Telugu Variable", system-ui, sans-serif'

const font = (weight, size) => `${weight} ${size}px ${FAMILY}`

// The site's headline style is a wide face. Browsers that can't widen canvas text just skip this.
function wide(ctx, on) {
  try { ctx.fontStretch = on ? 'expanded' : 'normal' } catch { /* not supported: fine */ }
}

// Rounded rectangle path. r is one number or [topLeft, topRight, bottomRight, bottomLeft].
function rr(ctx, x, y, w, h, r) {
  const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r]
  ctx.beginPath()
  ctx.moveTo(x + tl, y)
  ctx.lineTo(x + w - tr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + tr)
  ctx.lineTo(x + w, y + h - br)
  ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h)
  ctx.lineTo(x + bl, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - bl)
  ctx.lineTo(x, y + tl)
  ctx.quadraticCurveTo(x, y, x + tl, y)
  ctx.closePath()
}

// Splits text into lines that fit maxWidth. Adds "…" if it needs more than maxLines.
function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  const fits = s => ctx.measureText(s).width <= maxWidth

  const pushLong = word => {
    // a single word wider than the line (e.g. a long link): break it by characters
    let chunk = ''
    for (const ch of word) {
      if (!fits(chunk + ch) && chunk) { lines.push(chunk); chunk = ch } else chunk += ch
    }
    return chunk
  }

  for (const word of words) {
    const test = line ? line + ' ' + word : word
    if (fits(test)) line = test
    else {
      if (line) lines.push(line)
      line = fits(word) ? word : pushLong(word)
    }
  }
  if (line) lines.push(line)

  let truncated = false
  if (lines.length > maxLines) {
    truncated = true
    lines.length = maxLines
  }
  if (truncated) {
    let last = lines[maxLines - 1]
    while (last.length > 1 && !fits(last + '…')) last = last.slice(0, -1)
    lines[maxLines - 1] = last.replace(/[\s.,;:!-]+$/, '') + '…'
  }
  return { lines, truncated }
}

// Loads an image for the canvas. Resolves null on any problem, so a bad poster never blocks sharing.
function loadImage(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous' // needed so the canvas can still be exported
    const timer = setTimeout(() => resolve(null), 8000)
    img.onload = () => { clearTimeout(timer); resolve(img) }
    img.onerror = () => { clearTimeout(timer); resolve(null) }
    img.src = url
  })
}

async function loadFonts(text) {
  if (!document.fonts || !document.fonts.load) return
  try {
    await Promise.all([
      document.fonts.load(font(800, 80), text),
      document.fonts.load(font(700, 40), text),
      document.fonts.load(font(500, 36), text),
    ])
    await document.fonts.ready
  } catch { /* draw with whatever font is available */ }
}

// ---- pieces of the picture ----

// The Kakatiya gateway from the site, with the club's initials in the opening.
function drawGateway(ctx, cx, top, size, accent, label) {
  const w = size
  const x = cx - w / 2
  const lintel = Math.round(size * 0.1)
  const pillar = Math.round(size * 0.15)
  const foot = Math.round(size * 0.05)
  const bottom = top + size

  ctx.fillStyle = INK
  ctx.fillRect(x, top, w, lintel)
  ctx.fillRect(x, top, pillar, size)
  ctx.fillRect(x + w - pillar, top, pillar, size)
  ctx.fillRect(x - 14, bottom - foot, w + 28, foot)

  // carved bands on the pillars
  ctx.fillStyle = INK_LIGHT
  for (let y = top + lintel + 16; y < bottom - foot - 10; y += 38) {
    ctx.fillRect(x, y, pillar, 6)
    ctx.fillRect(x + w - pillar, y, pillar, 6)
  }

  // the sunlit opening
  const ix = x + pillar
  const iw = w - pillar * 2
  const iy = top + lintel
  const ih = size - lintel - foot
  ctx.fillStyle = accent
  ctx.beginPath()
  const r = iw / 2
  ctx.moveTo(ix, iy + ih)
  ctx.lineTo(ix, iy + r + ih * 0.06)
  ctx.arc(ix + r, iy + r + ih * 0.06, r, Math.PI, 0)
  ctx.lineTo(ix + iw, iy + ih)
  ctx.closePath()
  ctx.fill()

  if (label) {
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    wide(ctx, true)
    ctx.font = font(800, Math.round(size * 0.24))
    ctx.fillText(label, ix + r, iy + ih * 0.7)
    wide(ctx, false)
    ctx.textAlign = 'left'
  }
}

// A small version of the gateway, used as the brand mark on the stub.
function drawMark(ctx, x, y, s) {
  ctx.fillStyle = INK
  ctx.fillRect(x, y, s, s * 0.16)
  ctx.fillRect(x, y, s * 0.2, s)
  ctx.fillRect(x + s * 0.8, y, s * 0.2, s)
  ctx.fillStyle = SUN
  ctx.beginPath()
  ctx.moveTo(x + s * 0.2, y + s)
  ctx.lineTo(x + s * 0.2, y + s * 0.55)
  ctx.arc(x + s * 0.5, y + s * 0.55, s * 0.3, Math.PI, 0)
  ctx.lineTo(x + s * 0.8, y + s)
  ctx.closePath()
  ctx.fill()
}

// A small map pin for the venue line.
function drawPin(ctx, x, y, s, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x + s / 2, y + s * 0.4, s * 0.4, Math.PI * 0.85, Math.PI * 0.15)
  ctx.lineTo(x + s / 2, y + s)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = PAPER
  ctx.beginPath()
  ctx.arc(x + s / 2, y + s * 0.4, s * 0.15, 0, Math.PI * 2)
  ctx.fill()
}

function drawQr(ctx, text, x, y, size) {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  const quiet = 3
  const cell = size / (n + quiet * 2)
  ctx.fillStyle = '#FFFFFF'
  rr(ctx, x, y, size, size, 14)
  ctx.fill()
  ctx.fillStyle = INK
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) {
        // +0.4 overlaps neighbouring squares slightly so no hairline gaps show
        ctx.fillRect(x + (c + quiet) * cell, y + (r + quiet) * cell, cell + 0.4, cell + 0.4)
      }
    }
  }
}

// ---- the ticket ----

export async function renderTicket(event, siteUrl) {
  const host = event.clubs ? event.clubs.name : 'City event'
  const accent = event.clubs ? categoryColor(event.clubs.category) : SUN
  const where = (event.location || '').trim()

  await loadFonts([event.title, where, host, 'Warangal Clubs'].join(' ') + ' 0123456789 AaPpMm')
  const poster = event.poster_url ? await loadImage(event.poster_url) : null

  const canvas = document.createElement('canvas')
  canvas.width = TICKET_W
  canvas.height = TICKET_H
  const ctx = canvas.getContext('2d')
  ctx.textBaseline = 'alphabetic'

  // backdrop
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, TICKET_W, TICKET_H)

  // ticket body
  const tx = 70
  const ty = 70
  const tw = TICKET_W - tx * 2
  const th = TICKET_H - ty * 2
  const heroH = 400
  const perfY = ty + th - 250
  const padX = 56

  ctx.save()
  rr(ctx, tx, ty, tw, th, 36)
  ctx.clip()
  ctx.fillStyle = PAPER
  ctx.fillRect(tx, ty, tw, th)

  // hero
  ctx.fillStyle = STONE
  ctx.fillRect(tx, ty, tw, heroH)
  if (poster) {
    const pad = 26
    const bw = tw - pad * 2
    const bh = heroH - pad * 2
    const s = Math.min(bw / poster.width, bh / poster.height)
    const dw = poster.width * s
    const dh = poster.height * s
    const dx = tx + (tw - dw) / 2
    const dy = ty + (heroH - dh) / 2
    ctx.shadowColor = 'rgba(28, 42, 45, 0.35)'
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 8
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(dx, dy, dw, dh)
    ctx.shadowColor = 'transparent'
    ctx.drawImage(poster, dx, dy, dw, dh)
    ctx.strokeStyle = INK
    ctx.lineWidth = 4
    ctx.strokeRect(dx, dy, dw, dh)
  } else {
    drawGateway(ctx, tx + tw / 2, ty + 36, heroH - 72, accent, event.clubs ? initials(event.clubs.name) : '')
  }
  // coloured edge under the hero
  ctx.fillStyle = accent
  ctx.fillRect(tx, ty + heroH, tw, 14)

  // stub background
  ctx.fillStyle = GRANITE
  ctx.fillRect(tx, perfY, tw, ty + th - perfY)
  ctx.restore()

  // ---- measure everything first, so the text block can be centred between the picture and the tear-off line ----
  const barX = tx + padX
  const textX = barX + 40
  const rightEdge = tx + tw - padX
  const textW = rightEdge - textX
  const heroBottom = ty + heroH + 14
  const minTop = 44
  const limitBottom = perfY - 34
  const PIN = 46

  wide(ctx, true)
  ctx.font = font(800, 150)
  const day = dayNum(event.starts_at)
  const dayW = ctx.measureText(day).width
  ctx.font = font(800, 62)
  const time = timeStr(event.starts_at)
  const timeW = ctx.measureText(time).width
  wide(ctx, false)
  ctx.font = font(700, 46)
  const dayText = weekdayLong(event.starts_at)
  const midX = textX + dayW + 28
  // if the weekday would run into the time, drop the time onto its own row instead
  const sideBySide = midX + ctx.measureText(dayText).width + 30 < rightEdge - timeW
  const dateH = sideBySide ? 150 : 232

  ctx.font = font(500, 40)
  const whereLines = where ? wrap(ctx, where, textW - PIN, 2).lines : []
  const metaH = whereLines.length * 54 + 50

  // the title gets whatever height is left, shrinking (and finally shortening) if it has to
  const fixedH = dateH + 30 + 26 + metaH
  const avail = limitBottom - (heroBottom + minTop) - fixedH
  let titleLines = []
  let titleSize = 52
  for (const size of [80, 72, 64, 58, 52]) {
    wide(ctx, true)
    ctx.font = font(800, size)
    const maxLines = Math.max(1, Math.floor(avail / Math.round(size * 1.14)))
    const res = wrap(ctx, event.title, textW, maxLines)
    titleLines = res.lines
    titleSize = size
    if (!res.truncated) break
  }
  wide(ctx, false)
  const lineH = Math.round(titleSize * 1.14)
  const blockH = fixedH + titleLines.length * lineH
  const room = limitBottom - heroBottom - blockH
  const contentTop = heroBottom + Math.max(minTop, Math.round(room / 2))

  // ---- date and time ----
  let y = contentTop
  ctx.fillStyle = INK
  wide(ctx, true)
  ctx.font = font(800, 150)
  ctx.fillText(day, textX, y + 118)
  wide(ctx, false)

  ctx.font = font(700, 46)
  ctx.fillStyle = INK
  ctx.fillText(dayText, midX, y + 66)
  ctx.font = font(500, 38)
  ctx.fillStyle = SOFT
  ctx.fillText(monthYear(event.starts_at), midX, y + 116)

  ctx.fillStyle = INK
  wide(ctx, true)
  ctx.font = font(800, 62)
  if (sideBySide) {
    ctx.textAlign = 'right'
    ctx.fillText(time, rightEdge, y + 112)
    ctx.textAlign = 'left'
  } else {
    ctx.fillText(time, textX, y + 196)
  }
  wide(ctx, false)
  y += dateH

  // ---- title ----
  const titleTop = y + 30
  ctx.fillStyle = INK
  wide(ctx, true)
  ctx.font = font(800, titleSize)
  titleLines.forEach((l, i) => ctx.fillText(l, textX, titleTop + titleSize * 0.9 + i * lineH))
  wide(ctx, false)

  // ---- where and who ----
  let my = titleTop + titleLines.length * lineH + 26
  if (whereLines.length) {
    drawPin(ctx, textX + 2, my + 6, 32, INK)
    ctx.font = font(500, 40)
    ctx.fillStyle = INK
    whereLines.forEach((l, i) => ctx.fillText(l, textX + PIN, my + 38 + i * 54))
    my += whereLines.length * 54
  }
  ctx.font = font(500, 36)
  ctx.fillStyle = SOFT
  ctx.fillText(event.clubs ? 'Hosted by ' + host : host, textX, my + 40)

  // accent bar down the left, like the event rows on the site
  ctx.fillStyle = accent
  ctx.fillRect(barX, contentTop + 6, 12, my + 40 + 6 - contentTop)

  // ---- perforation with side notches ----
  ctx.save()
  ctx.strokeStyle = '#9AA59C'
  ctx.lineWidth = 4
  ctx.setLineDash([16, 14])
  ctx.beginPath()
  ctx.moveTo(tx + 52, perfY)
  ctx.lineTo(tx + tw - 52, perfY)
  ctx.stroke()
  ctx.restore()
  ctx.fillStyle = INK
  ctx.beginPath(); ctx.arc(tx, perfY, 34, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(tx + tw, perfY, 34, 0, Math.PI * 2); ctx.fill()

  // ---- stub ----
  const stubTop = perfY
  const stubH = ty + th - perfY
  const qrSize = 176
  const qrX = tx + tw - padX - qrSize
  const qrY = stubTop + (stubH - qrSize) / 2
  drawQr(ctx, siteUrl, qrX, qrY, qrSize)

  const markS = 52
  const mid = stubTop + stubH / 2
  drawMark(ctx, tx + padX, mid - 62, markS)
  ctx.fillStyle = INK
  wide(ctx, true)
  ctx.font = font(800, 40)
  ctx.fillText('Warangal Clubs', tx + padX + markS + 20, mid - 22)
  wide(ctx, false)
  ctx.font = font(500, 30)
  ctx.fillStyle = SOFT
  ctx.fillText('Clubs and events in Warangal', tx + padX, mid + 26)
  ctx.font = font(700, 32)
  ctx.fillStyle = INK
  let shownHost = siteUrl
  try { shownHost = new URL(siteUrl).host } catch { /* keep as is */ }
  ctx.fillText(shownHost, tx + padX, mid + 72)

  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error("The ticket image couldn't be made in this browser.")
  return blob
}
