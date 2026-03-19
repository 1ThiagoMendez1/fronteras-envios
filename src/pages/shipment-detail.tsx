import { useState, useRef } from "react"
import { useRoute, Link } from "wouter"
import SignatureCanvas from "react-signature-canvas"
// Mock hooks to replace useGetShipment and useListDrivers
const useGetShipment = (_id: number, _options?: any) => ({
  data: {
    id: _id, guideNumber: `GUIA-${1000 + _id}`, senderName: "Empresa A", senderCity: "Bogota", senderPhone: "3001234567", senderAddress: "Calle Principal 123", recipientName: "Cliente B", recipientCity: "Medellin", recipientPhone: "3109876543", recipientAddress: "Carrera 45 #67-89", weight: 5.5, declaredValue: 50000, shippingCost: 15000, driverPayment: 10000, branchOrigin: "Bogotá", status: "in_transit", createdAt: new Date().toISOString(), driverId: null, driverName: "Carlos Sanchez", driverSignature: null, observations: "Ninguna", history: [{ id: 1, status: "created", createdAt: new Date().toISOString(), note: "Creado" }]
  },
  isLoading: false
})
const useListDrivers = () => ({
  data: [
    { id: 1, name: "Carlos Sanchez", vehicleType: "Camión", city: "Bogota", isActive: true },
    { id: 2, name: "Luisa Pinto", vehicleType: "Furgón", city: "Medellin", isActive: true }
  ],
  isLoading: false
})
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCurrency, getStatusColor, getStatusLabel, cn } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, Printer, Truck, MapPin, Building, Phone } from "lucide-react"
import { useUpdateShipmentStatusMutation, useAssignDriverMutation } from "@/hooks/use-shipments-wrapper"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { QRCodeSVG } from "qrcode.react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ChatBox } from "@/components/chat-box"

