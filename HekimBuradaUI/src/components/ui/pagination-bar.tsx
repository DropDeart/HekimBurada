"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationBarProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

/** Admin liste sayfalarında ortak kullanılan sayfa gezinme çubuğu. */
export function PaginationBar({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  disabled = false,
}: PaginationBarProps) {
  if (totalCount === 0) {
    return null;
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        {totalCount} kayıttan {from}-{to} arası gösteriliyor.
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="icon-sm"
          variant="outline"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
        </Button>
        <span className="text-xs font-medium text-foreground">
          Sayfa {page} / {Math.max(totalPages, 1)}
        </span>
        <Button
          size="icon-sm"
          variant="outline"
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
