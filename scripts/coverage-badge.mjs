import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const [summaryPath, outputPath, label = 'coverage'] = process.argv.slice(2)

if (!summaryPath || !outputPath) {
  console.error('Usage: node scripts/coverage-badge.mjs <coverage-summary.json> <output.svg> [label]')
  process.exit(1)
}

const summary = JSON.parse(await readFile(summaryPath, 'utf8'))
const pct = Number(summary.total?.lines?.pct ?? 0)
const value = `${pct.toFixed(1)}%`
const color = pct >= 90 ? '#16a34a' : pct >= 75 ? '#65a30d' : pct >= 60 ? '#d97706' : '#dc2626'
const labelWidth = Math.max(94, label.length * 7 + 18)
const valueWidth = 58
const width = labelWidth + valueWidth

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${label}: ${value}">
  <title>${label}: ${value}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".7"/>
    <stop offset=".1" stop-opacity=".1"/>
    <stop offset=".9" stop-opacity=".3"/>
    <stop offset="1" stop-opacity=".5"/>
  </linearGradient>
  <clipPath id="r"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${width}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${label}</text>
    <text x="${labelWidth / 2}" y="14">${label}</text>
    <text x="${labelWidth + valueWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${value}</text>
    <text x="${labelWidth + valueWidth / 2}" y="14">${value}</text>
  </g>
</svg>
`

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, svg)
console.log(`Wrote ${outputPath}`)
