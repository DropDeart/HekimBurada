"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProvinceSelect } from "@/components/ProvinceSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationBar } from "@/components/ui/pagination-bar";
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

const REGION_ADMIN_ROLE = "RegionAdmin";
const PAGE_SIZE = 20;

export default function KullanicilarPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [roleTarget, setRoleTarget] = useState<AdminUserRow | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [provinceId, setProvinceId] = useState("");
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  const [removeRoleTarget, setRemoveRoleTarget] = useState<{ user: AdminUserRow; role: string } | null>(
    null
  );
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [addUserError, setAddUserError] = useState<string | null>(null);
  const [addUserSubmitting, setAddUserSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        adminUsersApi.listUsers({ page, pageSize: PAGE_SIZE }),
        adminUsersApi.listRoles(),
      ]);
      setUsers(usersRes.items);
      setTotalCount(usersRes.totalCount);
      setRoles(rolesRes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Liste alınamadı.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount'ta/sayfa değişince veri çekme (React'in "Fetching data" deseni)
    void load();
  }, [load]);

  const removeRole = async () => {
    if (!removeRoleTarget) return;
    const { user, role } = removeRoleTarget;
    setBusyId(user.id);
    try {
      await adminUsersApi.removeRole(user.id, role);
      toast.success("Rol kaldırıldı.");
      setRemoveRoleTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Rol kaldırılamadı.");
    } finally {
      setBusyId(null);
    }
  };

  const addRole = async (e: FormEvent) => {
    e.preventDefault();
    if (!roleTarget || !selectedRole) return;
    setRoleError(null);
    setRoleSubmitting(true);
    try {
      if (selectedRole === REGION_ADMIN_ROLE) {
        if (!provinceId) {
          setRoleError("İl gerekli.");
          return;
        }
        // Sade addRole yalnızca rolü ekler, doğrulama kuyruğunu filtrelemek için gereken "region"
        // claim'ini atamaz — RegionAdmin'in kuyruğu boş görünürdü. Bu yüzden RegionAdmin için ayrı
        // uç kullanılıyor (bkz. adminUsersApi.assignRegionAdmin doc yorumu).
        await adminUsersApi.assignRegionAdmin(roleTarget.id, provinceId);
      } else {
        await adminUsersApi.addRole(roleTarget.id, selectedRole);
      }

      toast.success("Rol eklendi.");
      setRoleTarget(null);
      setSelectedRole("");
      setProvinceId("");
      await load();
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : "Rol eklenemedi.");
    } finally {
      setRoleSubmitting(false);
    }
  };

  const deleteUser = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await adminUsersApi.deleteUser(deleteTarget.id);
      toast.success("Kullanıcı silindi.");
      setDeleteTarget(null);
      if (users.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kullanıcı silinemedi.");
    } finally {
      setBusyId(null);
    }
  };

  const addUser = async (e: FormEvent) => {
    e.preventDefault();
    setAddUserError(null);
    setAddUserSubmitting(true);
    try {
      await adminUsersApi.addUser({ email: newEmail.trim(), fullName: newFullName.trim() || null });
      toast.success("Kullanıcı eklendi.");
      setAddUserOpen(false);
      setNewEmail("");
      setNewFullName("");
      await load();
    } catch (err) {
      setAddUserError(err instanceof Error ? err.message : "Kullanıcı eklenemedi.");
    } finally {
      setAddUserSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-xl font-bold text-foreground">Kullanıcı Yönetimi</h1>
          <p className="text-sm text-muted-foreground">
            Tüm doktor hesaplarını görüntüleyin ve rollerini yönetin.
          </p>
        </div>

        <Dialog
          open={addUserOpen}
          onOpenChange={(next) => {
            setAddUserOpen(next);
            if (!next) {
              setAddUserError(null);
              setNewEmail("");
              setNewFullName("");
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>Kullanıcı Ekle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yeni Kullanıcı</DialogTitle>
            </DialogHeader>
            <form onSubmit={addUser} className="flex flex-col gap-3">
              {addUserError && (
                <div className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">{addUserError}</div>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="newEmail">E-posta</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="newFullName">Ad Soyad</Label>
                <Input id="newFullName" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={addUserSubmitting}>
                  {addUserSubmitting ? "Ekleniyor…" : "Ekle"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
                            onClick={() => setRemoveRoleTarget({ user: u, role: r })}
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
                          setProvinceId("");
                          setRoleError(null);
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
                          <form onSubmit={addRole} className="flex flex-col gap-3">
                            {roleError && (
                              <div className="rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-700">
                                {roleError}
                              </div>
                            )}
                            <div className="grid gap-1.5">
                              <Label>Rol</Label>
                              <Select
                                value={selectedRole}
                                onValueChange={(v) => {
                                  setSelectedRole(v);
                                  setRoleError(null);
                                }}
                              >
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

                            {selectedRole === REGION_ADMIN_ROLE && (
                              <div className="grid gap-1.5">
                                <Label>İl</Label>
                                <ProvinceSelect
                                  provinceId={provinceId}
                                  onProvinceIdChange={setProvinceId}
                                />
                                <p className="text-xs text-muted-foreground">
                                  RegionAdmin, doğrulama kuyruğunda yalnızca bu ildeki doktorları görür.
                                </p>
                              </div>
                            )}

                            <DialogFooter>
                              <Button
                                type="submit"
                                disabled={
                                  !selectedRole ||
                                  roleSubmitting ||
                                  (selectedRole === REGION_ADMIN_ROLE && !provinceId)
                                }
                              >
                                {roleSubmitting ? "Ekleniyor…" : "Ekle"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busyId === u.id}
                        onClick={() => setDeleteTarget(u)}
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

      <PaginationBar
        page={page}
        totalPages={Math.ceil(totalCount / PAGE_SIZE)}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        disabled={loading}
      />

      <AlertDialog
        open={removeRoleTarget !== null}
        onOpenChange={(next) => !next && setRemoveRoleTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rol kaldırılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{removeRoleTarget?.user.email}&quot; kullanıcısından &quot;{removeRoleTarget?.role}&quot;
              rolü kaldırılacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={removeRole}>Kaldır</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kullanıcı silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.email}&quot; kalıcı olarak silinecek. Bu işlem geri alınamaz ve
              kullanıcının ilan/yorum gibi verilerini de etkileyebilir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
