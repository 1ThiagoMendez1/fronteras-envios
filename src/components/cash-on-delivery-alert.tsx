import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePendingCashOnDeliveryShipments } from "@/hooks/use-shipments";
import { useCollectCashOnDeliveryMutation } from "@/hooks/use-shipments-wrapper";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, AlertCircle, CheckCircle2, ChevronRight, Package, MapPin } from "lucide-react";
import { Link } from "wouter";

export function CashOnDeliveryAlert() {
  const { profile } = useAuth();
  const userBranch = profile?.branch;
  const { data: pendingShipments, isLoading } = usePendingCashOnDeliveryShipments(userBranch);
  const collectMutation = useCollectCashOnDeliveryMutation();

  const [isOpen, setIsOpen] = useState(false);

  // Check if we should show the alert today
  useEffect(() => {
    if (isLoading) return;
    
    // Si no hay envíos pendientes, no mostrar nada
    if (!pendingShipments || pendingShipments.length === 0) {
       setIsOpen(false);
       return;
    }

    const todayDateStr = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
    const storageKey = `fronteras_cod_alert_${profile?.id ?? 'default'}`;
    const lastShown = localStorage.getItem(storageKey);

    if (lastShown !== todayDateStr) {
      setIsOpen(true);
      localStorage.setItem(storageKey, todayDateStr);
    }
  }, [pendingShipments, isLoading, profile?.id]);

  if (isLoading || !pendingShipments || pendingShipments.length === 0) {
    return null;
  }

  const handleCollect = async (id: number) => {
    try {
      await collectMutation.mutateAsync(id);
    } catch (error) {
      console.error("Error al registrar recado:", error);
    }
  };

  const totalPending = pendingShipments.reduce((acc, s) => acc + (s.cashOnDelivery || 0), 0);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="max-w-md p-0 overflow-hidden bg-white/95 backdrop-blur-xl border border-border/50 shadow-2xl rounded-2xl">
        <div className="bg-amber-500 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
          <AlertCircle className="w-12 h-12 mx-auto mb-3 drop-shadow-md" />
          <AlertDialogTitle className="text-2xl font-bold font-display text-white mb-1">
            Recordatorio de Recaudo
          </AlertDialogTitle>
          <AlertDialogDescription className="text-white/90 text-sm font-medium">
            Tienes pagos "Contra Entrega" pendientes por confirmar.
          </AlertDialogDescription>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-4 border-b border-sidebar-border pb-3">
             <span className="text-sm font-bold text-slate-500">Envíos Pendientes</span>
             <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">
               Total: ${totalPending.toLocaleString("es-CO")}
             </Badge>
          </div>

          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {pendingShipments.map((shipment) => (
              <div key={shipment.id} className="flex flex-col p-3 rounded-xl bg-slate-50 border border-slate-100 hover:shadow-sm transition-all gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold flex items-center gap-1.5 text-slate-800">
                      <Package className="w-4 h-4 text-primary" />
                      {shipment.guideNumber || `Guía #${shipment.id}`}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {shipment.recipientCity}
                    </div>
                  </div>
                  <div className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {(shipment.cashOnDelivery || 0).toLocaleString("es-CO")}
                  </div>
                </div>
                
                <div className="flex gap-2 mt-1">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-8 text-xs font-semibold"
                    onClick={() => handleCollect(shipment.id)}
                    disabled={collectMutation.isPending}
                  >
                    {collectMutation.isPending ? "Procesando..." : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Marcar Recibido
                      </>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
                    <Link href={`/shipments/${shipment.id}`}>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <AlertDialogFooter className="p-4 bg-slate-50 border-t border-slate-100 sm:justify-center">
          <AlertDialogCancel className="w-full sm:w-auto font-semibold rounded-xl border-slate-200">
            Cerrar por hoy
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
