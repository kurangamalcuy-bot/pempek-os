"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, Package, Activity, MessageCircle, Trash2, Printer, Megaphone, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trxRes, batchRes, expRes] = await Promise.all([
          supabase.from('transactions').select('*').order('created_at', { ascending: false }),
          supabase.from('batches').select('*').order('arrival_date', { ascending: false }),
          supabase.from('expenses').select('*')
        ]);

        if (trxRes.data) setTransactions(trxRes.data);
        if (batchRes.data) setBatches(batchRes.data);
        if (expRes.data) setExpenses(expRes.data);
      } catch (error) {
        console.error("Gagal menarik data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (id: number) => {
    if (window.confirm("Yakin ingin menghapus penjualan ini?")) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (!error) setTransactions(transactions.filter(trx => trx.id !== id));
    }
  };

  // --- KUMPULAN RUMUS BISNIS ---
  
  // 1. Logika Filter Bulan Ini
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const isThisMonth = (dateString: string) => {
    const d = new Date(dateString);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  };

  const trxThisMonth = transactions.filter(t => isThisMonth(t.created_at));
  const expThisMonth = expenses.filter(e => isThisMonth(e.created_at));

  // 2. Sisa Stok Real-time
  const totalStockIn = batches.filter(b => b.status !== 'Sold Out').reduce((acc, curr) => acc + Number(curr.total_qty), 0);
  const totalPackagesSold = transactions.reduce((acc, curr) => acc + Number(curr.qty), 0);
  const currentStock = totalStockIn - totalPackagesSold;

  // 3. Keuangan Lifetime
  const capex = expenses.filter(e => e.category === 'capex').reduce((acc, curr) => acc + Number(curr.amount), 0) || 1;
  const opex = expenses.filter(e => e.category === 'operational' || e.category === 'ads').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalRevenue = transactions.reduce((acc, curr) => acc + (Number(curr.qty) * Number(curr.selling_price)), 0);
  const baseCost = batches.length > 0 ? Number(batches[0].base_cost_per_qty) : 15000;
  const netProfit = totalRevenue - (totalPackagesSold * baseCost) - opex;
  const bepPercentage = Math.max(0, Math.min(100, (netProfit / capex) * 100));

  // 4. Keuangan Bulan Ini & CAC
  const revenueThisMonth = trxThisMonth.reduce((acc, curr) => acc + (Number(curr.qty) * Number(curr.selling_price)), 0);
  const soldThisMonth = trxThisMonth.reduce((acc, curr) => acc + Number(curr.qty), 0);
  const adsThisMonth = expThisMonth.filter(e => e.category === 'ads').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const cacPerPack = soldThisMonth > 0 ? (adsThisMonth / soldThisMonth) : 0; // Biaya Iklan per Pack terjual

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  // 5. Fitur Salin Label Pengiriman
  const copyLabel = (trx: any) => {
    const text = `📦 LABEL PENGIRIMAN\n\nPenerima: ${trx.customer_name}\nNo. HP: ${trx.customer_phone}\n\nIsi Paket:\n${trx.qty} Pack Pempek Frozen\n\n-----------------`;
    navigator.clipboard.writeText(text);
    alert("Label berhasil disalin! Silakan paste (tempel) di chat kurir.");
  };

  const sendWhatsApp = (trx: any) => {
    const text = `Halo Kak ${trx.customer_name}! Ini rekap pesanan Pempek Frozen Bengkulu-nya ya:\nJumlah: ${trx.qty} Paket\nTotal: ${formatIDR(trx.qty * trx.selling_price)}\n\nTerima kasih banyak!`;
    window.open(`https://wa.me/${trx.customer_phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-bold">Memuat Dashboard...</div>;

  return (
    <div className="font-sans pb-10">
      <header className="bg-emerald-600 text-white p-5 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div><h1 className="text-xl font-bold tracking-tight">Pempek OS v2</h1><p className="text-emerald-100 text-xs">Pusat Komando Bisnis</p></div>
          <div className="bg-white/20 p-2 rounded-full"><Activity className="w-5 h-5 text-white" /></div>
        </div>
        
        <div className="bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-sm mb-3">
          <p className="text-emerald-50 text-sm mb-1">Net Profit (All Time)</p>
          <h2 className="text-3xl font-extrabold">{formatIDR(netProfit)}</h2>
        </div>

        {/* STATUS STOK REALTIME */}
        <div className={`p-3 rounded-xl border flex items-center justify-between ${currentStock < 10 ? 'bg-rose-500 border-rose-400' : 'bg-emerald-700 border-emerald-500'}`}>
          <div className="flex items-center"><Package className="w-5 h-5 mr-2" /> <span className="font-bold text-sm">Sisa Stok di Freezer</span></div>
          <span className="text-xl font-bold">{currentStock} <span className="text-xs font-normal">Pack</span></span>
        </div>
      </header>

      <main className="p-5 space-y-6">
        
        {/* LAPORAN BULAN INI & CAC */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-3 border-b pb-2">Performa Bulan Ini</h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div><p className="text-xs text-slate-500">Omzet Bulan Ini</p><p className="font-bold text-emerald-600 text-lg">{formatIDR(revenueThisMonth)}</p></div>
            <div><p className="text-xs text-slate-500">Terjual Bulan Ini</p><p className="font-bold text-slate-800 text-lg">{soldThisMonth} Pack</p></div>
          </div>
          <div className="bg-blue-50 p-3 rounded-xl flex justify-between items-center border border-blue-100">
            <div className="flex items-center"><Megaphone className="w-5 h-5 text-blue-600 mr-2" /><div><p className="text-xs text-blue-800 font-bold">Biaya Iklan (CAC) / Pack</p></div></div>
            <p className="font-bold text-blue-800">{formatIDR(cacPerPack)}</p>
          </div>
        </section>

        {/* BEP TRACKER LAMA */}
        <section>
          <div className="flex justify-between items-end mb-2">
            <h3 className="font-bold text-slate-700">BEP Tracker Alat</h3>
            <span className="text-xs font-semibold text-emerald-600">{bepPercentage.toFixed(2)}%</span>
          </div>
          <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden border border-slate-300 shadow-inner">
            <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${Math.max(2, bepPercentage)}%` }}></div>
          </div>
        </section>

        {/* LIST TRANSAKSI + PRINT LABEL */}
        <section>
          <h3 className="font-bold text-slate-700 mb-3">Penjualan Terakhir</h3>
          <div className="space-y-3">
            {transactions.slice(0, 5).map((trx) => (
              <div key={trx.id} className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{trx.customer_name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{trx.qty} Packs • {trx.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{formatIDR(trx.qty * trx.selling_price)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
                  <button onClick={() => handleDelete(trx.id)} className="flex items-center justify-center space-x-1 text-[10px] bg-rose-50 text-rose-600 p-2 rounded-lg hover:bg-rose-100 font-bold">
                    <Trash2 className="w-3.5 h-3.5" /> <span>Batal</span>
                  </button>
                  <button onClick={() => sendWhatsApp(trx)} className="flex items-center justify-center space-x-1 text-[10px] bg-emerald-50 text-emerald-700 p-2 rounded-lg hover:bg-emerald-100 font-bold">
                    <MessageCircle className="w-3.5 h-3.5" /> <span>Kirim WA</span>
                  </button>
                  <button onClick={() => copyLabel(trx)} className="flex items-center justify-center space-x-1 text-[10px] bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-800 font-bold">
                    <Printer className="w-3.5 h-3.5" /> <span>Salin Label</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}