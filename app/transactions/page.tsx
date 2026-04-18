"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Save, Megaphone, Store, Smartphone, AlertCircle, CheckCircle2, Calendar, Plus } from 'lucide-react';
import toast from 'react-hot-toast'; // Notifikasi modern

export default function TransactionsPage() {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [account, setAccount] = useState('Tunai (Laci)');
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [cart, setCart] = useState<any[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('628');
  const [qty, setQty] = useState('');
  const [priceOption, setPriceOption] = useState('20000'); 
  const [customPrice, setCustomPrice] = useState(''); 
  const [type, setType] = useState('organik'); 
  const [batchId, setBatchId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('lunas');
  const [amountPaid, setAmountPaid] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const batchRes = await supabase.from('batches').select('*').neq('status', 'Sold Out').order('arrival_date', { ascending: false });
    if (batchRes.data && batchRes.data.length > 0) {
      setBatches(batchRes.data);
      setBatchId(batchRes.data[0].id);
    }
    const trxRes = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (trxRes.data) setTransactions(trxRes.data);
  };

  // 1. FUNGSI UNTUK MEMASUKKAN BARANG KE KERANJANG SEMENTARA
  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault(); // Mencegah halaman refresh
    
    // Cegah masuk keranjang kalau produk belum dipilih atau stok tidak cukup
    if (isQtyInvalid || !batchId) return;

    // Cari nama produk berdasarkan ID yang dipilih kasir
    const batch = batches.find(b => b.id === batchId);
    
    // Bikin bingkisan barang untuk dimasukkan ke keranjang
    const newItem = {
        id: Date.now(), // ID unik sementara untuk di layar
        batch_id: batch.id,
        product_name: batch.product_name,
        qty: parseInt(qty),
        selling_price: parseInt(priceOption === 'custom' ? customPrice : priceOption),
        subtotal: parseInt(qty) * parseInt(priceOption === 'custom' ? customPrice : priceOption)
    };

    // Masukkan bingkisan tadi ke dalam state cart
    setCart([...cart, newItem]);
    
    // Kosongkan form input produk agar siap diketik barang kedua
    setBatchId(''); 
    setQty(''); 
  };

  // Fungsi kecil untuk menghapus barang dari keranjang jika kasir salah ketik
  const removeFromCart = (id: number) => setCart(cart.filter(item => item.id !== id));
  
  // Fungsi kecil untuk menghitung total tagihan di keranjang
  const grandTotal = cart.reduce((acc, item) => acc + item.subtotal, 0);


  // 2. FUNGSI MASTER UNTUK MENGIRIM SELURUH KERANJANG KE SUPABASE
  const handleCheckout = async () => {
    setLoading(true);
    
    // Siapkan seluruh data di keranjang agar formatnya sesuai dengan tabel Supabase
    const payload = cart.map(item => ({
        customer_name: name || 'Pelanggan',
        customer_phone: phone,
        type: 'organik', // Sesuaikan jika kamu ada state untuk ini
        account: 'Tunai (Laci)', // Sesuaikan jika kamu ada state untuk ini
        payment_status: paymentStatus === 'lunas' ? 'Lunas' : 'Terhutang',
        batch_id: item.batch_id,
        product_name: item.product_name,
        qty: item.qty,
        selling_price: item.selling_price,
        amount_paid: paymentStatus === 'lunas' ? item.subtotal : 0
    }));

    // Tembak datanya ke Supabase
    const { error } = await supabase.from('transactions').insert(payload);
    
    if (!error) {
        setCart([]); // Kosongkan layar keranjang setelah berhasil
        setName(''); // Reset nama pembeli
        setPhone('628'); // Reset nomor HP
        fetchData(); // Refresh data stok agar berkurang
        alert('Transaksi berhasil disimpan!');
    } else {
        alert('Error menyimpan data: ' + error.message);
    }
    setLoading(false);
  };

  const handleLunas = async (id: number, totalBill: number) => {
    if(window.confirm('Tandai tagihan ini sebagai LUNAS?')) {
      const { error } = await supabase.from('transactions').update({ payment_status: 'lunas', amount_paid: totalBill }).eq('id', id);
      if(!error) {
        toast.success('Tagihan berhasil dilunasi!');
        fetchData();
      } else {
        toast.error('Gagal update data.');
      }
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const d = new Date(t.created_at);
    return (d.getMonth() + 1) === filterMonth && d.getFullYear() === filterYear;
  });

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  // Ambil hanya yang belum lunas
  const piutangList = transactions.filter(t => t.payment_status === 'belum_lunas');

  // --- FITUR BARU: HITUNG SISA STOK ---
  const getRemainingStock = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return 0;
    
    // Hitung berapa yang sudah laku di database untuk batch ini
    const soldQty = transactions.filter(t => t.batch_id === batchId).reduce((acc, t) => acc + t.qty, 0);
    return batch.total_qty - soldQty;
  };

  // Saring hanya batch yang stoknya masih di atas 0
  const availableBatches = batches.filter(b => getRemainingStock(b.id) > 0);

  // Cek apakah angka yang diketik kasir melebihi stok
  const currentBatchMax = batchId ? getRemainingStock(batchId) : 0;
  const isQtyInvalid = parseInt(qty) > currentBatchMax;

  return (
    <div className="font-sans pb-24">
      <header className="bg-emerald-600 text-white p-5 rounded-b-3xl shadow-md">
        <h1 className="text-xl font-bold tracking-tight">Catat Penjualan</h1>
        <p className="text-emerald-100 text-xs">Pilih batch produk dan status pembayaran</p>
      </header>

      <main className="p-5 space-y-6">
        <form onSubmit={handleAddToCart} className="space-y-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div><label className="block text-sm font-bold text-slate-700 mb-1">Nama Pembeli</label><input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none" /></div>
          <div><label className="block text-sm font-bold text-slate-700 mb-1">No. WhatsApp</label><input type="number" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none" /></div>

          <div className="p-3 border-2 border-emerald-100 bg-emerald-50 rounded-xl">
            <label className="block text-sm font-bold text-emerald-800 mb-1">Pilih Produk (Dari Batch)</label>
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="w-full p-3 border border-emerald-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-slate-700">
                <option value="">-- Pilih Produk --</option>
                {/* Menggunakan availableBatches agar stok habis tidak muncul */}
                {availableBatches.map(b => (
                    <option key={b.id} value={b.id}>
                        📦 {b.product_name} (Sisa: {getRemainingStock(b.id)})
                    </option>
                ))}
                {availableBatches.length === 0 && <option value="">Semua stok habis / belum ada</option>}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Jumlah Pack</label>
              <input 
                type="number" 
                required 
                min="1" 
                value={qty} 
                onChange={(e) => setQty(e.target.value)} 
                className={`w-full p-3 border rounded-xl outline-none font-bold ${isQtyInvalid ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-slate-200 bg-slate-50'}`} 
              />
              {/* Ini Teks Peringatan Merahnya */}
              {isQtyInvalid && (
                <p className="text-xs text-rose-600 font-bold mt-1">⚠️ Melebihi sisa stok ({currentBatchMax})</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Harga Satuan</label>
              <select value={priceOption} onChange={(e) => setPriceOption(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none">
                <option value="20000">Rp 20.000</option><option value="25000">Rp 25.000</option><option value="custom">Manual...</option>
              </select>
            </div>
          </div>
          {priceOption === 'custom' && (
            <div><input type="number" required min="1" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="Nominal Custom" className="w-full p-3 border-2 border-emerald-200 rounded-xl bg-emerald-50 outline-none" /></div>
          )}

          {/* STATUS PEMBAYARAN */}
          <div className="pt-3 border-t border-slate-100">
            <label className="block text-sm font-bold text-slate-700 mb-2">Status Pembayaran</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <label className={`p-3 text-center rounded-xl border text-sm font-bold cursor-pointer ${paymentStatus === 'lunas' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}><input type="radio" value="lunas" checked={paymentStatus === 'lunas'} onChange={() => setPaymentStatus('lunas')} className="hidden" />Lunas Semuanya</label>
              <label className={`p-3 text-center rounded-xl border text-sm font-bold cursor-pointer ${paymentStatus === 'belum_lunas' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}><input type="radio" value="belum_lunas" checked={paymentStatus === 'belum_lunas'} onChange={() => setPaymentStatus('belum_lunas')} className="hidden" />Baru DP / Cicil</label>
            </div>
            {paymentStatus === 'belum_lunas' && (
              <div className="animate-in fade-in zoom-in duration-200">
                <label className="block text-xs font-bold text-rose-700 mb-1">Jumlah yang Baru Dibayar (Rp)</label>
                <input type="number" required min="0" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="Cth: 50000" className="w-full p-3 border-2 border-rose-200 rounded-xl bg-rose-50 outline-none focus:border-rose-500" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Jalur Pembeli</label>
            <div className="grid grid-cols-3 gap-2">
              <label className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold cursor-pointer ${type === 'organik' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}><input type="radio" value="organik" checked={type === 'organik'} onChange={() => setType('organik')} className="hidden" /><Smartphone className="w-4 h-4 mb-1" /> WA</label>
              <label className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold cursor-pointer ${type === 'marketplace' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}><input type="radio" value="marketplace" checked={type === 'marketplace'} onChange={() => setType('marketplace')} className="hidden" /><Store className="w-4 h-4 mb-1" /> Market</label>
              <label className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold cursor-pointer ${type === 'meta_ads' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}><input type="radio" value="meta_ads" checked={type === 'meta_ads'} onChange={() => setType('meta_ads')} className="hidden" /><Megaphone className="w-4 h-4 mb-1" /> Ads</label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Dompet Tujuan / Metode</label>
            <select 
              value={account} 
              onChange={(e) => setAccount(e.target.value)} 
              className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 outline-none font-bold text-slate-700"
            >
              <option value="Tunai (Laci)">💵 Tunai (Laci)</option>
              <option value="Rekening Bank">🏦 Transfer Bank</option>
              <option value="E-Wallet">📱 E-Wallet (QRIS/OVO)</option>
              <option value="Marketplace">🧡 Marketplace (Shopee/Tokped)</option>
            </select>
          </div>

          <button 
            type="submit" 
            disabled={isQtyInvalid || !batchId} 
            className={`w-full text-white font-bold p-4 rounded-xl mt-4 flex justify-center items-center shadow-md transition ${isQtyInvalid || !batchId ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}
          >
            <Plus className="w-5 h-5 mr-2" /> Tambah ke Nota
          </button>
        </form>

        {/* TAMPILAN NOTA KERANJANG (HANYA MUNCUL JIKA ADA BARANG) */}
        {cart.length > 0 && (
            <div className="mt-6 bg-slate-900 p-5 rounded-2xl shadow-xl text-white">
                <h3 className="font-bold mb-4 border-b border-slate-700 pb-2">Keranjang Kasir</h3>
                
                {/* Daftar Barang */}
                <div className="space-y-3 mb-4">
                    {cart.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-white/10 p-3 rounded-lg">
                            <div>
                                <p className="font-bold text-sm">{item.product_name}</p>
                                <p className="text-[10px] text-slate-400">{item.qty} pack x Rp {item.selling_price.toLocaleString('id-ID')}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                                <p className="font-black text-amber-400">Rp {item.subtotal.toLocaleString('id-ID')}</p>
                                <button type="button" onClick={() => removeFromCart(item.id)} className="text-rose-400 text-xs font-bold hover:text-rose-300">X</button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Total Harga */}
                <div className="flex justify-between items-end border-t border-slate-700 pt-3 mb-4">
                    <span className="text-slate-400 text-xs">Total Tagihan</span>
                    <span className="font-black text-xl text-emerald-400">Rp {grandTotal.toLocaleString('id-ID')}</span>
                </div>

                {/* TOMBOL CHECKOUT KE DATABASE */}
                <button 
                    type="button"
                    onClick={handleCheckout} 
                    disabled={loading}
                    className="w-full bg-emerald-500 text-slate-900 font-black p-4 rounded-xl hover:bg-emerald-400 transition"
                >
                    {loading ? 'Menyimpan ke Database...' : '✅ Selesaikan Transaksi'}
                </button>
            </div>
        )}

        {/* REKAP PIUTANG (YANG BELUM LUNAS) */}
        <section>
          <h3 className="font-bold text-rose-700 mb-3 flex items-center"><AlertCircle className="w-5 h-5 mr-2" /> Daftar Tagihan (Piutang)</h3>
          <div className="space-y-3">
            {piutangList.map(t => {
              const totalBill = t.qty * t.selling_price;
              const sisa = totalBill - t.amount_paid;
              return (
                <div key={t.id} className="p-4 bg-white border border-rose-200 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-slate-800">{t.customer_name}</p>
                      <p className="text-[10px] font-semibold text-slate-500">{t.qty}x {t.product_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Total: {formatIDR(totalBill)}</p>
                      <p className="text-sm font-black text-rose-600">Kurang: {formatIDR(sisa)}</p>
                    </div>
                  </div>
                  <button onClick={() => handleLunas(t.id, totalBill)} className="w-full mt-2 bg-emerald-50 text-emerald-700 p-2 rounded-lg text-xs font-bold flex items-center justify-center hover:bg-emerald-100 transition">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Tandai Sudah Lunas
                  </button>
                </div>
              )
            })}
            {piutangList.length === 0 && <p className="text-sm text-slate-500 text-center bg-slate-50 py-4 rounded-xl border border-slate-100">Wah, hebat! Tidak ada pelanggan yang berhutang. 🎉</p>}
          </div>
        </section>
        {/* SECTION RIWAYAT PENJUALAN DENGAN FILTER */}
        <section className="mt-6">
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="font-bold text-slate-700 flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-indigo-500"/> Riwayat Penjualan
            </h3>
            
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

          {/* DAFTAR TRANSAKSI YANG SUDAH DIFILTER */}
          <div className="space-y-3">
            {filteredTransactions.map((t) => (
              <div key={t.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.customer_name}</p>
                    <p className="text-[10px] text-slate-500">{t.product_name} x {t.qty}</p>
                  </div>
                  <p className="text-sm font-black text-slate-800">{formatIDR(t.qty * t.selling_price)}</p>
                </div>
              </div>
            ))}
            {filteredTransactions.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-10">Tidak ada riwayat penjualan di bulan ini.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}