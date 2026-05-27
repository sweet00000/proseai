const SKILL_COLORS = {
  'Clarity':        { fill: '#c084fc', glow: '#c084fc' },
  'Conciseness':    { fill: '#f472b6', glow: '#f472b6' },
  'Hooks':          { fill: '#fb7185', glow: '#fb7185' },
  'Tone':           { fill: '#fb923c', glow: '#fb923c' },
  'Structure':      { fill: '#fbbf24', glow: '#fbbf24' },
  'Word Precision': { fill: '#34d399', glow: '#34d399' },
}

const STONE_WIDTH  = 320
const STONE_H      = 130
const STONE_R      = 38     // radius of each stepping stone
const COL_LEFT     = 80
const COL_RIGHT    = 240

// Generate stone positions — alternating left/right, bottom→top
function stonePositions(count) {
  const height = count * STONE_H + 80
  return Array.from({ length: count }, (_, i) => ({
    x: i % 2 === 0 ? COL_LEFT : COL_RIGHT,
    y: height - 60 - i * STONE_H,
    index: i,
  }))
}

// SVG river path winding through stones
function riverPath(stones, height) {
  if (!stones.length) return ''
  let d = `M ${STONE_WIDTH / 2} ${height}`
  stones.forEach((s, i) => {
    const prev = stones[i - 1]
    if (!prev) {
      d += ` L ${s.x} ${s.y + 60}`
    } else {
      const cpX = (prev.x + s.x) / 2
      d += ` C ${prev.x} ${prev.y - 40}, ${s.x} ${s.y + 40}, ${s.x} ${s.y}`
    }
  })
  const last = stones[stones.length - 1]
  d += ` L ${last.x} 0`
  return d
}

function stoneEl(s, lesson, status, isActive) {
  const color = SKILL_COLORS[lesson.skill] ?? { fill: '#a78bfa', glow: '#a78bfa' }
  const completed = status === 'completed'
  const locked    = status === 'locked'
  const current   = status === 'current'

  const fillColor = locked ? '#d1d5db' : color.fill
  const opacity   = locked ? 0.5 : 1

  const pulseRing = current
    ? `<circle cx="${s.x}" cy="${s.y}" r="${STONE_R + 8}" fill="none"
         stroke="${color.fill}" stroke-width="2.5" opacity="0.5"
         class="pulse-ring"/>`
    : ''

  const glowFilter = !locked
    ? `<circle cx="${s.x}" cy="${s.y}" r="${STONE_R + 4}"
         fill="${color.glow}" opacity="0.18" filter="url(#blur)"/>`
    : ''

  const icon = completed
    ? `<text x="${s.x}" y="${s.y + 6}" text-anchor="middle" font-size="20">✓</text>`
    : locked
    ? `<text x="${s.x}" y="${s.y + 6}" text-anchor="middle" font-size="18">🔒</text>`
    : `<text x="${s.x}" y="${s.y + 6}" text-anchor="middle" font-size="18">${skillEmoji(lesson.skill)}</text>`

  const label = `<text x="${s.x}" y="${s.y + STONE_R + 18}"
    text-anchor="middle" font-size="11" font-weight="700"
    fill="${locked ? '#9ca3af' : '#1e1035'}" font-family="system-ui"
    opacity="${opacity}">${lesson.skill}</text>`

  const activeClass = isActive ? 'stone-active' : ''

  return `
    <g class="stone ${activeClass}" data-index="${s.index}" style="cursor:${locked ? 'default' : 'pointer'}">
      ${glowFilter}
      ${pulseRing}
      <circle cx="${s.x}" cy="${s.y}" r="${STONE_R}"
        fill="${fillColor}" opacity="${opacity}"
        stroke="white" stroke-width="2.5"
        filter="${!locked ? 'url(#shadow)' : 'none'}"/>
      ${icon}
      ${label}
    </g>`
}

