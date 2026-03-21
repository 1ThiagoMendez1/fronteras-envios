import { useState, useRef } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, ChevronRight, XCircle, Database, TrendingDown, DollarSign } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { motion } from "framer-motion"

type UploadStep = 'idle' | 'uploading' | 'validating' | 'results' | 'success'

export default function DataUploadPage() {
  const [step, setStep] = useState<UploadStep>('idle')
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const processFile = (file: File) => {
    setFileName(file.name)
    setStep('uploading')
    
    // Simulate upload
    setTimeout(() => {
      setStep('validating')
      // Simulate validation
      setTimeout(() => {
        setStep('results')
      }, 2500)
    }, 1500)
  }

  const handleConsolidate = () => {
    setStep('success')
  }

  const resetProcess = () => {
    setStep('idle')
    setFileName("")
  }

  // Mock validation results
  const validationSummary = {
    totalRows: 1245,
    validRows: 1210,
    warnings: 32,
    errors: 3,
    freightExpected: 42500000,
    freightReported: 41800000,
    negativeMarginGuides: 15
  }

  const errorDetails = [
    { row: 145, guide: "GUIA-8001", issue: "Guía no encontrada en el sistema", type: "error" },
    { row: 302, guide: "GUIA-8154", issue: "Diferencia de flete cobrado vs reportado", type: "warning" },
    { row: 512, guide: "GUIA-8290", issue: "Diferencia de flete cobrado vs reportado", type: "warning" },
    { row: 890, guide: "GUIA-8802", issue: "Estado actual difiere del reporte (Entregado vs En Tránsito)", type: "error" },
    { row: 1105, guide: "GUIA-9051", issue: "Ciudad destino no coincide", type: "error" }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header Banner */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden shadow-xl"
        >
          <div className="absolute right-0 top-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="relative z-10">
            <h1 className="text-3xl font-display font-bold">Procesamiento de Archivos</h1>
            <p className="text-slate-400 mt-2 max-w-lg text-sm leading-relaxed">Cargue los reportes de transportistas (Excel o CSV) para consolidar masivamente estados, costos de flete e incidencias hacia el Cierre Diario.</p>
          </div>
          <div className="relative z-10 grid grid-cols-2 gap-3 text-center md:text-left">
             <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Pendientes</p>
                <p className="text-xl font-bold">4 Archivos</p>
             </div>
             <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Última Carga</p>
                <p className="text-xl font-bold">Hace 2h</p>
             </div>
          </div>
        </motion.div>

        {/* Upload Zone */}
        {step === 'idle' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card 
               className={cn(
                 "border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-200", 
                 dragActive ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
               )}
               onDragEnter={handleDrag}
               onDragLeave={handleDrag}
               onDragOver={handleDrag}
               onDrop={handleDrop}
               onClick={() => inputRef.current?.click()}
            >
               <input ref={inputRef} type="file" className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleChange} />
               <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-6">
                 <UploadCloud className="w-10 h-10 text-slate-400" />
               </div>
               <h3 className="text-xl font-bold text-slate-800 mb-2">Arrastre su archivo Excel o CSV aquí</h3>
               <p className="text-sm text-slate-500 max-w-sm mx-auto mb-8">Formatos soportados: .xlsx, .xls, .csv hasta 50MB. El archivo debe contener las columnas de Guía, Estado y Flete.</p>
               <Button className="rounded-xl h-11 px-8 font-bold shadow-lg">Examinar Archivos</Button>
            </Card>
          </motion.div>
        )}

        {/* Processing State */}
        {(step === 'uploading' || step === 'validating') && (
           <Card className="rounded-3xl p-12 text-center bg-white border-slate-200">
             <div className="relative w-24 h-24 mx-auto mb-6">
               <motion.div 
                 animate={{ rotate: 360 }} 
                 transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                 className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-primary"
               />
               <div className="absolute inset-0 flex items-center justify-center">
                 {step === 'uploading' ? <UploadCloud className="w-8 h-8 text-primary" /> : <Database className="w-8 h-8 text-primary" />}
               </div>
             </div>
             <h3 className="text-2xl font-bold text-slate-800 mb-2">
               {step === 'uploading' ? 'Subiendo archivo...' : 'Validando estructura y datos...'}
             </h3>
             <p className="text-slate-500 font-medium">
               {fileName}
             </p>
             {step === 'validating' && (
                <div className="mt-8 max-w-md mx-auto space-y-3">
                   <div className="flex justify-between text-xs font-bold text-slate-500 uppercase"><span>Progreso</span><span>78%</span></div>
                   <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div initial={{ width: "20%" }} animate={{ width: "78%" }} transition={{ duration: 2 }} className="h-full bg-primary rounded-full"></motion.div>
                   </div>
                   <p className="text-xs text-slate-400">Analizando fila 964 de 1245...</p>
                </div>
             )}
           </Card>
        )}

        {/* Results State */}
        {step === 'results' && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <Card className="p-5 rounded-2xl bg-white border-slate-200 flex items-center gap-4">
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><FileSpreadsheet className="w-6 h-6" /></div>
                 <div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total Filas</p><p className="text-2xl font-bold text-slate-900">{validationSummary.totalRows}</p></div>
               </Card>
               <Card className="p-5 rounded-2xl bg-white border-slate-200 flex items-center gap-4">
                 <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 className="w-6 h-6" /></div>
                 <div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Correctas</p><p className="text-2xl font-bold text-slate-900">{validationSummary.validRows}</p></div>
               </Card>
               <Card className="p-5 rounded-2xl bg-white border-slate-200 flex items-center gap-4">
                 <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><AlertCircle className="w-6 h-6" /></div>
                 <div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Advertencias</p><p className="text-2xl font-bold text-slate-900">{validationSummary.warnings}</p></div>
               </Card>
               <Card className="p-5 rounded-2xl bg-white border-slate-200 flex items-center gap-4">
                 <div className="p-3 bg-red-50 text-red-600 rounded-xl"><XCircle className="w-6 h-6" /></div>
                 <div><p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Errores críticos</p><p className="text-2xl font-bold text-slate-900">{validationSummary.errors}</p></div>
               </Card>
             </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <Card className="p-6 rounded-3xl bg-white border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-800 font-bold mb-4">
                    <DollarSign className="w-5 h-5 text-emerald-500" />
                    <h4>Auditoría de Fletes</h4>
                  </div>
                  <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                    <span className="text-sm text-slate-500">Total Esperado en Sistema</span>
                    <span className="font-bold text-slate-800">{formatCurrency(validationSummary.freightExpected)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Total Reportado Transportista</span>
                    <span className="font-bold text-rose-600">{formatCurrency(validationSummary.freightReported)}</span>
                  </div>
                  <div className="mt-4 p-3 bg-rose-50 rounded-xl border border-rose-100 flex items-start gap-2 text-rose-800 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>Se detectó una diferencia desfavorable de <strong>{formatCurrency(validationSummary.freightExpected - validationSummary.freightReported)}</strong> en el reporte.</p>
                  </div>
                </Card>

                <Card className="p-6 rounded-3xl bg-white border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-800 font-bold mb-6">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
                    <h4>Resumen de Inconsistencias</h4>
                  </div>
                  <div className="space-y-4">
                    <div className="group border border-slate-200 rounded-2xl overflow-hidden text-sm">
                      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between cursor-pointer group-hover:bg-slate-100 transition-colors border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="font-bold text-slate-700">Errores Críticos Bloqueantes</span>
                        </div>
                        <span className="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-md text-xs">3 guías</span>
                      </div>
                      <div className="p-4 bg-white space-y-2">
                         <div className="flex justify-between items-center text-xs"><span className="text-slate-500"><span className="font-bold text-slate-700">GUIA-8001</span> (Fila 145)</span> <span className="text-slate-600 max-w-[200px] truncate" title="No encontrada en sistema">No encontrada en sistema</span></div>
                         <div className="flex justify-between items-center text-xs"><span className="text-slate-500"><span className="font-bold text-slate-700">GUIA-8802</span> (Fila 890)</span> <span className="text-slate-600 max-w-[200px] truncate" title="Estado difiere (Entregado vs En Tránsito)">Estado difiere</span></div>
                         <div className="flex justify-between items-center text-xs"><span className="text-slate-500"><span className="font-bold text-slate-700">GUIA-9051</span> (Fila 1105)</span> <span className="text-slate-600 max-w-[200px] truncate" title="Ciudad destino no coincide">Ciudad no coincide</span></div>
                      </div>
                    </div>
                    
                    <div className="group border border-slate-200 rounded-2xl overflow-hidden text-sm">
                      <div className="bg-slate-50 px-4 py-3 flex items-center justify-between cursor-pointer group-hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-500" />
                          <span className="font-bold text-slate-700">Advertencias de Auditoría</span>
                        </div>
                        <span className="bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-md text-xs">32 guías</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

             <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" className="h-12 px-6 rounded-xl font-bold" onClick={resetProcess}>Cancelar y Subir Otro</Button>
                <Button className="h-12 px-8 rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg" onClick={handleConsolidate}>
                  Consolidar Datos Válidos <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
             </div>
           </motion.div>
        )}

        {/* Success State */}
        {step === 'success' && (
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
             <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
               <CheckCircle2 className="w-10 h-10 text-emerald-600" />
             </div>
             <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Consolidación Exitosa!</h3>
             <p className="text-slate-500 max-w-sm mx-auto mb-8">Se han actualizado los estados y costos de 1,210 guías en el sistema. Los datos ya están disponibles para el Cierre Diario.</p>
             <div className="flex justify-center gap-4">
               <Button variant="outline" className="h-11 px-6 rounded-xl font-bold" onClick={resetProcess}><RefreshCw className="w-4 h-4 mr-2" /> Procesar Otro Archivo</Button>
               <Button className="h-11 px-8 rounded-xl font-bold shadow-lg" onClick={() => window.location.href='/daily-close'}>Ir al Cierre Diario</Button>
             </div>
           </motion.div>
        )}

      </div>
    </DashboardLayout>
  )
}
