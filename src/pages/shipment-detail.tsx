import { useState, useRef } from "react"
import { useRoute, Link } from "wouter"
import SignatureCanvas from "react-signature-canvas"
import { useGetShipment } from "@/hooks/use-shipments"
import { useListDrivers } from "@/hooks/use-drivers"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency, getStatusColor, getStatusLabel, cn, formatGuide } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, Printer, Truck, MapPin, Building, Phone } from "lucide-react"
import { useUpdateShipmentStatusMutation, useAssignDriverMutation } from "@/hooks/use-shipments-wrapper"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { QRCodeSVG } from "qrcode.react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ChatBox } from "@/components/chat-box"
import { useToast } from "@/hooks/use-toast"

export default function ShipmentDetail() {
  const [, params] = useRoute("/shipments/:id")
  const id = parseInt(params?.id || "0")
  
  const { data: shipment, isLoading } = useGetShipment(id)
  const { data: drivers } = useListDrivers({ onlyActive: true })
  
  const statusMutation = useUpdateShipmentStatusMutation(id)
  const assignMutation = useAssignDriverMutation(id)

  const [newStatus, setNewStatus] = useState<any>("")
  const [statusNote, setStatusNote] = useState("")
  const [driverId, setDriverId] = useState<string>("")
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false)
  const sigCanvas = useRef<SignatureCanvas>(null)
  const { toast } = useToast()

  // Local state for signature and driver display (mocking actual persistence hook)
  const [localSignature, setLocalSignature] = useState<string | null>(null)
  const [localDriverId, setLocalDriverId] = useState<string | null>(null)
  const [isReassigning, setIsReassigning] = useState(false)
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)
  const [printMode, setPrintMode] = useState<"guia" | "guia_conductor" | "rotulos">("guia")

  const quantityLabel = shipment?.quantity || 1;
  const numLabels = quantityLabel > 1 ? quantityLabel - 1 : 0;
  const labelPages = [];
  for (let i = 0; i < numLabels; i += 4) {
    const pageLabelsCount = Math.min(4, numLabels - i);
    labelPages.push(
      Array.from({ length: pageLabelsCount }, (_, index) => ({
        number: i + index + 2
      }))
    );
  }

  if (isLoading || !shipment) {
    return (
      <DashboardLayout>
         <div className="h-full w-full flex items-center justify-center p-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  const handleStatusChange = async () => {
    if (!newStatus) return
    await statusMutation.mutateAsync({ 
      status: newStatus,
      notes: statusNote || undefined
    })
    setIsStatusDialogOpen(false)
    setNewStatus("")
    setStatusNote("")
  }

  const handleAssignClick = () => {
    if (!driverId) return
    setIsSignatureDialogOpen(true)
  }

  const handleConfirmAssignment = async () => {
    if (!driverId) return;
    let sig: string | null = null;
    
    try {
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        // Fallback to getCanvas() to avoid getTrimmedCanvas() IndexSizeError crashes
        sig = sigCanvas.current.getCanvas().toDataURL("image/png");
      }
    } catch(e) { 
      console.error("Signature extraction error:", e);
    }
    
    if (!sig) {
      toast({ title: "Firma Requerida", description: "El conductor debe firmar en el recuadro antes de asignar.", variant: "destructive" });
      return;
    }
    
    await assignMutation.mutateAsync({
      driverId: parseInt(driverId),
      driverSignature: sig,
    });
    
    if (sig) setLocalSignature(sig)
    setLocalDriverId(driverId)
    setIsSignatureDialogOpen(false)
    setIsReassigning(false)
  }

  const clearSignature = () => {
    sigCanvas.current?.clear()
  }

  const handlePrint = () => {
    window.print()
  }


  const handlePrintActa = () => {
    const printWindow = window.open('', '', 'width=800,height=800')
    if (!printWindow) return

    const effectiveDriverId = localDriverId || shipment.driverId
    const driverInfo = drivers?.find(d => d.id.toString() === effectiveDriverId?.toString())
    const effectiveDriverName = driverInfo ? driverInfo.name : shipment.driverName
    const sigImage = localSignature || shipment.driverSignature

    printWindow.document.write(`
      <html>
        <head>
          <title>Acta de Entrega - ${shipment.guideNumber}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin: 0; color: #0f172a; }
            .subtitle { color: #64748b; margin-top: 8px; font-size: 14px; }
            .grid { display: flex; gap: 20px; margin-bottom: 30px; }
            .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; flex: 1; background: #f8fafc; }
            .label { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.05em; }
            .value { font-size: 14px; margin: 6px 0; color: #334155; line-height: 1.5; }
            .signature-box { border: 2px dashed #cbd5e1; padding: 30px; text-align: center; margin-top: 40px; border-radius: 12px; background: white; }
            .signature-img { max-width: 300px; max-height: 150px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">ACTA DE ENTREGA A CONDUCTOR TERCERIZADO</h1>
            <p class="subtitle">Fronteras Express - <strong>Guía ${formatGuide(shipment.guideNumber)}</strong></p>
            <p class="subtitle">Fecha de Asignación: ${new Date().toLocaleDateString('es-CO')} - Sede de Origen: ${shipment.branchOrigin}</p>
          </div>
          
          <div class="grid">
            <div class="box">
              <p class="label">Datos del Envío</p>
              <p class="value"><strong>Origen:</strong> ${shipment.senderCity} (${shipment.senderName})</p>
              <p class="value"><strong>Destino:</strong> ${shipment.recipientCity} (${shipment.recipientName})</p>
              <p class="value"><strong>Peso Registrado:</strong> ${shipment.weight} kg</p>
              <p class="value"><strong>Total Flete:</strong> $${shipment.shippingCost.toLocaleString()}</p>
            </div>
            <div class="box">
              <p class="label">Datos del Conductor</p>
              <p class="value"><strong>Nombre:</strong> ${effectiveDriverName}</p>
              <p class="value"><strong>Vehículo:</strong> ${driverInfo?.vehicleType || 'No especificado'}</p>
              <p class="value"><strong>Ciudad Base:</strong> ${driverInfo?.city || 'No especificada'}</p>
              <p class="value"><strong>Valor Pactado (Pago):</strong> $${(shipment.driverPayment || 0).toLocaleString()}</p>
            </div>
          </div>
          
          <p style="margin-top: 30px; line-height: 1.8; color: #334155; font-size: 15px; text-align: justify;">
            Yo, <strong>${effectiveDriverName}</strong>, con vehículo tipo <strong>${driverInfo?.vehicleType || 'N/A'}</strong>, certifico formalmente que he recibido los paquetes correspondientes a la guía <strong>${formatGuide(shipment.guideNumber)}</strong> en perfectas condiciones por parte de Fronteras Express. Me comprometo responsablemente a realizar el traslado y la entrega de la mercancía en <strong>${shipment.recipientCity}</strong>, asumiendo toda la responsabilidad civil, contractual y comercial sobre el estado de la mercancía hasta su destino final según lo estipulado.
          </p>
          
          <div class="signature-box">
            <p class="label" style="margin-bottom: 20px;">Firma Digital Registrada en Sistema</p>
            ${sigImage ? `<img src="${sigImage}" class="signature-img" />` : '<p style="color: #ef4444; font-weight: bold;">No hay firma registrada</p>'}
            <div style="margin-top: 20px;">
              <p style="display: inline-block; padding: 10px 40px 0; border-top: 1px solid #94a3b8; color: #475569; font-size: 14px;">Firma de Aceptación del Transportador</p>
            </div>
          </div>
          
          <div class="footer">
            Documento jurídico generado automáticamente por la plataforma de Fronteras Express.<br>
            Cualquier alteración a este documento invalida su efecto.
          </div>
        </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 600)
  }

  // Generate QR URL based on current origin
  const trackingUrl = `${window.location.origin}/?guide=${shipment.guideNumber}`

  const effectiveDriverId = isReassigning ? null : (localDriverId || shipment.driverId);
  const driverObj = effectiveDriverId ? drivers?.find(d => d.id.toString() === effectiveDriverId.toString()) : null;
  const effectiveDriverName = driverObj ? driverObj.name : shipment.driverName;

  const sortedHistory = (shipment.history as {id: number, status: string, notes: string | null, createdAt: string}[])?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || []
  const displayHistory = isHistoryExpanded ? sortedHistory : sortedHistory.slice(0, 3)

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 no-print">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/shipments">
              <Button variant="outline" size="icon" className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-display font-bold text-foreground">Guía {formatGuide(shipment.guideNumber)}</h1>
                <span className={cn("px-3 py-1 rounded-full text-xs font-bold border", getStatusColor(shipment.status))}>
                  {getStatusLabel(shipment.status)}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-sm">
                Creado el {format(new Date(shipment.createdAt), "dd 'de' MMMM, yyyy HH:mm", { locale: es })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => { setPrintMode("guia"); setTimeout(handlePrint, 100); }} className="rounded-xl h-11 font-semibold border-primary text-slate-800 hover:bg-primary/5">
              <Printer className="w-4 h-4 mr-2" /> Mostrar al Cliente
            </Button>
            <Button disabled={numLabels === 0} variant="outline" onClick={() => { setPrintMode("rotulos"); setTimeout(handlePrint, 100); }} className="rounded-xl h-11 font-semibold border-amber-400 text-slate-800 hover:bg-amber-50">
              <Printer className="w-4 h-4 mr-2" /> Rótulos ({numLabels})
            </Button>
            <Button variant="outline" onClick={() => { setPrintMode("guia_conductor"); setTimeout(handlePrint, 100); }} className="rounded-xl h-11 font-semibold border-emerald-400 text-slate-800 hover:bg-emerald-50">
              <Truck className="w-4 h-4 mr-2" /> Guía Conductor
            </Button>

            <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl h-11 font-semibold shadow-lg shadow-primary/20">
                  Actualizar Estado
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Actualizar Estado del Envío</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nuevo Estado</label>
                    <Select onValueChange={setNewStatus} value={newStatus}>
                      <SelectTrigger className="rounded-xl h-12">
                        <SelectValue placeholder="Seleccione un estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="picked_up">Recogido</SelectItem>
                        <SelectItem value="in_transit">En Tránsito</SelectItem>
                        <SelectItem value="out_for_delivery">Pendiente por Entregar</SelectItem>
                        <SelectItem value="delivered">Entregado</SelectItem>
                        <SelectItem value="incident">Incidencia (Problema)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nota / Novedad (Opcional)</label>
                    <Input 
                      placeholder="Ej. Recibido por portería..." 
                      className="rounded-xl h-12"
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full h-12 rounded-xl" 
                    onClick={handleStatusChange}
                    disabled={!newStatus || statusMutation.isPending}
                  >
                    {statusMutation.isPending ? "Actualizando..." : "Guardar Estado"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Left Column (Details) */}
          <div className="flex-1 w-full space-y-6 min-w-[300px]">
            {/* Origin & Destination Cards */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Card className="flex-1 p-6 rounded-2xl shadow-sm border-border/50 resize overflow-auto min-h-[150px] min-w-[250px] max-w-full">
                <div className="flex items-center gap-2 mb-4 text-slate-500">
                  <MapPin className="w-5 h-5" />
                  <h3 className="font-semibold uppercase tracking-wider text-xs">Origen / Remitente</h3>
                </div>
                <p className="text-xl font-bold text-foreground">{shipment.senderCity}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="font-medium text-slate-800">{shipment.senderName}</p>
                  {shipment.senderDocument && (
                    <p className="text-slate-600 font-medium">C.C/NIT: {shipment.senderDocument}</p>
                  )}
                  <p className="text-slate-600 flex items-center gap-2"><Phone className="w-3.5 h-3.5"/> {shipment.senderPhone}</p>
                  <p className="text-slate-600 flex items-start gap-2"><Building className="w-3.5 h-3.5 mt-0.5"/> {shipment.senderAddress}</p>
                </div>
              </Card>

              <Card className="flex-1 p-6 rounded-2xl shadow-sm border-border/50 bg-blue-50/30 border-blue-100 resize overflow-auto min-h-[150px] min-w-[250px] max-w-full">
                <div className="flex items-center gap-2 mb-4 text-blue-600">
                  <MapPin className="w-5 h-5" />
                  <h3 className="font-semibold uppercase tracking-wider text-xs">Destino / Destinatario</h3>
                </div>
                <p className="text-xl font-bold text-blue-900">{shipment.recipientCity}</p>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="font-medium text-slate-800">{shipment.recipientName}</p>
                  {shipment.recipientDocument && (
                    <p className="text-slate-600 font-medium">C.C/NIT: {shipment.recipientDocument}</p>
                  )}
                  <p className="text-slate-600 flex items-center gap-2"><Phone className="w-3.5 h-3.5"/> {shipment.recipientPhone}</p>
                  <p className="text-slate-600 flex items-start gap-2"><Building className="w-3.5 h-3.5 mt-0.5"/> {shipment.recipientAddress}</p>
                </div>
              </Card>
            </div>

            {/* Financial Details */}
            <Card className="p-6 rounded-2xl shadow-sm border-border/50 resize overflow-auto min-h-[150px] max-w-full">
              <h3 className="text-lg font-bold text-foreground mb-4">Detalles del Paquete</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Peso</p>
                  <p className="font-bold text-lg">{shipment.weight} kg</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Valor Declarado</p>
                  <p className="font-bold text-lg">{formatCurrency(shipment.declaredValue)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Costo Flete</p>
                  <p className="font-bold text-lg text-primary">{formatCurrency(shipment.shippingCost)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Pago Conductor</p>
                  <p className="font-bold text-lg">{formatCurrency(shipment.driverPayment)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Método de Pago</p>
                  <p className="font-bold text-lg">{shipment.paymentMethod}</p>
                </div>
              </div>
              {shipment.packageContents && (
                <div className="mt-6 p-4 bg-blue-50 text-blue-900 rounded-xl text-sm border border-blue-100">
                  <span className="font-bold block mb-1">Dice Contener:</span>
                  {shipment.packageContents}
                </div>
              )}
              {shipment.observations && (
                <div className="mt-3 p-4 bg-amber-50 text-amber-900 rounded-xl text-sm border border-amber-100">
                  <span className="font-bold block mb-1">Observaciones:</span>
                  {shipment.observations}
                </div>
              )}
            </Card>



            {/* Driver Assignment */}
            <Card className="p-6 rounded-2xl shadow-sm border-border/50 resize overflow-auto min-h-[150px] max-w-full">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-primary" /> Asignación de Conductor
              </h3>
              
              {effectiveDriverId ? (
                <div className="flex flex-col gap-4 p-4 bg-slate-50 border rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border shadow-sm text-xl font-bold text-slate-700">
                        {effectiveDriverName?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{effectiveDriverName}</p>
                        <p className="text-sm text-slate-500">{driverObj?.vehicleType || 'Transportador'} • {driverObj?.city || 'Asociado'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="secondary" onClick={handlePrintActa} className="h-9 font-medium bg-slate-200 hover:bg-slate-300 text-slate-700">
                        <Printer className="w-4 h-4 mr-2" /> Acta
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setIsReassigning(true); setLocalDriverId(null); setLocalSignature(null); }} className="h-9">Reasignar</Button>
                    </div>
                  </div>
                  
                  {/* Digital Signature Display */}
                  {(localSignature || shipment.driverSignature) && (
                    <div className="mt-4 border-t pt-4">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-4">Firma del Conductor (Acta Digital)</p>
                      <div className="bg-white border rounded-lg p-2 max-w-xs block overflow-hidden">
                        <img src={(localSignature || shipment.driverSignature) || undefined} alt="Firma del conductor" className="w-full h-auto" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Select onValueChange={setDriverId} value={driverId}>
                    <SelectTrigger className="flex-1 h-12 rounded-xl">
                      <SelectValue placeholder="Seleccionar conductor disponible..." />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers?.filter(d => d.isActive).map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>{d.name} - {d.vehicleType}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Dialog open={isSignatureDialogOpen} onOpenChange={(open) => {
                    setIsSignatureDialogOpen(open);
                    if (open) {
                      setTimeout(() => {
                        if (sigCanvas.current) {
                           // Standard clear will often force a re-render/resize internally
                           sigCanvas.current.clear();
                        }
                      }, 200);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        className="h-12 px-6 rounded-xl bg-slate-900" 
                        onClick={(e) => { e.preventDefault(); handleAssignClick(); }}
                        disabled={!driverId || assignMutation.isPending}
                      >
                        Asignar y Firmar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-3xl">
                      <DialogHeader>
                        <DialogTitle>Acta de Entrega al Conductor</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <p className="text-sm text-muted-foreground">
                          El conductor debe firmar digitalmente para confirmar la recolección de la mercancía.
                        </p>
                        <div className="border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 overflow-hidden relative touch-none">
                           <SignatureCanvas 
                             ref={sigCanvas} 
                             penColor="black"
                             canvasProps={{className: "w-full h-48 signature-canvas"}} 
                           />
                           <Button variant="ghost" size="sm" onClick={clearSignature} className="absolute top-2 right-2 h-7 text-xs bg-white/80 backdrop-blur">
                             Limpiar
                           </Button>
                        </div>
                        <Button 
                          className="w-full h-12 rounded-xl bg-primary text-white font-bold" 
                          onClick={handleConfirmAssignment}
                          disabled={assignMutation.isPending}
                        >
                          {assignMutation.isPending ? "Procesando..." : "Confirmar Firma y Asignar"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {isReassigning && shipment.driverId && (
                    <Button variant="ghost" onClick={() => setIsReassigning(false)} className="h-12 px-4 rounded-xl text-slate-500">
                      Cancelar
                    </Button>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Right Column (Timeline & Chat) */}
          <div 
            className="w-full lg:w-[450px] shrink-0 resize-x overflow-hidden min-w-[300px] max-w-full lg:max-w-[60vw] pl-2 pb-2" 
            style={{ direction: 'rtl' }}
          >
            <div style={{ direction: 'ltr' }} className="flex flex-col gap-6 h-full w-full pr-1">
              
              <div className="h-[500px] min-h-[350px] max-h-[800px] w-full resize overflow-hidden border border-slate-100 rounded-2xl relative shadow-sm">
                <ChatBox guideNumber={shipment.guideNumber} isAdmin={true} className="h-full w-full absolute inset-0 rounded-none border-none shadow-none" />
              </div>

              <Card className="p-6 rounded-2xl shadow-sm border-border/50 h-[350px] min-h-[250px] resize overflow-hidden flex flex-col">
                  <h3 className="text-lg font-bold text-foreground mb-4 shrink-0">Historial del Envío</h3>
                  
                  <div className="relative pl-10 space-y-6 before:absolute before:inset-0 before:ml-[19px] before:h-full before:w-0.5 before:bg-slate-200 flex-1 overflow-y-auto pr-2">
                {displayHistory.map((item) => (
                  <div key={item.id} className="relative">
                    <div className="absolute -left-[30px] mt-1 w-5 h-5 rounded-full bg-white border-2 border-primary z-10"></div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{getStatusLabel(item.status)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(() => { try { return format(new Date(item.createdAt), "d MMM, HH:mm", { locale: es }) } catch { return item.createdAt ?? "—" } })()}
                      </p>
                      {item.notes && (
                        <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded border">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {sortedHistory.length > 3 && (
                <Button variant="ghost" className="w-full mt-4 shrink-0 text-xs font-semibold text-slate-600 hover:text-slate-900" onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}>
                  {isHistoryExpanded ? "Ocultar historial" : "Ver historial completo"}
                </Button>
              )}
            </Card>
            
            </div>
          </div>
        </div>
      </div>

      {/* PRINT ONLY SECTION - Termica 100x150mm Label Style */}
      <style>{`
        @media print {
          @page {
            size: 100mm 150mm;
            margin: 0mm !important;
          }
          html, body, #root {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            height: auto !important;
            min-height: 100% !important;
            width: 100% !important;
            max-width: 100% !important;
            overflow: visible !important;
          }
          #print-area {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            z-index: 99999 !important;
            background: white !important;
          }
          #print-area.guia-mode,
          #print-area.guia-conductor-mode {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            height: auto !important;
            overflow: hidden !important;
            width: 100vw !important;
          }
          #print-area.rotulos-mode {
            position: relative !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: flex-start !important;
            width: 100% !important;
          }

          .rotulos-page {
            width: 100% !important;
            max-width: 100% !important;
            height: 100vh !important; 
            max-height: 100vh !important;
            flex-shrink: 0;
            display: flex;
            flex-direction: column;
            page-break-after: always;
            page-break-inside: avoid;
            overflow: hidden !important;
            box-sizing: border-box;
            background: white;
            margin: 0 !important;
          }
          .rotulos-page:last-child {
            page-break-after: auto !important;
          }

          .page-break {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .no-print {
            display: none !important;
          }
          
          /* Esconder barras laterales y header principal para evitar layouts raros */
          nav, aside, header {
             display: none !important;
          }

          /* Garantizar que los padres estructurales no empujen el contenido y generen hojas en blanco */
          html, body, #root, #root > div, main, main > div {
             padding: 0 !important;
             margin: 0 !important;
             min-height: 0 !important;
             height: auto !important;
          }

          /* Eliminar el reloj de DashboardLayout y cualquier margen superior residual */
          main > div:first-child {
             display: none !important;
          }
        }
      `}</style>
      <div id="print-area" className={cn("hidden print:block text-black font-sans box-border bg-white mx-auto", printMode === "guia_conductor" ? "guia-conductor-mode" : printMode === "rotulos" ? "rotulos-mode" : "guia-mode")}>
        {(printMode === "guia" || printMode === "guia_conductor") && (
          <div className="flex flex-col w-[100vw] h-[100vh] px-2 pt-0 pb-1 box-border overflow-hidden bg-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b-[3px] border-black pb-1 mb-2">
              <div className="flex items-center gap-1 font-display font-black shrink-0">
                <Truck className="w-8 h-8" />
                <span className="leading-tight text-xl tracking-tighter">FRONTERAS<br/>EXPRESS</span>
              </div>
              <div className="flex flex-col items-center justify-center text-center px-2 flex-1">
                 <span className="text-[8px] font-bold uppercase text-gray-700 leading-tight">Fecha y hora de ingreso</span>
                 <span className="text-[10px] font-black leading-tight text-black">
                   {(() => { try { return format(new Date(shipment.createdAt), "dd/MM/yyyy HH:mm", { locale: es }) } catch { return shipment.createdAt ? String(shipment.createdAt).substring(0, 16) : "—" } })()}
                 </span>
              </div>
              <div className="text-right shrink-0 ml-2">
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{formatGuide(shipment.guideNumber)}</h2>
                <p className="text-[10px] font-bold leading-tight mt-1 uppercase">Guía de Transporte</p>
              </div>
            </div>

            {/* Sender & Recipient Blocks */}
            <div className="flex flex-col border-[3px] border-black rounded-xl overflow-hidden mb-3 bg-white">
              <div className="flex">
                {/* Sender */}
                <div className="w-1/2 p-2 border-r-[3px] border-black border-b-[3px]">
                  <h3 className="text-[11px] font-black uppercase border-b-2 border-black pb-0.5 mb-1.5 text-black px-1 -mx-2 -mt-2">REMITENTE</h3>
                  <p className="font-extrabold text-[13px] leading-tight line-clamp-2 uppercase text-black">{shipment.senderName}</p>
                  {shipment.senderDocument && <p className="text-[11px] font-bold text-black mt-0.5 leading-tight">C.C/NIT: {shipment.senderDocument}</p>}
                  <p className="text-[11px] mt-1 leading-tight line-clamp-2 text-black">{shipment.senderAddress}</p>
                  <p className="text-[12px] font-black mt-1 uppercase text-black">{shipment.senderCity}</p>
                  <p className="text-[11px] mt-0.5 font-bold text-black">Tel: {shipment.senderPhone}</p>
                </div>
                {/* Recipient */}
                <div className="w-1/2 p-2 border-b-[3px] border-black">
                  <h3 className="text-[11px] font-black uppercase border-b-2 border-black pb-0.5 mb-1.5 text-black px-1 -mx-2 -mt-2">DESTINATARIO</h3>
                  <p className="font-extrabold text-[14px] leading-tight line-clamp-2 uppercase text-black">{shipment.recipientName}</p>
                  {shipment.recipientDocument && <p className="text-[11px] font-bold text-black mt-0.5 leading-tight">C.C/NIT: {shipment.recipientDocument}</p>}
                  <p className="text-[11px] mt-1 leading-tight line-clamp-3 text-black">{shipment.recipientAddress}</p>
                  <p className="text-[14px] font-black mt-1 uppercase text-black bg-gray-200 px-1 inline-block rounded">{shipment.recipientCity}</p>
                  <p className="text-[11px] mt-0.5 font-bold text-black">Tel: {shipment.recipientPhone}</p>
                </div>
              </div>
              
              {/* Details Row - differs between client and driver */}
              <div className="flex bg-gray-100">
                <div className="flex-1 p-2 border-r-[3px] border-black text-center flex flex-col justify-center">
                  <span className="text-[10px] font-black uppercase block">Peso</span>
                  <span className="text-lg font-black leading-none mt-1">{shipment.weight} <span className="text-xs">kg</span></span>
                </div>
                {printMode === "guia" ? (
                  <>
                    <div className="flex-1 p-2 border-r-[3px] border-black text-center flex flex-col justify-center">
                      <span className="text-[10px] font-black uppercase block">Declarado</span>
                      <span className="text-sm font-bold leading-none mt-1">{formatCurrency(shipment.declaredValue)}</span>
                    </div>
                    <div className="flex-1 p-2 text-center flex flex-col justify-center text-black">
                      <span className="text-[10px] font-black uppercase block leading-tight">
                        Total Flete 
                        {shipment.cashOnDelivery > 0 && <span className="block text-[8px] font-bold mt-0.5">(Contraentrega)</span>}
                      </span>
                      <span className="text-lg font-black leading-none mt-1 text-black">{formatCurrency(shipment.cashOnDelivery > 0 ? shipment.cashOnDelivery : shipment.shippingCost)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1 p-2 border-r-[3px] border-black text-center flex flex-col justify-center">
                      <span className="text-[10px] font-black uppercase block">Cantidad</span>
                      <span className="text-lg font-black leading-none mt-1">{shipment.quantity || 1} <span className="text-xs">pza(s)</span></span>
                    </div>
                    <div className="flex-1 p-2 text-center flex flex-col justify-center text-black">
                      <span className="text-[10px] font-black uppercase block">Dice Contener</span>
                      <span className="text-[11px] font-bold leading-tight mt-1 text-black line-clamp-2">{shipment.packageContents || "—"}</span>
                    </div>
                  </>
                )}
              </div>
              
            </div>

            {/* Observation & QR */}
            <div className="flex gap-3 mb-3 flex-1 bg-white">
              <div className="flex-1 border-[3px] border-black rounded-xl p-2 flex flex-col relative overflow-hidden">
                <span className="text-[11px] font-black uppercase block border-b-2 border-black pb-1 mb-1 relative z-10 w-full bg-white">DICE CONTENER</span>
                <p className="text-[11px] leading-tight font-bold whitespace-pre-wrap overflow-hidden relative z-10">{shipment.packageContents || "No especificado"}</p>
                {shipment.observations && (
                  <>
                    <span className="text-[10px] font-black uppercase block border-t border-black pt-1 mt-1 relative z-10">OBS:</span>
                    <p className="text-[10px] leading-tight font-medium whitespace-pre-wrap overflow-hidden relative z-10">{shipment.observations}</p>
                  </>
                )}
              </div>
              <div className="w-[120px] flex flex-col items-center justify-center p-2 border-[3px] border-black rounded-xl shrink-0">
                 {printMode === "guia" && (
                   <span className="text-[8px] font-bold leading-none mb-1.5 text-black">NIT: 901999613</span>
                 )}
                 <QRCodeSVG value={trackingUrl} size={86} level="M" />
                 <p className="text-[9px] text-center mt-2 font-black w-full uppercase leading-tight bg-black text-white py-0.5 rounded">RASTREAR</p>
              </div>
            </div>

            <div className="border-t-[3px] border-black pt-1.5 mt-auto text-center text-[8px] font-bold leading-tight uppercase bg-white">
              Fronteras Express S.A.S. - El envío se rige por nuestras políticas.<br/>Consulte términos en www.fronterasexpress.com
            </div>
          </div>
        )}
        {printMode === "rotulos" && (
          <div className="w-full h-auto bg-white flex flex-col">
            {labelPages.map((pageLabels, pageIdx) => (
              <div key={pageIdx} className="rotulos-page">
                {pageLabels.map((lbl, idx) => (
                  <div key={idx} style={{ height: (100 / pageLabels.length) + "%" }} className="w-full flex justify-center items-center box-border pt-1.5 pb-0.5 px-3 relative flex-col overflow-hidden">
                    <div className="flex flex-col flex-1 w-full border-[3.5px] border-black rounded-2xl relative box-border p-2 bg-white overflow-hidden">
                      <div className="flex justify-between items-center border-b-[3px] border-black pb-1 mb-1 shrink-0">
                        <div className="flex items-center gap-1.5 font-display font-black text-[13px] tracking-tight">
                          <Truck className="w-5 h-5" strokeWidth={2.5} /> FRONTERAS EXPRESS
                        </div>
                        <div className="text-right font-black text-2xl tracking-tight leading-none overflow-hidden">{formatGuide(shipment.guideNumber)}</div>
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center relative z-10 w-[70%]">
                        <div className="text-[10px] font-black uppercase text-black mt-1">DESTINATARIO:</div>
                        <div className="w-16 border-b-[1.5px] border-gray-300 mb-1 block shrink-0"></div>
                        <div className="font-extrabold text-[15px] leading-tight uppercase line-clamp-1">{shipment.recipientName}</div>
                        <div className="text-[12px] leading-snug line-clamp-2 mt-0.5 text-gray-700">{shipment.recipientAddress}</div>
                        <div className="text-[14px] font-black uppercase mt-1 bg-gray-100 inline-block px-1.5 rounded self-start tracking-tight">{shipment.recipientCity}</div>
                      </div>
                      
                      <div className="absolute right-2 bottom-3 flex flex-col items-center shrink-0 z-20">
                        <QRCodeSVG value={trackingUrl} size={42} level="L" marginSize={0} />
                        <div className="text-[10px] font-black uppercase mt-2 bg-black text-white px-2 py-0.5 rounded-full leading-none tracking-widest whitespace-nowrap">
                          CAJA {lbl.number} / {quantityLabel}
                        </div>
                      </div>
                    </div>
                    {/* Intersecting line & telephone */}
                    <div className="flex items-center w-full px-2 mt-1 shrink-0">
                      <div className="text-[11px] font-bold tracking-tight whitespace-nowrap text-black z-10 bg-white pr-2">
                        Tel: {shipment.recipientPhone}
                      </div>
                      <div className="flex-1 border-t-[2.5px] border-dashed border-gray-400"></div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
