export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          role: 'admin' | 'operator' | 'driver'
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          role?: 'admin' | 'operator' | 'driver'
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: 'admin' | 'operator' | 'driver'
          is_active?: boolean
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: number
          document: string
          name: string
          phone: string
          city: string
          address: string
          email: string | null
          total_shipments: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          document: string
          name: string
          phone: string
          city: string
          address: string
          email?: string | null
          total_shipments?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          document?: string
          name?: string
          phone?: string
          city?: string
          address?: string
          email?: string | null
          total_shipments?: number
          updated_at?: string
        }
      }
      drivers: {
        Row: {
          id: number
          name: string
          phone: string
          email: string | null
          company: string | null
          vehicle_type: string
          city: string
          rate_per_delivery: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          phone: string
          email?: string | null
          company?: string | null
          vehicle_type: string
          city: string
          rate_per_delivery?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          phone?: string
          email?: string | null
          company?: string | null
          vehicle_type?: string
          city?: string
          rate_per_delivery?: number
          is_active?: boolean
          updated_at?: string
        }
      }
      shipments: {
        Row: {
          id: number
          guide_number: string
          sender_document: string | null
          sender_name: string
          sender_phone: string
          sender_address: string
          sender_city: string
          recipient_name: string
          recipient_phone: string
          recipient_address: string
          recipient_city: string
          weight: number
          declared_value: number
          shipping_cost: number
          driver_payment: number
          observations: string | null
          status: 'created' | 'assigned' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'incident' | 'returned'
          driver_id: number | null
          branch_origin: string
          created_by: string | null
          created_at: string
          updated_at: string
          comentarios: Json | null
        }
        Insert: {
          id?: number
          guide_number?: string
          sender_document?: string | null
          sender_name: string
          sender_phone: string
          sender_address: string
          sender_city: string
          recipient_name: string
          recipient_phone: string
          recipient_address: string
          recipient_city: string
          weight?: number
          declared_value?: number
          shipping_cost?: number
          driver_payment?: number
          observations?: string | null
          status?: 'created' | 'assigned' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'incident' | 'returned'
          driver_id?: number | null
          branch_origin?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
          comentarios?: Json | null
        }
        Update: {
          sender_document?: string | null
          sender_name?: string
          sender_phone?: string
          sender_address?: string
          sender_city?: string
          recipient_name?: string
          recipient_phone?: string
          recipient_address?: string
          recipient_city?: string
          weight?: number
          declared_value?: number
          shipping_cost?: number
          driver_payment?: number
          observations?: string | null
          status?: 'created' | 'assigned' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'incident' | 'returned'
          driver_id?: number | null
          branch_origin?: string
          updated_at?: string
          comentarios?: Json | null
        }
      }
      shipment_history: {
        Row: {
          id: number
          shipment_id: number
          status: string
          notes: string | null
          changed_by: string | null
          created_at: string
        }
        Insert: {
          id?: number
          shipment_id: number
          status: string
          notes?: string | null
          changed_by?: string | null
          created_at?: string
        }
        Update: {
          notes?: string | null
        }
      }
      daily_close: {
        Row: {
          id: number
          close_date: string
          branch: string
          total_shipments: number
          total_revenue: number
          total_driver_payments: number
          net_profit: number
          cash_collected: number
          notes: string | null
          closed_by: string | null
          status: 'pre_close' | 'completed'
          created_at: string
        }
        Insert: {
          id?: number
          close_date: string
          branch: string
          total_shipments?: number
          total_revenue?: number
          total_driver_payments?: number
          net_profit?: number
          cash_collected?: number
          notes?: string | null
          closed_by?: string | null
          status?: 'pre_close' | 'completed'
          created_at?: string
        }
        Update: {
          notes?: string | null
          cash_collected?: number
          status?: 'pre_close' | 'completed'
          total_shipments?: number
          total_revenue?: number
          total_driver_payments?: number
          net_profit?: number
        }
      }
      financial_movements: {
        Row: {
          id: number
          type: 'income' | 'expense'
          category: string
          amount: number
          description: string
          reference_id: number | null
          reference_type: string | null
          evidence_url: string | null
          recorded_by: string | null
          movement_date: string
          created_at: string
        }
        Insert: {
          id?: number
          type: 'income' | 'expense'
          category: string
          amount: number
          description: string
          reference_id?: number | null
          reference_type?: string | null
          evidence_url?: string | null
          recorded_by?: string | null
          movement_date?: string
          created_at?: string
        }
        Update: {
          category?: string
          amount?: number
          description?: string
          evidence_url?: string | null
          movement_date?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          guide_number: string
          text: string
          sender: 'user' | 'agent'
          created_at: string
        }
        Insert: {
          id?: string
          guide_number: string
          text: string
          sender: 'user' | 'agent'
          created_at?: string
        }
        Update: {
          guide_number?: string
          text?: string
          sender?: 'user' | 'agent'
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Driver = Database['public']['Tables']['drivers']['Row']
export type Shipment = Database['public']['Tables']['shipments']['Row']
export type ShipmentHistory = Database['public']['Tables']['shipment_history']['Row']
export type DailyClose = Database['public']['Tables']['daily_close']['Row']
export type FinancialMovement = Database['public']['Tables']['financial_movements']['Row']

export type ShipmentStatus = Shipment['status']
export type VehicleType = Driver['vehicle_type']
export type UserRole = Profile['role']
