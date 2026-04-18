"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, Plus } from 'lucide-react';

export default function FinancePage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  
  // Form input pengeluaran baru
  const [category, setCategory] = useState('operational');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    const { data } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    if (data) setExpenses(data);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('expenses').insert([
      { category: category, amount: parseInt(amount), description: description }
    ]);
    
    if (!error) {
      setAmount(''); setDescription('');
      fetchExpenses(); // Refresh daftar
      alert('Pengeluaran berhasil dicatat!');
    } else {
      alert('Error: ' + error.message);
    }
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="font-sans">
      <header className="bg-emerald-600 text-white p-5 rounded-b-3xl shadow-md">
        <h1 className="text-xl font-bold tracking-tight">Buku Keuangan</h1>
        <p className="text-emerald-100 text-xs">Catat Modal Alat (CAPEX) & Operasional (OPEX)</p>
      </header>

      <main className="p-5 space-y-6">
        
        {/* Form Tambah Pengeluaran */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-700 mb-3 flex items-center"><Plus className="w-4 h-4 mr-1" /> Catat Pengeluaran</h3>
          <form onSubmit={handleAddExpense} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Kategori (Penting untuk BEP)</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="capex">Modal Alat / Aset (CAPEX) - Cth: Freezer</option>
                <option value="operational">Operasional Rutin (OPEX) - Cth: Listrik, Plastik</option>
                <option value="ads">Iklan / Marketing - Cth: FB Ads, Diskon</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Jumlah Nominal (Rp)</label>
              <input type="number" required min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Cth: 3400000" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Keterangan / Catatan</label>
              <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Cth: Beli Freezer Gea 100L" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            
            <button type="submit" className="w-full bg-slate-900 text-white font-bold p-3 rounded-xl hover:bg-slate-800 transition-colors shadow-md flex justify-center items-center">
               Simpan Pengeluaran
            </button>
          </form>
        </section>

        {/* Daftar Pengeluaran */}
        <section>
          <h3 className="font-bold text-slate-700 mb-3">Riwayat Pengeluaran</h3>
          <div className="space-y-3">
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-white shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${exp.category === 'capex' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{exp.description}</p>
                    <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{exp.category}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-800">
                  {formatIDR(exp.amount)}
                </span>
              </div>
            ))}
            {expenses.length === 0 && <p className="text-sm text-slate-500">Belum ada catatan pengeluaran.</p>}
          </div>
        </section>

      </main>
    </div>
  );
}