import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { SafeUser, Department } from "@/types/database";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Users,
  UserCog,
  Plus,
  Trash2,
  Shield,
  Crown,
  Key,
  Mail,
  User,
  UserPlus,
  Power,
  PowerOff,
  Search,
  Eye,
  EyeOff
} from "lucide-react";

export function AdminSettings() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Department dialog state
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [createDeptOpen, setCreateDeptOpen] = useState(false);

  // Create user dialog state
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"admin" | "manager" | "member">("member");
  const [newUserDept, setNewUserDept] = useState<string>("none");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Edit user dialog state
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<string>("");
  const [editDept, setEditDept] = useState<string>("");

  // Change password dialog state
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<SafeUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Delete confirmation dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SafeUser | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [usersResult, deptsResult] = await Promise.all([
      api.users.getAllIncludingInactive(),
      api.departments.getAll(),
    ]);

    if (usersResult.success && usersResult.data) {
      setUsers(usersResult.data);
    }
    if (deptsResult.success && deptsResult.data) {
      setDepartments(deptsResult.data);
    }
    setLoading(false);
  };

  // Filter users by search term
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // =============================================
  // DEPARTMENT HANDLERS
  // =============================================

  const handleCreateDepartment = async () => {
    if (!newDeptName.trim()) {
      toast({
        title: "Error",
        description: "El nombre del departamento es requerido",
        variant: "destructive",
      });
      return;
    }

    const result = await api.departments.create({
      name: newDeptName,
      description: newDeptDesc || null,
    });

    if (result.success) {
      toast({
        title: "Departamento creado",
        description: `El departamento "${newDeptName}" ha sido creado`,
      });
      setNewDeptName("");
      setNewDeptDesc("");
      setCreateDeptOpen(false);
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo crear el departamento",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDepartment = async (deptId: string, deptName: string) => {
    if (!confirm(`¿Estás seguro de eliminar el departamento "${deptName}"?`)) {
      return;
    }

    const result = await api.departments.delete(deptId);

    if (result.success) {
      toast({
        title: "Departamento eliminado",
        description: `El departamento "${deptName}" ha sido eliminado`,
      });
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo eliminar el departamento",
        variant: "destructive",
      });
    }
  };

  // =============================================
  // USER HANDLERS
  // =============================================

  const handleCreateUser = async () => {
    if (!newUserEmail.trim() || !newUserUsername.trim() || !newUserPassword.trim()) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive",
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    const result = await api.users.create({
      email: newUserEmail,
      username: newUserUsername,
      password: newUserPassword,
      role: newUserRole,
      department_id: newUserDept === "none" ? null : newUserDept,
    });

    if (result.success) {
      toast({
        title: "Usuario creado",
        description: `El usuario "${newUserUsername}" ha sido creado correctamente`,
      });
      setCreateUserOpen(false);
      resetCreateUserForm();
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo crear el usuario",
        variant: "destructive",
      });
    }
  };

  const resetCreateUserForm = () => {
    setNewUserEmail("");
    setNewUserUsername("");
    setNewUserPassword("");
    setNewUserRole("member");
    setNewUserDept("none");
    setShowNewPassword(false);
  };

  const handleEditUser = (user: SafeUser) => {
    setSelectedUser(user);
    setEditUsername(user.username);
    setEditEmail(user.email);
    setEditRole(user.role || "member");
    setEditDept(user.department_id || "none");
    setEditUserOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    if (!editUsername.trim() || !editEmail.trim()) {
      toast({
        title: "Error",
        description: "El nombre y email son requeridos",
        variant: "destructive",
      });
      return;
    }

    const result = await api.users.update(selectedUser.id, {
      username: editUsername,
      email: editEmail,
      role: editRole as 'admin' | 'manager' | 'member',
      department_id: editDept === "none" ? null : editDept,
    });

    if (result.success) {
      toast({
        title: "Usuario actualizado",
        description: `Se han actualizado los datos de ${editUsername}`,
      });
      setEditUserOpen(false);
      setSelectedUser(null);
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo actualizar el usuario",
        variant: "destructive",
      });
    }
  };

  const handleOpenChangePassword = (user: SafeUser) => {
    setPasswordUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setChangePasswordOpen(true);
  };

  const handleChangePassword = async () => {
    if (!passwordUser) return;

    if (!newPassword.trim()) {
      toast({
        title: "Error",
        description: "La contraseña es requerida",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    const result = await api.users.changePassword(passwordUser.id, newPassword);

    if (result.success) {
      toast({
        title: "Contraseña actualizada",
        description: `La contraseña de ${passwordUser.username} ha sido cambiada. El usuario deberá iniciar sesión de nuevo.`,
      });
      setChangePasswordOpen(false);
      setPasswordUser(null);
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo cambiar la contraseña",
        variant: "destructive",
      });
    }
  };

  const handleToggleUserActive = async (user: SafeUser) => {
    const newStatus = !user.is_active;
    const action = newStatus ? "activar" : "desactivar";

    const result = await api.users.toggleActive(user.id, newStatus);

    if (result.success) {
      toast({
        title: newStatus ? "Usuario activado" : "Usuario desactivado",
        description: `El usuario ${user.username} ha sido ${newStatus ? "activado" : "desactivado"}`,
      });
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || `No se pudo ${action} el usuario`,
        variant: "destructive",
      });
    }
  };

  const handleOpenDeleteConfirm = (user: SafeUser) => {
    setUserToDelete(user);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    const result = await api.users.delete(userToDelete.id);

    if (result.success) {
      toast({
        title: "Usuario eliminado",
        description: `El usuario ${userToDelete.username} ha sido eliminado permanentemente`,
      });
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      fetchData();
    } else {
      toast({
        title: "Error",
        description: result.error || "No se pudo eliminar el usuario",
        variant: "destructive",
      });
    }
  };

  // =============================================
  // UI HELPERS
  // =============================================

  const getRoleBadge = (role: string | undefined) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30"><Crown className="w-3 h-3 mr-1" />Admin</Badge>;
      case "manager":
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30"><Shield className="w-3 h-3 mr-1" />Jefe</Badge>;
      default:
        return <Badge variant="outline">Miembro</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean | undefined) => {
    if (isActive === false) {
      return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/30">Inactivo</Badge>;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-muted-foreground">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Configuración General</h2>
        <p className="text-muted-foreground">Administra usuarios, departamentos y configuración del sistema</p>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="departments" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Departamentos
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setCreateUserOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Usuario
            </Button>
          </div>

          <div className="grid gap-3">
            {filteredUsers.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                {searchTerm ? "No se encontraron usuarios" : "No hay usuarios"}
              </Card>
            ) : (
              filteredUsers.map((user) => {
                const userDept = departments.find(d => d.id === user.department_id);
                return (
                  <Card key={user.id} className={`p-4 ${user.is_active === false ? 'opacity-60' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{user.username}</span>
                            {getRoleBadge(user.role)}
                            {getStatusBadge(user.is_active)}
                          </div>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {userDept && (
                            <p className="text-xs text-muted-foreground">
                              Departamento: {userDept.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenChangePassword(user)}
                          title="Cambiar contraseña"
                        >
                          <Key className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleToggleUserActive(user)}
                          title={user.is_active !== false ? "Desactivar usuario" : "Activar usuario"}
                        >
                          {user.is_active !== false ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <UserCog className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleOpenDeleteConfirm(user)}
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button onClick={() => setCreateDeptOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Departamento
            </Button>
          </div>

          <div className="grid gap-3">
            {departments.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground">
                No hay departamentos creados todavía
              </Card>
            ) : (
              departments.map((dept) => {
                const deptUsers = users.filter(u => u.department_id === dept.id);
                return (
                  <Card key={dept.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{dept.name}</h4>
                        {dept.description && (
                          <p className="text-sm text-muted-foreground">{dept.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {deptUsers.length} empleado{deptUsers.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Crea una nueva cuenta de usuario. La contraseña se hasheará automáticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-username">Nombre de usuario</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-username"
                  placeholder="Nombre del usuario"
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Contraseña</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="pl-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as typeof newUserRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Miembro</SelectItem>
                  <SelectItem value="manager">Jefe de Departamento</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={newUserDept} onValueChange={setNewUserDept}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin departamento</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateUserOpen(false); resetCreateUserForm(); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser}>
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos de {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username">Nombre de usuario</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="edit-username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Correo electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Miembro</SelectItem>
                  <SelectItem value="manager">Jefe de Departamento</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={editDept} onValueChange={setEditDept}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin departamento</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser}>
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Establecer nueva contraseña para {passwordUser?.username}. El usuario será desconectado y deberá iniciar sesión de nuevo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-pass">Nueva contraseña</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-pass"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pass">Confirmar contraseña</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm-pass"
                  type={showPassword ? "text" : "password"}
                  placeholder="Repetir contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword}>
              Cambiar Contraseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Department Dialog */}
      <Dialog open={createDeptOpen} onOpenChange={setCreateDeptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Departamento</DialogTitle>
            <DialogDescription>
              Crea un nuevo departamento para organizar a los empleados
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Nombre del departamento</Label>
              <Input
                id="dept-name"
                placeholder="Ej: Desarrollo, Marketing, Ventas..."
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-desc">Descripción (opcional)</Label>
              <Input
                id="dept-desc"
                placeholder="Descripción del departamento..."
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDeptOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateDepartment}>
              Crear Departamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta de <strong>{userToDelete?.username}</strong> y todos sus datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
