"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    BarChart3, Calendar, ArrowLeft, Target, Wallet, AlertCircle, Clock, 
    Activity, PieChart, Share2, Flame, ShoppingCart, Users, Archive, 
    Crown, UserMinus, Sprout, Star, Crosshair, AlertTriangle, Coins, PackageOpen,
    Layers, Percent // <-- Ini yang baru ditambahkan
} from 'lucide-react';
import Link from 'next/link';

export default function AnalyticsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk Fitur Target
  const [monthlyTarget, setMonthlyTarget] = useState(20000000); // Default 20 Juta

  useEffect(() => {
    const fetchData = async () => {
      const [trxRes, batchRes, expRes] = await Promise.all([
        supabase.from('transactions').select('*').order('created_at', { ascending: true }),
        supabase.from('batches').select('*'),
        supabase.from('expenses').select('*')
      ]);
      if (trxRes.data) setTransactions(trxRes.data);
      if (batchRes.data) setBatches(batchRes.data);
      if (expRes.data) setExpenses(expRes.data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  // ==========================================
  // LOGIKA 1: FORECASTING (PREDIKSI STOK)
  // ==========================================
  const getForecasting = () => {
    const stockMap: Record<string, number> = {};
    batches.forEach(b => { if (b.status !== 'Sold Out') stockMap[b.product_name] = (stockMap[b.product_name] || 0) + b.total_qty; });
    transactions.forEach(t => { stockMap[t.product_name] = (stockMap[t.product_name] || 0) - t.qty; });

    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return Object.keys(stockMap).map(name => {
        const trxRecent = transactions.filter(t => t.product_name === name && new Date(t.created_at) >= sevenDaysAgo);
        const totalSoldRecent = trxRecent.reduce((acc, curr) => acc + curr.qty, 0);
        const avgDailySales = totalSoldRecent / 7;
        const daysLeft = avgDailySales > 0 ? Math.floor(stockMap[name] / avgDailySales) : Infinity;
        
        return {
            name, currentStock: stockMap[name], avgDaily: avgDailySales.toFixed(1),
            daysLeft: daysLeft === Infinity ? 'Belum ada data' : `${daysLeft} Hari lagi`,
            isCritical: daysLeft <= 3
        };
    }).sort((a, b) => (a.isCritical === b.isCritical ? 0 : a.isCritical ? -1 : 1));
  };
  const forecasts = getForecasting();

  // ==========================================
  // LOGIKA 2: KEUANGAN (BEP & P&L)
  // ==========================================
  const totalCapex = expenses.filter(e => e.category === 'capex').reduce((acc, curr) => acc + curr.amount, 0) || 1;
  const totalAds = expenses.filter(e => e.category === 'ads').reduce((acc, curr) => acc + curr.amount, 0);
  const totalOpex = expenses.filter(e => e.category !== 'capex' && e.category !== 'ads').reduce((acc, curr) => acc + curr.amount, 0);

  const totalRevenue = transactions.reduce((acc, curr) => acc + (curr.qty * curr.selling_price), 0);
  const totalHPP = transactions.reduce((acc, curr) => acc + (curr.qty * 15000), 0);
  // Asumsi HPP 15rb
  
  const grossProfit = totalRevenue - totalHPP;
  const netProfit = grossProfit - totalOpex - totalAds;
  
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const bepPercent = Math.max(0, Math.min(100, (netProfit / totalCapex) * 100));
  const sisaBEP = Math.max(0, totalCapex - netProfit);

  // ==========================================
  // LOGIKA 3: SUPER KPI & RFM SEGMENTATION
  // ==========================================
  const aov = transactions.length > 0 ? totalRevenue / transactions.length : 0;
  const inventoryValue = forecasts.reduce((sum, f) => sum + (f.currentStock * 15000), 0);

  // RFM Analysis
  const customerMap: Record<string, { freq: number, monetary: number, lastDate: Date }> = {};
  transactions.forEach(t => {
      if (!customerMap[t.customer_phone]) customerMap[t.customer_phone] = { freq: 0, monetary: 0, lastDate: new Date(0) };
      const d = new Date(t.created_at);
      if (d > customerMap[t.customer_phone].lastDate) customerMap[t.customer_phone].lastDate = d;
      customerMap[t.customer_phone].freq += 1;
      customerMap[t.customer_phone].monetary += (t.qty * t.selling_price);
  });

  const now = new Date();
  const segments = { sultan: 0, atRisk: 0, newbie: 0, regular: 0 };
  Object.values(customerMap).forEach(c => {
      const daysSince = (now.getTime() - c.lastDate.getTime()) / (1000 * 3600 * 24);
      if (c.freq >= 2 && c.monetary >= 100000 && daysSince <= 30) segments.sultan++;
      else if (c.freq > 1 && daysSince > 30) segments.atRisk++;
      else if (c.freq === 1 && daysSince <= 14) segments.newbie++;
      else segments.regular++;
  });
  const totalUniqueCustomers = Object.keys(customerMap).length;
  const repeatRate = totalUniqueCustomers > 0 ? ((totalUniqueCustomers - segments.newbie - segments.regular) / totalUniqueCustomers) * 100 : 0;

  // ==========================================
  // LOGIKA 4: TARGET PACING (RUN-RATE)
  // ==========================================
  const currentM = now.getMonth();
  const currentY = now.getFullYear();
  const trxThisMonth = transactions.filter(t => new Date(t.created_at).getMonth() === currentM && new Date(t.created_at).getFullYear() === currentY);
  const mtdRevenue = trxThisMonth.reduce((acc, t) => acc + (t.qty * t.selling_price), 0);
  const daysPassed = now.getDate();
  const totalDaysInMonth = new Date(currentY, currentM + 1, 0).getDate();
  const daysLeftInMonth = totalDaysInMonth - daysPassed;
  
  const currentRunRate = mtdRevenue / daysPassed;
  const projectedRevenue = mtdRevenue + (currentRunRate * daysLeftInMonth);
  const requiredRunRate = daysLeftInMonth > 0 ? Math.max(0, (monthlyTarget - mtdRevenue) / daysLeftInMonth) : 0;
  const pacingPercentage = Math.min((mtdRevenue / monthlyTarget) * 100, 100);
  const isOnTrack = projectedRevenue >= monthlyTarget;

  // ==========================================
  // LOGIKA 5: PROFITABILITY QUADRANT
  // ==========================================
  const costMap: Record<string, number> = {};
  batches.forEach(b => { costMap[b.product_name] = b.base_cost_per_qty; });
  
  const productStats: Record<string, { vol: number, rev: number, cost: number }> = {};
  transactions.forEach(t => {
      const name = t.product_name;
      if (!productStats[name]) productStats[name] = { vol: 0, rev: 0, cost: 0 };
      productStats[name].vol += t.qty;
      productStats[name].rev += (t.qty * t.selling_price);
      productStats[name].cost += (t.qty * (costMap[name] || 15000));
  });

  const quadData = Object.keys(productStats).map(k => {
      const vol = productStats[k].vol;
      const margin = vol > 0 ? (productStats[k].rev - productStats[k].cost) / vol : 0;
      return { name: k, vol, margin };
  });
  const avgVol = quadData.reduce((acc, c) => acc + c.vol, 0) / (quadData.length || 1);
  const avgMargin = quadData.reduce((acc, c) => acc + c.margin, 0) / (quadData.length || 1);

  const quadStars = quadData.filter(q => q.vol >= avgVol && q.margin >= avgMargin).map(q => q.name);
  const quadCows = quadData.filter(q => q.vol < avgVol && q.margin >= avgMargin).map(q => q.name);
  const quadHorses = quadData.filter(q => q.vol >= avgVol && q.margin < avgMargin).map(q => q.name);
  const quadDogs = quadData.filter(q => q.vol < avgVol && q.margin < avgMargin).map(q => q.name);

  // ==========================================
  // LOGIKA 6: GRAFIK & HEATMAP
  // ==========================================
  const dailyChart = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); const dateStr = d.toLocaleDateString('en-CA');
    const dayTrx = transactions.filter(t => new Date(t.created_at).toLocaleDateString('en-CA') === dateStr);
    return { label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), rev: dayTrx.reduce((sum, t) => sum + (t.qty * t.selling_price), 0) };
  });
  const maxDailyRev = Math.max(...dailyChart.map(d => d.rev), 1);

  const monthlyChart = [...Array(6)].map((_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const trxMonth = transactions.filter(t => new Date(t.created_at).getMonth() === d.getMonth() && new Date(t.created_at).getFullYear() === d.getFullYear());
    return { label: d.toLocaleString('id-ID', { month: 'short' }), rev: trxMonth.reduce((acc, curr) => acc + (curr.qty * curr.selling_price), 0) };
  });
  const maxMonthlyRev = Math.max(...monthlyChart.map(m => m.rev), 1);

  const topProducts = quadData.map(q => ({ name: q.name, qty: q.vol, percent: (q.vol / (quadData.reduce((a,b)=>a+b.vol,0)||1))*100 })).sort((a, b) => b.qty - a.qty).slice(0, 4);
  
  const channelSales = { organik: 0, marketplace: 0, meta_ads: 0 };
  transactions.forEach(t => { if (channelSales[t.type as keyof typeof channelSales] !== undefined) channelSales[t.type as keyof typeof channelSales] += (t.qty * t.selling_price); });

  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const heatmapData = dayNames.map((day, index) => ({ day, qty: transactions.filter(t => new Date(t.created_at).getDay() === index).reduce((acc, curr) => acc + curr.qty, 0) }));
  const maxHeatmapQty = Math.max(...heatmapData.map(d => d.qty), 1);

  if (loading) return <div className="p-10 text-center font-bold text-slate-500 animate-pulse">Memuat Ultimate Dashboard...</div>;

  return (
    <div className="font-sans pb-24 bg-slate-50 min-h-screen">
      <header className="bg-slate-900 text-white p-5 rounded-b-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><BarChart3 className="w-32 h-32" /></div>
        <Link href="/" className="flex items-center text-slate-400 mb-4 hover:text-white relative z-10 w-fit"><ArrowLeft className="w-5 h-5 mr-2"/> Kembali</Link>
        <h1 className="text-2xl font-black tracking-tight relative z-10">Intelligence Dashboard</h1>
        <p className="text-xs text-slate-400 mt-1 relative z-10">Pusat Analisis Data Pempek OS</p>
      </header>

      <main className="p-4 space-y-6 -mt-4 relative z-20">
        
        {/* ========================================== */}
        {/* FITUR BARU 3: TARGET PACING (RUN-RATE)     */}
        {/* ========================================== */}
        <section className="bg-white p-5 rounded-2xl shadow-md border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center"><Crosshair className="w-5 h-5 mr-2 text-indigo-500"/> Target Pacing Bulan Ini</h3>
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <span className="text-[10px] font-bold px-2 text-slate-500">Rp</span>
                <input type="number" value={monthlyTarget} onChange={(e) => setMonthlyTarget(Number(e.target.value))} className="w-20 p-1 text-xs font-bold outline-none bg-transparent" />
            </div>
          </div>
          
          <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden border border-slate-200 shadow-inner relative mb-2">
            <div className={`h-full transition-all duration-1000 ${isOnTrack ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.max(2, pacingPercentage)}%` }}></div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-center mt-4">
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Proyeksi Akhir Bulan</p>
                  <p className={`text-sm font-black ${isOnTrack ? 'text-emerald-600' : 'text-amber-600'}`}>{formatIDR(projectedRevenue)}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-500 uppercase">Target Kecepatan Harian</p>
                  <p className="text-sm font-black text-slate-800">{formatIDR(requiredRunRate)} <span className="text-[9px]">/hr</span></p>
              </div>
          </div>
          {!isOnTrack && <p className="text-[10px] text-amber-700 mt-2 text-center font-medium bg-amber-50 p-1 rounded-lg">⚠️ Tambah omzet {formatIDR(monthlyTarget - projectedRevenue)} lagi untuk aman!</p>}
        </section>

        {/* ========================================== */}
        {/* FITUR BARU 1: RFM SEGMENTATION (PELANGGAN) */}
        {/* ========================================== */}
        <section className="grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-b from-amber-50 to-white p-3 rounded-2xl shadow-sm border border-amber-200 text-center">
                <div className="flex justify-center mb-1"><Crown className="w-5 h-5 text-amber-500"/></div>
                <p className="text-lg font-black text-amber-600 mt-1">{segments.sultan} <span className="text-[10px] font-normal text-slate-500">Org</span></p>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter leading-tight mt-1">Sultan (VIP)</p>
            </div>
            <div className="bg-gradient-to-b from-rose-50 to-white p-3 rounded-2xl shadow-sm border border-rose-200 text-center">
                <div className="flex justify-center mb-1"><UserMinus className="w-5 h-5 text-rose-500"/></div>
                <p className="text-lg font-black text-rose-600 mt-1">{segments.atRisk} <span className="text-[10px] font-normal text-slate-500">Org</span></p>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter leading-tight mt-1">Risiko Kabur</p>
            </div>
            <div className="bg-gradient-to-b from-emerald-50 to-white p-3 rounded-2xl shadow-sm border border-emerald-200 text-center">
                <div className="flex justify-center mb-1"><Sprout className="w-5 h-5 text-emerald-500"/></div>
                <p className="text-lg font-black text-emerald-600 mt-1">{segments.newbie} <span className="text-[10px] font-normal text-slate-500">Org</span></p>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter leading-tight mt-1">Anak Baru</p>
            </div>
        </section>

        <section className="grid grid-cols-2 gap-2">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
                <ShoppingCart className="w-4 h-4 text-emerald-500 mb-1"/>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Rata-rata Order (AOV)</p>
                <p className="text-sm font-black text-slate-800">{formatIDR(aov)}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
                <Archive className="w-4 h-4 text-amber-500 mb-1"/>
                <p className="text-[9px] font-bold text-slate-500 uppercase">Aset Beku (Freezer)</p>
                <p className="text-sm font-black text-amber-600">{formatIDR(inventoryValue)}</p>
            </div>
        </section>

        {/* ========================================== */}
        {/* FITUR BARU 2: PROFITABILITY QUADRANT       */}
        {/* ========================================== */}
        <section className="bg-slate-900 p-5 rounded-2xl shadow-md border border-slate-800 text-white">
          <h3 className="font-bold flex items-center mb-4"><PackageOpen className="w-4 h-4 mr-2 text-fuchsia-400"/> Kuadran Profitabilitas Produk</h3>
          <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                  <p className="text-[10px] font-bold text-amber-300 flex items-center"><Coins className="w-3 h-3 mr-1"/> Sapi Perah (Margin Tinggi, Vol Rendah)</p>
                  <p className="text-xs text-slate-300 mt-1">{quadCows.length > 0 ? quadCows.join(', ') : '-'}</p>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                  <p className="text-[10px] font-bold text-emerald-300 flex items-center"><Star className="w-3 h-3 mr-1"/> Bintang (Margin Tinggi, Vol Tinggi)</p>
                  <p className="text-xs text-slate-300 mt-1">{quadStars.length > 0 ? quadStars.join(', ') : '-'}</p>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                  <p className="text-[10px] font-bold text-rose-300 flex items-center"><AlertTriangle className="w-3 h-3 mr-1"/> Anjing (Margin Tipis, Vol Rendah)</p>
                  <p className="text-xs text-slate-300 mt-1">{quadDogs.length > 0 ? quadDogs.join(', ') : '-'}</p>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                  <p className="text-[10px] font-bold text-blue-300 flex items-center"><Activity className="w-3 h-3 mr-1"/> Kuda Beban (Margin Tipis, Vol Tinggi)</p>
                  <p className="text-xs text-slate-300 mt-1">{quadHorses.length > 0 ? quadHorses.join(', ') : '-'}</p>
              </div>
          </div>
        </section>

        {/* GRAFIK HARIAN (DENYUT NADI) */}
        <section className="bg-white p-5 rounded-2xl shadow-md border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center"><Activity className="w-4 h-4 mr-2 text-indigo-500"/> Denyut Nadi (7 Hari)</h3>
            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md">Harian</span>
          </div>
          <div className="h-40 flex items-end justify-between space-x-1">
            {dailyChart.map((d, i) => {
              const heightPercent = (d.rev / maxDailyRev) * 100;
              return (
                <div key={i} className="flex flex-col items-center w-full group relative">
                  <div className="absolute -top-6 text-[8px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 p-1 rounded z-10 whitespace-nowrap">
                    {d.rev > 0 ? (d.rev/1000)+'k' : '0'}
                  </div>
                  <div 
                    className={`w-full rounded-t-sm transition-all duration-700 ${d.rev === maxDailyRev ? 'bg-indigo-500' : 'bg-indigo-200 hover:bg-indigo-300'}`} 
                    style={{ height: `${Math.max(heightPercent, 2)}%` }}
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
                    const heatPercent = (d.qty / maxHeatmapQty) * 100;
                    return (
                        <div key={i} className="flex flex-col items-center w-full group relative">
                            <span className="text-[8px] font-bold text-slate-500 mb-1 opacity-0 group-hover:opacity-100 transition">{d.qty}</span>
                            <div className={`w-full rounded-sm transition-all duration-700 ${d.qty === maxHeatmapQty ? 'bg-rose-500' : 'bg-rose-200'}`} style={{ height: `${Math.max(heatPercent, 5)}%` }}></div>
                            <span className="text-[8px] font-bold text-slate-400 mt-1">{d.day}</span>
                        </div>
                    )
                })}
            </div>
          </div>
        </section>

        {/* FORECASTING STOK */}
        <section className="bg-white p-5 rounded-2xl shadow-md border border-slate-200">
          <h3 className="font-bold text-slate-800 flex items-center mb-4 text-sm uppercase">
            <Clock className="w-4 h-4 mr-2 text-amber-500"/> Estimasi Stok Habis
          </h3>
          <div className="space-y-3">
            {forecasts.map((f, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                    <p className="text-sm font-bold text-slate-800">{f.name}</p>
                    <p className="text-[10px] text-slate-500">Laju: {f.avgDaily} Pack/hari</p>
                </div>
                <div className="text-right">
                    <p className={`text-xs font-black ${f.isCritical ? 'text-rose-600' : 'text-emerald-600'}`}>{f.daysLeft}</p>
                    <p className="text-[10px] text-slate-400">Sisa {f.currentStock} Pack</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BEP TRACKER CARD */}
        <section className="bg-white p-5 rounded-2xl shadow-md border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center"><Target className="w-5 h-5 mr-2 text-indigo-500"/> BEP Tracker</h3>
            <span className="text-sm font-black text-indigo-600">{bepPercent.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-100 h-6 rounded-full overflow-hidden border border-slate-200 shadow-inner relative">
            <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${Math.max(2, bepPercent)}%` }}></div>
          </div>
          <div className="flex justify-between mt-3 text-xs font-bold text-slate-500">
            <p>Target Capex: {formatIDR(totalCapex)}</p>
            <p>Sisa: <span className="text-rose-500">{formatIDR(sisaBEP)}</span></p>
          </div>
        </section>

        {/* GRAFIK BULANAN */}
        <section className="bg-white p-5 rounded-2xl shadow-md border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center"><Calendar className="w-4 h-4 mr-2 text-emerald-500"/> Tren 6 Bulan</h3>
            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md">Bulanan</span>
          </div>
          <div className="h-40 flex items-end justify-between space-x-2">
            {monthlyChart.map((m, i) => {
              const heightPercent = (m.rev / maxMonthlyRev) * 100;
              return (
                <div key={i} className="flex flex-col items-center w-full group relative">
                  <div className="absolute -top-6 text-[8px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 p-1 rounded z-10">
                    {m.rev > 0 ? (m.rev/1000)+'k' : '0'}
                  </div>
                  <div className={`w-full rounded-t-md transition-all duration-700 ${m.rev === maxMonthlyRev ? 'bg-emerald-500' : 'bg-emerald-200 hover:bg-emerald-300'}`} style={{ height: `${Math.max(heightPercent, 5)}%` }}></div>
                  <span className="text-[9px] font-bold text-slate-500 mt-2 uppercase">{m.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* KESEHATAN KEUANGAN TOTAL (P&L) */}
        <section className="bg-slate-900 p-6 rounded-3xl shadow-xl text-white mb-8 border border-slate-800">
          <h3 className="font-bold flex items-center mb-6 text-sm uppercase tracking-widest"><Wallet className="w-5 h-5 mr-3 text-amber-400"/> Summary Laba/Rugi (All Time)</h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-slate-800 pb-3">
                <span className="text-slate-400 text-xs">Total Penjualan Kotor</span>
                <span className="font-black text-lg">{formatIDR(totalRevenue)}</span>
            </div>
            <div className="flex justify-between items-end border-b border-slate-800 pb-3">
                <span className="text-slate-400 text-xs">Total Modal (HPP)</span>
                <span className="font-bold text-amber-400">- {formatIDR(totalHPP)}</span>
            </div>
            
            {/* BREAKDOWN PENGELUARAN */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center"><Layers className="w-3 h-3 mr-1"/> Breakdown Operasional</p>
                <div className="flex justify-between text-xs"><span>Meta Ads</span><span className="font-bold text-blue-400">{formatIDR(totalAds)}</span></div>
                <div className="flex justify-between text-xs"><span>Operasional / Rutin</span><span className="font-bold text-rose-400">{formatIDR(totalOpex)}</span></div>
                <div className="flex justify-between text-xs"><span>Investasi Alat (Capex)</span><span className="font-bold text-indigo-400">{formatIDR(totalCapex)}</span></div>
            </div>

            <div className="pt-4 flex justify-between items-center">
                <div>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase">Profit Bersih</p>
                    <h2 className="text-3xl font-black text-emerald-400">{formatIDR(netProfit)}</h2>
                </div>
                {/* MARGIN RATIOS */}
                <div className="text-right">
                    <div className="flex items-center justify-end text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg mb-1">
                        <Percent className="w-3 h-3 mr-1"/> Gross: {grossMargin.toFixed(1)}%
                    </div>
                    <div className="flex items-center justify-end text-[10px] font-bold text-blue-500 bg-blue-500/10 px-2 py-1 rounded-lg">
                        <Activity className="w-3 h-3 mr-1"/> Net: {netMargin.toFixed(1)}%
                    </div>
                </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}