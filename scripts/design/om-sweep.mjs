#!/usr/bin/env node
/**
 * OM design-system sweep — applies the token map from
 * docs/journal/2026-07-07-ui-refresh-om-alignment-SPEC.md
 * across app/, components/, hooks/, lib/, types/.
 *
 * Deterministic hex→hex (works in className, inline style, SVG attrs,
 * recharts config). Reports unmapped colors left behind.
 *
 * Usage: node scripts/design/om-sweep.mjs [--dry]
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join, extname } from 'path'

const DRY = process.argv.includes('--dry')
const ROOTS = ['app', 'components', 'hooks', 'lib', 'types']
const EXTS = new Set(['.tsx', '.ts'])

// ---------- The token map (old hex → new hex, case-insensitive) ----------
const HEX_MAP = {
  '0F0F0F': '1A1410', // base → walnut
  '141414': '211913', // surface-1
  '1A1A1A': '281E16', // surface-2
  '222222': '2F241A', // surface-3
  '0A0A0A': '140F0B', // inset
  'F5F5F5': 'E8DFCE', // text primary → fg-strong
  'A0A0A0': 'A79B78', // text secondary → Field Beige
  '6B7280': '7A6F55', // text tertiary
  '4B5563': '5C5340', // text muted
  '374151': '4A4234', // text faint
  'E5E7EB': 'E8DFCE', // stray light gray
  'D4A017': 'C99A1F', // BF gold
  '008080': '3E7A70', // KORUS teal, warmed
  'F97316': 'C96F2E', // Personal terracotta
  '22C55E': '7D9B5E', // success
  'F59E0B': 'C9962E', // warning
  'EF4444': 'C0452E', // danger
  '3B82F6': '5F7A72', // info — the brand has no blue
  '60A5FA': '6E8B7E', // info light
  '8B5CF6': '9B6B4F', // purple → sienna
  'A855F7': '9B6B4F', // purple → sienna
  'EC4899': 'B0584A', // pink → clay
  '14B8A6': '4A8578', // agent teal
  '2A9D8F': '3E7A70', // chart teal → KORUS
  'F4A261': 'C98A54', // chart amber
  'E63946': 'B54334', // chart red
  // Long tail from census
  '9CA3AF': 'A79B78', // gray-400
  'D1D5DB': 'C9BEA3', // gray-300 → light beige
  'E5E5E5': 'E8DFCE',
  '34D399': '8FAF6E', // emerald-400 → success light
  '10B981': '7D9B5E', // emerald
  'A78BFA': 'AD7B5C', // violet-300 → sienna light
  'F472B6': 'B0584A', // pink-400 → clay
  '457B9D': '5F7A72', // steel blue
  '93C5FD': '6E8B7E', // blue-300
  '4A90E2': '5F7A72', // blue
  '74B0F4': '6E8B7E', // blue light
  '06B6D4': '4A8578', // cyan
  'EAB308': 'C9962E', // yellow
  'E9C46A': 'C9A94F', // chart sand
  '2A2A2A': '332820', // hover surface
  '1F1F1F': '2C2218',
  '1E1E1E': '281E16',
  '121212': '1A1410',
}

// 3-digit hexes get their own word-bounded pass
const SHORT_HEX_MAP = {
  'FFF': 'E8DFCE',
  '111': '140F0B',
  '222': '2F241A',
}

// Named Tailwind classes → OM equivalents. Longest/most-specific first.
const CLASS_MAP = [
  ['bg-black/60', 'bg-[rgba(15,11,8,0.7)]'],
  ['bg-white/20', 'bg-[rgba(232,223,206,0.2)]'],
  ['text-gray-400', 'text-[#A79B78]'],
  ['text-white', 'text-[#E8DFCE]'],
  ['bg-white', 'bg-[#E8DFCE]'],
  ['text-black', 'text-[#1A1410]'],
  ['border-white', 'border-[#E8DFCE]'],
  ['bg-black', 'bg-[#140F0B]'],
]

const hexToRgbTriplet = hex => {
  const n = parseInt(hex, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const files = []
const walk = dir => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name.startsWith('.')) continue
      walk(p)
    } else if (EXTS.has(extname(name))) {
      files.push(p)
    }
  }
}
ROOTS.forEach(r => walk(r))

let totalRepl = 0
let touched = 0

for (const file of files) {
  const before = readFileSync(file, 'utf8')
  let s = before

  // 1. White-alpha borders: rgba(255,255,255,a) → rgba(167,155,120, a*2.2 cap 0.9)
  s = s.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*(0?\.\d+|[01](?:\.\d+)?)\s*\)/g, (_, a) => {
    const na = Math.min(0.9, Math.round(parseFloat(a) * 2.2 * 100) / 100)
    return `rgba(167,155,120,${na})`
  })

  // 2. rgb triplets of mapped hexes (e.g. rgba(212, 160, 23, 0.1) gold tints)
  for (const [oldHex, newHex] of Object.entries(HEX_MAP)) {
    const [or, og, ob] = hexToRgbTriplet(oldHex)
    const [nr, ng, nb] = hexToRgbTriplet(newHex)
    s = s.replace(
      new RegExp(`(rgba?\\()\\s*${or}\\s*,\\s*${og}\\s*,\\s*${ob}\\b`, 'g'),
      `$1${nr},${ng},${nb}`
    )
  }

  // 3. Hex literals, case-insensitive
  for (const [oldHex, newHex] of Object.entries(HEX_MAP)) {
    s = s.replace(new RegExp(`#${oldHex}\\b`, 'gi'), `#${newHex}`)
  }
  for (const [oldHex, newHex] of Object.entries(SHORT_HEX_MAP)) {
    s = s.replace(new RegExp(`#${oldHex}\\b`, 'gi'), `#${newHex}`)
  }

  // 4. Named Tailwind color classes (word-bounded so text-white
  //    doesn't eat text-white/80 — variants handled explicitly above)
  for (const [oldCls, newCls] of CLASS_MAP) {
    s = s.replace(
      new RegExp(oldCls.replace(/[/[\]]/g, '\\$&') + String.raw`(?![\w/-])`, 'g'),
      newCls
    )
  }

  if (s !== before) {
    touched++
    const n = before.length === s.length ? '~' : Math.abs(s.length - before.length)
    totalRepl += 1
    if (!DRY) writeFileSync(file, s)
    console.log(`${DRY ? '[dry] ' : ''}updated ${file} (${n} bytes delta)`)
  }
}

console.log(`\n${touched}/${files.length} files updated`)

// ---------- Leftover census: anything colorful we didn't map ----------
const leftover = new Map()
const KNOWN_NEW = new Set(
  Object.values(HEX_MAP).concat([
    '1A1410', '211913', '281E16', '2F241A', '140F0B',
    'E8DFCE', 'A79B78', '7A6F55', '5C5340', '4A4234',
    '8B3A23', 'A04A30',
  ].map(h => h.toUpperCase()))
)
for (const file of files) {
  const s = readFileSync(file, 'utf8')
  for (const m of s.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    const hex = m[1].toUpperCase()
    if (!KNOWN_NEW.has(hex)) leftover.set(hex, (leftover.get(hex) || 0) + 1)
  }
  for (const m of s.matchAll(/rgba?\(\s*255\s*,\s*255\s*,\s*255/g)) {
    leftover.set('rgba(255,255,255,…)', (leftover.get('rgba(255,255,255,…)') || 0) + 1)
  }
}
if (leftover.size) {
  console.log('\nUnmapped colors remaining (manual review):')
  ;[...leftover.entries()].sort((a, b) => b[1] - a[1])
    .forEach(([hex, n]) => console.log(`  ${String(n).padStart(4)}  ${hex}`))
} else {
  console.log('\nNo unmapped colors remain.')
}
