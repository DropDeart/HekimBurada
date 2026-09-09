import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-lg font-bold text-foreground">
        Hekim<span className="text-brand">Burada</span>
      </div>
      <h1 className="text-3xl font-bold text-foreground">404</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Aradığınız sayfa bulunamadı. Silinmiş, taşınmış veya hiç var olmamış olabilir.
      </p>
      <Link href="/">
        <Button className="mt-2">Ana Sayfaya Dön</Button>
      </Link>
    </div>
  );
}
