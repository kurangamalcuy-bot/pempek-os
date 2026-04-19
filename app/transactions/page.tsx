"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Megaphone, Store, Smartphone, AlertCircle, CheckCircle2, Calendar, Plus, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TransactionsPage() {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [editingId, setEditingId] = useState<number | null>(null);

  // --- FORM STATE BARU (SISTEM MULTI-BARIS) ---
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('628');
  const [showSuggestions, setShowSuggestions] = useState(false);
  // items adalah array yang menyimpan baris-baris produk yang dipilih
  const [items, setItems] = useState([{ id: Date.now(), batchId: '', qty: '', priceOption: '20000', customPrice: '' }]);
  const [type, setType] = useState('organik'); 
  const [account, setAccount] = useState('Tunai (Laci)');
  const [paymentStatus, setPaymentStatus] = useState('lunas');
  const [amountPaid, setAmountPaid] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const batchRes = await supabase.from('batches').select('*').neq('status', 'Sold Out').order('arrival_date', { ascending: false });
    if (batchRes.data) setBatches(batchRes.data);
    
    const trxRes = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (trxRes.data) setTransactions(trxRes.data);
  };

  // --- FUNGSI DINAMIS UNTUK BARIS PRODUK ---
  const handleAddRow = () => {
    setItems([...items, { id: Date.now(), batchId: '', qty: '', priceOption: '20000', customPrice: '' }]);
  };

  const handleRemoveRow = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    } else {
      toast.error('Minimal harus ada 1 produk!');
    }
  };

  const updateItem = (id: number, field: string, value: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  // --- HITUNGAN SISA STOK (MESIN PINTAR REAL-TIME) ---
  const getRemainingStock = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return 0;
    
    // Cari nama produknya (huruf kecil semua biar seragam)
    const rawName = batch.product_name || 'Pempek Campur';
    const productNameKey = rawName.trim().toLowerCase();

    // 1. Hitung TOTAL MASUK (semua batch dengan nama produk yang sama)
    const totalIn = batches
      .filter(b => b.status !== 'Sold Out' && (b.product_name || 'Pempek Campur').trim().toLowerCase() === productNameKey)
      .reduce((sum, b) => sum + Number(b.total_qty || 0), 0);

    // 2. Hitung TOTAL KELUAR (semua transaksi dengan nama produk yang sama)
    const totalOut = transactions
      .filter(t => (t.product_name || 'Pempek Campur').trim().toLowerCase() === productNameKey)
      .reduce((sum, t) => sum + Number(t.qty || 0), 0);

    return totalIn - totalOut;
  };

  // Buat daftar dropdown yang stoknya masih > 0
  const availableBatches = batches.filter(b => getRemainingStock(b.id) > 0);

  // --- HITUNGAN TOTAL TAGIHAN ---
  const calculateGrandTotal = () => {
    return items.reduce((total, item) => {
      if (!item.batchId || !item.qty) return total;
      const price = item.priceOption === 'custom' ? Number(item.customPrice) || 0 : Number(item.priceOption);
      return total + (Number(item.qty) * price);
    }, 0);
  };

  const grandTotal = calculateGrandTotal();

  // --- FUNGSI SUBMIT TRANSAKSI UTAMA ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasi: Cek apakah ada produk yang kosong atau qty melebihi stok
    const validItems = items.filter(item => item.batchId && item.qty);
    if (validItems.length === 0) {
      return toast.error('Pilih minimal 1 produk dan masukkan jumlahnya!');
    }

    let hasError = false;
    validItems.forEach(item => {
        if (Number(item.qty) > getRemainingStock(item.batchId)) hasError = true;
    });

    if (hasError) return toast.error('Ada jumlah produk yang melebihi sisa stok!');

    setLoading(true);

    try {
        let remainingDP = Number(amountPaid) || 0;

        const payload = validItems.map(item => {
            const batch = batches.find(b => b.id === item.batchId);
            const price = item.priceOption === 'custom' ? Number(item.customPrice) : Number(item.priceOption);
            const subtotal = Number(item.qty) * price;

            let itemPaid = 0;
            if (paymentStatus === 'lunas') {
                itemPaid = subtotal;
            } else {
                if (remainingDP >= subtotal) {
                    itemPaid = subtotal;
                    remainingDP -= subtotal;
                } else {
                    itemPaid = remainingDP;
                    remainingDP = 0;
                }
            }

            return {
                customer_name: name || 'Pelanggan',
                customer_phone: phone,
                type: type,
                account: account,
                payment_status: paymentStatus,
                batch_id: item.batchId,
                product_name: batch?.product_name || 'Produk',
                qty: Number(item.qty),
                selling_price: price,
                amount_paid: itemPaid
            };
        });

        if (editingId) {
            // JIKA SEDANG EDIT: Gunakan .update()
            const { error } = await supabase.from('transactions').update(payload[0]).eq('id', editingId);
            if (error) throw error;
            toast.success('Transaksi berhasil diperbarui!');
        } else {
            // JIKA TRANSAKSI BARU: Gunakan .insert()
            const { error } = await supabase.from('transactions').insert(payload);
            if (error) throw error;
            toast.success('Transaksi berhasil disimpan!');
        }
        
        cancelEdit(); // Bersihkan form
        fetchData();

    } catch (error: any) {
        console.error("Error:", error);
        toast.error('Gagal menyimpan transaksi!');
    } finally {
        setLoading(false);
    }
  };

  // FUNGSI LUNAS TANPA POP-UP
  const handleLunas = async (id: number, totalBill: number) => {
    const { error } = await supabase.from('transactions').update({ payment_status: 'lunas', amount_paid: totalBill }).eq('id', id);
    if(!error) {
      toast.success('Tagihan berhasil dilunasi!');
      fetchData();
    } else {
      toast.error('Gagal update data.');
    }
  };

  // FUNGSI HAPUS TRANSAKSI TANPA POP-UP
  const handleDelete = async (id: number) => {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (!error) {
      toast.success("Transaksi berhasil dihapus");
      fetchData();
    } else {
      toast.error("Gagal menghapus transaksi.");
    }
  };

  // --- TARUH DI SINI (ANTARA handleSubmit DAN handleLunas) ---

  // FUNGSI UNTUK MEMUAT DATA KE FORM (EDIT)
  const handleEdit = (t: any) => {
    setEditingId(t.id);
    setName(t.customer_name);
    setPhone(t.customer_phone);
    setType(t.type);
    setAccount(t.account);
    setPaymentStatus(t.payment_status);
    setAmountPaid(t.amount_paid.toString());
    
    // Masukkan data barang ke baris pertama form
    setItems([{ 
      id: Date.now(), 
      batchId: t.batch_id, 
      qty: t.qty.toString(), 
      priceOption: [20000, 25000].includes(t.selling_price) ? t.selling_price.toString() : 'custom', 
      customPrice: [20000, 25000].includes(t.selling_price) ? '' : t.selling_price.toString() 
    }]);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success('Data dimuat ke form. Silakan edit.');
  };

  // FUNGSI BATAL EDIT
  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setPhone('628');
    setItems([{ id: Date.now(), batchId: '', qty: '', priceOption: '20000', customPrice: '' }]);
    setPaymentStatus('lunas');
    setAmountPaid('');
  };

