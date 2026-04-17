"use client"; // Ini wajib ditambahkan untuk Next.js App Router

import React, { useState } from 'react';
import { 
  TrendingUp, Package, DollarSign, MessageCircle, 
  Plus, Activity, History, Home, Truck
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // MOCK DATA
  const [capex] = useState(3400000); 
  const [opex] = useState(58000 + 20000); 
  const [cogsPerItem] = useState(15000); 
  
  const [transactions, setTransactions] = useState([
    { id: 1, name: 'Budi (Tetangga)', phone: '6281234567890', qty: 2, price: 20000, type: 'offline', date: 'Today' },
    { id: 2, name: 'Siska (Kantor)', phone: '6289876543210', qty: 10, price: 20000, type: 'offline', date: 'Today' },
    { id: 3, name: 'Andi (Shopee)', phone: '628111222333', qty: 3, price: 25000, type: 'online', date: 'Today' },
    { id: 4, name: 'Rina (Komplek)', phone: '628444555666', qty: 31, price: 20000, type: 'offline', date: 'Today' },
  ]);

  const [batches] = useState([
    { id: 'BCH-001', date: '2023-10-25', qty: 46, status: 'Sold Out' },
    { id: 'BCH-002', date: '2023-10-28', qty: 120, status: 'In Transit' },
  ]);

  const totalPackagesSold = transactions.reduce((acc, curr) => acc + curr.qty, 0);
  const totalRevenue = transactions.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
  const totalCOGS = totalPackagesSold * cogsPerItem;
  
  const netProfit = totalRevenue - totalCOGS - opex;
  const bepPercentage = Math.max(0, Math.min(100, (netProfit / capex) * 100));
  const remainingCapex = capex - netProfit;

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  const sendWhatsApp = (trx: any) => {
    const text = `Halo Kak ${trx.name}! Ini rekap pesanan Pempek Frozen Bengkulu-nya ya:\n\nJumlah: ${trx.qty} Paket\nTotal: ${formatIDR(trx.qty * trx.price)}\n\nTerima kasih banyak, ditunggu repeat ordernya! 🥟`;
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/${trx.phone}?text=${encodedText}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center font-sans text-slate-800">
      <div className="w-full max-w-md bg-white shadow-xl min-h-screen relative pb-20">
        
        {/* Header */}
        <header className="bg-emerald-600 text-white p-5 rounded-b-3xl shadow-md">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Pempek OS</h1>
              <p className="text-emerald-100 text-xs">Cimahi Hub</p>
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

        {/* Main Content Area */}
        <main className="p-5 space-y-6">
          
          <section>
            <div className="flex justify-between items-end mb-2">
              <h3 className="font-bold text-slate-700">BEP Tracker (Freezer)</h3>
              <span className="text-xs font-semibold text-emerald-600">{bepPercentage.toFixed(2)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden border border-slate-200">
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
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
              <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center mb-2">
                <Package className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-xs text-slate-500">Terjual</p>
              <p className="text-lg font-bold text-slate-800">{totalPackagesSold} <span className="text-xs font-normal">Packs</span></p>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
              <div className="bg-orange-100 w-8 h-8 rounded-full flex items-center justify-center mb-2">
                <TrendingUp className="w-4 h-4 text-orange-600" />
              </div>
              <p className="text-xs text-slate-500">Margin Rata-rata</p>
              <p className="text-lg font-bold text-slate-800">{totalPackagesSold > 0 ? formatIDR(netProfit / totalPackagesSold) : "Rp 0"}</p>
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-700">Active Batches</h3>
              <button className="text-emerald-600 text-xs font-semibold hover:underline">View All</button>
            </div>
            <div className="space-y-3">
              {batches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-white shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${batch.status === 'In Transit' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{batch.id}</p>
                      <p className="text-xs text-slate-500">{batch.qty} Packages • {batch.date}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${batch.status === 'In Transit' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    {batch.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-slate-700">Recent Sales</h3>
              <button className="bg-slate-900 text-white p-1.5 rounded-lg flex items-center shadow-sm">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              {transactions.map((trx) => (
                <div key={trx.id} className="p-3 border border-slate-100 rounded-xl bg-white shadow-sm flex flex-col space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{trx.name}</p>
                      <p className="text-xs text-slate-500">{trx.qty} Packs • {trx.type.toUpperCase()}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">{formatIDR(trx.qty * trx.price)}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-50 flex justify-end">
                    <button 
                      onClick={() => sendWhatsApp(trx)}
                      className="flex items-center space-x-1 text-xs bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Send WA Invoice</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </main>

        <nav className="absolute bottom-0 w-full bg-white border-t border-slate-100 flex justify-around p-3 pb-5">
          <button className={`flex flex-col items-center p-2 ${activeTab === 'dashboard' ? 'text-emerald-600' : 'text-slate-400'}`}>
            <Home className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center p-2 text-slate-400">
            <History className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">History</span>
          </button>
          <button className="flex flex-col items-center p-2 text-slate-400">
            <Package className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Batches</span>
          </button>
          <button className="flex flex-col items-center p-2 text-slate-400">
            <DollarSign className="w-5 h-5 mb-1" />
            <span className="text-[10px] font-medium">Finance</span>
          </button>
        </nav>
        
      </div>
    </div>
  );
}