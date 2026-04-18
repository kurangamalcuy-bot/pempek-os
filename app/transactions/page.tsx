"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, CheckCircle } from 'lucide-react';

export default function TransactionsPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('628');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('20000');
  const [type, setType] = useState('offline');
  const [batchId, setBatchId] = useState('');

  useEffect(() => {
    // Ambil data batch yang masih aktif/ada stok
    const fetchBatches = async () => {
      const { data } = await supabase.from('batches').select('*').neq('status', 'Sold Out').order('arrival_date', { ascending: false });
      if (data && data.length > 0) {
        setBatches(data);
        setBatchId(data[0].id); // Set default ke batch terbaru
      }
    };
    fetchBatches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('transactions').insert([
      {
        customer_name: name,
        customer_phone: phone,
        qty: parseInt(qty),
        selling_price: parseInt(price),
        type: type,
        batch_id: batchId || null
      }
    ]);

    setLoading(false);

    if (error) {
      alert('Gagal menyimpan: ' + error.message);
    } else {
      setSuccess(true);
      setName(''); setPhone('628'); setQty('');
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <div className="font-sans">
      <header className="bg-emerald-600 text-white p-5 rounded-b-3xl shadow-md">
        <h1 className="text-xl font-bold tracking-tight">Catat Penjualan</h1>
        <p className="text-emerald-100 text-xs">Masukkan transaksi baru</p>
      </header>

      <main className="p-5">
        {success && (
          <div className="bg-emerald-100 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl mb-4 flex items-center shadow-sm">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-bold">Transaksi berhasil disimpan!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Nama Pembeli</label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Cth: Tante Rina" className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">No. WhatsApp</label>
            <input type="number" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="628..." className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Jumlah Pack</label>
              <input type="number" required min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Harga Satuan</label>
              <select value={price} onChange={(e) => setPrice(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="20000">Rp 20.000 (Offline)</option>
                <option value="25000">Rp 25.000 (Online)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Sumber Stok (Batch)</label>
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-emerald-500 outline-none text-sm">
              {batches.map(b => (
                <option key={b.id} value={b.id}>Batch: {b.arrival_date} ({b.status})</option>
              ))}
              {batches.length === 0 && <option value="">Belum ada Batch Aktif</option>}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Jalur Penjualan</label>
            <div className="flex space-x-3">
              <label className={`flex-1 p-3 text-center rounded-xl border text-sm font-bold cursor-pointer transition-colors ${type === 'offline' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="radio" value="offline" checked={type === 'offline'} onChange={() => setType('offline')} className="hidden" />
                Offline / WA
              </label>
              <label className={`flex-1 p-3 text-center rounded-xl border text-sm font-bold cursor-pointer transition-colors ${type === 'online' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                <input type="radio" value="online" checked={type === 'online'} onChange={() => setType('online')} className="hidden" />
                Marketplace
              </label>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold p-4 rounded-xl mt-2 flex justify-center items-center hover:bg-slate-800 transition-colors disabled:bg-slate-400 shadow-md">
            {loading ? 'Menyimpan...' : <><Save className="w-5 h-5 mr-2" /> Simpan Transaksi</>}
          </button>
        </form>
      </main>
    </div>
  );
}