// --- BATAS AKHIR KODE LANGKAH 2 ---

  const filteredTransactions = transactions.filter(t => {
    const d = new Date(t.created_at);
    return (d.getMonth() + 1) === filterMonth && d.getFullYear() === filterYear;
  });

  const piutangList = transactions.filter(t => t.payment_status === 'belum_lunas');
  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  // --- LOGIKA AUTOCOMPLETE PELANGGAN (CARI NAMA & WA DARI TRANSAKSI LAMA) ---
  const uniqueCustomers = Array.from(new Set(transactions.map(t => t.customer_name)))
    .map(n => transactions.find(t => t.customer_name === n))
    .filter(c => c && c.customer_name); // Pastikan datanya tidak kosong

  // Saring pelanggan berdasarkan huruf yang sedang diketik Kasir
  const filteredCustomers = uniqueCustomers.filter((c: any) => 
    c.customer_name.toLowerCase().includes(name.toLowerCase())
  );
  
  return (
    <div className="font-sans pb-24">
      <header className="bg-emerald-600 text-white p-5 rounded-b-3xl shadow-md">
        <h1 className="text-xl font-bold tracking-tight">Catat Penjualan</h1>
        <p className="text-emerald-100 text-xs">Catat setiap kali ada yang beli</p>
      </header>

      <main className="p-5 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* DATA PELANGGAN */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4 relative">
            <div className="relative">
                <label className="block text-sm font-bold text-slate-700 mb-1">Nama Pembeli</label>
                <input 
                    type="text" 
                    required 
                    autoComplete="off"
                    value={name} 
                    onChange={(e) => {
                        setName(e.target.value);
                        setShowSuggestions(true); // Munculkan pop-up saat mulai ngetik
                    }} 
                    onFocus={() => setShowSuggestions(true)} // Munculkan saat kolom diklik
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Sembunyikan kalau klik di luar
                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition" 
                />
                
                {/* --- KOTAK POP-UP DAFTAR PELANGGAN --- */}
                {showSuggestions && filteredCustomers.length > 0 && (
                    <ul className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {filteredCustomers.map((cust: any, idx: number) => (
                            <li 
                                key={idx}
                                onMouseDown={(e) => e.preventDefault()} // Mencegah pop-up hilang sebelum diklik
                                onClick={() => {
                                    setName(cust.customer_name);
                                    setPhone(cust.customer_phone || '628');
                                    setShowSuggestions(false);
                                }}
                                className="p-3 hover:bg-emerald-50 cursor-pointer transition"
                            >
                                <p className="text-sm font-bold text-slate-800">{cust.customer_name}</p>
                                <p className="text-[10px] text-slate-500 font-medium font-mono">{cust.customer_phone || 'Tidak ada nomor WA'}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">No. WhatsApp</label>
                <input type="number" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 transition" />
            </div>
          </div>

          {/* AREA PRODUK DINAMIS (MULTI BARIS) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-100 space-y-4">
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-black text-emerald-800">Daftar Produk Dibeli</label>
                <button type="button" onClick={handleAddRow} className="flex items-center text-xs bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition">
                    <Plus className="w-4 h-4 mr-1" /> Tambah Varian
                </button>
            </div>

            {items.map((item, index) => {
                const currentStock = item.batchId ? getRemainingStock(item.batchId) : 0;
                const isQtyInvalid = item.batchId && Number(item.qty) > currentStock;

                return (
                    <div key={item.id} className="p-4 border-2 border-emerald-50 bg-emerald-50/50 rounded-xl relative">
                        {items.length > 1 && (
                            <button type="button" onClick={() => handleRemoveRow(item.id)} className="absolute -top-3 -right-3 bg-rose-100 text-rose-600 p-1.5 rounded-full hover:bg-rose-200 shadow-sm">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        
                        <div className="space-y-3">
                            <select required value={item.batchId} onChange={(e) => updateItem(item.id, 'batchId', e.target.value)} className="w-full p-3 border border-emerald-200 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 text-slate-900 outline-none font-bold text-sm">
                                <option value="">-- Pilih Produk --</option>
                                {availableBatches.map(b => (
                                    <option key={b.id} value={b.id}>📦 {b.product_name} (Sisa: {getRemainingStock(b.id)})</option>
                                ))}
                            </select>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <input 
                                        type="text" inputMode="numeric" required placeholder="Jml Pack" value={item.qty} 
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/[^0-9]/g, '');
                                            if (val.startsWith('0')) val = val.substring(1);
                                            updateItem(item.id, 'qty', val);
                                        }} 
                                        className={`w-full p-3 border rounded-xl outline-none font-bold text-slate-900 text-sm ${isQtyInvalid ? 'border-rose-400 bg-rose-50 text-rose-600' : 'border-slate-200 bg-white'}`} 
                                    />
                                    {isQtyInvalid && <p className="text-[10px] text-rose-600 font-bold mt-1">⚠️ Maks: {currentStock}</p>}
                                </div>
                                <select value={item.priceOption} onChange={(e) => updateItem(item.id, 'priceOption', e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-white text-slate-900 outline-none text-sm font-bold">
                                    <option value="20000">Rp 20.000</option><option value="25000">Rp 25.000</option><option value="custom">Manual...</option>
                                </select>
                            </div>
                            {item.priceOption === 'custom' && (
                                <input type="number" required min="1" value={item.customPrice} onChange={(e) => updateItem(item.id, 'customPrice', e.target.value)} placeholder="Harga Custom (Rp)" className="w-full p-3 border-2 border-emerald-200 rounded-xl bg-white text-slate-900 outline-none text-sm" />
                            )}
                        </div>
                    </div>
                )
            })}
          </div>

          {/* STATUS PEMBAYARAN & LAINNYA */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            
            <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-slate-700">Total Tagihan:</span>
                <span className="text-xl font-black text-emerald-600">{formatIDR(grandTotal)}</span>
            </div>

            <div className="pt-3 border-t border-slate-100">
                <label className="block text-sm font-bold text-slate-700 mb-2">Status Pembayaran</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                <label className={`p-3 text-center rounded-xl border text-sm font-bold cursor-pointer ${paymentStatus === 'lunas' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}><input type="radio" value="lunas" checked={paymentStatus === 'lunas'} onChange={() => setPaymentStatus('lunas')} className="hidden" />Lunas Semuanya</label>
                <label className={`p-3 text-center rounded-xl border text-sm font-bold cursor-pointer ${paymentStatus === 'belum_lunas' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}><input type="radio" value="belum_lunas" checked={paymentStatus === 'belum_lunas'} onChange={() => setPaymentStatus('belum_lunas')} className="hidden" />Baru DP / Cicil</label>
                </div>
                {paymentStatus === 'belum_lunas' && (
                <div className="animate-in fade-in zoom-in duration-200">
                    <label className="block text-xs font-bold text-rose-700 mb-1">Jumlah yang Baru Dibayar (Rp)</label>
                    <input type="number" required min="0" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder={`Maks: ${grandTotal}`} className="w-full p-3 border-2 border-rose-200 rounded-xl bg-rose-50 text-slate-900 outline-none focus:border-rose-500 font-bold" />
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
                <label className="block text-sm font-bold text-slate-700 mb-1">Dompet Tujuan</label>
                <select value={account} onChange={(e) => setAccount(e.target.value)} className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 outline-none font-bold">
                <option value="Tunai (Laci)">💵 Tunai (Laci)</option>
                <option value="Rekening Bank">🏦 Transfer Bank</option>
                <option value="E-Wallet">📱 E-Wallet (QRIS/OVO)</option>
                <option value="Marketplace">🧡 Marketplace (Shopee/Tokped)</option>
                </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className={`w-full text-white font-black p-4 rounded-xl mt-4 flex justify-center items-center shadow-lg transition ${loading ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
            <Save className="w-5 h-5 mr-2" /> {loading ? 'Memproses...' : (editingId ? 'UPDATE TRANSAKSI' : 'SIMPAN TRANSAKSI')}
          </button>
        </form>

        {/* REKAP PIUTANG */}
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
        
        {/* RIWAYAT */}
        <section className="mt-6">
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="font-bold text-slate-700 flex items-center"><Calendar className="w-4 h-4 mr-2 text-indigo-500"/> Riwayat</h3>
            <div className="flex space-x-1">
              <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))} className="p-1 text-[10px] font-bold border border-slate-200 rounded bg-white text-slate-900 outline-none">
                {[...Array(12)].map((_, i) => (<option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('id-ID', { month: 'short' })}</option>))}
              </select>
              <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} className="p-1 text-[10px] font-bold border border-slate-200 rounded bg-white text-slate-900 outline-none">
                <option value={2026}>2026</option><option value={2025}>2025</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTransactions.map((t) => (
              <div key={t.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{t.customer_name}</p>
                    <p className="text-[10px] text-slate-500">{t.product_name} x {t.qty}</p>
                  </div>
                  <p className="text-sm font-black text-slate-800">{formatIDR(t.qty * t.selling_price)}</p>
                </div>

                {/* TOMBOL AKSI BARU */}
                <div className="flex justify-end space-x-2 border-t border-slate-50 pt-2">
                  <button onClick={() => handleEdit(t)} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100 transition">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="text-[10px] font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-lg hover:bg-rose-100 transition">
                    Hapus
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