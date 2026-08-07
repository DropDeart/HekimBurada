"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { communityApi, type CommunityComment, type Topic } from "@/lib/api";

export default function AdminYorumlarPage() {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [commentsRes, topicsRes] = await Promise.all([
        communityApi.listComments({ pageSize: 200 }),
        communityApi.listTopics({ pageSize: 200 }),
      ]);
      setComments(commentsRes.items);
      setTopics(topicsRes.items);
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

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await communityApi.deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
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
                      onClick={() => remove(c.id)}
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
    </div>
  );
}
