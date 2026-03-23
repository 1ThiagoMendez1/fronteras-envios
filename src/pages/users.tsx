import { useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useUsers, UserProfile } from "@/hooks/use-users"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  MoreHorizontal, 
  UserPlus, 
  Shield, 
  UserCheck, 
  UserX, 
  Mail, 
  Calendar,
  ShieldAlert,
  Edit2,
  ShieldCheck,
  Key,
  Activity,
  Lock,
  Users as UsersIcon
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Card } from "@/components/ui/card"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function UsersPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isPermsDialogOpen, setIsPermsDialogOpen] = useState(false)
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "operator" as any })
  const { users, isLoading, updateRole, toggleStatus, updatePermissions, createUser } = useUsers()

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error("Por favor completa todos los campos")
      return
    }
    try {
      await createUser(newUser)
      setIsCreateDialogOpen(false)
      setNewUser({ name: "", email: "", password: "", role: "operator" })
    } catch (e) {}
  }

  const handleUpdatePerms = async () => {
    if (selectedUser) {
      await updatePermissions(selectedUser.id, selectedUser.permissions || {})
      setIsPermsDialogOpen(false)
    }
  }

  const togglePermission = (key: string) => {
    if (!selectedUser) return
    const current = selectedUser.permissions || {}
    setSelectedUser({
      ...selectedUser,
      permissions: {
        ...current,
        [key]: !current[key]
      }
    })
  }
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false)

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default" className="bg-indigo-600 hover:bg-indigo-700">Administrador</Badge>
      case "operator":
        return <Badge variant="secondary">Operador</Badge>
      case "driver":
        return <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50">Conductor</Badge>
      case "client":
        return <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Cliente</Badge>
      default:
        return <Badge variant="secondary">{role}</Badge>
    }
  }

  const handleToggleStatus = (user: UserProfile) => {
    toggleStatus({ id: user.id, isActive: !user.is_active })
  }

  const handleUpdateRole = (user: UserProfile) => {
    setSelectedUser(user)
    setIsEditRoleOpen(true)
  }

  const handlePermissions = (user: UserProfile) => {
    setSelectedUser(user)
    setIsPermsDialogOpen(true)
  }

  const onUpdateRole = (newRole: "admin" | "operator" | "driver" | "client") => {
    if (selectedUser) {
      updateRole({ id: selectedUser.id, role: newRole })
      setIsEditRoleOpen(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Gestión de Usuarios</h1>
            <p className="text-muted-foreground mt-1">Administra accesos, roles y permisos del sistema.</p>
          </div>
          <Button 
            className="rounded-xl gap-2 font-semibold shadow-sm"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Usuario
          </Button>
        </div>

        <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden bg-white">
          <div className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6 py-4">Usuario</TableHead>
                  <TableHead className="px-6 py-4">Rol</TableHead>
                  <TableHead className="px-6 py-4">Estado</TableHead>
                  <TableHead className="px-6 py-4">Último Acceso</TableHead>
                  <TableHead className="px-6 py-4 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="h-16 animate-pulse bg-slate-50/50" />
                    </TableRow>
                  ))
                ) : (
                  users?.map((user) => (
                    <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{user.name}</span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {user.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="px-6 py-4">
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                            <span className="w-2 h-2 rounded-full bg-slate-300" /> Inactivo
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-slate-500 text-xs">
                        {user.last_login ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(user.last_login), "d MMM, HH:mm", { locale: es })}
                          </div>
                        ) : "Nunca"}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-border/50">
                            <DropdownMenuLabel className="text-xs font-bold text-slate-500 uppercase tracking-widest p-3">Acciones</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleUpdateRole(user)} className="px-3 py-2.5 cursor-pointer gap-2 rounded-lg">
                              <Shield className="w-4 h-4 text-indigo-500" /> Cambiar Rol
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePermissions(user)} className="px-3 py-2.5 cursor-pointer gap-2 rounded-lg">
                              <ShieldCheck className="w-4 h-4 text-primary" /> Permisos Granulares
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(user)} className="px-3 py-2.5 cursor-pointer gap-2 rounded-lg">
                              {user.is_active ? (
                                <><UserX className="w-4 h-4 text-red-500" /> Desactivar Acceso</>
                              ) : (
                                <><UserCheck className="w-4 h-4 text-emerald-500" /> Activar Acceso</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="px-3 py-2.5 cursor-pointer gap-2 rounded-lg text-red-600 focus:bg-red-50 focus:text-red-700">
                              <ShieldAlert className="w-4 h-4" /> Revocar Permisos
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Roles & Permissions Reference Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card className="p-6 rounded-3xl border-border/50 bg-white shadow-sm">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary" />
              Matriz de Permisos por Rol
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <Badge className="bg-indigo-600">Admin</Badge>
                <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                  Control total del sistema: gestión de usuarios, auditoría financiera, configuración de tarifas y eliminación de envíos.
                </p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <Badge variant="secondary">Operador</Badge>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Gestión operativa: creación de envíos, asignación de conductores, cierres de caja y actualización de estados.
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 rounded-3xl border-border/50 bg-slate-900 text-white shadow-lg overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 relative z-10">
              <Info className="w-5 h-5 text-accent" />
              Seguridad del Sistema
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed font-medium relative z-10">
              Todos los accesos están protegidos por Row Level Security (RLS) en el nivel de base de datos. Los cambios en roles y permisos se registran en los logs de auditoría para trazabilidad completa.
            </p>
            <div className="mt-6 flex gap-3 relative z-10">
              <div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold border border-white/10 italic">Cifrado AES-256</div>
              <div className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold border border-white/10 italic">Auditoría Habilitada</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Role Dialog */}
      <Dialog open={isEditRoleOpen} onOpenChange={setIsEditRoleOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md border-border/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              Modificar Rol
            </DialogTitle>
            <DialogDescription>
              Ajusta los privilegios de acceso para <strong>{selectedUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role">Nuevo Rol</Label>
              <Select 
                defaultValue={selectedUser?.role} 
                onValueChange={(v: any) => onUpdateRole(v)}
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  <SelectItem value="admin">Administrador (Control Total)</SelectItem>
                  <SelectItem value="operator">Operador (Gestión Logística)</SelectItem>
                  <SelectItem value="driver">Conductor (Visión de Rutas)</SelectItem>
                  <SelectItem value="client">Cliente (Seguimiento Propio)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nuevo Usuario */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md border-border/50">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Nuevo Usuario
            </DialogTitle>
            <DialogDescription>
              Crea una nueva cuenta de acceso al sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
               <Label>Nombre Completo</Label>
               <Input 
                 placeholder="Ej. Juan Pérez" 
                 value={newUser.name}
                 onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewUser({...newUser, name: e.target.value})}
               />
            </div>
            <div className="space-y-2">
               <Label>Correo Electrónico</Label>
               <Input 
                 type="email"
                 placeholder="usuario@fronteras.com" 
                 value={newUser.email}
                 onChange={(e) => setNewUser({...newUser, email: e.target.value})}
               />
            </div>
            <div className="space-y-2">
               <Label>Contraseña</Label>
               <Input 
                 type="password"
                 placeholder="Mínimo 6 caracteres" 
                 value={newUser.password}
                 onChange={(e) => setNewUser({...newUser, password: e.target.value})}
               />
            </div>
            <div className="space-y-2">
               <Label>Rol Inicial</Label>
               <Select 
                 value={newUser.role} 
                 onValueChange={(val) => setNewUser({...newUser, role: val as any})}
               >
                 <SelectTrigger>
                   <SelectValue />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} className="bg-primary hover:bg-primary/90 rounded-xl px-6">Crear Usuario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Permisos Granulares */}
      <Dialog open={isPermsDialogOpen} onOpenChange={setIsPermsDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Permisos: {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <p className="text-sm text-slate-500 mb-4">Activa o desactiva el acceso a módulos específicos.</p>
             
             {[
               { id: 'view_dashboard', label: 'Ver Tablero (Dashboard)', icon: Activity },
               { id: 'manage_shipments', label: 'Gestionar Envíos', icon: Lock },
               { id: 'manage_clients', label: 'Gestionar Clientes', icon: UsersIcon },
               { id: 'view_financial', label: 'Ver Módulo Financiero', icon: Shield },
             ].map((perm) => (
               <div key={perm.id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <perm.icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <Label className="font-semibold cursor-pointer" htmlFor={perm.id}>{perm.label}</Label>
                 </div>
                 <Switch 
                   id={perm.id} 
                   checked={selectedUser?.permissions?.[perm.id] || false}
                   onCheckedChange={() => togglePermission(perm.id)}
                 />
               </div>
             ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdatePerms} className="bg-primary hover:bg-primary/90 rounded-xl px-6">Guardar Permisos</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

function Info({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
    </svg>
  )
}
