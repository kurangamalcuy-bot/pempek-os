"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity, Trash2, Printer, Megaphone, Calendar, BarChart3, TrendingUp, Package } from 'lucide-react';
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

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  // --- LOGIKA STOK MULTI-PRODUK (OTOMATIS) ---
  const stockMap: Record<string, { in: number, out: number }> = {};
  
  // 1. Kumpulkan semua stok masuk berdasarkan nama produk
  batches.forEach(b => {
    const name = b.product_name || 'Pempek Campur';
    if (!stockMap[name]) stockMap[name] = { in: 0, out: 0 };
    if (b.status !== 'Sold Out') stockMap[name].in += b.total_qty;
  });

  // 2. Kurangi dengan stok yang terjual berdasarkan nama produk
  transactions.forEach(t => {
    const name = t.product_name || 'Pempek Campur';
    if (!stockMap[name]) stockMap[name] = { in: 0, out: 0 };
    stockMap[name].out += t.qty;
  });

  // 3. Ubah jadi list array untuk ditampilkan
  const currentStocks = Object.keys(stockMap).map(name => ({
    name,
    qty: stockMap[name].in - stockMap[name].out
  }));


  // --- LOGIKA KEUANGAN (SAMA SEPERTI SEBELUMNYA) ---
  const todayStr = new Date().toLocaleDateString('en-CA');
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const trxToday = transactions.filter(t => new Date(t.created_at).toLocaleDateString('en-CA') === todayStr);
  const expToday = expenses.filter(e => new Date(e.created_at).toLocaleDateString('en-CA') === todayStr && e.category !== 'capex');
  const revToday = trxToday.reduce((acc, curr) => acc + (curr.qty * curr.selling_price), 0);
  const qtyToday = trxToday.reduce((acc, curr) => acc + curr.qty, 0);
  const opexToday = expToday.reduce((acc, curr) => acc + curr.amount, 0);
  const profitToday = revToday - opexToday; // Simple gross profit harian

  const trxThisMonth = transactions.filter(t => new Date(t.created_at).getMonth() === currentMonth && new Date(t.created_at).getFullYear() === currentYear);
  const revThisMonth = trxThisMonth.reduce((acc, curr) => acc + (curr.qty * curr.selling_price), 0);

  const adsExpensesThisMonth = expenses.filter(e => new Date(e.created_at).getMonth() === currentMonth && new Date(e.created_at).getFullYear() === currentYear && e.category === 'ads').reduce((acc, curr) => acc + curr.amount, 0);
  const qtyFromMetaAdsThisMonth = trxThisMonth.filter(t => t.type === 'meta_ads').reduce((acc, curr) => acc + curr.qty, 0);
  const cacMetaAds = qtyFromMetaAdsThisMonth > 0 ? (adsExpensesThisMonth / qtyFromMetaAdsThisMonth) : 0;

  const handleDelete = async (id: number) => {
    if (window.confirm("Yakin ingin menghapus transaksi ini?")) {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (!error) {
        setTransactions(transactions.filter(trx => trx.id !== id));
        toast.success('Data berhasil dihapus');
      } else {
        toast.error('Gagal menghapus data');
      }
    }
  };

  // --- KODE BARU: MESIN PEMBUAT PDF ---
  const generatePDF = (trx: any) => {
    const doc = new jsPDF({
      unit: "mm",
      format: [80, 150] // Ukuran kertas thermal struk
    });

    // Desain Header Struk
    doc.setFontSize(14);
    doc.text("Pempek Umiwa", 40, 15, { align: "center" });
    doc.setFontSize(8);
    doc.text("Pusat Pempek Frozen Bengkulu", 40, 20, { align: "center" });
    doc.text("------------------------------------------", 40, 25, { align: "center" });

    // Detail Transaksi
    doc.text(`Tgl: ${new Date(trx.created_at).toLocaleDateString()}`, 10, 32);
    doc.text(`Cust: ${trx.customer_name}`, 10, 37);

    // KODE YANG DIPERBAIKI: Menggunakan autoTable secara langsung
    autoTable(doc, {
      startY: 45,
      margin: { left: 5, right: 5 },
      head: [['Produk', 'Qty', 'Harga']],
      body: [[trx.product_name, trx.qty, formatIDR(trx.selling_price)]],
      theme: 'plain',
      styles: { fontSize: 7 }
    });

    // KODE YANG DIPERBAIKI: Mengambil posisi Y terakhir dengan aman
    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 10 : 60;
    
    doc.setFontSize(10);
    doc.text(`TOTAL: ${formatIDR(trx.qty * trx.selling_price)}`, 70, finalY, { align: "right" });
    
    doc.setFontSize(8);
    doc.text("Terima kasih sudah memesan!", 40, finalY + 15, { align: "center" });
    doc.text("IG: @pempek_os", 40, finalY + 20, { align: "center" });

    // Download File
    doc.save(`Struk_${trx.customer_name}.pdf`);
    toast.success("Struk berhasil dibuat & didownload!");
  };
  // --- BATAS KODE BARU ---

  if (loading) return <div className="p-10 text-center text-slate-500 font-bold">Memuat Analitik...</div>;

  return (
    <div className="font-sans pb-24 bg-slate-50 min-h-screen">
      <header className="bg-emerald-600 text-white p-5 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-center mb-6">
            <div><h1 className="text-xl font-bold tracking-tight">Pempek OS v2</h1><p className="text-emerald-100 text-xs">Pusat Komando Operasional</p></div>
            
            {/* TOMBOL MENUJU HALAMAN ANALITIK */}
            <Link href="/analytics" className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition shadow-inner flex items-center cursor-pointer z-10">
              <Activity className="w-5 h-5 text-white mr-2" />
              <span className="text-xs font-bold text-white pr-1">Buka Analitik</span>
            </Link>
          </div>

        {/* TRACKER SISA STOK BERDASARKAN PRODUK */}
        <h3 className="text-xs font-bold text-emerald-100 mb-2 uppercase tracking-wider">Sisa Stok di Freezer</h3>
        <div className="grid grid-cols-2 gap-2">
          {currentStocks.map((stock, idx) => (
            <div key={idx} className={`p-3 rounded-xl border backdrop-blur-sm ${stock.qty < 5 ? 'bg-rose-500/90 border-rose-400 text-white' : 'bg-white/10 border-white/20 text-white'}`}>
              <p className="text-[10px] opacity-80 font-bold truncate">{stock.name}</p>
              <p className="text-xl font-black">{stock.qty} <span className="text-[10px] font-normal opacity-80">Pack</span></p>
            </div>
          ))}
          {currentStocks.length === 0 && <p className="text-xs text-emerald-200">Belum ada data stok.</p>}
        </div>
      </header>

      <main className="p-4 space-y-5 -mt-2">
        {/* Laba Rugi dan Komponen lainnya tetap sama */}
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