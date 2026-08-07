"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminUsersApi, type AdminUserRow } from "@/lib/api";

export default function KullanicilarPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roleTarget, setRoleTarget] = useState<AdminUserRow | null>(null);
  const [selectedRole, setSelectedRole] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        adminUsersApi.listUsers(),
        adminUsersApi.listRoles(),
      ]);
      setUsers(usersRes);
      setRoles(rolesRes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Liste alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta veri çekme (React'in "Fetching data" deseni)
    void load();
  }, [load]);

  const removeRole = async (user: AdminUserRow, role: string) => {
    setBusyId(user.id);
    try {
      await adminUsersApi.removeRole(user.id, role);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rol kaldırılamadı.");
    } finally {
      setBusyId(null);
    }
  };

  const addRole = async () => {
    if (!roleTarget || !selectedRole) return;
    setBusyId(roleTarget.id);
    try {
      await adminUsersApi.addRole(roleTarget.id, selectedRole);
      toast.success("Rol eklendi.");
      setRoleTarget(null);
      setSelectedRole("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rol eklenemedi.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (user: AdminUserRow) => {
    setBusyId(user.id);
    try {
      await adminUsersApi.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kullanıcı silinemedi.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-foreground">Kullanıcı Yönetimi</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Tüm doktor hesaplarını görüntüleyin ve rollerini yönetin.
      </p>

      <div className="rounded-lg border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-posta</TableHead>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>Roller</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Yükleniyor…
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.fullName ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {u.roles.map((r) => (
                        <span
                          key={r}
                          className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-foreground"
                        >
                          {r}
                          <button
                            onClick={() => removeRole(u, r)}
                            disabled={busyId === u.id}
                            className="text-muted-foreground hover:text-red-600"
                            aria-label={`${r} rolünü kaldır`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog
                        open={roleTarget?.id === u.id}
                        onOpenChange={(open) => {
                          setRoleTarget(open ? u : null);
                          setSelectedRole("");
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            Rol Ekle
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{u.email} — Rol Ekle</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-1.5">
                            <Label>Rol</Label>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                              <SelectTrigger>
                                <SelectValue placeholder="Seçiniz" />
                              </SelectTrigger>
                              <SelectContent>
                                {roles
                                  .filter((r) => !u.roles.includes(r))
                                  .map((r) => (
                                    <SelectItem key={r} value={r}>
                                      {r}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <DialogFooter>
                            <Button onClick={addRole} disabled={!selectedRole}>
                              Ekle
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busyId === u.id}
                        onClick={() => deleteUser(u)}
                      >
                        Sil
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
