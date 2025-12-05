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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, UserCog, Plus, Trash2, Shield, Crown } from "lucide-react";

export function AdminSettings() {
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [createDeptOpen, setCreateDeptOpen] = useState(false);
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [usersResult, deptsResult] = await Promise.all([
      api.users.getAll(),
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

  const handleEditUser = (user: SafeUser) => {
    setSelectedUser(user);
    setSelectedRole(user.role || "member");
    setSelectedDept(user.department_id || "none");
    setEditUserOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    const result = await api.users.update(selectedUser.id, {
      role: selectedRole as 'admin' | 'manager' | 'member',
      department_id: selectedDept === "none" ? null : selectedDept,
    });

    if (result.success) {
      toast({
        title: "Usuario actualizado",
        description: `Se han actualizado los permisos de ${selectedUser.username}`,
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-muted-foreground">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 overflow-auto h-full">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Ajustes Generales</h2>
        <p className="text-muted-foreground">Administra departamentos, roles y configuración del sistema</p>
      </div>

      {/* Departments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Departamentos</h3>
          </div>
          <Dialog open={createDeptOpen} onOpenChange={setCreateDeptOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Departamento
              </Button>
            </DialogTrigger>
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
                  <Label htmlFor="dept-desc">Descripcion (opcional)</Label>
                  <Input
                    id="dept-desc"
                    placeholder="Descripcion del departamento..."
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
        </div>

        <div className="grid gap-3">
          {departments.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No hay departamentos creados todavia
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
      </div>

      {/* Users Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Usuarios y Roles</h3>
        </div>

        <div className="grid gap-3">
          {users.map((user) => {
            const userDept = departments.find(d => d.id === user.department_id);
            return (
              <Card key={user.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{user.username}</span>
                        {getRoleBadge(user.role)}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      {userDept && (
                        <p className="text-xs text-muted-foreground">
                          Departamento: {userDept.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditUser(user)}
                  >
                    <UserCog className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica el rol y departamento de {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
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
              <Select value={selectedDept} onValueChange={setSelectedDept}>
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
    </div>
  );
}
