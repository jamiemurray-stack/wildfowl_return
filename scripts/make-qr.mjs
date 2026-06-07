#!/usr/bin/env node
/*
 * Generate offline QR assets for the Bag Return app.
 *
 *   npm run qr -- https://your-site.vercel.app
 *
 * Outputs (in ./qr):
 *   qr.svg      vector QR, scales to any size
 *   qr.png      1024px raster for slides / messaging
 *   poster.svg  printable A4 "Scan to log your bag return" poster
 */
import QRCode from 'qrcode'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const url = process.argv[2] || process.env.QR_URL
if (!url) {
  console.error('Usage: npm run qr -- <url>')
  process.exit(1)
}

const ECC = 'M' // error correction: tolerates ~15% damage, good for print
const OUT = new URL('../qr/', import.meta.url)
await mkdir(OUT, { recursive: true })

// 1) Plain vector QR (its own quiet zone)
const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: ECC, margin: 4 })
await writeFile(new URL('qr.svg', OUT), svg)

// 2) PNG for slides / messaging
await QRCode.toFile(fileURLToPath(new URL('qr.png', OUT)), url, {
  errorCorrectionLevel: ECC,
  margin: 4,
  width: 1024,
})

// 3) Printable A4 poster (fully self-contained vector)
const qr = QRCode.create(url, { errorCorrectionLevel: ECC })
const n = qr.modules.size
const bits = qr.modules.data
let path = ''
for (let r = 0; r < n; r++) {
  for (let c = 0; c < n; c++) {
    if (bits[r * n + c]) path += `M${c} ${r}h1v1h-1z`
  }
}

const W = 595
const H = 842 // A4 @ 72dpi (pt)
const quiet = 4
const total = n + quiet * 2
const box = 340
const scale = box / total
const qrX = (W - box) / 2
const qrY = 300
const green = '#2e6b4f'
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const poster = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <rect x="0" y="0" width="${W}" height="10" fill="${green}"/>
  <text x="${W / 2}" y="120" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" fill="${green}">Grange &amp; District Wildfowlers</text>
  <text x="${W / 2}" y="156" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="18" fill="#1b241f">Bag Return — 25/26 Season</text>
  <text x="${W / 2}" y="232" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="26" font-weight="700" fill="#1b241f">Scan to log your bag return</text>
  <rect x="${qrX - 16}" y="${qrY - 16}" width="${box + 32}" height="${box + 32}" rx="14" fill="#ffffff" stroke="#e3e8e2" stroke-width="2"/>
  <rect x="${qrX}" y="${qrY}" width="${box}" height="${box}" fill="#ffffff"/>
  <g transform="translate(${qrX + quiet * scale} ${qrY + quiet * scale}) scale(${scale})">
    <path d="${path}" fill="#000000"/>
  </g>
  <text x="${W / 2}" y="${qrY + box + 70}" text-anchor="middle" font-family="Menlo, Consolas, monospace" font-size="16" fill="${green}">${esc(url)}</text>
  <text x="${W / 2}" y="${H - 96}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="15" fill="#6c7a72">Submit a return · Report an issue · View the season report</text>
  <text x="${W / 2}" y="${H - 64}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="13" fill="#9aa7a0">Point your phone camera at the code, then tap the link.</text>
</svg>
`
await writeFile(new URL('poster.svg', OUT), poster)

console.log(`Wrote qr/qr.svg, qr/qr.png, qr/poster.svg for ${url}`)
