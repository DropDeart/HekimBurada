import type { ReactNode } from "react";
import { AnnouncementPopup } from "@/components/AnnouncementPopup";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <AnnouncementPopup />
    </div>
  );
}
