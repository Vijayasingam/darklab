// ANSI escape code parser for job log output
// Converts ANSI color/style codes to styled spans

interface Segment {
  text: string
  className: string
}

const ANSI_COLOR_MAP: Record<number, string> = {
  30: 'ansi-black',
  31: 'ansi-red',
  32: 'ansi-green',
  33: 'ansi-yellow',
  34: 'ansi-blue',
  35: 'ansi-magenta',
  36: 'ansi-cyan',
  37: 'ansi-white',
  90: 'ansi-bright-black',
  91: 'ansi-bright-red',
  92: 'ansi-bright-green',
  93: 'ansi-bright-yellow',
  94: 'ansi-bright-blue',
  95: 'ansi-bright-magenta',
  96: 'ansi-bright-cyan',
  97: 'ansi-bright-white',
  // Background
  40: 'ansi-bg-black',
  41: 'ansi-bg-red',
  42: 'ansi-bg-green',
  43: 'ansi-bg-yellow',
  44: 'ansi-bg-blue',
  45: 'ansi-bg-magenta',
  46: 'ansi-bg-cyan',
  47: 'ansi-bg-white'
}

const ANSI_STYLE_MAP: Record<number, string> = {
  1: 'ansi-bold',
  2: 'ansi-dim',
  3: 'ansi-italic',
  4: 'ansi-underline',
  9: 'ansi-strikethrough'
}

const ANSI_ESCAPE = /\x1b\[([0-9;]*)m/g

export function parseAnsi(text: string): Segment[] {
  const segments: Segment[] = []
  let lastIndex = 0
  let currentClasses: string[] = []

  let match: RegExpExecArray | null
  ANSI_ESCAPE.lastIndex = 0

  while ((match = ANSI_ESCAPE.exec(text)) !== null) {
    // Push text before this escape
    if (match.index > lastIndex) {
      segments.push({
        text: text.slice(lastIndex, match.index),
        className: currentClasses.join(' ')
      })
    }

    // Parse codes
    const codes = match[1].split(';').map(Number)
    for (const code of codes) {
      if (code === 0 || match[1] === '') {
        currentClasses = []
      } else if (ANSI_COLOR_MAP[code]) {
        // Remove existing color classes, add new one
        currentClasses = currentClasses.filter((c) => !c.startsWith('ansi-') || c.startsWith('ansi-bg-') || c.startsWith('ansi-bold') || c.startsWith('ansi-dim') || c.startsWith('ansi-italic') || c.startsWith('ansi-underline') || c.startsWith('ansi-strike'))
        currentClasses.push(ANSI_COLOR_MAP[code])
      } else if (ANSI_STYLE_MAP[code]) {
        if (!currentClasses.includes(ANSI_STYLE_MAP[code])) {
          currentClasses.push(ANSI_STYLE_MAP[code])
        }
      }
    }

    lastIndex = ANSI_ESCAPE.lastIndex
  }

  // Push remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), className: currentClasses.join(' ') })
  }

  return segments
}

export function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE, '')
}
