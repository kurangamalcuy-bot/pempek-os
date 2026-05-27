"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/BottomNav';
import { PackageOpen, Plus, Pencil, Trash2, Calendar, DollarSign, Tag, X, Archive, AlertTriangle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States Asli
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalQty, setTotalQty] = useState('');
  const [baseCost, setBaseCost] = useState('');
  const [status, setStatus] = useState('In Freezer');
  const [priceNormal, setPriceNormal] = useState('');
  const [priceReseller, setPriceReseller] = useState('');
  const [priceOnline, setPriceOnline] = useState('');

  // Form States untuk Fitur Basi/Reject
  const [showSpoiledModal, setShowSpoiledModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [spoiledQty, setSpoiledQty] = useState('');

  // Filter States
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchData();
  }, [filterMonth, filterYear]);

  const fetchData = async () => {
    setLoading(true);
    
    // Jinakkan Bom 4: Filter langsung dari level Database server (Supabase)
    const startOfMonth = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
    const endOfMonth = `${filterYear}-${String(filterMonth).padStart(2, '0')}-31`; // Supabase toleran dengan tgl 31

    // 1. Ambil data batches berdasarkan filter bulan tiba
    const { data: batchesData, error: batchesError } = await supabase
      .from('batches')
      .select('*')
      .gte('arrival_date', startOfMonth)
      .lte('arrival_date', endOfMonth)
      .order('arrival_date', { ascending: false });

    // 2. Ambil seluruh transaksi untuk menghitung sisa stok & validasi
    const { data: trxData, error: trxError } = await supabase
      .from('transactions')
      .select('*');

    if (batchesError || trxError) {
      toast.error('Gagal mengambil data dari server');
    } else {
      setBatches(batchesData || []);
      setTransactions(trxData || []);
    }
    setLoading(false);
  };

  // Helper untuk menghitung jumlah terjual dari suatu batch
  const getTerjualQty = (batchId: string) => {
    return transactions
      .filter(t => t.batch_id === batchId)
      .reduce((sum, t) => sum + (Number(t.qty) || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!productName || !totalQty || !baseCost || !priceNormal) {
      toast.error('Nama, Total Pack, Modal, dan Harga Eceran wajib diisi!');
      setIsSubmitting(false);
      return;
    }

    const normalPrice = Number(priceNormal) || 0;
    const resellerPrice = Number(priceReseller) || normalPrice;
    const onlinePrice = Number(priceOnline) || normalPrice;
    const inputQty = Number(totalQty);

    // Validasi Pengaman Pengubahan Total Qty (Bom 3)
    if (editingId) {
      const terjual = getTerjualQty(editingId);
      if (inputQty < terjual) {
        toast.error(`Gagal! Produk ini sudah laku ${terjual} pack. Total stok baru tidak boleh lebih kecil.`);
        setIsSubmitting(false);
        return;
      }
    }

    const payload = {
      product_name: productName,
      arrival_date: arrivalDate,
      total_qty: inputQty,
      base_cost_per_qty: Number(baseCost),
      status: status,
      price_normal: normalPrice,
      price_reseller: resellerPrice,
      price_online: onlinePrice
    };

    if (editingId) {
      const { error } = await supabase.from('batches').update(payload).eq('id', editingId);
      if (!error) {
        toast.success('Stok berhasil diperbarui!');
        resetForm();
        fetchData();
      } else {
        toast.error('Gagal update: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('batches').insert([payload]);
      if (!error) {
        toast.success('Stok baru berhasil ditambahkan!');
        resetForm();
        fetchData();
      } else {
        toast.error('Gagal menyimpan: ' + error.message);
      }
    }
    setIsSubmitting(false);
  };

  // Jinakkan Bom 2: Logika Split-Batch Terproteksi Sisa Stok Riil
  const handleSpoiledSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyToSpoil = Number(spoiledQty);
    
    if (!selectedBatch) return;

    const terjual = getTerjualQty(selectedBatch.id);
    const sisaStokRiil = selectedBatch.total_qty - terjual;

    if (qtyToSpoil <= 0 || qtyToSpoil > sisaStokRiil) {
      toast.error(`Jumlah tidak valid! Sisa fisik di kulkas saat ini hanya ada ${sisaStokRiil} pack.`);
      return;
    }

    setIsSubmitting(true);

    // 1. Kurangi jumlah total_qty dari batch asli
    const newTotalQty = selectedBatch.total_qty - qtyToSpoil;
    const { error: updateError } = await supabase
      .from('batches')
      .update({ total_qty: newTotalQty })
      .eq('id', selectedBatch.id);

    if (updateError) {
      toast.error('Gagal memotong stok asli');
      setIsSubmitting(false);
      return;
    }

    // 2. Masukkan data afkir/basi ke database dengan parameter aman
    const spoiledPayload = {
      product_name: `${selectedBatch.product_name} (REJECT/BASI)`,
      arrival_date: selectedBatch.arrival_date,
      total_qty: qtyToSpoil,
      base_cost_per_qty: selectedBatch.base_cost_per_qty || 0,
      status: 'Rusak/Basi', 
      price_normal: selectedBatch.price_normal || 0,
      price_reseller: selectedBatch.price_reseller || 0,
      price_online: selectedBatch.price_online || 0,
      is_archived: selectedBatch.is_archived || false
    };

    const { error: insertError } = await supabase.from('batches').insert([spoiledPayload]);

    if (insertError) {
      // ROLLBACK SYSTEM: Kembalikan stok jika pembuatan log gagal
      await supabase.from('batches').update({ total_qty: selectedBatch.total_qty }).eq('id', selectedBatch.id);
      toast.error(`Gagal mencatat kerugian: ${insertError.message}`);
    } else {
      toast.success(`${qtyToSpoil} pack berhasil dicatat sebagai kerugian barang basi!`);
      setShowSpoiledModal(false);
      setSpoiledQty('');
      setSelectedBatch(null);
      fetchData();
    }
    setIsSubmitting(false);
  };

  const handleEdit = (batch: any) => {
    setEditingId(batch.id);
    setProductName(batch.product_name || '');
    setArrivalDate(batch.arrival_date);
    setTotalQty(batch.total_qty.toString());
    setBaseCost(batch.base_cost_per_qty.toString());
    setStatus(batch.status);
    setPriceNormal(batch.price_normal ? batch.price_normal.toString() : '');
    setPriceReseller(batch.price_reseller ? batch.price_reseller.toString() : '');
    setPriceOnline(batch.price_online ? batch.price_online.toString() : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Jinakkan Bom 1: Proteksi Penghapusan Data Terkait Transaksi Masau Lalu
  const handleDelete = async (id: string) => {
    const terjual = getTerjualQty(id);
    if (terjual > 0) {
      toast.error(`TIDAK BOLEH DIHAPUS! Produk ini sudah terjual sebanyak ${terjual} pack. Gunakan fitur 'Arsip' untuk menyembunyikan.`);
      return;
    }

    if (window.confirm('Yakin ingin menghapus data stok kosong ini?')) {
      const { error } = await supabase.from('batches').delete().eq('id', id);
      if (!error) {
        toast.success('Stok berhasil didelete!');
        fetchData();
      } else {
        toast.error('Gagal menghapus data: ' + error.message);
      }
    }
  };

  const toggleArchive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('batches')
      .update({ is_archived: !currentStatus })
      .eq('id', id);

    if (!error) {
      toast.success(currentStatus ? 'Stok dikembalikan dari arsip' : 'Stok berhasil diarsip');
      fetchData();
    } else {
      toast.error('Gagal memproses arsip');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setProductName('');
    setTotalQty('');
    setBaseCost('');
    setPriceNormal('');
    setPriceReseller('');
    setPriceOnline('');
    setStatus('In Freezer');
  };

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0);

  return (
    <div className="font-sans pb-24 bg-slate-50 min-h-screen">
      <Toaster position="top-center" reverseOrder={false} />

      <header className="bg-emerald-600 text-white p-5 rounded-b-3xl shadow-md">
        <h1 className="text-xl font-bold tracking-tight flex items-center">
          <PackageOpen className="w-5 h-5 mr-2" /> Manajemen Stok
        </h1>
        <p className="text-emerald-100 text-xs mt-1">Catat kedatangan & atur variasi harga</p>
      </header>

      <main className="p-4 space-y-6 mt-2">
        {/* FORM INPUT */}
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-slate-800 flex items-center">
              <Plus className="w-4 h-4 mr-2 text-emerald-500"/> 
              {editingId ? 'Edit Stok & Harga' : 'Tambah Stok Baru'}
            </h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="bg-slate-100 text-slate-500 p-1.5 rounded-lg hover:bg-slate-200">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Jenis Paket / Produk</label>
              <input type="text" required value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Cth: Pempek 20pcs, Tekwan" className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-emerald-400" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase flex items-center"><Calendar className="w-3 h-3 mr-1"/> Tanggal Tiba</label>
                <input type="date" required value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none bg-slate-50" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Total Pack Masuk</label>
                <input type="number" required min="1" value={totalQty} onChange={(e) => setTotalQty(e.target.value)} placeholder="Cth: 50" className="w-full p-2.5 border border-slate-200 rounded-xl text-sm font-bold outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase flex items-center"><DollarSign className="w-3 h-3 mr-1"/> Modal /Pack (HPP)</label>
                <input type="number" required min="1" value={baseCost} onChange={(e) => setBaseCost(e.target.value)} placeholder="Cth: 15000" className="w-full p-2.5 border border-amber-200 bg-amber-50 rounded-xl text-sm font-bold outline-none text-amber-800" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none font-bold">
                  <option value="In Freezer">❄️ Di Freezer</option>
                  <option value="In Transit">🚚 Sedang Dikirim</option>
                  <option value="Sold Out">❌ Habis Terjual</option>
                  <option value="Rusak/Basi">⚠️ Rusak/Basi</option>
                </select>
              </div>
            </div>

            {/* --- PRICING TIERS --- */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
               <h3 className="text-[10px] font-black text-slate-400 uppercase flex items-center tracking-wider">
                 <Tag className="w-3 h-3 mr-1 text-indigo-400"/> Variasi Harga Jual
               </h3>
               <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-1">Harga Eceran (Normal)</label>
                  <input type="number" required min="1" value={priceNormal} onChange={(e) => setPriceNormal(e.target.value)} placeholder="Harga jual standar ke konsumen" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold outline-none" />
               </div>
               <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Harga Reseller</label>
                    <input type="number" value={priceReseller} onChange={(e) => setPriceReseller(e.target.value)} placeholder="Harga agen" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Harga Online (App)</label>
                    <input type="number" value={priceOnline} onChange={(e) => setPriceOnline(e.target.value)} placeholder="Gofood/Shopee" className="w-full p-2 border border-slate-200 rounded-lg text-xs" />
                  </div>
               </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full text-white font-bold p-3.5 rounded-xl shadow-md transition-transform active:scale-95 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 flex justify-center items-center">
              {isSubmitting ? 'Menyimpan...' : (editingId ? 'Update Stok & Harga' : 'Simpan Batch Stok')}
            </button>
          </form>
        </section>

        {/* LIST STOK */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-700">Histori Kedatangan</h3>
            <div className="flex space-x-1">
              <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))} className="p-1 text-[10px] font-bold border border-slate-200 rounded bg-white">
                {[...Array(12)].map((_, i) => (<option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('id-ID', { month: 'short' })}</option>))}
              </select>
              <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} className="p-1 text-[10px] font-bold border border-slate-200 rounded bg-white">
                <option value={2026}>2026</option><option value={2025}>2025</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {loading && <p className="text-center text-xs text-slate-500 animate-pulse">Memuat data aman...</p>}
            
            {!loading && batches.map((batch) => {
              const terjual = getTerjualQty(batch.id);
              const sisa = batch.total_qty - terjual;

              return (
                <div key={batch.id} className={`border p-4 rounded-2xl shadow-sm ${batch.status === 'Rusak/Basi' ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${batch.status === 'Rusak/Basi' ? 'bg-rose-100' : 'bg-emerald-50'}`}>
                        {batch.status === 'Rusak/Basi' ? <AlertTriangle className="w-5 h-5 text-rose-600"/> : <PackageOpen className="w-5 h-5 text-emerald-600" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{batch.product_name || 'Pempek Campur'}</h4>
                        <p className="text-[10px] text-slate-500">
                          {batch.arrival_date} • Sisa: <span className="font-extrabold text-emerald-600">{sisa}</span> / {batch.total_qty} Pack
                        </p>
                      </div>
                    </div>
                    <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${batch.status === 'In Freezer' ? 'bg-emerald-100 text-emerald-700' : batch.status === 'Sold Out' ? 'bg-slate-100 text-slate-500' : 'bg-rose-500 text-white'}`}>
                      {batch.status}
                    </span>
                  </div>
                  
                  <div className="bg-white/50 rounded-lg p-2 mt-3 grid grid-cols-2 gap-2 border border-slate-100">
                      <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Modal (HPP)</p>
                          <p className="text-xs font-black text-amber-600">{formatIDR(batch.base_cost_per_qty)}</p>
                      </div>
                      <div>
                          <p className="text-[8px] font-bold text-slate-400 uppercase">Harga Normal</p>
                          <p className="text-xs font-black text-indigo-600">{formatIDR(batch.price_normal || 0)}</p>
                      </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                    {batch.status !== 'Rusak/Basi' && sisa > 0 && (
                      <button 
                        onClick={() => { setSelectedBatch(batch); setShowSpoiledModal(true); }} 
                        className="flex items-center text-[10px] bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg font-bold hover:bg-orange-100 border border-orange-200"
                      >
                        <AlertTriangle className="w-3 h-3 mr-1"/> Lapor Basi
                      </button>
                    )}
                    <button onClick={() => handleEdit(batch)} className="flex items-center text-[10px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-200">
                      <Pencil className="w-3 h-3 mr-1"/> Edit
                    </button>
                    <button onClick={() => handleDelete(batch.id)} className="flex items-center text-[10px] bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-bold hover:bg-rose-100">
                      <Trash2 className="w-3 h-3 mr-1"/> Hapus
                    </button>
                    <button 
                      onClick={() => toggleArchive(batch.id, batch.is_archived)} 
                      className={`flex items-center text-[10px] px-3 py-1.5 rounded-lg font-bold transition ${batch.is_archived ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}
                    >
                      <Archive className="w-3 h-3 mr-1"/> {batch.is_archived ? 'Buka Arsip' : 'Arsip'}
                    </button>
                  </div>
                </div>
              );
            })}
            
            {!loading && batches.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-6">Tidak ada histori kedatangan di bulan ini.</p>
            )}
          </div>
        </section>
        
        {/* MODAL LAPOR BARI / REJECT */}
        {showSpoiledModal && selectedBatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 mb-4 mx-auto">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-black text-center text-slate-800 mb-1">Lapor Barang Basi</h3>
              <p className="text-xs text-center text-slate-500 mb-4">
                Berapa banyak produk <span className="font-bold text-slate-700">{selectedBatch.product_name}</span> yang rusak/basi?
              </p>
              
              <form onSubmit={handleSpoiledSubmit}>
                <input 
                  type="number" 
                  min="1" 
                  max={selectedBatch.total_qty - getTerjualQty(selectedBatch.id)}
                  required 
                  value={spoiledQty} 
                  onChange={(e) => setSpoiledQty(e.target.value)} 
                  placeholder="Jumlah..." 
                  className="w-full p-4 border border-rose-200 bg-rose-50 rounded-xl text-center text-lg font-black text-rose-600 outline-none mb-4" 
                />
                <div className="flex space-x-3">
                  <button type="button" onClick={() => { setShowSpoiledModal(false); setSpoiledQty(''); setSelectedBatch(null); }} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl">
                    Batal
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-lg disabled:opacity-50">
                    {isSubmitting ? 'Menyimpan...' : 'Laporkan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}