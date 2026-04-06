import { useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getAdminClient } from "@/lib/admin-client"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export interface ChatMessage {
  id: string
  guide_number: string
  text: string
  sender: "user" | "agent"
  created_at: string
}

export function useChatMessages(guideNumber: string) {
  const queryClient = useQueryClient()

  // Fetch initial messages from shipments.comentarios
  const query = useQuery({
    queryKey: ["chat_messages", guideNumber],
    queryFn: async () => {
      const adminClient = getAdminClient()
      const { data, error } = await adminClient
        .from("shipments")
        .select("comentarios")
        .eq("guide_number", guideNumber)
        .single()

      if (error && error.code !== 'PGRST116') throw error // PGRST116 is no rows
      
      const comentarios = data?.comentarios as ChatMessage[] | null
      return comentarios || []
    },
    enabled: !!guideNumber,
    refetchInterval: 5000, // Backup Polling 
  })

  // Set up real-time subscription for shipments updates
  useEffect(() => {
    if (!guideNumber) return

    const channel = supabase
      .channel(`chat_${guideNumber}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shipments",
          filter: `guide_number=eq.${guideNumber}`,
        },
        (payload) => {
          const newComentarios = (payload.new as any).comentarios as ChatMessage[] | null
          if (newComentarios) {
            queryClient.setQueryData<ChatMessage[]>(["chat_messages", guideNumber], newComentarios)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [guideNumber, queryClient])

  return query
}

export function useSendMessage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (payload: { guideNumber: string; text: string; sender: "user" | "agent" }) => {
      const adminClient = getAdminClient()
      
      // 1. Get current comments
      const { data: current, error: fetchError } = await adminClient
        .from("shipments")
        .select("comentarios")
        .eq("guide_number", payload.guideNumber)
        .single()
        
      if (fetchError) throw fetchError

      const existing = (current?.comentarios as ChatMessage[]) || []
      
      const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        guide_number: payload.guideNumber,
        text: payload.text,
        sender: payload.sender,
        created_at: new Date().toISOString()
      }
      
      const updatedComentarios = [...existing, newMessage]

      // 2. Update the shipments table with the new array
      const { error: updateError } = await adminClient
        .from("shipments")
        .update({ comentarios: updatedComentarios as any })
        .eq("guide_number", payload.guideNumber)

      if (updateError) throw updateError
      
      return newMessage
    },
    onError: (error: any) => {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el mensaje. Intenta de nuevo.",
        variant: "destructive",
      })
    },
    onSuccess: (newMessage, variables) => {
      // Optimistic update
      queryClient.setQueryData<ChatMessage[]>(["chat_messages", variables.guideNumber], (oldData) => {
        if (!oldData) return [newMessage]
        if (oldData.some(msg => msg.id === newMessage.id)) return oldData
        return [...oldData, newMessage]
      })
    },
  })
}
