"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, Plus, Trash2, Pencil, X } from 'lucide-react';

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State untuk Mode Edit
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form input
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [productName, setProductName] = useState('');
  const [qty, setQty] = useState('');
  const [cost, setCost] = useState('15000');
  const [status, setStatus] = useState('In Freezer');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    const { data } = await supabase.from('batches').select('*').order('arrival_date', { ascending: false });
    if (data) setBatches(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      // PROSES EDIT DATA
      const { error } = await supabase.from('batches').update({ 
        arrival_date: date, 
        product_name: productName, 
        total_qty: parseInt(qty), 
        base_cost_per_qty: parseInt(cost), 
        status: status 
      }).eq('id', editingId);
      
      if (!error) {
        alert('Data Stok berhasil diupdate!');
        resetForm();
        fetchBatches();
      } else {
        alert('Error: ' + error.message);
      }
    } else {
      // PROSES TAMBAH DATA BARU
      const { error } = await supabase.from('batches').insert([
        { 
          arrival_date: date, 
          product_name: productName, 
          total_qty: parseInt(qty), 
          base_cost_per_qty: parseInt(cost), 
          status: status 
        }
      ]);
      
      if (!error) {
        alert('Stok baru berhasil ditambahkan!');
        resetForm();
        fetchBatches();
      } else {
        alert('Error: ' + error.message);
      }
    }
  };

  const handleEdit = (batch: any) => {
    setDate(batch.arrival_date);
    setProductName(batch.product_name);
    setQty(batch.total_qty.toString());
    setCost(batch.base_cost_per_qty.toString());
    setStatus(batch.status);
    setEditingId(batch.id);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll ke atas otomatis
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Yakin ingin menghapus data stok ini? Sisa stok di Dashboard akan ikut berkurang.")) {
      const { error } = await supabase.from('batches').delete().eq('id', id);
      if (!error) {
        fetchBatches();
      } else {
        alert('Gagal menghapus (Mungkin ada transaksi yang nyangkut di stok ini): ' + error.message);
      }
    }
  };

  const resetForm = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setProductName('');
    setQty('');
    setCost('15000');
    setStatus('In Freezer');
    setEditingId(null);
  };

const filteredBatches = batches.filter(b => {
  const d = new Date(b.arrival_date);
  return (d.getMonth() + 1) === filterMonth && d.getFullYear() === filterYear;
});

  return (
    <div className="font-sans pb-24">
      <header className="bg-emerald-600 text-white p-5 rounded-b-3xl shadow-md">
        <h1 className="text-xl font-bold tracking-tight">Manajemen Stok</h1>
        <p className="text-emerald-100 text-xs">Catat kedatangan berbagai jenis paket</p>
      </header>

      <main className="p-5 space-y-6">
        
        {/* Form Tambah / Edit */}
        <section className={`p-5 rounded-2xl shadow-sm border ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
          <div className="flex justify-between items-center mb-3">
            <h3 className={`font-bold flex items-center ${editingId ? 'text-amber-800' : 'text-slate-700'}`}>
              {editingId ? <Pencil className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />} 
              {editingId ? 'Edit Data Stok' : 'Tambah Stok Baru'}
            </h3>
            {editingId && (
              <button onClick={resetForm} className="text-xs flex items-center text-amber-700 bg-amber-200 px-2 py-1 rounded-lg font-bold">
                <X className="w-3 h-3 mr-1" /> Batal Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-emerald-700 mb-1">Jenis Paket / Produk</label>
              <input type="text" required value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Cth: Pempek 20pcs, Tekwan, Baso" className="w-full p-3 border-2 border-emerald-100 rounded-xl bg-white text-sm outline-none focus:border-emerald-500 font-semibold" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Tanggal Tiba</label>
                <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Total Pack Masuk</label>
                <input type="number" required min="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Cth: 50" className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm outline-none" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Modal /Pack</label>
                <input type="number" required value={cost} onChange={(e) => setCost(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg bg-white text-sm outline-none">
                  <option value="In Freezer">Tiba di Freezer</option>
                  <option value="In Transit">Sedang Dikirim</option>
                  <option value="Sold Out">Habis Terjual</option>
                </select>
              </div>
            </div>
            
            <button type="submit" className={`w-full text-white font-bold p-3 rounded-xl mt-2 transition-colors shadow-md ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              {editingId ? 'Update Data Stok' : 'Simpan Batch Stok'}
            </button>
          </form>
        </section>

        {/* Daftar Stok */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-700">Histori Kedatangan</h3>
            
            {/* UI FILTER BULAN & TAHUN */}
            <div className="flex space-x-1">
              <select 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="p-1 text-[10px] font-bold border border-slate-200 rounded bg-white outline-none"
              >
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('id-ID', { month: 'short' })}
                  </option>
                ))}
              </select>

              <select 
                value={filterYear} 
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="p-1 text-[10px] font-bold border border-slate-200 rounded bg-white outline-none"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>
          </div>
          {loading ? <p className="text-sm text-slate-500">Memuat...</p> : (
            <div className="space-y-3">
              {filteredBatches.map((batch) => (
                <div key={batch.id} className="p-3 border border-slate-100 rounded-xl bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${batch.status === 'Sold Out' ? 'bg-slate-100 text-slate-400' : 'bg-emerald-100 text-emerald-600'}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{batch.product_name}</p>
                        <p className="text-xs text-slate-500">{batch.arrival_date} • Stok Awal: {batch.total_qty} Pack</p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${batch.status === 'In Transit' ? 'bg-amber-100 text-amber-700' : batch.status === 'Sold Out' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'}`}>
                      {batch.status}
                    </span>
                  </div>
                  
                  {/* Tombol Aksi */}
                  <div className="flex justify-end space-x-2 border-t border-slate-50 pt-2 mt-1">
                    <button onClick={() => handleEdit(batch)} className="text-[10px] flex items-center bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 font-bold transition-colors">
                      <Pencil className="w-3 h-3 mr-1"/> Edit
                    </button>
                    <button onClick={() => handleDelete(batch.id)} className="text-[10px] flex items-center bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-100 font-bold transition-colors">
                      <Trash2 className="w-3 h-3 mr-1"/> Hapus
                    </button>
                  </div>
                </div>
              ))}
              {batches.length === 0 && <p className="text-sm text-slate-500">Belum ada data stok.</p>}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}