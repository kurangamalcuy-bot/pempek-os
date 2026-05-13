import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { Toaster } from 'react-hot-toast';

// 1. TAMBAHKAN IMPORT PINGATE DI SINI
import PinGate from "@/components/PinGate";

export const metadata: Metadata = {
  title: "Pempek OS",
  description: "Operating System for Pempek Business",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,     // Ini sihirnya: melarang HP untuk nge-zoom otomatis
  userScalable: false, // Mengunci layar agar terasa seperti aplikasi asli
};

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="bg-slate-200 text-slate-800" suppressHydrationWarning>
        <div className="w-full max-w-md mx-auto bg-slate-50 min-h-screen relative shadow-2xl overflow-x-hidden">
          
          {/* Memanggil Toaster agar notifikasi sukses/gagal bisa muncul */}
          <Toaster position="top-center" />

          {/* 2. BUNGKUS ISI WEB DENGAN PINGATE */}
          <PinGate>
            {children}
            <BottomNav />
          </PinGate>

        </div>
      </body>
    </html>
  );
}