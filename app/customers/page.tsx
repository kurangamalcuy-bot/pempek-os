"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Star, MessageCircle } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data } = await supabase.from('transactions').select('*');
      if (data) {
        // Logika untuk mengelompokkan pembeli berdasarkan Nomor WA (Repeat Order)
        // Logika untuk mengelompokkan pembeli berdasarkan Nomor WA atau Nama (Jika WA kosong)
        const grouped = data.reduce((acc, curr) => {
          
          // 1. Deteksi apakah nomor WA kosong atau cuma diisi '628' bawaan form
          const phoneStr = curr.customer_phone ? String(curr.customer_phone).trim() : '';
          const isPhoneEmpty = phoneStr === '' || phoneStr === '628' || phoneStr === '-';

          // 2. Kunci Unik: Pakai Nama kalau nomornya kosong, pakai Nomor kalau ada
          const uniqueKey = isPhoneEmpty 
              ? `NAME_${curr.customer_name.trim().toLowerCase()}` 
              : `PHONE_${phoneStr}`;

          // 3. Masukkan atau gabungkan data pelanggan
          if (!acc[uniqueKey]) {
            acc[uniqueKey] = { 
              name: curr.customer_name, 
              phone: isPhoneEmpty ? '-' : phoneStr, // Otomatis jadi tanda setrip kalau kosong biar rapi
              total_qty: 0, 
              total_spent: 0, 
              order_count: 0 
            };
          }
          acc[uniqueKey].total_qty += Number(curr.qty);
          acc[uniqueKey].total_spent += (Number(curr.qty) * Number(curr.selling_price));
          acc[uniqueKey].order_count += 1;
          
          return acc;
        }, {});
        
        // Ubah jadi array dan urutkan dari yang belanjanya paling banyak (Top Spender)
        const sortedCustomers = Object.values(grouped).sort((a: any, b: any) => b.total_spent - a.total_spent);
        setCustomers(sortedCustomers);
      }
      setLoading(false);
    };
    fetchCustomers();
  }, []);

  const formatIDR = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

  const sendPromoWA = (phone: string, name: string) => {
    const text = `Halo Kak ${name}! Terima kasih sudah jadi pelanggan setia Pempek kami. Spesial buat Kakak, ada diskon khusus nih untuk pemesanan hari ini! Mau pesan berapa pack Kak? 🥟✨`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="font-sans">
      <header className="bg-emerald-600 text-white p-5 rounded-b-3xl shadow-md">
        <h1 className="text-xl font-bold tracking-tight">Database Pelanggan</h1>
        <p className="text-emerald-100 text-xs">CRM & Loyalitas (Top Spenders)</p>
      </header>

      <main className="p-5 space-y-4">
        {loading ? <p className="text-center text-sm mt-10">Memuat data pelanggan...</p> : (
          customers.map((cust: any, index: number) => (
            <div key={index} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
              {/* Badge Top 3 */}
              {index < 3 && <div className="absolute top-0 right-0 bg-amber-400 text-amber-900 text-[10px] font-bold px-3 py-1 rounded-bl-xl"><Star className="w-3 h-3 inline mr-1" />VIP</div>}
              
              <h3 className="font-bold text-slate-800 text-lg">{cust.name}</h3>
              <p className="text-xs text-slate-500 mb-3">{cust.phone}</p>
              
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-xl mb-3">
                <div className="text-center"><p className="text-[10px] text-slate-500">Total Beli</p><p className="font-bold text-sm">{cust.total_qty} <span className="text-[10px] font-normal">Pack</span></p></div>
                <div className="text-center border-l border-r border-slate-200"><p className="text-[10px] text-slate-500">Order</p><p className="font-bold text-sm">{cust.order_count}x</p></div>
                <div className="text-center"><p className="text-[10px] text-slate-500">Omzet</p><p className="font-bold text-sm text-emerald-600">{formatIDR(cust.total_spent)}</p></div>
              </div>

              <button onClick={() => sendPromoWA(cust.phone, cust.name)} className="w-full flex justify-center items-center space-x-2 bg-slate-900 text-white p-2 rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors">
                <MessageCircle className="w-4 h-4" /> <span>Kirim WA Promo Khusus</span>
              </button>
            </div>
          ))
        )}
      </main>
    </div>
  );
}