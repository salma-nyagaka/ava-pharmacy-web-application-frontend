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
  const [messages, setMessages] = useState<SocketMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const onNewMessageRef = useRef(onNewMessage)

  useEffect(() => {
    onNewMessageRef.current = onNewMessage
  }, [onNewMessage])

  const connect = useCallback(() => {
    if (!consultationId || !token) return
    const url = `${WS_BASE}/ws/consultations/${consultationId}/?token=${token}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setIsConnected(true)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as {
          type?: string
          message?: SocketMessage
          user?: string
        }

        if (data.type === 'message.new' && data.message) {
          setMessages((prev) => [...prev, data.message as SocketMessage])
          onNewMessageRef.current?.(data.message as SocketMessage)
        } else if (data.type === 'typing.indicator' && data.user) {
          setTypingUsers((prev) =>
            prev.includes(data.user as string) ? prev : [...prev, data.user as string],
          )
          setTimeout(() => {
            setTypingUsers((prev) => prev.filter((u) => u !== data.user))
          }, 3000)
        } else if (data.type === 'consultation.status_changed') {
          // handled by caller via polling or refetch
        }
      } catch {
        // ignore malformed frames
      }
    }

    ws.onclose = () => {
      setIsConnected(false)
      reconnectTimerRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()
  }, [consultationId, token])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current?.close()
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
