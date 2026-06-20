import { useCallback, useEffect, useRef, useState } from 'react'

const WS_BASE = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:8000'

export interface SocketMessage {
  id: number
  sender: number | null
  senderName: string
  message: string
  messageType: 'text' | 'image' | 'file' | 'e_prescription'
  fileUrl?: string
  sentAt: string
}

function normalizeSocketMessage(raw: Record<string, unknown>): SocketMessage {
  return {
    id: Number(raw.id ?? 0),
    sender: raw.sender == null ? null : Number(raw.sender),
    senderName: String(raw.senderName ?? raw.sender_name ?? ''),
    message: String(raw.message ?? ''),
    messageType: String(raw.messageType ?? raw.message_type ?? 'text') as SocketMessage['messageType'],
    fileUrl: raw.fileUrl || raw.attachment_url ? String(raw.fileUrl ?? raw.attachment_url) : undefined,
    sentAt: String(raw.sentAt ?? raw.sent_at ?? ''),
  }
}

interface UseConsultationSocketResult {
  messages: SocketMessage[]
  isConnected: boolean
  typingUsers: string[]
  sendMessage: (text: string) => void
  sendTyping: () => void
}

export function useConsultationSocket(
  consultationId: number | null,
  token: string | null,
  onNewMessage?: (msg: SocketMessage) => void,
): UseConsultationSocketResult {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shouldReconnectRef = useRef(false)
  const [messages, setMessages] = useState<SocketMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const onNewMessageRef = useRef(onNewMessage)

  useEffect(() => {
    onNewMessageRef.current = onNewMessage
  }, [onNewMessage])

  const connect = useCallback(() => {
    if (!consultationId || !token) return
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return
    shouldReconnectRef.current = true
    const url = `${WS_BASE}/ws/consultations/${consultationId}/?token=${token}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setIsConnected(true)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type?: string
          message?: SocketMessage
          payload?: Record<string, unknown>
          user?: string
        }

        if (data.type === 'message.new' && (data.message || data.payload)) {
          const message = normalizeSocketMessage((data.message ?? data.payload) as Record<string, unknown>)
          setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]))
          onNewMessageRef.current?.(message)
        } else if (data.type === 'typing.indicator' && (data.user || data.payload)) {
          const user = data.user ?? String(data.payload?.user_name ?? data.payload?.user ?? '')
          if (!user) return
          setTypingUsers((prev) => (prev.includes(user) ? prev : [...prev, user]))
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u !== user))
          }, 3000)
        } else if (data.type === 'consultation.status_changed') {
          // handled by caller via polling or refetch
        }
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      if (wsRef.current !== ws) return
      setIsConnected(false)
      if (shouldReconnectRef.current && consultationId && token) {
        reconnectTimerRef.current = setTimeout(connect, 3000)
      }
    }

    ws.onerror = () => ws.close()
  }, [consultationId, token])

  useEffect(() => {
    shouldReconnectRef.current = false
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    wsRef.current?.close()
    wsRef.current = null
    setMessages([])
    connect()
    return () => {
      shouldReconnectRef.current = false
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
      wsRef.current = null
      setIsConnected(false)
    }
  }, [connect])

  const sendMessage = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message.send', message: text }))
    }
  }, [])

  const sendTyping = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing.indicator' }))
    }
  }, [])

  return { messages, isConnected, typingUsers, sendMessage, sendTyping }
}
