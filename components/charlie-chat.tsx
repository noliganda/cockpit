'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Send, Mic, MicOff, Camera, Image as ImageIcon,
  Minimize2, Wifi, WifiOff,
} from 'lucide-react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
};

const WS_URL = 'ws://localhost:18789';
const CHAT_STATE_KEY = 'charlie-chat-open';

export function CharlieChat() {
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [sending, setSending] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Restore open state
  useEffect(() => {
    const stored = localStorage.getItem(CHAT_STATE_KEY);
    if (stored === 'true') setOpen(true);
  }, []);

  useEffect(() => {
    localStorage.setItem(CHAT_STATE_KEY, String(open));
  }, [open]);

  // WebSocket connection
  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Request history
        ws.send(JSON.stringify({ type: 'chat.history' }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'chat.message' || msg.type === 'chat.response') {
            setMessages((prev) => [...prev, {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: msg.content ?? msg.message ?? '',
              timestamp: new Date(msg.timestamp ?? Date.now()),
            }]);
            setSending(false);
          } else if (msg.type === 'chat.history' && Array.isArray(msg.messages)) {
            setMessages(msg.messages.map((m: { role: string; content: string; timestamp?: string }) => ({
              id: crypto.randomUUID(),
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: new Date(m.timestamp ?? Date.now()),
            })));
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onerror = () => setConnected(false);
      ws.onclose = () => {
        setConnected(false);
        // Retry after 5s
        setTimeout(connectWs, 5000);
      };
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    if (open) connectWs();
    return () => {
      wsRef.current?.close();
    };
  }, [open, connectWs]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function sendMessage(content: string, imageUrl?: string) {
    if (!content.trim() && !imageUrl) return;

    const msg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
      imageUrl,
    };
    setMessages((prev) => [...prev, msg]);
    setInput('');
    setSending(true);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat.send',
        content,
        image: imageUrl,
        timestamp: new Date().toISOString(),
        context: { page: window.location.pathname },
      }));
    } else {
      // Offline fallback after brief delay
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: "Charlie is offline — use Telegram to reach me.",
          timestamp: new Date(),
        }]);
        setSending(false);
      }, 500);
    }
  }

  function handleSend() {
    sendMessage(input.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleImageUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      sendMessage('[Image attached]', base64);
    };
    reader.readAsDataURL(file);
  }

  function toggleVoice() {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    const recognition = new SR();
    recognition.lang = 'en-AU';
    recognition.continuous = false;
    recognition.interimResults = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev: string) => prev + transcript);
    };
    recognition.onend = () => setRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setRecording(true);
  }

  async function captureCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setShowCamera(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      alert('Camera access denied or unavailable.');
    }
  }

  function takePicture() {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const stream = videoRef.current.srcObject as MediaStream;
    stream?.getTracks().forEach((t) => t.stop());
    setShowCamera(false);
    sendMessage('[Camera photo attached]', dataUrl);
  }

  const isOffline = !connected;

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
          e.target.value = '';
        }}
      />

      {/* Floating bubble */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110"
            style={{ backgroundColor: '#008080' }}
          >
            <MessageCircle className="h-6 w-6 text-white" />
            <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0F0F0F]"
              style={{ backgroundColor: connected ? '#22C55E' : '#6B7280' }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border border-[#2A2A2A] shadow-2xl overflow-hidden"
            style={{
              width: 'min(400px, calc(100vw - 2rem))',
              height: 'min(600px, calc(100vh - 6rem))',
              backgroundColor: '#0F0F0F',
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#2A2A2A] bg-[#1A1A1A]">
              <div className="relative">
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: '#008080' }}>
                  C
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#1A1A1A]"
                  style={{ backgroundColor: connected ? '#22C55E' : '#6B7280' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">Charlie</p>
                <div className="flex items-center gap-1 text-[10px]">
                  {connected ? (
                    <><Wifi className="h-2.5 w-2.5 text-[#22C55E]" /><span className="text-[#22C55E]">Connected</span></>
                  ) : (
                    <><WifiOff className="h-2.5 w-2.5 text-[#6B7280]" /><span className="text-[#6B7280]">Offline</span></>
                  )}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-white hover:bg-[#2A2A2A] transition-colors"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => { setOpen(false); setMessages([]); }}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-white hover:bg-[#2A2A2A] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Offline banner */}
            {isOffline && (
              <div className="px-4 py-2 text-xs text-center" style={{ backgroundColor: '#1A1A1A', color: '#6B7280' }}>
                Charlie is offline — use Telegram to reach me
              </div>
            )}

            {/* Camera preview */}
            {showCamera && (
              <div className="relative bg-black">
                <video ref={videoRef} className="w-full h-32 object-cover" muted />
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                  <button
                    onClick={takePicture}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                    style={{ backgroundColor: '#008080' }}
                  >
                    Capture
                  </button>
                  <button
                    onClick={() => {
                      const stream = videoRef.current?.srcObject as MediaStream;
                      stream?.getTracks().forEach((t) => t.stop());
                      setShowCamera(false);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-[#2A2A2A]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: '#008080' }}>C</div>
                  <p className="text-sm text-white font-medium">Hi, I&apos;m Charlie</p>
                  <p className="text-xs text-[#6B7280]">Your AI ops assistant. Ask me anything about your workspace.</p>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[80%] rounded-2xl px-3 py-2 text-sm"
                    style={
                      msg.role === 'user'
                        ? { backgroundColor: '#008080', color: '#fff', borderBottomRightRadius: 4 }
                        : { backgroundColor: '#1A1A1A', color: '#fff', border: '1px solid #2A2A2A', borderBottomLeftRadius: 4 }
                    }
                  >
                    {msg.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={msg.imageUrl} alt="attached" className="rounded-lg mb-2 max-h-32 w-auto" />
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className="text-[10px] mt-1 opacity-60">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A]">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                          className="h-2 w-2 rounded-full bg-[#6B7280]"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 border-t border-[#2A2A2A] bg-[#0F0F0F]">
              <div className="flex items-end gap-2 rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message Charlie…"
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-[#6B7280] outline-none resize-none max-h-24"
                  style={{ lineHeight: '1.5' }}
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-white hover:bg-[#2A2A2A] transition-colors"
                    title="Upload image"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={captureCamera}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-white hover:bg-[#2A2A2A] transition-colors"
                    title="Camera"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <button
                    onClick={toggleVoice}
                    className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors"
                    style={recording ? { backgroundColor: '#EF444422', color: '#EF4444' } : { color: '#6B7280' }}
                    title={recording ? 'Stop recording' : 'Voice input'}
                  >
                    {recording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                    style={{ backgroundColor: '#008080', color: '#fff' }}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-[#6B7280] text-center mt-1.5">Enter to send · Shift+Enter for newline</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
