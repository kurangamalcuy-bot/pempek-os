"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, Trash2, Printer, Megaphone, Calendar, BarChart3, TrendingUp, Package, Snowflake, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
          supabase.from('batches').select('*').order('arrival_date', { ascending: false }), // <-- KOMA DI SINI
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
    // Sinkronisasi otomatis setiap 3 detik
    const syncInterval = setInterval(() => { fetchData(); }, 3000);
    return () => clearInterval(syncInterval);
  }, []);

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  // --- LOGIKA STOK MULTI-PRODUK (ANTI DUPLIKAT) ---
  const stockMap: Record<string, { in: number, out: number, displayName: string, isArchived: boolean }> = {};

  batches.forEach(b => {
    const rawName = b.product_name || 'Pempek Campur';
    const key = rawName.trim().toLowerCase(); 
    
    // Default anggap diarsip, sampai terbukti ada 1 saja batch yang belum diarsip
    if (!stockMap[key]) stockMap[key] = { in: 0, out: 0, displayName: rawName.trim(), isArchived: true };
    
    // Hitung total masuk
    if (b.status !== 'Sold Out') stockMap[key].in += Number(b.total_qty);
    
    // Jika ada 1 saja batch yang is_archived = false, berarti produk ini masih aktif
    if (!b.is_archived) stockMap[key].isArchived = false; 
  });

  transactions.forEach(t => {
    const rawName = t.product_name || 'Pempek Campur';
    const key = rawName.trim().toLowerCase(); 
    
    if (!stockMap[key]) stockMap[key] = { in: 0, out: 0, displayName: rawName.trim(), isArchived: false };
    // Hitung total keluar (terjual)
    stockMap[key].out += Number(t.qty);
  });

  // TAHAP AKHIR: Hitung sisa stok, LALU sembunyikan yang masuk kotak arsip
  const currentStocks = Object.values(stockMap)
    .filter(item => item.isArchived === false) // <-- Ini kunci rahasianya: Sembunyikan dari layar!
    .map(item => ({
      name: item.displayName,
      qty: item.in - item.out // Matematikanya tetap normal tidak minus
    }));

  // --- LOGIKA KEUANGAN ---
  const todayStr = new Date().toLocaleDateString('en-CA');
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const trxToday = transactions.filter(t => new Date(t.created_at).toLocaleDateString('en-CA') === todayStr);
  const expToday = expenses.filter(e => new Date(e.created_at).toLocaleDateString('en-CA') === todayStr && e.category !== 'capex');
  const revToday = trxToday.reduce((acc, curr) => acc + (curr.qty * curr.selling_price), 0);
  const qtyToday = trxToday.reduce((acc, curr) => acc + curr.qty, 0);
  
  const trxThisMonth = transactions.filter(t => new Date(t.created_at).getMonth() === currentMonth && new Date(t.created_at).getFullYear() === currentYear);
  const revThisMonth = trxThisMonth.reduce((acc, curr) => acc + (curr.qty * curr.selling_price), 0);

  const adsExpensesThisMonth = expenses.filter(e => new Date(e.created_at).getMonth() === currentMonth && new Date(e.created_at).getFullYear() === currentYear && (e.category === 'ads' || e.category === 'marketing')).reduce((acc, curr) => acc + curr.amount, 0);
  const qtyFromMetaAdsThisMonth = trxThisMonth.filter(t => t.type === 'meta_ads').reduce((acc, curr) => acc + curr.qty, 0);
  const cacMetaAds = qtyFromMetaAdsThisMonth > 0 ? (adsExpensesThisMonth / qtyFromMetaAdsThisMonth) : 0;

  // Hapus transaksi tanpa pop-up konfirmasi
  const handleDelete = async (id: number) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      setTransactions(transactions.filter(trx => trx.id !== id));
      toast.success('Data berhasil dihapus');
    } else {
      toast.error('Gagal menghapus data');
    }
  };

  const generatePDF = (trx: any) => {
    const doc = new jsPDF({ unit: "mm", format: [80, 150] });

    doc.setFontSize(14);
    doc.text("Pempek Umiwa", 40, 15, { align: "center" });
    doc.setFontSize(8);
    doc.text("Pusat Pempek Frozen Bengkulu", 40, 20, { align: "center" });
    doc.text("------------------------------------------", 40, 25, { align: "center" });

    doc.text(`Tgl: ${new Date(trx.created_at).toLocaleDateString()}`, 10, 32);
    doc.text(`Cust: ${trx.customer_name}`, 10, 37);

    autoTable(doc, {
      startY: 45,
      margin: { left: 5, right: 5 },
      head: [['Produk', 'Qty', 'Harga']],
      body: [[trx.product_name, trx.qty, formatIDR(trx.selling_price)]],
      theme: 'plain',
      styles: { fontSize: 7 }
    });

    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 60;
    
    doc.setFontSize(10);
    doc.text(`TOTAL: ${formatIDR(trx.qty * trx.selling_price)}`, 70, finalY, { align: "right" });
    
    doc.setFontSize(8);
    doc.text("Terima kasih sudah memesan!", 40, finalY + 15, { align: "center" });
    doc.text("IG: @pempek_os", 40, finalY + 20, { align: "center" });

    doc.save(`Struk_${trx.customer_name}.pdf`);
    toast.success("Struk berhasil dibuat & didownload!");
  };

  if (loading) return <div className="p-10 text-center text-slate-500 font-bold">Memuat Dashboard...</div>;

  return (
    <div className="font-sans pb-24 bg-slate-50 min-h-screen">
      <header className="bg-emerald-600 text-white p-5 pb-12 rounded-b-[40px] shadow-lg">
        <div className="flex justify-between items-center mb-6">
            <div><h1 className="text-xl font-bold tracking-tight">Pempek Umiwa</h1></div>
            
            <Link href="/analytics" className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition shadow-inner flex items-center cursor-pointer z-10">
              <Activity className="w-5 h-5 text-white mr-2" />
              <span className="text-xs font-bold text-white pr-1">Buka Analitik</span>
            </Link>
        </div>

        {/* TRACKER SISA STOK BERDASARKAN PRODUK */}
        <div className="mt-4 mb-2">
            <h3 className="text-[11px] font-black text-emerald-100 mb-3 uppercase tracking-widest flex items-center opacity-90 drop-shadow-sm">
                <Snowflake className="w-4 h-4 mr-1.5 opacity-80" />
                Live Status Freezer
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              {currentStocks.map((stock, idx) => {
                  const isLow = stock.qty < 5;
                  return (
                    <div key={idx} className={`relative p-3.5 rounded-2xl border backdrop-blur-md overflow-hidden transition-all duration-300 ${isLow ? 'bg-rose-500/90 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'bg-white/10 border-white/20 hover:bg-white/15'}`}>
                      
                      <div className="absolute -right-4 -bottom-4 opacity-10">
                          <Package className="w-16 h-16 text-white" />
                      </div>
                      
                      <div className="relative z-10 flex justify-between items-start mb-2">
                          <p className="text-[11px] font-bold tracking-wide leading-tight pr-4 text-white/90 drop-shadow-sm">{stock.name}</p>
                          {isLow && (
                              <span className="absolute top-0 right-0 flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-200 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                              </span>
                          )}
                      </div>
                      
                      <div className="relative z-10 flex items-end justify-between">
                          <p className="text-3xl font-black drop-shadow-md tracking-tighter">
                              {stock.qty} <span className="text-[10px] font-medium opacity-75 tracking-normal">Pack</span>
                          </p>
                          {isLow ? (
                              <div className="bg-white/20 py-1 px-1.5 rounded-lg flex items-center border border-white/20">
                                  <AlertCircle className="w-3 h-3 text-rose-100 mr-1" />
                                  <span className="text-[8px] font-bold text-rose-50 uppercase tracking-wider">Kritis</span>
                              </div>
                          ) : (
                              <div className="bg-emerald-900/30 py-1 px-2 rounded-lg flex items-center border border-emerald-400/20">
                                  <span className="text-[8px] font-bold text-emerald-100 uppercase tracking-wider">Aman</span>
                              </div>
                          )}
                      </div>
                    </div>
                  );
              })}
              
              {currentStocks.length === 0 && (
                  <div className="col-span-2 p-5 rounded-2xl bg-white/5 border border-white/10 border-dashed text-center backdrop-blur-sm">
                      <Package className="w-6 h-6 mx-auto mb-2 opacity-50 text-emerald-100" />
                      <p className="text-xs font-medium text-emerald-200">Belum ada data stok di freezer.</p>
                  </div>
              )}
            </div>
        </div>
      </header>

      <main className="p-4 space-y-5 -mt-6 relative z-10">
        <section className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10"><Calendar className="w-10 h-10" /></div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Omzet Hari Ini</p>
            <p className="text-xl font-black text-slate-800">{formatIDR(revToday)}</p>
            <p className="text-[10px] text-slate-400 mt-1">Terjual: {qtyToday} Pack</p>
          </div>
          <div className="bg-emerald-700 p-4 rounded-2xl shadow-md border border-emerald-600 relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 p-2 opacity-10"><TrendingUp className="w-10 h-10" /></div>
            <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider mb-1">Omzet Bulan Ini</p>
            <p className="text-xl font-black">{formatIDR(revThisMonth)}</p>
          </div>
        </section>

        <section className="bg-blue-50 border border-blue-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-blue-900 flex items-center mb-1"><Megaphone className="w-4 h-4 mr-2" /> CAC Meta Ads Bulan Ini</h3>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-blue-700">{formatIDR(cacMetaAds)}</p>
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wider">Per Pack Terjual</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-bold text-slate-700 mb-3">Penjualan Terakhir</h3>
          <div className="space-y-3">
            {transactions.slice(0, 5).map((trx) => (
              <div key={trx.id} className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{trx.customer_name}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">
                      {trx.qty}x {trx.product_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{formatIDR(trx.qty * trx.selling_price)}</p>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                   <button onClick={() => handleDelete(trx.id)} className="flex items-center justify-center space-x-1 text-[10px] bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-100 font-bold transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> <span>Hapus</span>
                  </button>
                  <button onClick={() => generatePDF(trx)} className="flex items-center justify-center space-x-1 text-[10px] bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 font-bold transition-colors">
                    <Printer className="w-3.5 h-3.5" /> <span>Cetak Struk</span>
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