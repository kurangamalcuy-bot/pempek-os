import type { Metadata } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { Toaster } from 'react-hot-toast';

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
      {/* Tambahkan suppressHydrationWarning juga di body */}
      <body className="bg-slate-200 text-slate-800" suppressHydrationWarning>
        <div className="w-full max-w-md mx-auto bg-slate-50 min-h-screen relative shadow-2xl overflow-x-hidden">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}