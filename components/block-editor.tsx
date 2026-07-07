'use client'
import { useCallback } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import type { PartialBlock, Block } from '@blocknote/core'
import '@blocknote/mantine/style.css'

interface BlockEditorProps {
  /** Initial content — can be JSON blocks array or plain text string */
  initialContent?: unknown
  onChange: (blocks: unknown, plaintext: string) => void
  placeholder?: string
  className?: string
}

function parseContent(content: unknown): PartialBlock[] | undefined {
  try {
    if (Array.isArray(content) && content.length > 0) {
      return content as PartialBlock[]
    }
    if (typeof content === 'string' && content.trim()) {
      // Try to parse as JSON blocks first
      if (content.trimStart().startsWith('[')) {
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed as PartialBlock[]
      }
      // Legacy plain text: wrap in paragraph block
      return [{ type: 'paragraph', content: [{ type: 'text', text: content, styles: {} }] }] as PartialBlock[]
    }
  } catch {}
  return undefined
}

function blocksToPlaintext(blocks: Block[]): string {
  return blocks
    .map(block => {
      if (Array.isArray(block.content)) {
        return block.content
          .map((item: { type?: string; text?: string }) => item.text ?? '')
          .join('')
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')
}

const THEME_CONFIG = {
  colors: {
    editor: { text: '#E8DFCE', background: 'transparent' },
    menu: { text: '#E8DFCE', background: '#201A14' },
    tooltip: { text: '#E8DFCE', background: '#272018' },
    hovered: { text: '#E8DFCE', background: '#272018' },
    selected: { text: '#E8DFCE', background: '#2B221A' },
    disabled: { text: '#7A6F55', background: '#1A1510' },
    shadow: 'rgba(0,0,0,0.5)',
    border: 'rgba(167,155,120,0.18)',
    sideMenu: '#5C5340',
    highlights: {
      gray: { text: '#7A6F55', background: 'rgba(122,111,85,0.15)' },
      brown: { text: '#A0856C', background: 'rgba(160,133,108,0.15)' },
      red: { text: '#C0452E', background: 'rgba(192,69,46,0.15)' },
      orange: { text: '#C96F2E', background: 'rgba(201,111,46,0.15)' },
      yellow: { text: '#C9962E', background: 'rgba(201,150,46,0.15)' },
      green: { text: '#7D9B5E', background: 'rgba(125,155,94,0.15)' },
      blue: { text: '#5F7A72', background: 'rgba(95,122,114,0.15)' },
      purple: { text: '#9B6B4F', background: 'rgba(155,107,79,0.15)' },
      pink: { text: '#B0584A', background: 'rgba(176,88,74,0.15)' },
    },
  },
  borderRadius: 0,
  fontFamily: 'inherit',
}

const DARK_THEME = { dark: THEME_CONFIG, light: THEME_CONFIG }

export function BlockEditor({ initialContent, onChange, className }: BlockEditorProps) {
  const initialBlocks = parseContent(initialContent)
  const editor = useCreateBlockNote({ initialContent: initialBlocks })

  const handleChange = useCallback(() => {
    const blocks = editor.document
    const plaintext = blocksToPlaintext(blocks)
    onChange(blocks, plaintext)
  }, [editor, onChange])

  return (
    <div className={className} data-blocknote="true">
      <BlockNoteView
        editor={editor}
        theme={DARK_THEME}
        onChange={handleChange}
      />
    </div>
  )
}