export default function ShipmentDetail() {
  const [, params] = useRoute("/shipments/:id")
  const id = parseInt(params?.id || "0")
  
  const { data: shipment, isLoading } = useGetShipment(id, { query: { enabled: !!id } })
  const { data: drivers } = useListDrivers()
  
  const statusMutation = useUpdateShipmentStatusMutation(id)
  const assignMutation = useAssignDriverMutation(id)

  const [newStatus, setNewStatus] = useState<any>("")
  const [statusNote, setStatusNote] = useState("")
  const [driverId, setDriverId] = useState<string>("")
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false)
  const sigCanvas = useRef<SignatureCanvas>(null)

  // Local state for signature and driver display (mocking actual persistence hook)
  const [localSignature, setLocalSignature] = useState<string | null>(null)
  const [localDriverId, setLocalDriverId] = useState<string | null>(null)

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
      id, 
      data: { status: newStatus, note: statusNote }
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
    if (!driverId) return
    let sig = null;
    try {
      if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
        sig = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png")
      }
    } catch(e) { console.error(e) }
    
    await assignMutation.mutateAsync({
      id,
      data: { driverId: parseInt(driverId), driverSignature: sig }
    })
    
    if (sig) setLocalSignature(sig)
    setLocalDriverId(driverId)
    setIsSignatureDialogOpen(false)
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
            <p class="subtitle">Fronteras Express - <strong>Guía ${shipment.guideNumber}</strong></p>
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
            Yo, <strong>${effectiveDriverName}</strong>, con vehículo tipo <strong>${driverInfo?.vehicleType || 'N/A'}</strong>, certifico formalmente que he recibido los paquetes correspondientes a la guía <strong>${shipment.guideNumber}</strong> en perfectas condiciones por parte de Fronteras Express. Me comprometo responsablemente a realizar el traslado y la entrega de la mercancía en <strong>${shipment.recipientCity}</strong>, asumiendo toda la responsabilidad civil, contractual y comercial sobre el estado de la mercancía hasta su destino final según lo estipulado.
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

  const effectiveDriverId = localDriverId || shipment.driverId;
  const driverObj = effectiveDriverId ? drivers?.find(d => d.id.toString() === effectiveDriverId.toString()) : null;
  const effectiveDriverName = driverObj ? driverObj.name : shipment.driverName;

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-20 no-print">
        
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
                <h1 className="text-3xl font-display font-bold text-foreground">Guía {shipment.guideNumber}</h1>
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
            <Button variant="secondary" onClick={handlePrint} className="rounded-xl h-11 font-semibold">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (Details) */}
          <div className="col-span-1 lg:col-span-2 space-y-6">
            {/* Origin & Destination Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 rounded-2xl shadow-sm border-border/50">
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

              <Card className="p-6 rounded-2xl shadow-sm border-border/50 bg-blue-50/30 border-blue-100">
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
            <Card className="p-6 rounded-2xl shadow-sm border-border/50">
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

            {/* Profit Margin Info */}
            <Card className="p-6 rounded-2xl shadow-sm border-border/50 bg-green-50/50 border-green-100 mt-4">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm font-bold text-green-800 uppercase tracking-widest mb-1">Margen de Ganancia (Sede {shipment.branchOrigin})</p>
                   <p className="text-xs text-green-700">Cobro al cliente ({formatCurrency(shipment.shippingCost)}) - Pago T. ({formatCurrency(shipment.driverPayment)})</p>
                 </div>
                 <div className="text-2xl font-black text-green-700">
                    {formatCurrency(shipment.shippingCost - shipment.driverPayment)}
                 </div>
               </div>
            </Card>

            {/* Driver Assignment */}
            <Card className="p-6 rounded-2xl shadow-sm border-border/50">
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
                      <Button variant="outline" size="sm" onClick={() => { setLocalDriverId(null); setLocalSignature(null); }} className="h-9">Reasignar</Button>
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
                  
                  <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
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
                </div>
              )}
            </Card>
          </div>

          {/* Right Column (Timeline) */}
          <div className="col-span-1">
            <Card className="p-6 rounded-2xl shadow-sm border-border/50 sticky top-24">
              <h3 className="text-lg font-bold text-foreground mb-6">Historial del Envío</h3>
              
              <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-[15px] before:h-full before:w-0.5 before:bg-slate-200">
                {shipment.history?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((item) => (
                  <div key={item.id} className="relative">
                    <div className="absolute -left-[35px] mt-1 w-5 h-5 rounded-full bg-white border-2 border-primary z-10"></div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">{getStatusLabel(item.status)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {format(new Date(item.createdAt), "d MMM, HH:mm", { locale: es })}
                      </p>
                      {item.note && (
                        <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded border">
                          {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="mt-6 h-[500px]">
              <ChatBox guideNumber={shipment.guideNumber} isAdmin={true} className="h-full" />
            </div>
          </div>
        </div>
      </div>

      {/* PRINT ONLY SECTION - This matches an actual shipping guide style */}
      <div id="print-area" className="hidden print:block p-8 bg-white text-black font-sans w-full">
        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center gap-3 font-display text-2xl font-bold">
            <Truck className="w-8 h-8" />
            <span>FRONTERAS EXPRESS</span>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold uppercase tracking-widest">{shipment.guideNumber}</h2>
            <p className="text-sm font-medium">Guía de Transporte de Carga</p>
          </div>
        </div>

        <div className="flex justify-between mb-8">
          <div className="w-3/4 pr-8">
            <div className="grid grid-cols-2 gap-4 border-2 border-black rounded-lg overflow-hidden">
              <div className="p-4 border-r-2 border-black">
                <h3 className="text-xs font-bold uppercase mb-2 border-b border-gray-300 pb-1">Remitente</h3>
                <p className="font-bold text-lg">{shipment.senderName}</p>
                <p className="text-sm mt-1">{shipment.senderAddress}</p>
                <p className="text-sm font-bold mt-1">{shipment.senderCity}</p>
                <p className="text-sm mt-1">Tel: {shipment.senderPhone}</p>
              </div>
              <div className="p-4">
                <h3 className="text-xs font-bold uppercase mb-2 border-b border-gray-300 pb-1">Destinatario</h3>
                <p className="font-bold text-lg">{shipment.recipientName}</p>
                <p className="text-sm mt-1">{shipment.recipientAddress}</p>
                <p className="text-sm font-bold mt-1">{shipment.recipientCity}</p>
                <p className="text-sm mt-1">Tel: {shipment.recipientPhone}</p>
              </div>
            </div>

            <div className="mt-4 flex border-2 border-black rounded-lg overflow-hidden">
              <div className="flex-1 p-3 border-r-2 border-black">
                <span className="text-xs font-bold uppercase block">Peso</span>
                <span className="text-lg font-bold">{shipment.weight} kg</span>
              </div>
              <div className="flex-1 p-3 border-r-2 border-black">
                <span className="text-xs font-bold uppercase block">Valor Declarado</span>
                <span className="text-lg font-bold">{formatCurrency(shipment.declaredValue)}</span>
              </div>
              <div className="flex-1 p-3 bg-gray-100">
                <span className="text-xs font-bold uppercase block">Costo Flete</span>
                <span className="text-lg font-bold">{formatCurrency(shipment.shippingCost)}</span>
              </div>
            </div>

            {shipment.observations && (
              <div className="mt-4 p-3 border-2 border-black rounded-lg">
                <span className="text-xs font-bold uppercase block mb-1">Observaciones</span>
                <p className="text-sm">{shipment.observations}</p>
              </div>
            )}
          </div>

          <div className="w-1/4 flex flex-col items-center justify-start pt-2">
            <QRCodeSVG value={trackingUrl} size={150} level="H" includeMargin={false} />
            <p className="text-xs text-center mt-3 font-bold w-full uppercase">Escanee para<br/>rastrear paquete</p>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 pt-8 border-t border-dashed border-gray-400">
          <div className="border-b border-black pb-1 mb-8 relative">
            <span className="absolute bottom-1 left-0 text-xs font-bold text-gray-500">Firma Remitente / Sello</span>
          </div>
          <div className="border-b border-black pb-1 mb-8 relative">
            <span className="absolute bottom-1 left-0 text-xs font-bold text-gray-500">Firma Destinatario (Recibido conforme)</span>
          </div>
        </div>
        <p className="text-[10px] text-center mt-8 text-gray-500">Fronteras Express - Más que rápido, siempre a tiempo. El envío de este paquete se rige por las políticas de transporte nacional publicadas en nuestro portal. Para más información consulte en www.fronterasexpress.com</p>
      </div>
    </DashboardLayout>
  )
}
