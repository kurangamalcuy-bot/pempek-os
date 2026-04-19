"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    Wallet, Plus, Trash2, Pencil, Download, 
    ArrowUpCircle, ArrowDownCircle, Filter, 
    TrendingUp, PieChart, Landmark, Smartphone, Store, AlertCircle, CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function FinancePage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [type, setType] = useState('expense'); 
  const [category, setCategory] = useState('operational');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [account, setAccount] = useState('Tunai (Laci)'); // FITUR BARU 3
  const [paymentStatus, setPaymentStatus] = useState('Lunas'); // FITUR BARU 6

  useEffect(() => {
    fetchData();
  }, [filterMonth, filterYear]);

  const fetchData = async () => {
    setLoading(true);
    const { data: expData } = await supabase.from('expenses').select('*').order('entry_date', { ascending: false });
    const { data: trxData } = await supabase.from('transactions').select('*');
    if (expData) setExpenses(expData);
    if (trxData) setTransactions(trxData);
    setLoading(false);
  };

  // --- LOGIKA SALDO PER DOMPET ---
  const calculateBalance = (accName: string) => {
    const trxIn = transactions.filter(t => t.account === accName).reduce((acc, curr) => acc + (curr.qty * curr.selling_price), 0);
    const expIn = expenses.filter(e => e.account === accName && e.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const expOut = expenses.filter(e => e.account === accName && e.type === 'expense' && e.payment_status === 'Lunas').reduce((acc, curr) => acc + curr.amount, 0);
    return trxIn + expIn - expOut;
  };

  const balances = {
    tunai: calculateBalance('Tunai (Laci)'),
    bank: calculateBalance('Rekening Bank'),
    ewallet: calculateBalance('E-Wallet'),
    marketplace: calculateBalance('Marketplace')
  };
  const totalBalance = balances.tunai + balances.bank + balances.ewallet + balances.marketplace;

  // --- CRUD FUNCTIONS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { 
        type, category, amount: parseInt(amount), description, 
        entry_date: entryDate, account, payment_status: paymentStatus 
    };

    if (editingId) {
      const { error } = await supabase.from('expenses').update(payload).eq('id', editingId);
      if (!error) { toast.success('Data diperbarui!'); resetForm(); fetchData(); }
    } else {
      const { error } = await supabase.from('expenses').insert([payload]);
      if (!error) { toast.success('Berhasil dicatat!'); resetForm(); fetchData(); }
    }
  };

  const resetForm = () => {
    setType('expense'); setCategory('operational'); setAmount(''); 
    setDescription(''); setEditingId(null); setPaymentStatus('Lunas');
  };

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  // 1. Saring dulu semua pengeluaran berdasarkan bulan & tahun
  const filteredExpenses = expenses.filter(e => {
    const d = new Date(e.entry_date);
    return (d.getMonth() + 1) === filterMonth && d.getFullYear() === filterYear;
  });

  // 2. Baru hitung totalnya dari hasil saringan di atas (Letakkan di LUAR baris filter)
  const totalInflowFiltered = filteredExpenses
    .filter(e => e.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalOutflowFiltered = filteredExpenses
    .filter(e => e.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // FUNGSI HAPUS ARUS KAS TANPA POP-UP
  const handleDelete = async (id: number) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (!error) {
      toast.success('Data berhasil dihapus!');
      fetchData(); 
    } else {
      toast.error('Gagal menghapus data.');
    }
  };

  // --- FUNGSI EDIT TRANSAKSI ---
  const handleEdit = (exp: any) => {
    // 1. Tarik data dari kartu ke form input di atas
    setEditingId(exp.id);
    setType(exp.type);
    setCategory(exp.category || 'operational');
    setAccount(exp.account);
    setPaymentStatus(exp.payment_status || 'Lunas');
    setAmount(exp.amount.toString());
    setDescription(exp.description);
    
    // 2. Arahkan layar otomatis ke atas (opsional tapi bikin UX bagus)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

    return (
    <div className="font-sans pb-24 bg-slate-50 min-h-screen">
      <header className="bg-emerald-600 text-white p-5 rounded-b-3xl shadow-md">
        <h1 className="text-xl font-bold tracking-tight">Manajemen Arus Kas</h1>
        <p className="text-emerald-100 text-xs">Pemisahan Dompet & Kontrol Hutang</p>
      </header>

      <main className="p-4 space-y-5 -mt-4">
        
        {/* FITUR 3: ACCOUNT RECONCILIATION CARDS */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Total Saldo Gabungan</p>
            <h2 className="text-2xl font-black text-slate-800 mb-4">{formatIDR(totalBalance)}</h2>
            <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center text-[9px] font-bold text-slate-500 uppercase"><Landmark className="w-3 h-3 mr-1 text-blue-500"/> Bank</div>
                    <p className="text-xs font-black text-slate-700">{formatIDR(balances.bank)}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center text-[9px] font-bold text-slate-500 uppercase"><Smartphone className="w-3 h-3 mr-1 text-fuchsia-500"/> E-Wallet</div>
                    <p className="text-xs font-black text-slate-700">{formatIDR(balances.ewallet)}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center text-[9px] font-bold text-slate-500 uppercase"><Wallet className="w-3 h-3 mr-1 text-emerald-500"/> Tunai</div>
                    <p className="text-xs font-black text-slate-700">{formatIDR(balances.tunai)}</p>
                </div>
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center text-[9px] font-bold text-slate-500 uppercase"><Store className="w-3 h-3 mr-1 text-orange-500"/> Market</div>
                    <p className="text-xs font-black text-slate-700">{formatIDR(balances.marketplace)}</p>
                </div>
            </div>
        </section>

        {/* FORM INPUT DENGAN PILIHAN DOMPET & STATUS */}
        <section className={`p-5 rounded-2xl shadow-md border bg-white border-slate-200`}>
          <div className="flex space-x-2 mb-4">
             <button onClick={() => setType('expense')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${type === 'expense' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>Pengeluaran</button>
             <button onClick={() => setType('income')} className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${type === 'income' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>Modal</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Pilih Dompet</label>
                    <select value={account} onChange={(e) => setAccount(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs outline-none bg-slate-50 font-bold">
                        <option value="Tunai (Laci)">Tunai (Laci)</option>
                        <option value="Rekening Bank">Rekening Bank</option>
                        <option value="E-Wallet">E-Wallet</option>
                        <option value="Marketplace">Marketplace</option>
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Status Bayar</label>
                    <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={`w-full p-2 border rounded-lg text-xs outline-none font-bold ${paymentStatus === 'Lunas' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                        <option value="Lunas">✅ Lunas</option>
                        <option value="Terhutang">⏳ Terhutang</option>
                    </select>
                </div>
            </div>

            {/* --- FITUR KATEGORI PENGELUARAN --- */}
            {type === 'expense' && (
                <div className="animate-in fade-in zoom-in duration-200">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Kategori Pengeluaran</label>
                    <select 
                      value={category} 
                      onChange={(e) => setCategory(e.target.value)} 
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs outline-none bg-white font-bold text-slate-900 focus:border-rose-400"
                    >
                        <option value="operational">🍔 Operasional (Bahan, Ongkir, Gaji)</option>
                        <option value="marketing">🚀 Marketing & Iklan (Meta/TikTok Ads)</option>
                        <option value="capex">📦 Capex / Investasi (Alat, Freezer)</option>
                    </select>
                </div>
            )}
            {/* ------------------------------------ */}

            <input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Nominal (Rp)" className="w-full p-3 border border-slate-200 rounded-xl text-sm font-bold outline-none text-slate-900" />
            <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Keterangan Transaksi" className="w-full p-3 border border-slate-200 rounded-xl text-sm outline-none" />
            <button type="submit" className={`w-full text-white font-bold p-3 rounded-xl shadow-lg transition-transform active:scale-95 ${type === 'income' ? 'bg-emerald-600' : 'bg-slate-900'}`}>
               {editingId ? 'Update Data' : 'Simpan Transaksi'}
            </button>
          </form>
        </section>

        {/* RIWAYAT DENGAN INDIKATOR STATUS */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-700 flex items-center">
              <Filter className="w-4 h-4 mr-1"/> Riwayat Kas
            </h3>
            
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
          <div className="space-y-2">
            {filteredExpenses.map((exp) => (
              <div key={exp.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm mb-3">
                
                {/* BAGIAN ATAS KARTU */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${exp.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {exp.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{exp.description}</p>
                      <div className="flex items-center space-x-1.5 mt-0.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{exp.account}</p>
                        {exp.type === 'expense' && (
                          <>
                            <span className="text-[10px] text-slate-300">•</span>
                            <p className="text-[10px] font-black text-indigo-500 uppercase">
                              {exp.category === 'operational' ? 'Operasional' : exp.category === 'marketing' ? 'Marketing' : exp.category === 'capex' ? 'Capex' : exp.category}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${exp.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {exp.type === 'income' ? '+' : '-'} {formatIDR(exp.amount)}
                    </p>
                    {exp.payment_status === 'Terhutang' ? (
                      <span className="text-[8px] font-black bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded uppercase">Hutang</span>
                    ) : (
                      <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded uppercase">Lunas</span>
                    )}
                  </div>
                </div>

                {/* BAGIAN TOMBOL EDIT & HAPUS */}
                <div className="flex justify-end space-x-2 border-t border-slate-50 pt-3 mt-3">
                  <button 
                    onClick={() => handleEdit(exp)} 
                    className="flex items-center text-[10px] bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-200 transition-colors"
                  >
                    <Pencil className="w-3 h-3 mr-1"/> Edit
                  </button>
                  <button 
                    onClick={() => handleDelete(exp.id)} 
                    className="flex items-center text-[10px] bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg font-bold hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 mr-1"/> Hapus
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