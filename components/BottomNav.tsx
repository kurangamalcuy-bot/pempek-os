"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, Package, DollarSign, Users } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path;

  return (
    <>
      <div className="h-24"></div>
      <nav className="fixed bottom-0 left-0 right-0 mx-auto w-full max-w-md bg-white border-t border-slate-200 flex justify-between px-2 py-2 pb-6 z-[9999] shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
        
        <Link href="/" className={`flex flex-col items-center p-2 w-1/5 transition-colors ${isActive('/') ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-500'}`}>
          <Home className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold">Home</span>
        </Link>
        
        <Link href="/transactions" className={`flex flex-col items-center p-2 w-1/5 transition-colors ${isActive('/transactions') ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-500'}`}>
          <History className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold">Jual</span>
        </Link>
        
        <Link href="/batches" className={`flex flex-col items-center p-2 w-1/5 transition-colors ${isActive('/batches') ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-500'}`}>
          <Package className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold">Stok</span>
        </Link>
        
        <Link href="/finance" className={`flex flex-col items-center p-2 w-1/5 transition-colors ${isActive('/finance') ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-500'}`}>
          <DollarSign className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold">Uang</span>
        </Link>

        {/* MENU BARU: PELANGGAN (CRM) */}
        <Link href="/customers" className={`flex flex-col items-center p-2 w-1/5 transition-colors ${isActive('/customers') ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-500'}`}>
          <Users className="w-5 h-5 mb-1" />
          <span className="text-[9px] font-bold">CRM</span>
        </Link>

      </nav>
    </>
  );
}