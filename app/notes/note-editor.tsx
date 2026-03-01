'use client'
import { useState, useRef } from 'react'
import type { Note } from '@/types'

interface NoteEditorProps {
  note: Note
  onSave: (content: unknown, plaintext: string) => void
}

export function NoteEditor({ note, onSave }: NoteEditorProps) {
  const [content, setContent] = useState(
    typeof note.contentPlaintext === 'string' ? note.contentPlaintext : ''
  )
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  function handleChange(value: string) {
    setContent(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      onSave({ blocks: [{ type: 'paragraph', text: value }] }, value)
    }, 1000)
  }

  return (
    <div className="px-6 py-4 min-h-full">
      <textarea
        value={content}
        onChange={e => handleChange(e.target.value)}
        placeholder="Start writing…"
        className="w-full min-h-96 bg-transparent text-[#F5F5F5] text-sm leading-relaxed outline-none resize-none placeholder-[#4B5563]"
      />
    </div>
  )
}
