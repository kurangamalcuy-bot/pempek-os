"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { TrendingUp, Package, Activity, MessageCircle, Trash2 } from 'lucide-react';

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

  // FITUR HAPUS TRANSAKSI
  const handleDelete = async (id: number) => {
    // Munculkan peringatan dulu sebelum beneran dihapus
    if (window.confirm("Yakin ingin menghapus penjualan ini? Data BEP & Omzet akan otomatis dipotong.")) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      
      if (!error) {
        // Hapus data dari layar tanpa perlu refresh web
        setTransactions(transactions.filter(trx => trx.id !== id));
      } else {
        alert("Gagal menghapus: " + error.message);
      }
    }
  };

  const capex = expenses.filter(e => e.category === 'capex').reduce((acc, curr) => acc + Number(curr.amount), 0) || 1;
  const opex = expenses.filter(e => e.category === 'operational' || e.category === 'ads').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalPackagesSold = transactions.reduce((acc, curr) => acc + Number(curr.qty), 0);
  const totalRevenue = transactions.reduce((acc, curr) => acc + (Number(curr.qty) * Number(curr.selling_price)), 0);
  const baseCost = batches.length > 0 ? Number(batches[0].base_cost_per_qty) : 15000;
  const totalCOGS = totalPackagesSold * baseCost;

  const netProfit = totalRevenue - totalCOGS - opex;
  const bepPercentage = Math.max(0, Math.min(100, (netProfit / capex) * 100));
  const remainingCapex = Math.max(0, capex - netProfit);

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  const sendWhatsApp = (trx: any) => {
    const text = `Halo Kak ${trx.customer_name}! Ini rekap pesanan Pempek Frozen Bengkulu-nya ya:\n\nJumlah: ${trx.qty} Paket\nTotal: ${formatIDR(trx.qty * trx.selling_price)}\n\nTerima kasih banyak, ditunggu repeat ordernya! 🥟`;
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/${trx.customer_phone}?text=${encodedText}`, '_blank');
  };

  if (loading) return <div className="p-10 text-center text-slate-500 animate-pulse font-bold">Memuat Dashboard...</div>;

  return (
    <div className="font-sans">
      <header className="bg-emerald-600 text-white p-5 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Pempek OS v2</h1>
            <p className="text-emerald-100 text-xs">Pusat Komando Bisnis</p>
          </div>
          <div className="bg-white/20 p-2 rounded-full">
            <Activity className="w-5 h-5 text-white" />
          </div>
        </div>
        
        <div className="bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-sm">
          <p className="text-emerald-50 text-sm mb-1">Net Profit (Live)</p>
          <h2 className="text-3xl font-extrabold">{formatIDR(netProfit)}</h2>
          <div className="mt-2 flex items-center text-xs text-emerald-100 space-x-2">
            <span className="bg-emerald-500/50 px-2 py-1 rounded-full">Omzet: {formatIDR(totalRevenue)}</span>
            <span className="bg-rose-500/50 px-2 py-1 rounded-full">Opex: {formatIDR(opex)}</span>
          </div>
        </div>
      </header>

      <main className="p-5 space-y-6">
        
        <section>
          <div className="flex justify-between items-end mb-2">
            <h3 className="font-bold text-slate-700">BEP Tracker (Balik Modal Alat)</h3>
            <span className="text-xs font-semibold text-emerald-600">{bepPercentage.toFixed(2)}%</span>
          </div>
          <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden border border-slate-300 shadow-inner">
            <div 
              className="bg-emerald-500 h-full transition-all duration-1000 ease-in-out"
              style={{ width: `${Math.max(2, bepPercentage)}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-2 text-right">
            Sisa modal alat: <span className="font-bold text-slate-700">{formatIDR(remainingCapex)}</span>
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-slate-100 shadow-sm p-4 rounded-2xl">
            <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center mb-2">
              <Package className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-slate-500">Terjual</p>
            <p className="text-lg font-bold text-slate-800">{totalPackagesSold} <span className="text-xs font-normal">Packs</span></p>
          </div>
          <div className="bg-white border border-slate-100 shadow-sm p-4 rounded-2xl">
            <div className="bg-orange-100 w-8 h-8 rounded-full flex items-center justify-center mb-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-xs text-slate-500">Margin Rata-rata</p>
            <p className="text-lg font-bold text-slate-800">
              {totalPackagesSold > 0 ? formatIDR(netProfit / totalPackagesSold) : 'Rp 0'}
            </p>
          </div>
        </section>

        <section>
          <h3 className="font-bold text-slate-700 mb-3">5 Penjualan Terakhir</h3>
          <div className="space-y-3">
            {transactions.slice(0, 5).map((trx) => (
              <div key={trx.id} className="p-3 border border-slate-100 rounded-xl bg-white shadow-sm flex flex-col space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{trx.customer_name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{trx.qty} Packs • {trx.type}</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600">{formatIDR(trx.qty * trx.selling_price)}</p>
                </div>
                
                {/* Tombol Hapus dan WA sekarang bersebelahan */}
                <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                  <button 
                    onClick={() => handleDelete(trx.id)}
                    className="flex items-center space-x-1 text-xs bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-colors font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Batal</span>
                  </button>
                  <button 
                    onClick={() => sendWhatsApp(trx)}
                    className="flex items-center space-x-1 text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors font-semibold"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Kirim WA</span>
                  </button>
                </div>

              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4 bg-white rounded-xl border border-slate-100 shadow-sm">Belum ada transaksi.</p>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}