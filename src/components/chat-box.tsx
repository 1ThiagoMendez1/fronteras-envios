import { useState, useRef, useEffect } from "react"
import { Send, User, Bot, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn, formatGuide } from "@/lib/utils"
import { useChatMessages, useSendMessage } from "@/hooks/use-chat"

interface ChatBoxProps {
  guideNumber: string
  isAdmin?: boolean
  className?: string
}

export function ChatBox({ guideNumber, isAdmin = false, className }: ChatBoxProps) {
  const [inputValue, setInputValue] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data: messages, isLoading } = useChatMessages(guideNumber)
  const sendMessage = useSendMessage()

  // Always scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || sendMessage.isPending) return

    const textToSend = inputValue.trim()
    setInputValue("") // Optimistically clear input

    try {
      await sendMessage.mutateAsync({
        guideNumber,
        text: textToSend,
        sender: isAdmin ? "agent" : "user",
      })
    } catch (error) {
       // Error is handled by the hook's toast
       setInputValue(textToSend) // Restore input if failed
    }
  }

  // Prepend default message based on view
  const displayMessages = Array.isArray(messages) ? messages : []
  
  const defaultMessage = {
    id: "default-msg",
    guide_number: guideNumber,
    text: isAdmin 
      ? `Chat interno para soporte de la guía ${formatGuide(guideNumber)}.`
      : `¡Hola! Soy tu asistente. ¿En qué te puedo ayudar con tu envío ${formatGuide(guideNumber)}?`,
    sender: "agent" as const,
    created_at: new Date().toISOString()
  }

  const allMessages = displayMessages.length === 0 ? [defaultMessage] : displayMessages

  return (
    <div className={cn("flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          {isAdmin ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm leading-none">
            {isAdmin ? "Chat con Cliente" : "Soporte en línea"}
          </h3>
          <p className="text-xs text-slate-500 mt-1">{formatGuide(guideNumber)}</p>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[400px] sm:max-h-full"
      >
        {isLoading ? (
           <div className="flex h-full items-center justify-center">
             <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
           </div>
        ) : (
          allMessages.map((msg) => {
            const isOwnMessage = isAdmin ? msg.sender === "agent" : msg.sender === "user"
            
            return (
              <div 
                key={msg.id} 
                className={cn(
                  "flex max-w-[85%] flex-col",
                  isOwnMessage ? "ml-auto" : "mr-auto"
                )}
              >
                <div 
                  className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm break-words",
                    isOwnMessage 
                      ? "bg-primary text-primary-foreground rounded-tr-sm" 
                      : "bg-slate-100 text-slate-700 rounded-tl-sm"
                  )}
                >
                  {msg.text}
                </div>
                <span className={cn(
                  "text-[10px] text-slate-400 mt-1",
                  isOwnMessage ? "text-right mr-1" : "ml-1"
                )}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-slate-50/50 border-t border-slate-100">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 rounded-xl bg-white border-slate-200 focus-visible:ring-primary/20 pr-10"
            disabled={sendMessage.isPending || isLoading}
          />
          <Button 
            type="submit" 
            size="icon" 
            className="h-10 w-10 shrink-0 rounded-xl"
            disabled={!inputValue.trim() || sendMessage.isPending || isLoading}
          >
            {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
      
      {!isAdmin && (
        <div className="bg-amber-50 px-4 py-2 border-t border-amber-100 flex items-center gap-2 text-[10px] text-amber-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>El horario de atención es de Lunes a Viernes de 8:00am a 6:00pm.</span>
        </div>
      )}
    </div>
  )
}
