"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    BarChart3, Calendar, ArrowLeft, Target, Wallet, AlertCircle, Clock, 
    Activity, PieChart, Share2, Flame, ShoppingCart, Users, Archive, 
    Crown, UserMinus, Sprout, Star, Crosshair, AlertTriangle, Coins, PackageOpen,
    Layers, Percent, // <-- Koma wajib ditambahkan di sini
    Scale, Trash2, ArrowDownCircle, ArrowUpCircle // Coins yang double sudah saya hapus
} from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pnlFilter, setPnlFilter] = useState('all');

    useEffect(() => {
    const fetchData = async () => {
      try {
        const [trxRes, batchRes, expRes] = await Promise.all([
          supabase.from('transactions').select('*'), 
          supabase.from('batches').select('*'),
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

    fetchData(); // <--- TAMBAHAN 1: Jangan lupa panggil fungsinya biar jalan
  }, []); // <--- TAMBAHAN 2: Ini gembok penutup useEffect-nya yang tadi hilang!

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  // --- ALAT PENGAMAN ANGKA & TANGGAL (Wajib Ada) ---
  const safeNum = (val: any) => { const n = Number(val); return isNaN(n) ? 0 : n; };
  const safeDate = (dateStr: any) => {
      if (!dateStr) return new Date();
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? new Date() : d;
  };

  // ==========================================
  // LOGIKA 2: KEUANGAN (FILTERED P&L + BEP FIX + ANTI-MODAL)
  // ==========================================
  const nowPnl = new Date();
  const currentMonth = nowPnl.getMonth();
  const currentYear = nowPnl.getFullYear();

  // A. FUNGSI FILTER HARAM (Hanya untuk Pengeluaran Riil, bukan Modal/Uang Masuk)
  const isRealExpense = (e: any) => {
    return (e.type || '').toLowerCase() === 'expense';
  };

  // B. DATA UNTUK LABA/RUGI (BISA DIFILTER PER BULAN)
  const filteredTrx = transactions.filter(t => {
      if (pnlFilter === 'all') return true;
      const d = safeDate(t.created_at);
      if (pnlFilter === 'this_month') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      if (pnlFilter === 'last_month') {
          const lastM = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastY = currentMonth === 0 ? currentYear - 1 : currentYear;
          return d.getMonth() === lastM && d.getFullYear() === lastY;
      }
      return true;
  });

  const filteredExp = expenses.filter(e => {
      // Baris isRealExpense SAYA HAPUS agar data setoran modal / uang masuk bisa lewat ke Arus Kas
      if (pnlFilter === 'all') return true;
      const d = safeDate(e.created_at);
      if (pnlFilter === 'this_month') return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      if (pnlFilter === 'last_month') {
          const lastM = currentMonth === 0 ? 11 : currentMonth - 1;
          const lastY = currentMonth === 0 ? currentYear - 1 : currentYear;
          return d.getMonth() === lastM && d.getFullYear() === lastY;
      }
      return true;
  });

  // 1. PISAHKAN PENDAPATAN MURNI PRODUK DAN PENDAPATAN JASA (ONGKIR & PACKING)
  const totalProductRevenue = filteredTrx.reduce((acc, curr) => acc + (safeNum(curr.qty) * safeNum(curr.selling_price)), 0);
  const totalServiceRevenue = filteredTrx.reduce((acc, curr) => acc + (safeNum(curr.ongkir) || 0) + (safeNum(curr.packing_fee) || 0), 0);
  const totalGrossRevenue = totalProductRevenue + totalServiceRevenue;

  // 2. HPP DINAMIS DARI DATABASE GUDANG (Bukan dipukul rata 15.000)
  const totalHPP = filteredTrx.reduce((acc, curr) => {
      const batch = batches.find(b => b.id === curr.batch_id);
      const modal = batch ? safeNum(batch.base_cost_per_qty) : 15000;
      return acc + (safeNum(curr.qty) * modal);
  }, 0);

  const totalCapex = filteredExp.filter(e => e.category === 'capex').reduce((acc, curr) => acc + safeNum(curr.amount), 0);
  const totalAds = filteredExp.filter(e => e.category === 'marketing' || e.category === 'ads').reduce((acc, curr) => acc + safeNum(curr.amount), 0);
  const totalStok = filteredExp.filter(e => e.category === 'stok').reduce((acc, curr) => acc + safeNum(curr.amount), 0);
  const totalOpex = filteredExp.filter(e => e.category === 'operational' || e.category === 'operasional').reduce((acc, curr) => acc + safeNum(curr.amount), 0);

  // 3. RUMUS NET PROFIT DAN MARGIN STANDAR KORPORAT
  const netProfit = (totalGrossRevenue - totalHPP) - totalOpex - totalAds;
  const grossMargin = totalProductRevenue > 0 ? ((totalProductRevenue - totalHPP) / totalProductRevenue) * 100 : 0;
  const netMargin = totalGrossRevenue > 0 ? (netProfit / totalGrossRevenue) * 100 : 0;
  
  // ==========================================
  // LOGIKA MUTAKHIR: HITUNG SISA FISIK MURNI (ANTI STOK HANTU)
  // ==========================================
  let totalModalSisaDiFreezer = 0;
  let potensiOmzetSemuaStok = 0;

  // 1. Buat peta untuk menghitung sisa stok riil per nama produk
  const hitungStokRiil: Record<string, { masuk: number, keluar: number, harga: number, modal: number }> = {};

  // 2. Hitung semua barang yang PERNAH MASUK
  batches.forEach(b => {
      if (b.status === 'Rusak/Basi') return; // Abaikan barang rusak

      const namaBersih = (b.product_name || 'Pempek Campur').split(' (REJECT')[0].trim().toLowerCase();

      if (!hitungStokRiil[namaBersih]) {
          hitungStokRiil[namaBersih] = { masuk: 0, keluar: 0, harga: 0, modal: 0 };
      }

      // Tambahkan stok masuk jika batch belum dinyatakan Sold Out secara sistem
      if (b.status !== 'Sold Out') {
          hitungStokRiil[namaBersih].masuk += Number(b.total_qty || 0);
      }

      // Ambil patokan modal & harga dari data yang paling update
      hitungStokRiil[namaBersih].modal = Number(b.base_cost_per_qty) || hitungStokRiil[namaBersih].modal;
      hitungStokRiil[namaBersih].harga = Number(b.price_normal) || Number(b.selling_price) || hitungStokRiil[namaBersih].harga;
  });

  // 3. Kurangi dengan SEMUA TRANSAKSI YANG PERNAH TERJUAL (ALL-TIME)
  // Gunakan variabel transactions UTUH (bachelor penjualan dari awal buka toko)
  transactions.forEach(t => {
      const namaBersih = (t.product_name || 'Pempek Campur').split(' | ')[0].trim().toLowerCase();

      if (hitungStokRiil[namaBersih]) {
          hitungStokRiil[namaBersih].keluar += Number(t.qty || 0);
      }
  });

  // 4. Konversi Sisa Fisik Kulkas ke Rupiah
  Object.keys(hitungStokRiil).forEach(key => {
      const produk = hitungStokRiil[key];
      
      // Sisa riil = Total Masuk Seumur Hidup - Total Keluar Seumur Hidup
      const sisaFisikFreezer = produk.masuk - produk.keluar;

      // HANYA hitung jika barangnya membumi / benar-benar ada di kulkas saat ini
      if (sisaFisikFreezer > 0) {
          totalModalSisaDiFreezer += (sisaFisikFreezer * produk.modal);
          potensiOmzetSemuaStok += (sisaFisikFreezer * produk.harga);
      }
  });

  const totalRugiBarangBasi = 0;
  const potensiUntungSemuaStok = potensiOmzetSemuaStok - totalModalSisaDiFreezer;
  
  // ==========================================
  // LOGIKA 2B: PIUTANG BEREDAR (ACCOUNTS RECEIVABLE)
  // ==========================================
  const totalPiutangBeredar = filteredTrx.reduce((acc, curr) => {
      // FILTER TANGGAL: Abaikan transaksi yang terjadi sebelum 12 Mei 2026
      const cutoffDate = new Date('2026-05-12T00:00:00');
      const trxDate = safeDate(curr.created_at);
      if (trxDate < cutoffDate) {
          return acc;
      }

      // Kalau statusnya udah Lunas, langsung lewati (jangan dihitung utang)
      if (curr.payment_status === 'Lunas') {
          return acc;
      }

      // Kalau statusnya masih 'Terhutang', baru kita hitung sisa tagihannya
      const totalTagihanTrx = (safeNum(curr.qty) * safeNum(curr.selling_price)) + safeNum(curr.ongkir) + safeNum(curr.packing_fee);
      const sisaHutangPelanggan = totalTagihanTrx - safeNum(curr.amount_paid);
      
      return acc + (sisaHutangPelanggan > 0 ? sisaHutangPelanggan : 0);
  }, 0);

  // ==========================================
  // LOGIKA TAMBAHAN B: ARUS KAS FISIK (DOMPET ASLI)
  // ==========================================
  // 1. Uang Masuk Fisik
  // 1. Uang Masuk Fisik (MURNI hanya membaca yang dibayar, hutang 0 tidak akan dihitung)
  const totalCashInSales = filteredTrx.reduce((acc, curr) => acc + safeNum(curr.amount_paid), 0);
  const totalCashInModal = filteredExp.filter(e => e.type === 'income').reduce((acc, curr) => acc + safeNum(curr.amount), 0);
  const totalCashIn = totalCashInSales + totalCashInModal;

  // 2. Uang Keluar Fisik (Termasuk beli stok yang belum laku jadi uang)
  const totalCashOutStok = filteredExp.filter(e => e.type === 'expense' && e.category === 'stok').reduce((acc, curr) => acc + safeNum(curr.amount), 0);
  const totalCashOutCapex = totalCapex; // Narik dari variabel lama Anda
  const totalCashOutOpexAds = totalOpex + totalAds; // Narik dari variabel lama Anda
  const totalCashOut = totalCashOutStok + totalCashOutCapex + totalCashOutOpexAds;

  // 3. Dompet Akhir
  const netCashFlow = totalCashIn - totalCashOut;

  // C. DATA KHUSUS BEP TRACKER (PROFESIONAL)
  const allTimeRev = transactions.reduce((acc, curr) => acc + (safeNum(curr.qty) * safeNum(curr.selling_price)) + safeNum(curr.ongkir) + safeNum(curr.packing_fee), 0);
  
  const allTimeHPP = transactions.reduce((acc, curr) => {
      const batch = batches.find(b => b.id === curr.batch_id);
      const modal = batch ? safeNum(batch.base_cost_per_qty) : 15000;
      return acc + (safeNum(curr.qty) * modal);
  }, 0);

  // 1. Target Modal Pribadi (Menarik semua pemasukan/income dari tabel Keuangan tanpa peduli nama kategorinya)
  const totalSetoranModal = expenses
      .filter(e => e.type === 'income')
      .reduce((acc, curr) => acc + safeNum(curr.amount), 0);
  
  // 2. Total Biaya Operasional (Hanya Opex & Ads, membuang Capex & Stok agar hitungan Profit murni)
  const allTimeOpexAds = expenses
      .filter(e => e.type === 'expense' && (e.category === 'operational' || e.category === 'operasional' || e.category === 'marketing' || e.category === 'ads'))
      .reduce((acc, curr) => acc + safeNum(curr.amount), 0);
  
  // 3. Menghitung Profit Bersih Murni
  const netProfitAllTime = (allTimeRev - allTimeHPP) - allTimeOpexAds; 
  
  // 4. Persentase Kembalinya Modal Pribadi
  const bepPercent = totalSetoranModal > 0 ? Math.max(0, Math.min(100, (netProfitAllTime / totalSetoranModal) * 100)) : 0;
  
  // 5. Sisa Rupiah Menuju Balik Modal 100%
  const sisaBEP = Math.max(0, totalSetoranModal - netProfitAllTime);

  // ==========================================
  // LOGIKA 6: GRAFIK & HEATMAP (TITANIUM FIX)
  // ==========================================
  
  // A. Helper Pembersih Angka & Tanggal (Anti-Error)
  const getSafeNum = (val: any) => { const n = Number(val); return isNaN(n) ? 0 : n; };
  
  const getLocalDateStr = (dateVal: any) => {
      // Jika Supabase gagal mengirim tanggal, paksa baca sebagai hari ini
      const d = dateVal ? new Date(dateVal) : new Date();
      if (isNaN(d.getTime())) return ""; 
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
  };

  const getLocalMonthStr = (dateVal: any) => {
      const d = dateVal ? new Date(dateVal) : new Date();
      if (isNaN(d.getTime())) return "";
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const today = new Date();

  // B. GRAFIK DENYUT NADI HARIAN (7 Hari Terakhir)
  const dailyChart = [...Array(7)].map((_, i) => {
      const targetDate = new Date();
      targetDate.setDate(today.getDate() - (6 - i));
      const targetStr = getLocalDateStr(targetDate); // Ciptakan kunci: "2026-04-19"
      
      let rev = 0;
      transactions.forEach(t => {
          // Hanya tambahkan omzet jika kunci tanggalnya persis sama
          if (getLocalDateStr(t.created_at) === targetStr) {
              rev += (getSafeNum(t.qty) * getSafeNum(t.selling_price));
          }
      });
      
      return { 
          label: targetDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), 
          rev 
      };
  });
  const maxDailyRev = Math.max(...dailyChart.map(d => d.rev), 1);

  // C. GRAFIK TREN BULANAN (6 Bulan Terakhir)
  const monthlyChart = [...Array(6)].map((_, i) => {
      const targetDate = new Date();
      targetDate.setDate(1); // Kunci gembok anti-loncat bulan
      targetDate.setMonth(today.getMonth() - (5 - i));
      const targetMonthStr = getLocalMonthStr(targetDate); // Ciptakan kunci: "2026-04"
      
      let rev = 0;
      transactions.forEach(t => {
          if (getLocalMonthStr(t.created_at) === targetMonthStr) {
              rev += (getSafeNum(t.qty) * getSafeNum(t.selling_price));
          }
      });
      
      return { 
          label: targetDate.toLocaleString('id-ID', { month: 'short' }), 
          rev 
      };
  });
  const maxMonthlyRev = Math.max(...monthlyChart.map(m => m.rev), 1);

  // D. TOP PRODUK & SUMBER OMZET 
  
  const channelSales = { organik: 0, marketplace: 0, meta_ads: 0 };
  transactions.forEach(t => { 
      const type = t.type as keyof typeof channelSales;
      if (type && channelSales[type] !== undefined) {
          channelSales[type] += (getSafeNum(t.qty) * getSafeNum(t.selling_price)); 
      }
  });

  // E. HEATMAP HARI TERAMAI
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const heatmapData = dayNames.map((day, index) => {
      let qty = 0;
      transactions.forEach(t => {
          const d = t.created_at ? new Date(t.created_at) : new Date();
          if (!isNaN(d.getTime()) && d.getDay() === index) {
              qty += getSafeNum(t.qty);
          }
      });
      return { day, qty };
  });
  const maxHeatmapQty = Math.max(...heatmapData.map(d => d.qty), 1);

  if (loading) return <div className="p-10 text-center font-bold text-slate-500 animate-pulse">Memuat Ultimate Dashboard...</div>;

  return (
    <div className="font-sans pb-24 bg-slate-50 min-h-screen">
      <header className="bg-slate-900 text-white p-5 rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><BarChart3 className="w-32 h-32" /></div>
        <Link href="/" className="flex items-center text-slate-400 mb-4 hover:text-white relative z-10 w-fit"><ArrowLeft className="w-5 h-5 mr-2"/> Kembali</Link>
        <h1 className="text-2xl font-black tracking-tight relative z-10">Intelligence Dashboard</h1>
        <p className="text-xs text-slate-400 mt-1 relative z-10">Pusat Analisis Data Pempek Umiwa</p>
      </header>

      <main className="p-4 space-y-6 -mt-1 relative z-20">

        {/* P&L SUMMARY (DENGAN FILTER) */}
        <section className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white mb-2 border border-slate-800 z-30 relative">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold flex items-center text-sm uppercase tracking-widest">
              <Wallet className="w-5 h-5 mr-3 text-amber-400"/> Laba/Rugi
            </h3>
            {/* DROPDOWN FILTER */}
            <select 
              value={pnlFilter} 
              onChange={(e) => setPnlFilter(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg text-[10px] font-bold px-2 py-1 outline-none cursor-pointer hover:bg-white/20 transition"
            >
              <option value="all" className="bg-slate-900">Semua Waktu</option>
              <option value="this_month" className="bg-slate-900">Bulan Ini</option>
              <option value="last_month" className="bg-slate-900">Bulan Lalu</option>
            </select>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-slate-800 pb-3">
                <span className="text-slate-400 text-xs">Penjualan Murni Produk</span>
                <span className="font-black text-lg">{formatIDR(totalProductRevenue)}</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-800 pb-3">
                <span className="text-slate-400 text-xs">Pendapatan Ongkir & Packing</span>
                <span className="font-black text-lg text-indigo-400">+ {formatIDR(totalServiceRevenue)}</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-800 pb-3">
                <span className="text-slate-400 text-xs">Modal (HPP)</span>
                <span className="font-bold text-amber-400">- {formatIDR(totalHPP)}</span>
            </div>
            
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center">Breakdown Biaya (Mengurangi Laba)</p>
                <div className="flex justify-between text-xs"><span>Ads Marketing</span><span className="font-bold text-blue-400">- {formatIDR(totalAds)}</span></div>
                <div className="flex justify-between text-xs"><span>Operasional</span><span className="font-bold text-rose-400">- {formatIDR(totalOpex)}</span></div>
                
                <div className="border-t border-white/10 pt-3 mt-3 space-y-2">
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Aliran Kas Keluar (Aset / Tdk Kurangi Laba)</p>
                    <div className="flex justify-between text-xs"><span>Capex (Investasi)</span><span className="font-bold text-indigo-400">{formatIDR(totalCapex)}</span></div>
                    <div className="flex justify-between text-xs"><span>Beli Stok (Aset)</span><span className="font-bold text-teal-400">{formatIDR(totalStok)}</span></div>
                </div>
            </div>

            <div className="pt-4 flex justify-between items-center">
                <div>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase">Profit Bersih ({pnlFilter === 'all' ? 'All Time' : 'Periode Ini'})</p>
                    <h2 className={`text-3xl font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatIDR(netProfit)}</h2>
                </div>
                <div className="text-right">
                    <div className="flex items-center justify-end text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg mb-1">
                        Gross: {grossMargin.toFixed(1)}%
                    </div>
                    <div className={`flex items-center justify-end text-[10px] font-bold bg-blue-500/10 px-2 py-1 rounded-lg ${netProfit >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                        Net: {netMargin.toFixed(1)}%
                    </div>
                </div>
            </div>
          </div>
        </section>

        {/* KOTAK VALUASI STOK UPGRADED (POTENSI OMZET & PROFIT) */}
        <section className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white mb-2 border border-slate-800">
          <h3 className="font-bold flex items-center text-sm uppercase tracking-widest mb-4">
            <PackageOpen className="w-5 h-5 mr-3 text-amber-400"/> Valuasi & Potensi Stok
          </h3>
          
          {/* BARIS 1: KONDISI STOK SAAT INI */}
          <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-slate-800 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Modal Mengendap</p>
                <p className="text-base font-black text-indigo-400 mt-1">{formatIDR(totalModalSisaDiFreezer)}</p>
              </div>
              <div className="bg-rose-950/30 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-rose-400/70 uppercase tracking-wide">Rugi Stok Basi</p>
                <p className="text-base font-black text-rose-500 mt-1">{formatIDR(0)}</p>
              </div>
          </div>

          {/* BARIS 2: PREDIKSI MASA DEPAN JIKA HABIS TERJUAL */}
          <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-950/20 border border-emerald-500/10 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Potensi Omzet Cash</p>
                <p className="text-base font-black text-emerald-400 mt-1">+{formatIDR(potensiOmzetSemuaStok)}</p>
              </div>
              <div className="bg-cyan-950/20 border border-cyan-500/10 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide">Potensi Cuan Bersih</p>
                <p className="text-base font-black text-cyan-400 mt-1">+{formatIDR(potensiUntungSemuaStok)}</p>
              </div>
          </div>

          {/* TOTAL KEUNTUNGAN REAL SAAT INI */}
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex justify-between items-center">
             <div>
                <span className="text-xs text-amber-200 font-bold block">Keuntungan Real Saat Ini:</span>
                <span className="text-[9px] text-slate-400 italic">*Sudah dikurangi operasional & iklan berjalan</span>
             </div>
             <span className={`text-lg font-black ${netProfit - totalRugiBarangBasi >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {formatIDR(netProfit - totalRugiBarangBasi)}
             </span>
          </div>
        </section>

        {/* PANEL BARU: PIUTANG BEREDAR (ACCOUNTS RECEIVABLE) */}
        <section className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white mb-2 border border-slate-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold flex items-center text-sm uppercase tracking-widest text-slate-200">
              <Activity className="w-5 h-5 mr-3 text-rose-400"/> Piutang Beredar
            </h3>
            <span className="text-[9px] font-black bg-rose-500/20 text-rose-400 px-2.5 py-1 rounded-md uppercase tracking-wider">
               Belum Tertagih
            </span>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 p-5 rounded-2xl border border-slate-700/60 flex justify-between items-center">
             <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Total Uang di Pelanggan</p>
                <h2 className="text-2xl font-black text-rose-400 mt-1">{formatIDR(totalPiutangBeredar)}</h2>
             </div>
             <div className="text-right max-w-[50%]">
                <p className="text-[9px] text-slate-400 leading-normal italic">
                   *Uang ini sudah diakui sebagai omzet penjualan, namun fisik kas belum masuk ke laci/bank Pempek Umiwa.
                </p>
             </div>
          </div>
        </section>

        {/* ========================================== */}
        {/* FITUR BARU 2: ARUS KAS FISIK (CASH FLOW)  */}
        {/* ========================================== */}
        <section className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white mb-6 border border-slate-800 z-30 relative">
          <h3 className="font-bold flex items-center text-sm uppercase tracking-widest mb-4">
            <Coins className="w-5 h-5 mr-3 text-emerald-400"/> Arus Kas Fisik (Cash Flow)
          </h3>
          <div className="space-y-4">
            <div className="bg-emerald-950/20 border border-emerald-900/30 p-4 rounded-2xl space-y-2">
                <p className="text-[10px] font-bold text-emerald-500 uppercase flex items-center"><ArrowDownCircle className="w-3 h-3 mr-1"/> Uang Masuk Fisik</p>
                <div className="flex justify-between text-xs"><span>Omzet / DP Masuk</span><span className="font-bold text-emerald-400">{formatIDR(totalCashInSales)}</span></div>
                <div className="flex justify-between text-xs"><span>Setoran Modal</span><span className="font-bold text-emerald-400">{formatIDR(totalCashInModal)}</span></div>
            </div>
            <div className="bg-rose-950/20 border border-rose-900/30 p-4 rounded-2xl space-y-2">
                <p className="text-[10px] font-bold text-rose-500 uppercase flex items-center"><ArrowUpCircle className="w-3 h-3 mr-1"/> Uang Keluar Fisik</p>
                <div className="flex justify-between text-xs"><span>Beli Stok (Aset/Harta)</span><span className="font-bold text-rose-400">- {formatIDR(totalCashOutStok)}</span></div>
                <div className="flex justify-between text-xs"><span>Opex & Iklan</span><span className="font-bold text-rose-400">- {formatIDR(totalCashOutOpexAds)}</span></div>
                <div className="flex justify-between text-xs"><span>Beli Alat/Capex</span><span className="font-bold text-rose-400">- {formatIDR(totalCashOutCapex)}</span></div>
            </div>
            <div className="pt-2 flex justify-between items-center border-t border-slate-700">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Posisi Kas Dompet</p>
                </div>
                <h2 className={`text-2xl font-black ${netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                    {netCashFlow >= 0 ? '+' : ''}{formatIDR(netCashFlow)}
                </h2>
            </div>
          </div>
        </section>

        {/* GRAFIK HARIAN (DENYUT NADI) */}
        <section className="bg-white p-5 rounded-2xl shadow-md border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center"><Activity className="w-4 h-4 mr-2 text-indigo-500"/> Denyut Nadi (7 Hari)</h3>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md">Harian</span>
          </div>
          <div className="h-40 flex items-end justify-between space-x-1">
            {dailyChart.map((d, i) => {
              const heightPercent = maxDailyRev > 0 ? (d.rev / maxDailyRev) * 100 : 0;
              return (
                // PERBAIKAN DI SINI: Tambahan h-full dan justify-end
                <div key={i} className="flex flex-col items-center justify-end w-full h-full group relative pb-1">
                  <div className="absolute top-0 -mt-2 text-[8px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 p-1 rounded z-10 whitespace-nowrap">
                    {d.rev > 0 ? (d.rev/1000).toFixed(0)+'k' : '0'}
                  </div>
                  <div 
                    className={`w-full rounded-t-sm transition-all duration-700 ${d.rev === maxDailyRev && d.rev > 0 ? 'bg-indigo-500' : 'bg-indigo-200 hover:bg-indigo-300'}`} 
                    style={{ height: `${Math.max(heightPercent || 0, 2)}%` }}
                  ></div>
                  <span className="text-[8px] font-bold text-slate-500 mt-2 rotate-45 origin-left">{d.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* CHANNEL ANALYTICS & HEATMAP */}
        <section className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center">
            <h3 className="font-bold text-slate-800 flex items-center mb-3 text-[11px] uppercase tracking-wider"><Share2 className="w-3 h-3 mr-1 text-blue-500"/> Sumber Omzet</h3>
            <div className="space-y-2">
                <div><p className="text-[9px] text-slate-500">Meta Ads</p><p className="text-sm font-black text-blue-600">{formatIDR(channelSales.meta_ads)}</p></div>
                <div><p className="text-[9px] text-slate-500">Marketplace</p><p className="text-sm font-black text-orange-500">{formatIDR(channelSales.marketplace)}</p></div>
                <div><p className="text-[9px] text-slate-500">Organik (WA)</p><p className="text-sm font-black text-emerald-600">{formatIDR(channelSales.organik)}</p></div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center mb-3 text-[11px] uppercase tracking-wider"><Flame className="w-3 h-3 mr-1 text-rose-500"/> Hari Teramai</h3>
            <div className="flex justify-between items-end h-28 space-x-1">
                {heatmapData.map((d, i) => {
                    const heatPercent = maxHeatmapQty > 0 ? (d.qty / maxHeatmapQty) * 100 : 0;
                    return (
                        // PERBAIKAN DI SINI: Tambahan h-full dan justify-end
                        <div key={i} className="flex flex-col items-center justify-end w-full h-full group relative">
                            <span className="text-[8px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition">{d.qty}</span>
                            <div className={`w-full rounded-sm transition-all duration-700 ${d.qty === maxHeatmapQty && d.qty > 0 ? 'bg-rose-500' : 'bg-rose-200'}`} style={{ height: `${Math.max(heatPercent || 0, 5)}%` }}></div>
                            <span className="text-[8px] font-bold text-slate-400 mt-1">{d.day}</span>
                        </div>
                    )
                })}
            </div>
          </div>
        </section>

        {/* BEP TRACKER CARD (STANDAR PROFESIONAL) */}
        <section className="bg-white p-5 rounded-2xl shadow-md border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center"><Target className="w-5 h-5 mr-2 text-indigo-500"/> BEP Tracker</h3>
            <span className="text-sm font-black text-indigo-600">{bepPercent.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden border border-slate-200 shadow-inner relative">
            <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${Math.max(2, bepPercent)}%` }}></div>
          </div>
          <div className="flex justify-between mt-3 text-xs font-bold text-slate-500">
            <p>Target Modal: {formatIDR(totalSetoranModal)}</p>
            <p>Sisa: <span className="text-rose-500">{formatIDR(sisaBEP)}</span></p>
          </div>
        </section>

        {/* GRAFIK BULANAN */}
        <section className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center"><Calendar className="w-4 h-4 mr-2 text-emerald-500"/> Tren 6 Bulan</h3>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md">Bulanan</span>
          </div>
          <div className="h-40 flex items-end justify-between space-x-2">
            {monthlyChart.map((m, i) => {
              const heightPercent = maxMonthlyRev > 0 ? (m.rev / maxMonthlyRev) * 100 : 0;
              return (
                // PERBAIKAN DI SINI: Tambahan h-full dan justify-end
                <div key={i} className="flex flex-col items-center justify-end w-full h-full group relative pb-1">
                  <div className="absolute top-0 -mt-2 text-[8px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 p-1 rounded z-10">
                    {m.rev > 0 ? (m.rev/1000).toFixed(0)+'k' : '0'}
                  </div>
                  <div className={`w-full rounded-t-md transition-all duration-700 ${m.rev === maxMonthlyRev && m.rev > 0 ? 'bg-emerald-500' : 'bg-emerald-200 hover:bg-emerald-300'}`} style={{ height: `${Math.max(heightPercent || 0, 5)}%` }}></div>
                  <span className="text-[9px] font-bold text-slate-500 mt-2 uppercase">{m.label}</span>
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}