function avatarEl(x, y) {
  // cute quill writer character
  return `
    <g class="avatar-character" transform="translate(${x}, ${y - 50})">
      <!-- body -->
      <ellipse cx="0" cy="8" rx="12" ry="14" fill="#1e1035"/>
      <!-- head -->
      <circle cx="0" cy="-10" r="12" fill="#1e1035"/>
      <!-- eyes -->
      <circle cx="-4" cy="-11" r="2.5" fill="white"/>
      <circle cx="4"  cy="-11" r="2.5" fill="white"/>
      <circle cx="-3.5" cy="-11" r="1.2" fill="#1e1035"/>
      <circle cx="4.5"  cy="-11" r="1.2" fill="#1e1035"/>
      <!-- smile -->
      <path d="M -4 -5 Q 0 -2 4 -5" stroke="white" fill="none" stroke-width="1.5" stroke-linecap="round"/>
      <!-- quill -->
      <path d="M 12 -8 Q 22 -20 28 -30 Q 20 -18 16 -4" fill="#fbbf24" stroke="#f59e0b" stroke-width="0.5"/>
      <line x1="16" y1="-4" x2="10" y2="4" stroke="#fbbf24" stroke-width="1.5"/>
    </g>`
}

function skillEmoji(skill) {
  const map = {
    'Clarity': '💡', 'Conciseness': '✂️', 'Hooks': '🎣',
    'Tone': '🎵', 'Structure': '🏗️', 'Word Precision': '🎯',
  }
  return map[skill] ?? '✍️'
}

export function renderRiver(container, lessons, completedIds, currentIndex) {
  const count   = lessons.length
  const stones  = stonePositions(count)
  const height  = count * STONE_H + 80
  const current = lessons[currentIndex]

  const svgContent = `
    <svg viewBox="0 0 ${STONE_WIDTH} ${height}" width="100%" xmlns="http://www.w3.org/2000/svg"
         style="display:block; max-width:360px; margin:0 auto;">
      <defs>
        <filter id="blur"><feGaussianBlur stdDeviation="8"/></filter>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity="0.2"/>
        </filter>
        <linearGradient id="river-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#93c5fd" stop-opacity="0.5"/>
          <stop offset="50%"  stop-color="#a5f3fc" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#93c5fd" stop-opacity="0.5"/>
        </linearGradient>
      </defs>

      <!-- river water band -->
      <path d="${riverPath(stones, height)}"
        stroke="url(#river-grad)" stroke-width="72" fill="none"
        stroke-linecap="round" opacity="0.55" class="river-path"/>

      <!-- ripple lines on river -->
      <path d="${riverPath(stones, height)}"
        stroke="white" stroke-width="2" fill="none"
        stroke-dasharray="12 24" opacity="0.35" class="river-ripple"/>

      <!-- stones -->
      ${stones.map((s, i) => {
        const lesson = lessons[i]
        const status = completedIds.includes(lesson.id)
          ? 'completed'
          : i === currentIndex
          ? 'current'
          : i > currentIndex && !completedIds.includes(lessons[i - 1]?.id) && i > currentIndex + 1
          ? 'locked'
          : 'next'
        return stoneEl(s, lesson, status, i === currentIndex)
      }).join('')}

      <!-- avatar on current stone -->
      ${stones[currentIndex] ? avatarEl(stones[currentIndex].x, stones[currentIndex].y) : ''}
    </svg>

    <style>
      .river-ripple { animation: ripple 3s linear infinite; }
      @keyframes ripple { to { stroke-dashoffset: -72; } }

      .pulse-ring { animation: pulse-ring 2s ease-out infinite; }
      @keyframes pulse-ring {
        0%   { r: ${STONE_R + 4}; opacity: 0.6; }
        100% { r: ${STONE_R + 20}; opacity: 0; }
      }

      .avatar-character { animation: avatar-bob 2s ease-in-out infinite; transform-origin: center; }
      @keyframes avatar-bob {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-5px); }
      }

      .stone:hover:not([style*="default"]) { filter: brightness(1.08); }
    </style>`

  container.innerHTML = svgContent

  // click handler — stones call back with lesson index
  container.querySelectorAll('.stone').forEach(el => {
    el.addEventListener('click', () => {
      const i = parseInt(el.dataset.index)
      const lesson = lessons[i]
      if (!lesson) return
      container.dispatchEvent(new CustomEvent('stone-click', { detail: { index: i, lesson } }))
    })
  })
}
