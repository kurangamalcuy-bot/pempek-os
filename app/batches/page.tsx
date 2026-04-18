"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Truck, Plus, Package } from 'lucide-react';

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form input batch baru
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('15000');
  const [status, setStatus] = useState('In Transit');

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    const { data } = await supabase.from('batches').select('*').order('arrival_date', { ascending: false });
    if (data) setBatches(data);
    setLoading(false);
  };

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('batches').insert([
      { arrival_date: date, total_qty: parseInt(qty), base_cost_per_qty: parseInt(cost), status: status }
    ]);
    
    if (!error) {
      setQty('');
      fetchBatches(); // Refresh daftar batch
      alert('Batch baru berhasil ditambahkan!');
    } else {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="font-sans">
      <header className="bg-emerald-600 text-white p-5 rounded-b-3xl shadow-md">
        <h1 className="text-xl font-bold tracking-tight">Manajemen Stok</h1>
        <p className="text-emerald-100 text-xs">Catat kedatangan Pempek (Batch)</p>
      </header>

      <main className="p-5 space-y-6">
        
        {/* Form Tambah Batch */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-700 mb-3 flex items-center"><Plus className="w-4 h-4 mr-1" /> Tambah Batch Baru</h3>
          <form onSubmit={handleAddBatch} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal Tiba</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Total Pack</label>
                <input type="number" required min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Cth: 50" className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:border-emerald-500" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Modal /Pack</label>
                <input type="number" required value={cost} onChange={(e) => setCost(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-sm outline-none focus:border-emerald-500">
                  <option value="In Transit">Sedang Dikirim</option>
                  <option value="In Freezer">Tiba di Freezer</option>
                  <option value="Sold Out">Habis Terjual</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-emerald-600 text-white font-bold p-3 rounded-lg text-sm hover:bg-emerald-700 transition-colors">Simpan Batch</button>
          </form>
        </section>

        {/* Daftar Batch */}
        <section>
          <h3 className="font-bold text-slate-700 mb-3">Histori Kedatangan</h3>
          {loading ? <p className="text-sm text-slate-500">Memuat...</p> : (
            <div className="space-y-3">
              {batches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl bg-white shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${batch.status === 'In Transit' ? 'bg-amber-100 text-amber-600' : batch.status === 'Sold Out' ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600'}`}>
                      {batch.status === 'In Freezer' ? <Package className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Tiba: {batch.arrival_date}</p>
                      <p className="text-xs text-slate-500">Stok Awal: {batch.total_qty} Packs</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${batch.status === 'In Transit' ? 'bg-amber-100 text-amber-700' : batch.status === 'Sold Out' ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>
                    {batch.status}
                  </span>
                </div>
              ))}
              {batches.length === 0 && <p className="text-sm text-slate-500">Belum ada data batch.</p>}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}