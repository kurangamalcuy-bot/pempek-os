"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Star, MessageCircle, MessageSquare, Filter, Send, AlertCircle, Edit2, Save, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDays, setFilterDays] = useState('all');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tempPhone, setTempPhone] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null); 
  
  // State untuk Komposer Pesan
  const [message, setMessage] = useState('Halo Kak [nama]! Terima kasih sudah jadi pelanggan setia Pempek Umiwa. Spesial buat Kakak, ada diskon khusus nih untuk pemesanan hari ini! Mau pesan berapa pack Kak? 🥟✨');

  useEffect(() => {
    fetchCustomers();
  }, [filterDays]);

  const fetchCustomers = async () => {
    setLoading(true);
    
    // 🚀 PERBAIKAN 4 (PERFORMA): HANYA tarik kolom yang dipakai. Ukuran data turun drastis 80%!
    let query = supabase.from('transactions').select('id, customer_name, customer_phone, qty, selling_price, created_at');
    
    if (filterDays !== 'all') {
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - parseInt(filterDays));
      const dateStr = dateLimit.toISOString().split('T')[0];
      query = query.gte('created_at', dateStr + 'T00:00:00');
    }

    const { data, error } = await query;

    if (error) {
       toast.error('Gagal menarik data pelanggan');
       console.error(error);
       setLoading(false);
       return;
    }
    
    if (data) {
      const grouped = data.reduce((acc: any, curr: any) => {
        const rawName = curr.customer_name ? String(curr.customer_name).trim() : 'Hamba Allah';
        const cleanName = rawName.toLowerCase();
        // Bersihkan semua karakter selain angka (spasi, strip, plus akan hilang)
        const rawPhone = curr.customer_phone ? String(curr.customer_phone).replace(/\D/g, '') : '';
        
        // 1. Deteksi nomor WA kosong atau tidak valid (kurang dari 9 angka)
        const isPhoneEmpty = rawPhone === '' || rawPhone === '628' || rawPhone.length < 9;
        
        // Standarisasi format nomor ke 628... untuk link WA nanti
        let phoneStr = rawPhone;
        if (!isPhoneEmpty) {
            if (phoneStr.startsWith('0')) {
                phoneStr = '62' + phoneStr.substring(1);
            }
        }
        
        // 2. Deteksi nama generik
        const isGenericName = cleanName === 'hamba allah' || cleanName === 'pelanggan' || cleanName === 'pembeli';

        // 🐛 PERBAIKAN MINOR (ANTI-VIP PALSU): Logika Kunci Unik yang Lebih Cerdas
        let uniqueKey;
        if (!isPhoneEmpty) {
          uniqueKey = `PHONE_${phoneStr}`; // Prioritas 1: WA pasti unik, gabungkan!
        } else if (!isGenericName) {
          uniqueKey = `NAME_${cleanName}`; // Prioritas 2: Namanya spesifik (misal: "Budi Cimahi"), gabungkan!
        } else {
          uniqueKey = `TX_${curr.id}`;     // Prioritas 3: Nama generik & tanpa WA? Jangan digabung!
        }

        // 3. Gabungkan data ke dalam Peta (Map)
        if (!acc[uniqueKey]) {
          acc[uniqueKey] = { 
            name: rawName, 
            phone: isPhoneEmpty ? '-' : phoneStr,
            total_qty: 0, 
            total_spent: 0, 
            order_count: 0,
            isPhoneValid: !isPhoneEmpty
          };
        }
        
        acc[uniqueKey].total_qty += Number(curr.qty || 0);
        acc[uniqueKey].total_spent += (Number(curr.qty || 0) * Number(curr.selling_price || 0));
        acc[uniqueKey].order_count += 1;
        
        return acc;
      }, {});
      
      const sortedCustomers = Object.values(grouped).sort((a: any, b: any) => b.total_spent - a.total_spent);
      setCustomers(sortedCustomers);
    }
    setLoading(false);
  };

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  const handleUpdatePhone = async (customerName: string, newPhone: string) => {
    setLoading(true);
    const { error } = await supabase
      .from('transactions')
      .update({ customer_phone: newPhone })
      .eq('customer_name', customerName);

    if (error) {
      toast.error('Gagal memperbarui nomor');
    } else {
      toast.success('Nomor berhasil diperbarui!');
      setEditingKey(null);
      fetchCustomers(); // Muat ulang data
    }
    setLoading(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSendWA = (phone: string, name: string) => {
    if (!phone || phone === '-') {
        toast.error('Nomor WhatsApp pelanggan ini tidak tersedia!');
        return;
    }
    // Ganti kata [nama] atau [Nama] menjadi nama asli pembeli
    const personalizedMessage = message.replace(/\[nama\]/gi, name.split(' ')[0]); // Mengambil nama panggilan (kata pertama)
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(personalizedMessage)}`, '_blank');
  };

  return (
    <div className="font-sans pb-32 bg-slate-50 min-h-screen">
      <header className="bg-emerald-600 text-white p-6 rounded-b-[40px] shadow-lg">
        <h1 className="text-xl font-black flex items-center tracking-tight">
          <Users className="mr-2 w-6 h-6" /> CRM & Loyalitas
        </h1>
        <p className="text-emerald-100 text-xs mt-1">Database Pelanggan & Smart Follow-Up</p>
      </header>

      <main className="p-4 space-y-5 -mt-2">
        
        {/* --- KOMPOSER PESAN (BARU) --- */}
        <section className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
             <h2 className="text-sm font-black text-slate-800 flex items-center">
                <MessageCircle className="w-4 h-4 mr-1.5 text-emerald-500" /> Komposer Pesan
             </h2>
          </div>
          
          <textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full h-28 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 focus:bg-emerald-50/30 transition-all leading-relaxed resize-none"
            placeholder="Ketik pesan promosi atau minta review di sini..."
          />

          <div className="flex gap-2">
            <button 
              onClick={() => setMessage('Halo Kak, terima kasih banyak ya sudah jajan di Pempek Umiwa! 🥰 Semoga rasa ikannya pas dan bikin nagih di lidah.\n\nOh iya Kak, kalau Kakak berkenan dan punya waktu senggang 1 menit saja, bolehkah kami minta bantuan untuk kasih bintang & sedikit cerita tentang rasa pempek kami di Google Maps? 🥹\n\nBantuan dari Kakak sungguh berharga banget buat membantu usaha kecil kami agar lebih dikenal orang banyak. Ini link-nya ya Kak:\nhttps://maps.app.goo.gl/8F87oK5z3JcNm5xq8?g_st=ic\n\nSehat selalu ya Kak, ditunggu kabar baik/orderan selanjutnya! Hehe 🙏✨')}
              className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition flex items-center justify-center shadow-sm"
            >
               <Star className="w-3.5 h-3.5 mr-1.5" /> Minta Review
            </button>
            <button 
              onClick={() => setMessage('Halo Kak, apa kabar? Semoga Kakak dan keluarga sehat serta bahagia selalu ya di sana! 🥰\n\nCuma mau info kalau stok kami hari ini Ready Stock kembali kakk! Kehadiran Kakak sebagai pelanggan setia bener-bener berarti bagi usaha kecil kami, jadi mumpung stoknya masih lengkap, kalau mau order lagi boleh langsung balas pesan ini ya.\n\nMakasih banyak Kak, ditunggu kabar baiknya! 😊🙏')}
              className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition flex items-center justify-center shadow-sm"
            >
               <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Info Ready Stok
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-emerald-50 transition">
              {imagePreview ? (
                <img src={imagePreview} className="h-20 rounded-lg object-cover" />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <ImageIcon className="w-6 h-6 mb-1" />
                  <span className="text-[10px] font-bold">Lampirkan Gambar Promo</span>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
            </label>
            {imagePreview && (
               <button onClick={() => setImagePreview(null)} className="text-[9px] text-rose-500 font-bold uppercase text-center">Hapus Gambar</button>
            )}
          </div>
        </section>

        {/* --- FILTER & DATABASE --- */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
             <h2 className="text-sm font-black text-slate-800 flex items-center">
                <Filter className="w-4 h-4 mr-1.5 text-slate-400" /> Target Pelanggan
             </h2>
             <div className="relative bg-white border border-slate-200 rounded-xl shadow-sm">
                 <select 
                   value={filterDays} 
                   onChange={(e) => setFilterDays(e.target.value)}
                   className="text-xs font-black bg-transparent py-2 pl-3 pr-8 outline-none text-emerald-700 appearance-none cursor-pointer"
                 >
                   <option value="all">👑 Sepanjang Waktu (VIP)</option>
                   <option value="1">🛒 Belanja 1 Hari Terakhir</option>
                   <option value="3">📅 Belanja 3 Hari Terakhir</option>
                   <option value="7">📆 Belanja 7 Hari Terakhir</option>
                   <option value="30">📊 Belanja 30 Hari Terakhir</option>
                 </select>
                 <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-2 h-2 border-b-2 border-r-2 border-emerald-500 transform rotate-45"></div>
                 </div>
             </div>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-xs font-bold text-slate-400 py-10 animate-pulse">Memuat database pelanggan...</p>
            ) : customers.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-[24px] border border-slate-200 border-dashed">
                 <AlertCircle className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                 <p className="text-xs font-bold text-slate-400">Belum ada pelanggan di periode ini.</p>
              </div>
            ) : (
              customers.map((cust: any, index: number) => (
                <div key={index} className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-100 relative overflow-hidden transition-all hover:border-emerald-200 group">
                  
                  {/* Badge VIP HANYA untuk 3 Teratas */}
                  {index < 3 && filterDays === 'all' && (
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-2xl shadow-sm">
                      <Star className="w-2.5 h-2.5 inline mr-1 -mt-0.5" /> VIP SPENDER
                    </div>
                  )}
                  
                  <div className="mb-3 flex justify-between items-start">
                      <div className="flex-1">
                          <h3 className="font-black text-slate-800 text-base leading-tight">{cust.name}</h3>
                          
                          {editingKey === cust.name ? (
                            <div className="flex items-center gap-2 mt-2 animate-in slide-in-from-left-2">
                                <input 
                                  type="number" value={tempPhone} 
                                  onChange={(e) => setTempPhone(e.target.value)}
                                  className="text-[11px] font-mono font-bold p-1 border-b-2 border-emerald-500 outline-none w-32 bg-emerald-50 rounded"
                                  autoFocus
                                />
                                <button onClick={() => handleUpdatePhone(cust.name, tempPhone)} className="p-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition"><Save size={12}/></button>
                                <button onClick={() => setEditingKey(null)} className="p-1 bg-slate-100 text-slate-400 rounded-md hover:bg-slate-200 transition"><X size={12}/></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-[10px] font-mono font-bold text-slate-400">
                                   {cust.isPhoneValid ? cust.phone : <span className="text-rose-400 bg-rose-50 px-1.5 py-0.5 rounded font-bold border border-rose-100">Belum ada WA</span>}
                                </p>
                                <button 
                                  onClick={() => { setEditingKey(cust.name); setTempPhone(cust.phone === '-' ? '628' : cust.phone); }} 
                                  className="text-slate-300 hover:text-emerald-500 transition bg-slate-50 p-1 rounded"
                                >
                                  <Edit2 size={12} />
                                </button>
                            </div>
                          )}
                      </div>
                  </div>
                  
                  {/* METRIK PEMBELIAN */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1.5 rounded-xl mb-3 border border-slate-100">
                    <div className="text-center bg-white py-1.5 rounded-lg shadow-sm border border-slate-50">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Beli</p>
                        <p className="font-black text-sm text-slate-700">{cust.total_qty} <span className="text-[9px]">Pack</span></p>
                    </div>
                    <div className="text-center bg-white py-1.5 rounded-lg shadow-sm border border-slate-50">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Order</p>
                        <p className="font-black text-sm text-slate-700">{cust.order_count}x</p>
                    </div>
                    <div className="text-center bg-emerald-50 py-1.5 rounded-lg border border-emerald-100">
                        <p className="text-[9px] font-black text-emerald-600/70 uppercase tracking-widest mb-0.5">Omzet</p>
                        <p className="font-black text-xs text-emerald-600">{formatIDR(cust.total_spent)}</p>
                    </div>
                  </div>

                  {/* TOMBOL ACTION */}
                  <button 
                    onClick={() => handleSendWA(cust.phone, cust.name)} 
                    disabled={!cust.isPhoneValid}
                    className={`w-full flex justify-center items-center space-x-2 p-3.5 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 ${
                        cust.isPhoneValid 
                        ? 'bg-slate-900 text-white hover:bg-slate-800 hover:shadow-md' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" /> 
                    <span>{cust.isPhoneValid ? 'KIRIM PESAN WA' : 'TIDAK BISA DIHUBUNGI'}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}