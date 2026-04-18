import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "../components/BottomNav";

export const metadata: Metadata = {
  title: "Pempek OS",
  description: "Operating System for Pempek Business",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-slate-200 text-slate-800">
        {/* Pembungkus agar tampilannya seperti layar HP di tengah layar laptop */}
        <div className="w-full max-w-md mx-auto bg-slate-50 min-h-screen relative shadow-2xl overflow-x-hidden">
          {children}
          
          {/* Memanggil Navigasi Bawah */}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}