-- ============================================================
-- Fronteras Envíos – Robustness & RPCs
-- Run this in Supabase SQL Editor
-- ============================================================

-- RPC to update shipment status with notes in a single transaction
CREATE OR REPLACE FUNCTION public.update_shipment_status(
  p_shipment_id INTEGER,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update the shipment
  UPDATE public.shipments
  SET status = p_new_status,
      updated_at = NOW()
  WHERE id = p_shipment_id;

  -- Insert history (the trigger will also fire, so we should either disable the trigger 
  -- or make the trigger more specific. Let's make the trigger only fire for non-RPC updates 
  -- if possible, or just accept the trigger is for 'auto' and we use manual for 'detailed')
  
  -- Re-thinking: Let's remove the trigger and use this RPC for ALL status changes from now on.
  INSERT INTO public.shipment_history (shipment_id, status, notes, changed_by)
  VALUES (p_shipment_id, p_new_status, p_notes, auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disable the old trigger to avoid double-logging (RPC handles it now)
DROP TRIGGER IF EXISTS on_shipment_status_change ON public.shipments;

-- RPC to increment client shipment count atomically
CREATE OR REPLACE FUNCTION public.increment_client_shipments(p_document TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.clients
  SET total_shipments = total_shipments + 1,
      updated_at = NOW()
  WHERE document = p_document;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Refined status change trigger to use auth.uid()
CREATE OR REPLACE FUNCTION public.log_shipment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.shipment_history (shipment_id, status, notes, changed_by)
    VALUES (NEW.id, NEW.status, NULL, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indices for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_shipments_guide_number ON public.shipments(guide_number);
CREATE INDEX IF NOT EXISTS idx_clients_document ON public.clients(document);
