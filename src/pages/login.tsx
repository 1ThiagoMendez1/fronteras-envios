import { useState, useEffect } from "react"
import { Link } from "wouter"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

export default function Login() {
  const { login, isAuthenticated, isLoading: isAuthLoading, user, profile } = useAuth()
  const { toast } = useToast()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)

  // Redirección automática si ya está autenticado
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && user && profile) {
      if (profile.role === "operator") {
        window.location.href = "/clients"
      } else {
        window.location.href = "/dashboard"
      }
    }
  }, [isAuthenticated, isAuthLoading, user, profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (lockoutUntil && Date.now() < lockoutUntil) {
      const waitTime = Math.ceil((lockoutUntil - Date.now()) / 1000)
      toast({
        title: "Demasiados intentos",
        description: `Por favor espera ${waitTime} segundos antes de intentar de nuevo.`,
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      const loggedUser = await login({ email, password })
      
      setFailedAttempts(0)
      setLockoutUntil(null)

      // Redirigir inmediatamente según el rol
      const role = profile?.role || loggedUser?.user_metadata?.role
      if (role === "operator") {
        window.location.href = "/clients"
      } else {
        window.location.href = "/dashboard"
      }
    } catch (error) {
      console.error("Login failed:", error)
      setIsLoading(false)
      
      const newAttempts = failedAttempts + 1
      setFailedAttempts(newAttempts)
      
      if (newAttempts >= 3) {
        const cooldown = Math.min(300, Math.pow(2, newAttempts - 3) * 30)
        setLockoutUntil(Date.now() + cooldown * 1000)
        toast({
          title: "Acceso bloqueado temporalmente",
          description: `Demasiados intentos fallidos. Bloqueado por ${cooldown} segundos.`,
          variant: "destructive"
        })
      }
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-slate-50">
      {/* Left branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between bg-primary p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent opacity-90 z-0" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl z-0" />
        <div className="absolute bottom-20 -left-20 w-80 h-80 bg-accent/20 rounded-full blur-3xl z-0" />

        <div className="relative z-10 flex items-center gap-3 font-display">
          <img src="/logo-mark.png" alt="Fronteras Express" className="h-16 w-auto object-contain drop-shadow-lg" />
          <span className="text-2xl font-bold tracking-tight translate-y-2">FRONTERAS EXPRESS</span>
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
              <img src="/logo-mark.png" alt="Fronteras" className="h-20 w-auto object-contain drop-shadow-md" />
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

            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-all gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                "Verificando credenciales..."
              ) : (
                <>
                  Ingresar al Sistema Seguro
                  <ArrowRight className="ml-1 w-5 h-5" />
                </>
              )}
            </Button>
            
            <p className="flex justify-center items-center gap-2 text-xs text-muted-foreground mt-4 font-medium">
               <ShieldCheck className="w-4 h-4 text-emerald-500" /> Autenticación segura y cifrada de extremo a extremo
            </p>
          </form>



          <div className="pt-6 border-t border-border/50 text-center">
            <p className="text-sm text-slate-600">
              ¿No tienes cuenta en este entorno?{" "}
              <Link href="/register" className="text-primary font-bold hover:underline">
                Crea una cuenta nueva
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}