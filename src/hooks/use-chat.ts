import { useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { createClient } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

export interface ChatMessage {
  id: string
  guide_number: string
  text: string
  sender: "user" | "agent"
  created_at: string
}

const FORCE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getAdminClient() {
  return createClient(SUPABASE_URL, FORCE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export function useChatMessages(guideNumber: string) {
  const queryClient = useQueryClient()

  // Fetch initial messages
  const query = useQuery({
    queryKey: ["chat_messages", guideNumber],
    queryFn: async () => {
      const adminClient = getAdminClient()
      const { data, error } = await adminClient
        .from("chat_messages" as any)
        .select("*")
        .eq("guide_number", guideNumber)
        .order("created_at", { ascending: true })

      if (error) throw error
      return data as ChatMessage[]
    },
    enabled: !!guideNumber,
  })

  // Set up real-time subscription
  useEffect(() => {
    if (!guideNumber) return

    const channel = supabase
      .channel(`chat_${guideNumber}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `guide_number=eq.${guideNumber}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage
          queryClient.setQueryData<ChatMessage[]>(["chat_messages", guideNumber], (oldData) => {
            if (!oldData) return [newMessage]
            // Avoid duplicates just in case
            if (oldData.some(msg => msg.id === newMessage.id)) return oldData
            return [...oldData, newMessage]
          })
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
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (payload: { guideNumber: string; text: string; sender: "user" | "agent" }) => {
      const adminClient = getAdminClient()
      const { data, error } = await adminClient
        .from("chat_messages" as any)
        // @ts-ignore
        .insert({
          guide_number: payload.guideNumber,
          text: payload.text,
          sender: payload.sender,
        })
        .select()
        .single()

      if (error) throw error
      return data as ChatMessage
    },
    onError: (error: any) => {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el mensaje. Intenta de nuevo.",
        variant: "destructive",
      })
    },
  })
}
