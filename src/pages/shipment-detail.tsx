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
import { ArrowLeft, Printer, Truck, MapPin, Building, Phone, Package } from "lucide-react"
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

  const [localSignature, setLocalSignature] = useState<string | null>(null)
  const [localDriverId, setLocalDriverId] = useState<string | null>(null)
  const [isReassigning, setIsReassigning] = useState(false)
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)

  // Labels print state
  const [printType, setPrintType] = useState<"guide" | "labels">("guide")
  const [isLabelsDialogOpen, setIsLabelsDialogOpen] = useState(false)
  const [labelsCount, setLabelsCount] = useState<number>(1)

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

  const handlePrintGuide = () => {
    setPrintType("guide")
    setTimeout(() => window.print(), 350)
  }

  const handlePrintLabels = () => {
    setPrintType("labels")
    setIsLabelsDialogOpen(false)
    setTimeout(() => window.print(), 350)
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

  // Generate chunks of up to 4 labels each
  const labelChunks = []
  for (let i = 0; i < labelsCount; i += 4) {
    labelChunks.push(Array.from({ length: Math.min(4, labelsCount - i) }, (_, index) => i + index + 1))
  }

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
            <Dialog open={isLabelsDialogOpen} onOpenChange={setIsLabelsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl h-11 font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4" /> Rótulos
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xs rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Imprimir Rótulos de Cajas</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cantidad de Cajas</label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="100"
                      value={labelsCount} 
                      onChange={e => setLabelsCount(parseInt(e.target.value) || 1)}
                      className="rounded-xl h-12 text-lg text-center font-bold"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                       Se agruparán hasta 4 rótulos por hoja (100x150mm) para ahorrar papel.
                    </p>
                  </div>
                  <Button className="w-full h-12 rounded-xl" onClick={handlePrintLabels}>
                    <Printer className="w-4 h-4 mr-2" /> Imprimir {labelsCount} Rótulo(s)
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Button variant="secondary" onClick={handlePrintGuide} className="rounded-xl h-11 font-semibold">
              <Printer className="w-4 h-4 mr-2" /> Imprimir Guía
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
                        <SelectItem value="out_for_delivery">En Entrega</SelectItem>
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
                  <p className="text-slate-600 flex items-center gap-2"><Phone className="w-3.5 h-3.5"/> {shipment.recipientPhone}</p>
                  <p className="text-slate-600 flex items-start gap-2"><Building className="w-3.5 h-3.5 mt-0.5"/> {shipment.recipientAddress}</p>
                </div>
              </Card>
            </div>

            {/* Financial Details */}
            <Card className="p-6 rounded-2xl shadow-sm border-border/50 resize overflow-auto min-h-[150px] max-w-full">
              <h3 className="text-lg font-bold text-foreground mb-4">Detalles del Paquete</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
              </div>
              {shipment.observations && (
                <div className="mt-6 p-4 bg-amber-50 text-amber-900 rounded-xl text-sm border border-amber-100">
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
        @page {
          size: 100mm 150mm;
          margin: 0 !important;
        }
        
        @media print {
          /* Reset root flow to prevent cropping */
          * {
            overflow: visible !important;
          }
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          /* Hide all default elements visually but preserve flow so CSS parses 100% safely */
          body * {
            visibility: hidden;
            box-sizing: border-box;
          }
          /* Strip all layout structural gaps (like top headers and padding) from ancestors */
          #root, #root > div, main {
            position: static !important;
            padding: 0 !important;
            margin: 0 !important;
            transform: none !important;
          }
          .no-print {
            display: none !important;
          }
          #print-area-container, #print-area-container * {
            visibility: visible !important;
          }
          #print-area-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            margin: 0 !important;
            z-index: 99999 !important;
            display: block !important;
            background: white !important;
          }
          .guide-print {
            width: 100vw !important;
            height: 100vh !important;
            overflow: hidden !important;
          }
          .sheet {
            width: 100vw !important;
            height: 100vh !important;
            page-break-after: always;
            break-after: page;
            display: flex;
            flex-direction: column;
            overflow: hidden !important;
            background: white;
          }
        }
      `}</style>
      
      <div id="print-area-container" className="hidden print:block bg-white text-black font-sans box-border w-full">
        
        {printType === "guide" && (
          <div className="guide-print flex flex-col px-2 pt-0 pb-1 box-border">
            {/* Header */}
            <div className="flex items-center justify-between border-b-[3px] border-black pb-1 mb-2">
              <div className="flex items-center gap-1 font-display font-black">
                <Truck className="w-8 h-8" />
                <span className="leading-tight text-xl tracking-tighter">FRONTERAS<br/>EXPRESS</span>
              </div>
              <div className="text-right flex-1 ml-2">
                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">{formatGuide(shipment.guideNumber)}</h2>
                <p className="text-[10px] font-bold leading-tight mt-1 uppercase">Guía de Transporte</p>
              </div>
            </div>

            {/* Sender & Recipient Blocks */}
            <div className="flex flex-col border-[3px] border-black rounded-xl overflow-hidden mb-3">
              <div className="flex">
                {/* Sender */}
                <div className="w-1/2 p-2 border-r-[3px] border-black border-b-[3px]">
                  <h3 className="text-[11px] font-black uppercase border-b-2 border-black pb-0.5 mb-1.5 text-black px-1 -mx-2 -mt-2">REMITENTE</h3>
                  <p className="font-extrabold text-[13px] leading-tight line-clamp-2 uppercase text-black">{shipment.senderName}</p>
                  <p className="text-[11px] mt-1 leading-tight line-clamp-2 text-black">{shipment.senderAddress}</p>
                  <p className="text-[12px] font-black mt-1 uppercase text-black">{shipment.senderCity}</p>
                  <p className="text-[11px] mt-0.5 font-bold text-black">Tel: {shipment.senderPhone}</p>
                </div>
                {/* Recipient */}
                <div className="w-1/2 p-2 border-b-[3px] border-black">
                  <h3 className="text-[11px] font-black uppercase border-b-2 border-black pb-0.5 mb-1.5 text-black px-1 -mx-2 -mt-2">DESTINATARIO</h3>
                  <p className="font-extrabold text-[14px] leading-tight line-clamp-2 uppercase text-black">{shipment.recipientName}</p>
                  <p className="text-[11px] mt-1 leading-tight line-clamp-3 text-black">{shipment.recipientAddress}</p>
                  <p className="text-[14px] font-black mt-1 uppercase text-black bg-gray-200 px-1 inline-block rounded">{shipment.recipientCity}</p>
                  <p className="text-[11px] mt-0.5 font-bold text-black">Tel: {shipment.recipientPhone}</p>
                </div>
              </div>
              
              {/* Details Row */}
              <div className="flex bg-gray-100">
                <div className="flex-1 p-2 border-r-[3px] border-black text-center flex flex-col justify-center">
                  <span className="text-[10px] font-black uppercase block">Peso</span>
                  <span className="text-lg font-black leading-none mt-1">{shipment.weight} <span className="text-xs">kg</span></span>
                </div>
                <div className="flex-1 p-2 border-r-[3px] border-black text-center flex flex-col justify-center">
                  <span className="text-[10px] font-black uppercase block">Declarado</span>
                  <span className="text-sm font-bold leading-none mt-1">{formatCurrency(shipment.declaredValue)}</span>
                </div>
                <div className="flex-1 p-2 text-center flex flex-col justify-center text-black">
                   <span className="text-[10px] font-black uppercase block">Total Flete</span>
                   <span className="text-lg font-black leading-none mt-1 text-black">{formatCurrency(shipment.shippingCost)}</span>
                </div>
              </div>
            </div>

            {/* Observation & QR */}
            <div className="flex gap-3 mb-3 flex-1">
              <div className="flex-1 border-[3px] border-black rounded-xl p-2 flex flex-col relative overflow-hidden">
                <span className="text-[11px] font-black uppercase block border-b-2 border-black pb-1 mb-1 relative z-10 w-full bg-white">OBSERVACIONES</span>
                <p className="text-[11px] leading-tight font-bold whitespace-pre-wrap overflow-hidden relative z-10">{shipment.observations || "Sin observaciones registradas."}</p>
              </div>
              <div className="w-[120px] flex flex-col items-center justify-center p-2 border-[3px] border-black rounded-xl shrink-0">
                 <QRCodeSVG value={trackingUrl} size={90} level="M" />
                 <p className="text-[9px] text-center mt-2 font-black w-full uppercase leading-tight bg-black text-white py-0.5 rounded">RASTREAR</p>
              </div>
            </div>

            <div className="border-t-[3px] border-black pt-1.5 mt-auto text-center text-[8px] font-bold leading-tight uppercase">
              Fronteras Express S.A.S. - El envío se rige por nuestras políticas.<br/>Consulte términos en www.fronterasexpress.com
            </div>
          </div>
        )}




        {printType === "labels" && (
          <div className="labels-print block w-full">
            {labelChunks.map((chunk, sheetIdx) => {
              const isCompact = chunk.length >= 3;
              const isUltraCompact = chunk.length === 4;
              return (
                <div key={sheetIdx} className="sheet">
                  {chunk.map(labelNum => {
                    const boxLetter = String.fromCharCode(64 + labelNum); // 1->A, 2->B, etc.
                    return (
                      <div key={labelNum} className="flex-1 flex relative overflow-hidden box-border border-b-[2px] border-dashed border-black last:border-b-0 w-full">
                        <div className={cn("flex-1 flex flex-col justify-center w-full h-full", isUltraCompact ? "p-1.5" : "p-2")}>
                          <div className={cn("flex justify-between items-center border-b-[2px] border-black", isUltraCompact ? "pb-0.5 mb-0.5" : "pb-1 mb-1")}>
                            <div className="flex flex-col">
                               <div className={cn("font-black uppercase tracking-tighter leading-none", isUltraCompact ? "text-lg" : isCompact ? "text-xl" : "text-3xl")}>
                                  {formatGuide(shipment.guideNumber)}
                               </div>
                               <div className={cn("font-bold text-gray-500", isUltraCompact ? "hidden" : isCompact ? "text-[8px] mt-0.5" : "text-[10px] mt-1")}>
                                  GUÍA SECUNDARIA DE ROTULADO
                               </div>
                            </div>
                            <div className={cn("font-black bg-black text-white px-2 rounded-sm uppercase tracking-wider text-center flex flex-col items-center justify-center", isUltraCompact ? "py-0.5 text-xs" : isCompact ? "py-1 text-sm" : "py-1 text-2xl")}>
                              <span>CAJA {boxLetter}</span>
                              <span className={cn("font-bold text-gray-300", isUltraCompact ? "text-[7px] mt-0" : isCompact ? "text-[8px] mt-0.5" : "text-sm mt-0.5")}>Pza {labelNum}/{labelsCount}</span>
                            </div>
                          </div>
                          
                          <div className="flex-1 flex flex-col justify-center">
                              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-0">Destinatario</span>
                              <span className={cn("font-extrabold uppercase leading-none line-clamp-1", isUltraCompact ? "text-xs mt-0.5" : isCompact ? "text-sm mt-0.5" : "text-xl mt-1")}>
                                {shipment.recipientName}
                              </span>
                              <span className={cn("font-black bg-gray-200 self-start px-1 rounded uppercase", isUltraCompact ? "mt-0.5 text-[9px]" : isCompact ? "mt-1 text-xs" : "mt-1 text-lg")}>
                                {shipment.recipientCity}
                              </span>
                              <span className={cn("font-medium leading-tight line-clamp-2", isUltraCompact ? "mt-0.5 text-[9px]" : isCompact ? "mt-1 text-[10px]" : "mt-1 text-sm")}>
                                {shipment.recipientAddress}
                              </span>
                              <span className={cn("font-bold", isUltraCompact ? "mt-0 text-[8px]" : isCompact ? "mt-0.5 text-[9px]" : "mt-0.5 text-xs")}>
                                Tel: {shipment.recipientPhone}
                              </span>
                          </div>

                          {/* Add Sender info horizontally if we have space (chunk < 3) */}
                          {!isCompact && (
                             <div className="mt-2 flex gap-2 w-full">
                               <div className="flex-1 border border-black p-1.5 rounded bg-gray-50">
                                 <span className="text-[9px] font-black uppercase text-gray-600 block mb-0.5">Remitente</span>
                                 <p className="text-[12px] font-bold truncate">{shipment.senderName}</p>
                                 <p className="text-[10px] truncate">{shipment.senderCity}</p>
                               </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
