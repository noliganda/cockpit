'use client'
import { useCallback, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import type { PartialBlock, Block } from '@blocknote/core'
import '@blocknote/mantine/style.css'
import type { Note } from '@/types'

interface NoteEditorProps {
  note: Note
  onSave: (content: unknown, plaintext: string) => void
}

function parseInitialContent(content: unknown): PartialBlock[] | undefined {
  try {
    if (Array.isArray(content) && content.length > 0) {
      return content as PartialBlock[]
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

// Both light and dark keys are required by BlockNote theme type
const THEME_CONFIG = {
  colors: {
    editor: { text: '#F5F5F5', background: 'transparent' },
    menu: { text: '#F5F5F5', background: '#1A1A1A' },
    tooltip: { text: '#F5F5F5', background: '#222222' },
    hovered: { text: '#F5F5F5', background: '#222222' },
    selected: { text: '#F5F5F5', background: '#2A2A2A' },
    disabled: { text: '#6B7280', background: '#141414' },
    shadow: 'rgba(0,0,0,0.5)',
    border: 'rgba(255,255,255,0.08)',
    sideMenu: '#4B5563',
    highlights: {
      gray: { text: '#6B7280', background: 'rgba(107,114,128,0.15)' },
      brown: { text: '#A0856C', background: 'rgba(160,133,108,0.15)' },
      red: { text: '#EF4444', background: 'rgba(239,68,68,0.15)' },
      orange: { text: '#F97316', background: 'rgba(249,115,22,0.15)' },
      yellow: { text: '#F59E0B', background: 'rgba(245,158,11,0.15)' },
      green: { text: '#22C55E', background: 'rgba(34,197,94,0.15)' },
      blue: { text: '#3B82F6', background: 'rgba(59,130,246,0.15)' },
      purple: { text: '#A855F7', background: 'rgba(168,85,247,0.15)' },
      pink: { text: '#EC4899', background: 'rgba(236,72,153,0.15)' },
    },
  },
  borderRadius: 6,
  fontFamily: 'inherit',
}

const DARK_THEME = { dark: THEME_CONFIG, light: THEME_CONFIG }

export function NoteEditor({ note, onSave }: NoteEditorProps) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const initialContent = parseInitialContent(note.content)

  const editor = useCreateBlockNote({
    initialContent,
  })

  const handleChange = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const blocks = editor.document
      const plaintext = blocksToPlaintext(blocks)
      onSave(blocks, plaintext)
    }, 1000)
  }, [editor, onSave])

  return (
    <div className="px-2 py-2 min-h-full">
      <BlockNoteView
        editor={editor}
        theme={DARK_THEME}
        onChange={handleChange}
      />
    </div>
  )
}
