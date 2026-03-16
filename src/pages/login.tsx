import { useState } from "react"
import { useLocation } from "wouter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Truck, ArrowRight, ShieldCheck } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type LoginRequestRole = "admin" | "operator" | "driver" | "client"

export default function Login() {
  const [, setLocation] = useLocation()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<LoginRequestRole>("admin")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    setTimeout(() => {
      console.log({
        email,
        password,
        role,
      })

      setLocation("/")
      setIsLoading(false)
    }, 1000)
  }

  const demoCredentials: Record<
    string,
    { email: string; password: string; role: LoginRequestRole }
  > = {
    admin: { email: "admin@fronteras.com", password: "admin123", role: "admin" },
    operator: {
      email: "operator@fronteras.com",
      password: "op123",
      role: "operator",
    },
    driver: {
      email: "driver@fronteras.com",
      password: "driver123",
      role: "driver",
    },
    client: {
      email: "cliente@fronteras.com",
      password: "cliente123",
      role: "client",
    },
  }

  const fillDemo = (roleType: string) => {
    const creds = demoCredentials[roleType]
    if (creds) {
      setEmail(creds.email)
      setPassword(creds.password)
      setRole(creds.role)
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
            Más que rápido,
            <br />
            <span className="text-accent">siempre a tiempo.</span>
          </h1>

          <p className="text-lg text-primary-foreground/80 leading-relaxed">
            Plataforma logística integral para la gestión inteligente de
            envíos, conductores y control financiero.
          </p>
        </div>

        <div className="relative z-10 text-sm font-medium text-primary-foreground/60">
          © 2024 Fronteras Express
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="bg-primary text-white p-3 rounded-2xl shadow-lg">
                <Truck className="h-8 w-8" />
              </div>
            </div>

            <h2 className="text-3xl font-display font-bold text-foreground">
              Iniciar Sesión
            </h2>

            <p className="text-muted-foreground">
              Ingresa tus credenciales para acceder al sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-white rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Rol de Acceso</Label>

                <Select
                  value={role}
                  onValueChange={(value: LoginRequestRole) => setRole(value)}
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
                "Ingresando..."
              ) : (
                <>
                  Ingresar al Sistema
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          {/* Demo */}
          <div className="pt-8 border-t border-border/50">
            <p className="text-xs text-center text-muted-foreground font-medium mb-4 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Accesos de Demostración
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fillDemo("admin")}
              >
                Admin
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fillDemo("operator")}
              >
                Operador
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fillDemo("driver")}
              >
                Conductor
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fillDemo("client")}
              >
                Cliente
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}