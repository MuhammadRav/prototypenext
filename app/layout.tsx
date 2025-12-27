import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Suspense } from "react";

export const metadata = {
  title: "Portal UBN - Precision",
  description: "Sistem Pendaftaran Mahasiswa Asing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="h-screen w-full flex flex-row bg-bg-white overflow-hidden box-border font-sans">
        {/* Sidebar */}
        <Suspense
          fallback={
            <div className="w-64 bg-bg-white border-r border-stone-light"></div>
          }
        >
          <Sidebar />
        </Suspense>

        {/* Main Content */}
        {/* PERBAIKAN: Ubah overflow-hidden jadi overflow-y-auto agar halaman panjang bisa discroll */}
        <main className="flex-1 flex flex-col h-full overflow-y-auto bg-bg-white relative custom-scroll">
          {children}
        </main>
      </body>
    </html>
  );
}