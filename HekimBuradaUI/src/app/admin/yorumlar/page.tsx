"use client";

import { useCallback, useEffect, useState } from "react";
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
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { communityApi, type CommunityComment, type Topic } from "@/lib/api";

const PAGE_SIZE = 20;

export default function AdminYorumlarPage() {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommunityComment | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [commentsRes, topicsRes] = await Promise.all([
        communityApi.listComments({ page, pageSize: PAGE_SIZE }),
        communityApi.listTopics({ pageSize: 100 }),
      ]);
      setComments(commentsRes.items);
      setTotalCount(commentsRes.totalCount);
      setTopics(topicsRes.items);
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

  const remove = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setBusyId(id);
    try {
      await communityApi.deleteComment(id);
      setDeleteTarget(null);
      if (comments.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await load();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Silinemedi.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-foreground">Yorum Moderasyonu</h1>
      <p className="mb-5 text-sm text-muted-foreground">
        Topluluk konularına yapılan yorumları inceleyin, uygunsuz içerikleri kaldırın.
      </p>

      <div className="rounded-lg border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Konu</TableHead>
              <TableHead>Yorum</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Yükleniyor…
                </TableCell>
              </TableRow>
            ) : comments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Gösterilecek yorum yok.
                </TableCell>
              </TableRow>
            ) : (
              comments.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{topics.find((t) => t.id === c.topicId)?.title ?? "—"}</TableCell>
                  <TableCell className="max-w-md truncate">{c.body}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busyId === c.id}
                      onClick={() => setDeleteTarget(c)}
                    >
                      Kaldır
                    </Button>
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

      <AlertDialog open={deleteTarget !== null} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yorum kaldırılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.body}&quot; yorumu kalıcı olarak kaldırılacak. Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction onClick={remove}>Kaldır</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
