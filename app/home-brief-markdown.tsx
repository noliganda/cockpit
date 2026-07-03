'use client'
import ReactMarkdown from 'react-markdown'

/** Markdown renderer for the Home brief card — same treatment as /brief. */
export function BriefMarkdown({ content }: { content: string }) {
  return (
    <div className="text-[#D1D5DB] text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="text-[#F5F5F5] font-semibold">{children}</strong>,
          ul: ({ children }) => <ul className="my-2 space-y-1">{children}</ul>,
          li: ({ children }) => (
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-[#6B7280] shrink-0" />
              <span>{children}</span>
            </li>
          ),
          em: ({ children }) => <em className="text-[#9CA3AF] not-italic">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
