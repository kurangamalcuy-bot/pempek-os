"use client";

import React, { useState } from 'react';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';

interface PinGateProps {
  children: React.ReactNode;
}

export default function PinGate({ children }: PinGateProps) {
  const CORRECT_PIN = "123400";
  // isAuthorized langsung diset 'false' agar setiap refresh pasti minta PIN
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(false);

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;

    const newPin = [...pin];
    newPin[index] = value.substring(value.length - 1);
    setPin(newPin);
    setError(false);

    // Otomatis pindah ke kotak selanjutnya
    if (value && index < 5) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }

    // Jika 6 kotak sudah terisi, langsung cek
    const fullPin = newPin.join('');
    if (fullPin.length === 6) {
      if (fullPin === CORRECT_PIN) {
        setIsAuthorized(true); // Lolos! Buka gemboknya
      } else {
        setError(true);
        // Hapus inputan jika salah
        setTimeout(() => {
          setPin(['', '', '', '', '', '']);
          document.getElementById('pin-0')?.focus();
        }, 500);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      prevInput?.focus();
    }
  };

  // JIKA BELUM MASUKIN PIN / BARU DI-REFRESH
  if (!isAuthorized) {
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/30 backdrop-blur-xl transition-all duration-700">
        <div className="w-full max-w-xs p-8 bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-slate-100 text-center animate-in zoom-in-95 duration-300">
          
          <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Lock className="w-8 h-8 text-emerald-600" />
          </div>

          <h2 className="text-xl font-black text-slate-800 mb-2">Akses Terkunci</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-8">Masukkan 6 Digit PIN Internal</p>

          <div className="flex justify-between gap-2 mb-8">
            {pin.map((digit, i) => (
              <input
                key={i}
                id={`pin-${i}`}
                type="password"
                inputMode="numeric"
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-10 h-14 text-center text-xl font-black rounded-2xl border-2 transition-all outline-none ${
                  error 
                  ? 'border-rose-400 bg-rose-50 text-rose-600 animate-bounce' 
                  : 'border-slate-100 bg-slate-50 text-emerald-700 focus:border-emerald-500 focus:bg-white'
                }`}
              />
            ))}
          </div>

          {error ? (
            <div className="flex items-center justify-center text-rose-500 text-[10px] font-black uppercase tracking-tighter animate-pulse">
              <AlertCircle className="w-3 h-3 mr-1.5" /> PIN Salah, Coba Lagi
            </div>
          ) : (
            <div className="flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3 h-3 mr-1.5" /> Secure Encryption
            </div>
          )}
        </div>
      </div>
    );
  }

  // JIKA PIN BENAR, TAMPILKAN WEB SEPERTI BIASA
  return <>{children}</>;
}