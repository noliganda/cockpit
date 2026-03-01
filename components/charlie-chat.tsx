'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, Mic, ImagePlus, ChevronDown, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/hooks/use-workspace'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  images?: string[]
  timestamp: Date
}

const WS_URL = process.env.NEXT_PUBLIC_OPENCLAW_WS_URL ?? 'ws://localhost:18789'

export function CharlieChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [sending, setSending] = useState(false)
  const [listening, setListening] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [cameraOpen, setCameraOpen] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { workspace } = useWorkspace()

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // WebSocket connection
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onopen = () => setWsConnected(true)
      ws.onclose = () => { setWsConnected(false); wsRef.current = null }
      ws.onerror = () => { setWsConnected(false); wsRef.current = null }
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as { type?: string; content?: string; text?: string }
          const content = data.content ?? data.text ?? String(event.data)
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content,
            timestamp: new Date(),
          }])
        } catch {
          setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: String(event.data),
            timestamp: new Date(),
          }])
        }
        setSending(false)
      }
    } catch { setWsConnected(false) }
  }, [])

  useEffect(() => {
    if (open) connect()
  }, [open, connect])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  async function sendMessage() {
    if (!input.trim() && images.length === 0) return
    const msg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      images: images.length > 0 ? [...images] : undefined,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, msg])
    setInput('')
    setImages([])
    setSending(true)

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat.send',
        content: input,
        images: msg.images,
        context: { workspace: workspace.id, url: typeof window !== 'undefined' ? window.location.pathname : '/' },
      }))
    } else {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Charlie is offline (OpenClaw Gateway not connected at ${WS_URL}).`,
          timestamp: new Date(),
        }])
        setSending(false)
      }, 500)
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (ev.target?.result) setImages(prev => [...prev, ev.target!.result as string])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items)
    items.forEach(item => {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (ev) => {
            if (ev.target?.result) setImages(prev => [...prev, ev.target!.result as string])
          }
          reader.readAsDataURL(file)
        }
      }
    })
  }

  function startVoice() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    const SpeechRecognitionAPI = win.webkitSpeechRecognition ?? win.SpeechRecognition
    if (!SpeechRecognitionAPI) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SpeechRecognitionAPI() as any
    recognition.lang = 'en-AU'
    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript as string
      setInput((prev: string) => prev ? `${prev} ${transcript}` : transcript)
    }
    recognition.start()
  }

  async function openCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setCameraOpen(true)
      // Attach stream to video element after state update
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
      }, 100)
    } catch {
      // Camera permission denied or unavailable
    }
  }

  function captureFrame() {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 640
    canvas.height = videoRef.current.videoHeight || 480
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.85)
    setImages(prev => [...prev, base64])
    closeCamera()
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOpen(false)
  }

  function formatTime(d: Date) {
    return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg"
        style={{ backgroundColor: workspace.color }}
        aria-label="Open chat"
      >
        {open ? <ChevronDown className="w-5 h-5 text-white" /> : <MessageSquare className="w-5 h-5 text-white" />}
      </button>

      {/* Camera viewfinder overlay */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <div className="relative w-full max-w-sm">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} className="w-full rounded-[12px]" playsInline autoPlay muted />
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-6">
              <button
                onClick={closeCamera}
                className="w-12 h-12 rounded-full bg-[rgba(255,255,255,0.2)] flex items-center justify-center text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <button
                onClick={captureFrame}
                className="w-16 h-16 rounded-full border-4 border-white bg-white/20 flex items-center justify-center"
                aria-label="Capture photo"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat panel */}
      {open && (
        <div className={cn(
          'fixed z-40 flex flex-col bg-[#141414] border border-[rgba(255,255,255,0.10)] overflow-hidden',
          isMobile
            ? 'inset-0 rounded-none'
            : 'bottom-20 right-6 w-80 h-[520px] rounded-[12px]'
        )}>
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)] shrink-0"
            style={{ borderTop: `2px solid ${workspace.color}` }}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: wsConnected ? '#22C55E' : '#6B7280' }} />
              <span className="text-sm font-semibold text-[#F5F5F5]">Charlie</span>
              <span className="text-xs text-[#4B5563]">{wsConnected ? 'connected' : 'offline'}</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center pt-8">
                <p className="text-sm text-[#4B5563]">Send a message to Charlie</p>
                <p className="text-xs text-[#4B5563] mt-1">Context: {workspace.name}</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-[8px] px-3 py-2',
                    msg.role === 'user'
                      ? 'text-white text-sm'
                      : 'bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] text-sm'
                  )}
                  style={msg.role === 'user' ? { backgroundColor: workspace.color } : undefined}
                >
                  {msg.images?.map((img, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={img} alt="attached" className="rounded mb-1 max-h-32 object-contain" />
                  ))}
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs opacity-50 mt-0.5">{formatTime(msg.timestamp)}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] rounded-[8px] px-3 py-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-[#6B7280] animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="flex gap-2 px-3 py-2 border-t border-[rgba(255,255,255,0.06)] shrink-0">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="w-12 h-12 rounded object-cover" />
                  <button
                    onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] flex items-center justify-center text-white"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 border-t border-[rgba(255,255,255,0.06)] shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage() } }}
              onPaste={handlePaste}
              placeholder="Message Charlie…"
              className="flex-1 bg-[#0A0A0A] border border-[rgba(255,255,255,0.06)] rounded-[6px] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#4B5563] outline-none focus:border-[rgba(255,255,255,0.16)]"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 flex items-center justify-center rounded text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
              title="Upload image"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => void openCamera()}
              className="w-8 h-8 flex items-center justify-center rounded text-[#6B7280] hover:text-[#F5F5F5] transition-colors"
              title="Camera"
            >
              <Camera className="w-4 h-4" />
            </button>
            <button
              onClick={startVoice}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded transition-colors',
                listening ? 'text-[#EF4444]' : 'text-[#6B7280] hover:text-[#F5F5F5]'
              )}
              title="Voice input"
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={() => void sendMessage()}
              disabled={(!input.trim() && images.length === 0) || sending}
              className="w-8 h-8 flex items-center justify-center rounded disabled:opacity-40 transition-colors"
              style={{ color: workspace.color }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
