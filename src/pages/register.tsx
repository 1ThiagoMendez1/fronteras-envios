import { useState } from "react"
import { useLocation, Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Truck, UserPlus } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function Register() {
  const [, setLocation] = useLocation()
  const { toast } = useToast()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("admin")
  const [isLoading, setIsLoading] = useState(false)

  const validatePassword = (pass: string) => {
    const minLength = 8
    const hasUpper = /[A-Z]/.test(pass)
    const hasNumber = /[0-9]/.test(pass)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass)
    
    if (pass.length < minLength) return "La contraseña debe tener al menos 8 caracteres."
    if (!hasUpper) return "Debe incluir al menos una mayúscula."
    if (!hasNumber) return "Debe incluir al menos un número."
    if (!hasSpecial) return "Debe incluir al menos un carácter especial."
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const passwordError = validatePassword(password)
    if (passwordError) {
      toast({ title: "Seguridad insuficiente", description: passwordError, variant: "destructive" })
      return
    }

    if (password !== confirmPassword) {
      toast({ title: "Error de validación", description: "Las contraseñas no coinciden.", variant: "destructive" })
      return
    }

    setIsLoading(true)

    try {
      // 1. Crear el usuario en auth de Supabase
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          }
        }
      })

      if (error) throw error

      toast({
        title: "Registro exitoso",
        description: "Tu cuenta ha sido creada. Ahora puedes iniciar sesión.",
      })
      setLocation("/login")
    } catch (error: any) {
      console.error("Registration failed:", error)
      toast({
        title: "Error al registrar",
        description: error.message || "Ocurrió un error inesperado al registrar",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-slate-50">
      {/* Left branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-primary p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent opacity-90 z-0" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl z-0" />
        <div className="absolute bottom-20 -left-20 w-80 h-80 bg-accent/20 rounded-full blur-3xl z-0" />

        <div className="relative z-10 flex items-center gap-3 font-display text-2xl font-bold tracking-tight">
          <div className="bg-white text-primary p-2.5 rounded-xl shadow-lg">
            <Truck className="h-6 w-6" />
          </div>
          <span>FRONTERAS EXPRESS</span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-5xl font-display font-bold leading-tight mb-6">
            Únete a la nueva era,
            <br />
            <span className="text-accent">logística inteligente.</span>
          </h1>

          <p className="text-lg text-primary-foreground/80 leading-relaxed">
            Crea tu cuenta de acceso maestro para empezar a gestionar operaciones.
          </p>
        </div>

        <div className="relative z-10 text-sm font-medium text-primary-foreground/60">
          © 2024 Fronteras Express
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-8 my-auto">
          <div className="text-center lg:text-left space-y-2">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="bg-primary text-white p-3 rounded-2xl shadow-lg">
                <Truck className="h-8 w-8" />
              </div>
            </div>

            <h2 className="text-3xl font-display font-bold text-foreground">
              Crear Cuenta
            </h2>

            <p className="text-muted-foreground">
              Registra un nuevo usuario para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-12 bg-white rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-white rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres, números y símbolos"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-white rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-12 bg-white rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Rol del Usuario</Label>
                <Select
                  value={role}
                  onValueChange={(value) => setRole(value)}
                >
                  <SelectTrigger className="h-12 bg-white rounded-xl">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="operator">Operador</SelectItem>
                    <SelectItem value="driver">Conductor</SelectItem>
                    <SelectItem value="client">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                "Registrando..."
              ) : (
                <>
                  <UserPlus className="mr-2 w-5 h-5" />
                  Registrar Cuenta
                </>
              )}
            </Button>
          </form>

          <div className="pt-6 border-t border-border/50 text-center">
            <p className="text-sm text-slate-600">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-primary font-bold hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
