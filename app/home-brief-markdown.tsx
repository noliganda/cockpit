'use client'
import ReactMarkdown from 'react-markdown'

/** Markdown renderer for the Home brief card — same treatment as /brief. */
export function BriefMarkdown({ content }: { content: string }) {
  return (
    <div className="text-[#C9BEA3] text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="text-[#E8DFCE] font-semibold">{children}</strong>,
          ul: ({ children }) => <ul className="my-2 space-y-1">{children}</ul>,
          li: ({ children }) => (
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-[#7A6F55] shrink-0" />
              <span>{children}</span>
            </li>
          ),
          em: ({ children }) => <em className="text-[#A79B78] not-italic">{children}</em>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
