"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Megaphone, Store, Smartphone, AlertCircle, CheckCircle2, Calendar, Plus, Trash2, Save, Printer, Download, X, Edit3, MapPin, Package, QrCode, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import * as htmlToImage from 'html-to-image';

export default function TransactionsPage() {
  const [loading, setLoading] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [generatedImage, setGeneratedImage] = useState('');

  // --- STATE UNTUK MODAL STRUK PNG ---
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);
  const [ongkir, setOngkir] = useState(0);
  const [packingFee, setPackingFee] = useState(0);
  const [customOngkir, setCustomOngkir] = useState('');
  // TAMBAHKAN KODE INI TEPAT DI BAWAHNYA:
  // --- STATE UNTUK MODAL EDIT NAMA ---
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [editNameData, setEditNameData] = useState<{ currentName: string, items: any[] }>({ currentName: '', items: [] });
  const [newCustomerName, setNewCustomerName] = useState('');

  // --- STATE UNTUK MODAL RESI PENGIRIMAN ---
  const [showResiModal, setShowResiModal] = useState(false);
  const [currentResi, setCurrentResi] = useState<any>(null);
  const [isManualAddress, setIsManualAddress] = useState(false); // Deteksi mode manual
  
  const [resiForm, setResiForm] = useState({
      name: '', phone: '', detailAddress: '', city: '', district: '', subdistrict: '', postalCode: '', courier: 'AHSAN XPRESS', customCourier: ''
  });

  // DATA LENGKAP BANDUNG RAYA (KOTA BANDUNG, KAB BANDUNG, KBB, CIMAHI)
  const ADDRESS_DATA: any = {
      "Kota Cimahi": {
          "Cimahi Selatan": { "Cibeber": "40531", "Leuwigajah": "40532", "Utama": "40533", "Melong": "40534", "Cibeureum": "40535" },
          "Cimahi Tengah": { "Baros": "40521", "Cigugur Tengah": "40522", "Karangmekar": "40523", "Setiamanah": "40524", "Cimahi": "40525", "Padasuka": "40526" },
          "Cimahi Utara": { "Cipageran": "40511", "Citeureup": "40512", "Cibabat": "40513", "Pasirkaliki": "40514" }
      },
      "Kota Bandung": {
          "Andir": { "Campaka": "40184", "Ciroyom": "40182", "Garuda": "40184", "Maleber": "40184" },
          "Antapani": { "Antapani Kidul": "40291", "Antapani Kulon": "40291", "Antapani Tengah": "40291" },
          "Arcamanik": { "Cisaranten Endah": "40292", "Cisaranten Kulon": "40293", "Sukamiskin": "40293" },
          "Astana Anyar": { "Cibadak": "40241", "Karanganyar": "40241", "Nyengseret": "40242", "Panjunan": "40242" },
          "Babakan Ciparay": { "Babakan": "40222", "Babakanciparay": "40223", "Margahayu Utara": "40224" },
          "Bandung Kidul": { "Batununggal": "40266", "Mengger": "40267", "Wates": "40256" },
          "Bandung Kulon": { "Caringin": "40212", "Cibuntu": "40212", "Cijerah": "40213", "Gempolsari": "40215" },
          "Bandung Wetan": { "Cihapit": "40114", "Citarum": "40115", "Tamansari": "40116" },
          "Batununggal": { "Binong": "40275", "Cibangkong": "40273", "Gumuruh": "40275", "Maleer": "40274" },
          "Bojongloa Kaler": { "Jamika": "40231", "Kopo": "40233", "Suka Asih": "40233" },
          "Bojongloa Kidul": { "Cibaduyut": "40236", "Cibaduyut Kidul": "40239", "Mekarwangi": "40237" },
          "Buahbatu": { "Cijawura": "40287", "Jatisari": "40286", "Margasari": "40286", "Sekejati": "40286" },
          "Cibeunying Kaler": { "Cigadung": "40191", "Cihaurgeulis": "40122", "Sukaluyu": "40123" },
          "Cibeunying Kidul": { "Cicadas": "40121", "Cikutra": "40124", "Padasuka": "40125", "Pasirlayung": "40192" },
          "Cicendo": { "Arjuna": "40172", "Husen Sastranegara": "40174", "Pajajaran": "40173", "Pasirkaliki": "40171" },
          "Cidadap": { "Ciumbuleuit": "40142", "Hegarmanah": "40141", "Ledeng": "40143" },
          "Coblong": { "Cipaganti": "40131", "Dago": "40135", "Lebakgede": "40132", "Sadangserang": "40133" },
          "Kiaracondong": { "Babakansari": "40283", "Cicaheum": "40282", "Kebonkangkung": "40284" },
          "Lengkong": { "Burangrang": "40262", "Cijagra": "40265", "Malabar": "40262", "Turangga": "40264" },
          "Sukajadi": { "Cipedes": "40162", "Pasteur": "40161", "Sukagalih": "40163", "Sukawarna": "40164" },
          "Sumur Bandung": { "Braga": "40111", "Kebonpisang": "40112", "Merdeka": "40113" }
      },
      "Kab. Bandung": {
          "Margahayu": { "Margahayu Selatan": "40226", "Margahayu Tengah": "40225", "Sayati": "40228", "Sukamenak": "40227" },
          "Margaasih": { "Margaasih": "40215", "Rahayu": "40218", "Mekrahayu": "40218", "Nanjung": "40217", "Cigondewah Hilir": "40214" },
          "Dayeuhkolot": { "Dayeuhkolot": "40238", "Cangkuang Kulon": "40239", "Cangkuang Wetan": "40238", "Citeureup": "40237" },
          "Baleendah": { "Baleendah": "40375", "Andir": "40375", "Bojongmalaka": "40375", "Manggahang": "40375", "Rancamanyar": "40375" },
          "Soreang": { "Soreang": "40911", "Cingcin": "40914", "Pamekaran": "40912", "Sadu": "40913", "Sekarwangi": "40915" },
          "Katapang": { "Katapang": "40921", "Banyusari": "40921", "Cilampeni": "40921", "Gandasari": "40921", "Sangkanhurip": "40921" },
          "Bojongsoang": { "Bojongsoang": "40288", "Bojongsari": "40288", "Buahbatu": "40287", "Cipagalo": "40287", "Lengkong": "40287" },
          "Cileunyi": { "Cileunyi Kulon": "40620", "Cileunyi Wetan": "40622", "Cimekar": "40623", "Cinunuk": "40624" }
      },
      "Kab. Bandung Barat": {
          "Padalarang": { "Padalarang": "40553", "Kertamulya": "40553", "Kertajaya": "40553", "Ciburuy": "40553", "Laksanamekar": "40553", "Jayamekar": "40553" },
          "Ngamprah": { "Ngamprah": "40552", "Cilame": "40552", "Cimareme": "40552", "Gadobangkong": "40552", "Tanimulya": "40552", "Pakuhaji": "40552" },
          "Parongpong": { "Sariwangi": "40559", "Cihanjuang": "40559", "Cihanjuang Rahayu": "40559", "Ciwaruga": "40559", "Karyawangi": "40559" },
          "Lembang": { "Lembang": "40391", "Jayagiri": "40391", "Kayuambon": "40391", "Gudangkahuripan": "40391", "Wangunsari": "40391" },
          "Cisarua": { "Cisarua": "40551", "Jambudipa": "40551", "Kertawangi": "40551", "Pasirhalang": "40551", "Padaasih": "40551" },
          "Batujajar": { "Batujajar Barat": "40561", "Batujajar Timur": "40561", "Cangkorah": "40561", "Galanggang": "40561" },
          "Cihampelas": { "Cihampelas": "40562", "Cipatik": "40562", "Citapen": "40562", "Mekarmukti": "40562", "Patrolsari": "40562" }
      }
  };

  // --- FORM STATE BARU (SISTEM MULTI-BARIS) ---
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('08');
  const [showSuggestions, setShowSuggestions] = useState(false);
  // items adalah array yang menyimpan baris-baris produk yang dipilih
  const [items, setItems] = useState([{ id: Date.now(), batchId: '', qty: '', priceOption: 'normal', customPrice: '' }]);
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

  // --- KONFIGURASI PAKET BUNDLING (HARGA KHUSUS) ---
  const BUNDLES = [
    {
      name: "Paket Cicip (2 packs)",
      items: [
        { productName: "Pempek Isi 10 pcs", qty: 1, bundlePricePerPack: 18000 },
        { productName: "Pempek Kapal Selam isi Telur", qty: 1, bundlePricePerPack: 26000 }
      ]
    },
    {
      name: "Paket Keluarga (3 packs)",
      items: [
        { productName: "Pempek isi 20 pcs", qty: 1, bundlePricePerPack: 31000 }, 
        { productName: "Adaan+Kulit isi 12 pcs ", qty: 1, bundlePricePerPack: 17000 }, 
        { productName: "Tekwan", qty: 1, bundlePricePerPack: 32000 }
      ]
    },
    {
      name: "Paket Istimewa (5 packs)",
      items: [
        { productName: "Pempek Isi 20 pcs", qty: 1, bundlePricePerPack: 32000 },
        { productName: "Pempek Besar isi 10 pcs", qty: 1, bundlePricePerPack: 32000 },
        { productName: "Tekwan", qty: 1, bundlePricePerPack: 32000 },
        { productName: "Adaan+Kulit isi 12 pcs ", qty: 1, bundlePricePerPack: 17000 },
        { productName: "Pempek Kapal Selam isi Telur", qty: 1, bundlePricePerPack: 26000 } 
      ]
    }
  ];

  // --- FUNGSI DINAMIS UNTUK BARIS PRODUK ---
  const handleAddRow = () => {
    setItems([...items, { id: Date.now(), batchId: '', qty: '', priceOption: 'normal', customPrice: '' }]);
  };

  // --- FUNGSI PENDETEKSI PINTAR (SMART MATCH) ---
  const isSmartMatch = (bundleName: string, dbName: string) => {
    // 1. Ubah semua jadi huruf kecil
    let b = bundleName.toLowerCase();
    let d = (dbName || '').toLowerCase();

    // 2. Samakan simbol '+' dan '&' menjadi spasi biasa
    b = b.replace(/\+/g, ' ').replace(/&/g, ' ');
    d = d.replace(/\+/g, ' ').replace(/&/g, ' ');

    // 3. Hapus kata-kata pengecoh (pcs, kecil, telur) dan rapikan spasi
    b = b.replace(/pcs/g, '').replace(/kecil/g, '').replace(/isi telur/g, '').replace(/telur/g, '').replace(/\s+/g, ' ').trim();
    d = d.replace(/pcs/g, '').replace(/kecil/g, '').replace(/isi telur/g, '').replace(/telur/g, '').replace(/\s+/g, ' ').trim();

    // 4. ATURAN ANTI-BOCOR: Cegah "Pempek Isi 10" tertukar dengan "Pempek Besar"
    if (b.includes('10') && !b.includes('besar') && d.includes('besar')) {
        return false; 
    }

    // 5. Cek kecocokan: Pastikan setiap kata penting di Bundles ADA di Database
    const words = b.split(' ');
    return words.every(word => d.includes(word));
  };

  // --- FITUR TERAPKAN PAKET BUNDLING ---
  const handleApplyBundle = (bundleName: string) => {
    const selectedBundle = BUNDLES.find(b => b.name === bundleName);
    if (!selectedBundle) return;

    const newItems = selectedBundle.items.map((item, index) => {
      const matchingBatch = availableBatches.find(b => isSmartMatch(item.productName, b.product_name));

      return {
        // Tambahkan Math.random() agar ID selalu unik walau diklik beruntun dengan cepat
        id: Date.now() + Math.floor(Math.random() * 1000) + index,
        batchId: matchingBatch ? matchingBatch.id : '',
        qty: item.qty.toString(),
        priceOption: 'custom', 
        customPrice: item.bundlePricePerPack.toString()
      };
    });

    // PERBAIKAN: Sistem "Add", bukan menimpa
    setItems(prevItems => {
      // Saring dulu baris kosong (jika ada baris yang belum diisi produk sama sekali, kita buang)
      const existingItems = prevItems.filter(item => item.batchId !== '');
      // Gabungkan list yang sudah ada dengan paket yang baru diklik
      return [...existingItems, ...newItems];
    });
    
    // Peringatan otomatis kalau produknya kosong di freezer
    if (newItems.some(item => item.batchId === '')) {
       toast.error(`Ada produk di ${bundleName} yang stoknya habis/tidak ditemukan!`);
    } else {
       toast.success(`${bundleName} Berhasil Ditambahkan!`);
    }
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

  // --- LOGIKA BARU DROPDOWN ANTI DUPLIKAT ---
  const uniqueProductsMap = new Map();

  batches.forEach(b => {
    const rawName = b.product_name || 'Pempek Campur';
    const key = rawName.trim().toLowerCase();
    
    // Jika produk belum masuk ke map, tambahkan
    if (!uniqueProductsMap.has(key)) {
       uniqueProductsMap.set(key, {
          id: b.id, // ID perwakilan untuk database
          product_name: rawName,
          isArchived: true, // Set default true, nanti dicek lagi
          stock: getRemainingStock(b.id) // Hitung total sisa stok
       });
    }
    
    // Jika ada 1 saja batch dari produk ini yang belum diarsip, ubah statusnya jadi aktif
    const status = (b.status || '').toLowerCase();
    if (b.is_archived !== true && !status.includes('archive')) {
       uniqueProductsMap.get(key).isArchived = false;
    }
  });

  // Buat daftar akhir: Hilangkan yang isArchived = true
  // Produk dengan stok 0 (habis) tetap lolos filter ini asalkan tidak diarsip
  const availableBatches = Array.from(uniqueProductsMap.values())
    .filter(product => product.isArchived === false);

  // --- HITUNGAN TOTAL TAGIHAN ---
  const calculateGrandTotal = () => {
    return items.reduce((total, item) => {
      if (!item.batchId || !item.qty) return total;
      
      let price = 0;
      if (item.priceOption === 'custom') {
        price = Number(item.customPrice) || 0;
      } else {
        const batch = batches.find(b => b.id === item.batchId);
        // Fallback to normal price if reseller/online is missing
        price = Number(batch?.[`price_${item.priceOption}`]) || Number(batch?.price_normal) || 0;
      }
      
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
            let price = 0;
            if (item.priceOption === 'custom') {
               price = Number(item.customPrice) || 0;
            } else {
               price = Number(batch?.[`price_${item.priceOption}`]) || Number(batch?.price_normal) || 0;
            }
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

  // FUNGSI LUNAS GRUP (Melunasi semua tagihan 1 orang sekaligus)
  const handleLunasGroup = async (items: any[], customerName: string) => {
    setLoading(true);
    try {
        // Melunasi semua baris pesanan milik orang ini ke database secara serentak
        await Promise.all(items.map(t => {
            const totalBill = t.qty * t.selling_price;
            return supabase.from('transactions')
                .update({ payment_status: 'lunas', amount_paid: totalBill })
                .eq('id', t.id);
        }));
        toast.success(`Semua tagihan ${customerName} berhasil dilunasi!`);
        fetchData();
    } catch (error) {
        toast.error('Gagal melunasi tagihan.');
    } finally {
        setLoading(false);
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

  // FUNGSI HAPUS SATU NOTA SEKALIGUS (SEMUA BARANG)
  const handleDeleteGroup = async (items: any[]) => {
    // Meminta konfirmasi agar tidak tidak sengaja terhapus
    if (!window.confirm("Yakin ingin menghapus SELURUH pesanan pada nota ini?")) return;
    
    // Kumpulkan semua ID barang yang ada di nota tersebut
    const ids = items.map(item => item.id);
    
    // Hapus massal di database Supabase
    const { error } = await supabase.from('transactions').delete().in('id', ids);
    
    if (!error) {
      toast.success("Seluruh nota berhasil dihapus!");
      fetchData();
    } else {
      toast.error("Gagal menghapus nota.");
    }
  };

  // TAMBAHKAN KODE INI TEPAT DI BAWAH FUNGSI DI ATAS:
  // BUKA POP-UP EDIT NAMA
  const handleEditGroupName = (items: any[], currentName: string) => {
    setEditNameData({ currentName, items });
    setNewCustomerName(currentName);
    setIsEditNameModalOpen(true);
  };

  // EKSEKUSI SIMPAN NAMA BARU KE DATABASE
  const submitNewGroupName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || newCustomerName.trim() === "" || newCustomerName === editNameData.currentName) {
        setIsEditNameModalOpen(false);
        return;
    }

    setLoading(true);
    try {
        await Promise.all(editNameData.items.map((t: any) => 
            supabase.from('transactions')
                .update({ customer_name: newCustomerName.trim() })
                .eq('id', t.id)
        ));
        toast.success(`Nama berhasil diganti menjadi ${newCustomerName.trim()}!`);
        fetchData();
    } catch (error) {
        console.error(error);
        toast.error("Gagal mengganti nama pelanggan.");
    } finally {
        setLoading(false);
        setIsEditNameModalOpen(false);
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
    setPhone('08');
    setItems([{ id: Date.now(), batchId: '', qty: '', priceOption: 'normal', customPrice: '' }]);
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

  // --- FUNGSI DOWNLOAD STRUK PNG (VERSI POP-UP PREVIEW ANTI HILANG LOGO) ---
  const handleDownloadReceipt = async () => {
    const node = document.getElementById('receipt-template');
    if (!node) return;

    setLoading(true);
    const idToast = toast.loading('Sedang menyiapkan logo & struk...');
    try {
      // 1. TRIK KHUSUS HP: Lakukan "foto bohongan" pertama kali untuk memancing logo agar ke-load (Pre-load)
      await htmlToImage.toPng(node, { cacheBust: true }); 
      
      // 2. Foto kedua (yang asli dan tajam)
      const dataUrl = await htmlToImage.toPng(node, { quality: 1, pixelRatio: 3, cacheBust: true });
      
      // 3. Simpan gambarnya dan munculkan pop-up
      setGeneratedImage(dataUrl);
      setShowImageModal(true);  // Buka layar gelap popup gambar
      setShowPrintModal(false); // Tutup layar settingan ongkir

      toast.success('Gambar struk siap disalin!', { id: idToast });
      
      // 4. Reset isian biaya tambahan
      setOngkir(0);
      setPackingFee(0);
      setCustomOngkir('');
    } catch (err) {
      console.error(err);
      toast.error('Gagal membuat gambar struk', { id: idToast });
    } finally {
      setLoading(false);
    }
  };

  // FUNGSI BUKA MODAL RESI
  const handleOpenResi = (group: any) => {
      setCurrentResi(group);
      
      // 1. Tarik no HP lama dari database
      let rawPhone = group.items[0]?.customer_phone || '08';
      
      // 2. KUNCI SAKTI: Ubah "628" jadi "08" otomatis untuk data lama!
      if (rawPhone.startsWith('62')) {
          rawPhone = '0' + rawPhone.slice(2); // Buang '62', ganti jadi '0'
      }

      // 3. Format otomatis tiap 4 angka ada strip
      let formattedPhone = rawPhone.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1-');

      setResiForm({
          ...resiForm,
          name: group.customer_name,
          phone: formattedPhone,
          detailAddress: '', city: '', district: '', subdistrict: '', postalCode: ''
      });
      setShowResiModal(true);
  };

  // FUNGSI DOWNLOAD RESI PNG (UKURAN THERMAL 80mm)
  const handleDownloadResiImage = async () => {
    const node = document.getElementById('shipping-label-template');
    if (!node) return;

    setLoading(true);
    const idToast = toast.loading('Mencetak resi pengiriman...');
    try {
      await htmlToImage.toPng(node, { cacheBust: true }); 
      const dataUrl = await htmlToImage.toPng(node, { quality: 1, pixelRatio: 3, cacheBust: true });
      
      setGeneratedImage(dataUrl);
      setShowImageModal(true);  
      setShowResiModal(false); 

      toast.success('Resi siap dicetak!', { id: idToast });
    } catch (err) {
      console.error(err);
      toast.error('Gagal membuat resi', { id: idToast });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="font-sans pb-48">
      <header className="bg-emerald-600 text-white p-5 pb-12 rounded-b-[40px] shadow-lg">
        <h1 className="text-xl font-bold tracking-tight">Catat Penjualan</h1>
        <p className="text-emerald-100 text-xs">Catat setiap kali ada yang beli</p>
      </header>

      <main className="p-5 space-y-6 -mt-6 relative z-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* --- 1. INFO PELANGGAN (SEAMLESS UI) --- */}
          {/* PERBAIKAN: Menghapus overflow-hidden dan menaikkan z-index menjadi 50 agar dropdown bebas menjuntai ke bawah */}
          <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 relative z-50">
            <div className="p-4 border-b border-slate-50 relative">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center">
                    Pelanggan
                </label>
                <input 
                    type="text" required autoComplete="off" value={name} 
                    onChange={(e) => { setName(e.target.value); setShowSuggestions(true); }} 
                    onFocus={() => setShowSuggestions(true)} 
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} 
                    placeholder="Ketik nama pembeli..."
                    className="w-full text-base font-bold outline-none text-slate-800 placeholder-slate-300 mt-1 bg-transparent" 
                />
                
                {/* Auto-complete pop-up */}
                {showSuggestions && filteredCustomers.length > 0 && (
                    <ul className="absolute left-0 top-full w-full mt-2 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-[20px] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] max-h-72 overflow-y-auto divide-y divide-slate-100 z-[100]">
                        {filteredCustomers.map((cust: any, idx: number) => (
                            <li 
                                key={idx} onMouseDown={(e) => e.preventDefault()} 
                                onClick={() => { setName(cust.customer_name); setPhone(cust.customer_phone || '08'); setShowSuggestions(false); }}
                                className="p-4 hover:bg-emerald-50 cursor-pointer transition flex justify-between items-center group active:bg-emerald-100"
                            >
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-800 group-hover:text-emerald-700">{cust.customer_name}</span>
                                    <span className="text-[10px] text-slate-400 font-medium font-mono">{cust.customer_phone || 'Tanpa WA'}</span>
                                </div>
                                <div className="bg-slate-100 group-hover:bg-emerald-100 p-1.5 rounded-lg transition flex items-center justify-center">
                                    <Plus className="w-3 h-3 text-slate-400 group-hover:text-emerald-600" />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            
            {/* PERBAIKAN: Menambahkan rounded-b-[24px] di sini untuk menggantikan efek overflow-hidden yang dibuang */}
            <div className="p-4 bg-slate-50/50 rounded-b-[24px]">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center">
                    No. WhatsApp
                </label>
                <input 
                    type="tel" required value={phone} 
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1-'))} 
                    className="w-full text-base font-bold outline-none text-slate-800 font-mono mt-1 bg-transparent" 
                />
            </div>
          </div>

          {/* --- 2. AREA PESANAN (CARD LIST & HORIZONTAL BUNDLE) --- */}
          <div>
            <div className="flex justify-between items-end mb-3 px-1">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Daftar Pesanan</h3>
            </div>

            {/* Quick Bundles (Swipeable) */}
            <div className="flex overflow-x-auto gap-2.5 pb-3 scrollbar-hide -mx-5 px-5 sm:mx-0 sm:px-0">
                {BUNDLES.map((bundle, i) => {
                    const hemat = bundle.name.includes("Cicip") ? "4rb" : bundle.name.includes("Keluarga") ? "10rb" : "14rb";
                    return (
                        <button 
                            key={i} type="button" onClick={() => handleApplyBundle(bundle.name)}
                            className="flex-none w-40 text-left bg-gradient-to-br from-white to-amber-50/30 border border-amber-100/50 p-3 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:border-amber-300 transition active:scale-95"
                        >
                            <span className="block text-[11px] font-black text-slate-800 leading-tight mb-1">{bundle.name.split(' (')[0]}</span>
                            <span className="block text-[9px] text-slate-500 font-medium mb-2">{bundle.name.match(/\(([^)]+)\)/)?.[1] || ''}</span>
                            <span className="inline-block text-[9px] bg-amber-100/50 px-2 py-0.5 rounded-md font-bold text-amber-700"> Hemat {hemat}</span>
                        </button>
                    );
                })}
            </div>

            {/* Product List (SEPARATED CARDS UI) */}
            <div className="space-y-4">
                {items.map((item, index) => {
                    const currentStock = item.batchId ? getRemainingStock(item.batchId) : 0;
                    const isQtyInvalid = item.batchId && Number(item.qty) > currentStock;
                    const selectedBatch = batches.find(b => b.id === item.batchId);

                    return (
                        <div key={item.id} className="p-4 bg-white rounded-[24px] shadow-sm border border-slate-200 relative group transition-all">
                            
                            {/* Header: Nomor Varian & Tombol Hapus */}
                            <div className="flex justify-between items-center mb-3">
                                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
                                    Varian {index + 1}
                                </span>
                                {items.length > 1 && (
                                    <button type="button" onClick={() => handleRemoveRow(item.id)} className="bg-rose-50 text-rose-500 p-1.5 rounded-full hover:bg-rose-500 hover:text-white transition active:scale-90">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Pilihan Produk (Dropdown Mencolok) */}
                            <div className="relative mb-1">
                                <select 
                                    required value={item.batchId} 
                                    onChange={(e) => updateItem(item.id, 'batchId', e.target.value)} 
                                    className={`w-full p-3.5 pr-10 rounded-xl font-bold text-sm outline-none appearance-none transition-all cursor-pointer ${
                                        item.batchId 
                                        ? 'bg-emerald-50/50 text-emerald-900 border border-emerald-200 shadow-sm' 
                                        : 'bg-slate-50 text-slate-600 border-2 border-slate-200 border-dashed hover:bg-slate-100 focus:border-emerald-400'
                                    }`}
                                >
                                    <option value="" disabled>👉 Ketuk untuk Pilih Produk...</option>
                                    {availableBatches.map(b => (
                                        <option 
                                            key={b.id} 
                                            value={b.id} 
                                            disabled={b.stock <= 0} // GABISA DIKLIK JIKA STOK 0 ATAU MINUS
                                        >
                                            {b.product_name} {b.stock <= 0 ? '- HABIS' : `(Sisa: ${b.stock})`}
                                        </option>
                                    ))}
                                </select>
                                {/* Ikon Panah Dropdown Kustom */}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <div className={`w-2.5 h-2.5 border-b-2 border-r-2 transform rotate-45 ${item.batchId ? 'border-emerald-600' : 'border-slate-400'}`}></div>
                                </div>
                            </div>

                            {/* Qty & Harga Ops (Muncul jika produk dipilih) */}
                            {item.batchId && (
                                <div className="mt-4 flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
                                    {/* Minimalist Stepper */}
                                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl h-11 w-28 shrink-0 p-1">
                                        <button type="button" onClick={() => updateItem(item.id, 'qty', String(Math.max(1, Number(item.qty || 0) - 1)))} className="w-8 h-full flex justify-center items-center text-slate-400 hover:text-slate-800 font-black text-lg active:scale-90">-</button>
                                        <input type="text" inputMode="numeric" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value.replace(/[^0-9]/g, ''))} className={`flex-1 w-full text-center bg-transparent font-black text-sm outline-none ${isQtyInvalid ? 'text-rose-500' : 'text-slate-800'}`} />
                                        <button type="button" onClick={() => updateItem(item.id, 'qty', String(Math.min(currentStock, Number(item.qty || 0) + 1)))} className="w-8 h-full flex justify-center items-center text-slate-400 hover:text-slate-800 font-black text-lg active:scale-90">+</button>
                                    </div>

                                    {/* Segmented Control untuk Harga */}
                                    <div className="flex-1 flex gap-1 bg-slate-50 p-1 rounded-xl overflow-x-auto scrollbar-hide border border-slate-200">
                                        {['normal', 'reseller', 'online', 'custom'].map((opt) => {
                                            // Sembunyikan jika harga 0 (kecuali normal & custom)
                                            if (opt === 'reseller' && !(selectedBatch?.price_reseller > 0)) return null;
                                            if (opt === 'online' && !(selectedBatch?.price_online > 0)) return null;
                                            
                                            const labels: any = { normal: 'Normal', reseller: 'Reseller', online: 'Online', custom: 'Manual' };
                                            const isSelected = item.priceOption === opt;
                                            
                                            return (
                                                <button 
                                                    key={opt} type="button" onClick={() => updateItem(item.id, 'priceOption', opt)}
                                                    className={`flex-1 py-1.5 px-2 text-[10px] font-bold rounded-lg transition-all ${isSelected ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    {labels[opt]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Input Harga Manual (Jika Custom) */}
                            {item.priceOption === 'custom' && (
                                <div className="mt-3 animate-in fade-in zoom-in-95 duration-200">
                                    <input type="number" required min="1" value={item.customPrice} onChange={(e) => updateItem(item.id, 'customPrice', e.target.value)} placeholder="Ketik Nominal (Rp)" className="w-full p-3 text-sm border border-emerald-200 bg-emerald-50/50 rounded-xl text-emerald-900 font-bold outline-none focus:border-emerald-500 placeholder-emerald-300" />
                                </div>
                            )}
                            
                            {isQtyInvalid && <p className="text-[9px] text-rose-500 font-bold mt-2 bg-rose-50 p-2 rounded-lg">⚠️ Melebihi batas! Sisa di freezer: {currentStock}</p>}
                        </div>
                    )
                })}
                
                {/* Tombol Tambah Varian yang TERPISAH dari kotak putih */}
                <button type="button" onClick={handleAddRow} className="w-full p-4 bg-emerald-50/80 text-emerald-600 border border-emerald-200 border-dashed rounded-[24px] font-black text-xs flex items-center justify-center hover:bg-emerald-100 transition active:scale-95 shadow-sm">
                    <Plus className="w-4 h-4 mr-1.5" /> TAMBAH VARIAN BARU
                </button>
            </div>
          </div>

          {/* --- 3. BENTO GRID PEMBAYARAN --- */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white p-4 rounded-[24px] shadow-sm border border-slate-100 flex flex-col">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Status Pembayaran</label>
                <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                    <button type="button" onClick={() => setPaymentStatus('lunas')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${paymentStatus === 'lunas' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Lunas</button>
                    <button type="button" onClick={() => setPaymentStatus('belum_lunas')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${paymentStatus === 'belum_lunas' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Kasbon</button>
                </div>
                {paymentStatus === 'belum_lunas' && (
                    <div className="mt-3 animate-in fade-in zoom-in-95 duration-200 bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                        <label className="block text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1.5">Uang Yang Baru Dibayar (DP)</label>
                        <input type="number" required value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="Ketik Nominal DP..." className="w-full p-2.5 border border-rose-200 rounded-lg bg-white text-rose-900 text-xs font-bold outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100" />
                    </div>
                )}
             </div>

             <div className="flex flex-col gap-3">
                <div className="bg-white p-3.5 rounded-[24px] shadow-sm border border-slate-100 flex-1 flex flex-col justify-center">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Konsumen Datang</label>
                    <div className="relative bg-slate-50 border border-slate-200 rounded-xl group hover:border-emerald-300 transition cursor-pointer">
                        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-transparent p-2.5 pr-8 text-slate-800 text-xs font-bold outline-none appearance-none cursor-pointer relative z-10">
                            <option value="organik">WA / Datang</option>
                            <option value="marketplace">Marketplace</option>
                            <option value="meta_ads">Meta Ads</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-0">
                            <div className="w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-500 transform rotate-45 group-hover:border-emerald-600 transition"></div>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-3.5 rounded-[24px] shadow-sm border border-slate-100 flex-1 flex flex-col justify-center">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Pembayaran Via</label>
                    <div className="relative bg-slate-50 border border-slate-200 rounded-xl group hover:border-emerald-300 transition cursor-pointer">
                        <select value={account} onChange={(e) => setAccount(e.target.value)} className="w-full bg-transparent p-2.5 pr-8 text-slate-800 text-xs font-bold outline-none appearance-none cursor-pointer relative z-10">
                            <option value="Tunai (Laci)">Uang Tunai</option>
                            <option value="Rekening Bank">Tf Rekening</option>
                            <option value="E-Wallet">E-Wallet (QR)</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none z-0">
                            <div className="w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-500 transform rotate-45 group-hover:border-emerald-600 transition"></div>
                        </div>
                    </div>
                </div>
             </div>
          </div>

          {/* --- 4. STICKY BOTTOM ACTION BAR (FIXED CUT-OFF) --- */}
          {/* bottom-16 digunakan agar bar ini mengambang di ATAS BottomNav utama */}
          <div className="fixed bottom-[84px] left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-10px_25px_rgba(0,0,0,0.05)]">
            <div className="max-w-md mx-auto p-4 flex justify-between items-center">
                <div className="flex flex-col">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Total Tagihan</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1 leading-none">
                        {formatIDR(grandTotal)}
                    </p>
                </div>
                <button 
                    type="submit" 
                    disabled={loading} 
                    className={`px-8 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center shadow-lg active:scale-95 ${
                        loading 
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed' 
                        : 'bg-slate-900 text-white shadow-slate-900/20 hover:bg-slate-800'
                    }`}
                >
                    {loading ? 'MEMPROSES...' : (editingId ? 'UPDATE' : 'SIMPAN')}
                </button>
            </div>
        </div>

        </form>

        {/* REKAP PIUTANG (GROUPED BY CUSTOMER) */}
        <section className="mt-8">
          <h3 className="font-black text-rose-600 mb-3 flex items-center text-sm uppercase tracking-wide px-1">
              <AlertCircle className="w-4 h-4 mr-1.5" /> Tagihan Belum Lunas
          </h3>
          <div className="space-y-3">
            {(() => {
                // LOGIKA CERDAS: Menggabungkan tagihan yang namanya sama
                const groupedPiutang = Object.values(piutangList.reduce((acc: any, t) => {
                    const key = t.customer_name.trim().toLowerCase(); // Disamakan huruf kecilnya
                    if (!acc[key]) {
                        acc[key] = { name: t.customer_name, phone: t.customer_phone, items: [], totalSisa: 0 };
                    }
                    const totalBill = t.qty * t.selling_price;
                    const sisa = totalBill - t.amount_paid;
                    
                    acc[key].items.push({ ...t, sisa });
                    acc[key].totalSisa += sisa;
                    return acc;
                }, {}));

                if (groupedPiutang.length === 0) {
                    return <p className="text-[11px] font-bold text-slate-400 text-center bg-white/50 py-6 rounded-[24px] border border-slate-100 border-dashed">Wah, hebat! Tidak ada satupun pelanggan yang berhutang. 🎉</p>;
                }

                // TAMPILAN KOTAK GROUP
                return groupedPiutang.map((group: any, index: number) => (
                    <div key={index} className="p-4 bg-white border border-rose-100 rounded-[24px] shadow-[0_4px_15px_-5px_rgba(244,63,94,0.05)] relative overflow-hidden">
                      {/* Aksen Merah di Kiri */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-400 rounded-l-[24px]"></div>
                      
                      <div className="flex justify-between items-start mb-3 pl-2">
                        <div>
                          <p className="font-black text-slate-800 text-sm leading-none">{group.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono font-bold mt-1.5">{group.phone || 'Tanpa WA'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-rose-400 font-black uppercase tracking-widest mb-0.5">Total Kekurangan</p>
                          <p className="text-base font-black text-rose-600 leading-none">{formatIDR(group.totalSisa)}</p>
                        </div>
                      </div>

                      {/* Rincian per item belanjaan */}
                      <div className="bg-rose-50/50 rounded-xl p-3 mb-3 space-y-2 border border-rose-50 ml-2">
                          {group.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-start text-[10px]">
                                  <div className="flex gap-1.5">
                                      <span className="font-black text-slate-700">{item.qty}x</span>
                                      <span className="font-bold text-slate-500 leading-snug">{item.product_name}</span>
                                  </div>
                                  <span className="text-rose-500 font-black ml-2 whitespace-nowrap">{formatIDR(item.sisa)}</span>
                              </div>
                          ))}
                      </div>

                      <button onClick={() => handleLunasGroup(group.items, group.name)} className="w-full ml-1 bg-emerald-50 text-emerald-600 py-3 rounded-xl text-[11px] font-black flex items-center justify-center hover:bg-emerald-100 transition active:scale-95 border border-emerald-100">
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> LUNASI SEMUA TAGIHAN {group.name.split(' ')[0].toUpperCase()}
                      </button>
                    </div>
                ));
            })()}
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

          <div className="space-y-4">
            {(() => {
                // LOGIKA PENGELOMPOKAN (GROUP BY WAKTU INPUT / 1 KALI SIMPAN)
                const groupedHistory = Object.values(filteredTransactions.reduce((acc: any, t) => {
                    const key = t.created_at; // Jadikan waktu klik "Simpan" sebagai kunci grouping
                    if (!acc[key]) {
                        acc[key] = {
                            key: t.created_at,
                            customer_name: t.customer_name,
                            total: 0,
                            items: []
                        };
                    }
                    acc[key].items.push(t);
                    acc[key].total += (t.qty * t.selling_price);
                    return acc;
                }, {})).sort((a: any, b: any) => new Date(b.key).getTime() - new Date(a.key).getTime());

                if (groupedHistory.length === 0) {
                    return <div className="p-6 bg-slate-50 border border-slate-100 rounded-[24px] text-center"><p className="text-xs text-slate-400 font-bold">Belum ada riwayat transaksi bulan ini.</p></div>;
                }

                return groupedHistory.map((group: any) => (
                    <div key={group.key} className="p-4 bg-white border border-slate-100 rounded-[24px] shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] relative overflow-hidden">
                        
                        {/* GANTI MENJADI SEPERTI INI: */}
                        {/* Header Nota */}
                        <div className="flex justify-between items-start mb-3 pb-3 border-b border-slate-100">
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-black text-slate-800">{group.customer_name}</p>
                                    {/* Tombol Pensil untuk Edit Nama */}
                                    <button 
                                        type="button"
                                        onClick={() => handleEditGroupName(group.items, group.customer_name)}
                                        className="text-slate-400 hover:text-emerald-600 bg-slate-100 hover:bg-emerald-50 p-1.5 rounded-lg transition-all active:scale-95"
                                        title="Ganti Nama Pelanggan"
                                    >
                                        <Edit3 className="w-3 h-3" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold mt-0.5 font-mono mb-2.5">
                                    {new Date(group.key).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • {new Date(group.key).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                </p>
                                
                                {/* Tombol Jejer (Cetak, Resi & Hapus Semua) */}
                                <div className="flex flex-wrap gap-2">
                                    <button 
                                        onClick={() => { setCurrentReceipt(group); setShowPrintModal(true); }}
                                        className="flex items-center text-[9px] font-black bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg shadow-sm active:scale-95 hover:bg-emerald-100 transition border border-emerald-100"
                                    >
                                        <Printer className="w-3 h-3 mr-1" /> STRUK
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleOpenResi(group)}
                                        className="flex items-center text-[9px] font-black bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded-lg shadow-sm active:scale-95 hover:bg-indigo-100 transition border border-indigo-100"
                                    >
                                        <Truck className="w-3 h-3 mr-1" /> RESI
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteGroup(group.items)}
                                        className="flex items-center text-[9px] font-black bg-rose-50 text-rose-600 px-2.5 py-1.5 rounded-lg shadow-sm active:scale-95 hover:bg-rose-100 transition border border-rose-100"
                                    >
                                        <Trash2 className="w-3 h-3 mr-1" /> HAPUS SEMUA
                                    </button>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Belanja</p>
                                <p className="text-base font-black text-emerald-600 leading-none">{formatIDR(group.total)}</p>
                            </div>
                        </div>

                        {/* Rincian Barang di dalam Nota */}
                        <div className="space-y-2">
                            {group.items.map((t: any) => (
                                <div key={t.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100/50 group/item transition-all hover:bg-slate-100/80">
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-slate-700 leading-snug">{t.qty}x {t.product_name}</p>
                                        <p className="text-[10px] font-black text-emerald-600/70 mt-0.5">{formatIDR(t.qty * t.selling_price)}</p>
                                    </div>
                                    <div className="flex space-x-1.5 ml-2">
                                        <button onClick={() => handleEdit(t)} className="text-[10px] font-bold text-blue-600 bg-blue-50/80 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition border border-blue-100/50">
                                            Edit
                                        </button>
                                        <button onClick={() => handleDelete(t.id)} className="text-[10px] font-bold text-rose-600 bg-rose-50/80 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition border border-rose-100/50">
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                    </div>
                ));
            })()}
          </div>
        </section>
        {/* --- MODAL INPUT BIAYA & DESAIN STRUK TERSEMBUNYI --- */}
        {showPrintModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-black text-slate-800 text-lg">Biaya Tambahan</h2>
                <button onClick={() => setShowPrintModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-rose-100 hover:text-rose-600 transition"><X className="w-4 h-4"/></button>
              </div>

              <div className="space-y-4">
                {/* Pilihan Ongkir */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Biaya Ongkir</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[0, 9000].map(val => (
                      <button key={val} onClick={() => {setOngkir(val); setCustomOngkir('')}} className={`py-2 text-xs font-bold rounded-xl border transition ${ongkir === val && !customOngkir ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        {val === 0 ? 'Gratis' : '9 Ribu'}
                      </button>
                    ))}
                    <button onClick={() => setOngkir(-1)} className={`py-2 text-xs font-bold rounded-xl border transition ${ongkir === -1 || customOngkir ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Manual</button>
                  </div>
                  {(ongkir === -1 || customOngkir !== '') && (
                    <div className="animate-in fade-in zoom-in-95">
                       <input type="number" value={customOngkir} onChange={(e) => setCustomOngkir(e.target.value)} placeholder="Ketik nominal ongkir (Rp)..." className="w-full p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-900 outline-none focus:border-emerald-500 placeholder-emerald-300" />
                    </div>
                  )}
                </div>

                {/* Packing Fee */}
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Biaya Packing (Opsional)</label>
                  <input type="number" value={packingFee || ''} onChange={(e) => setPackingFee(Number(e.target.value))} placeholder="Ketik nominal packing (Rp)..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-emerald-500 placeholder-slate-300" />
                </div>

                <button onClick={handleDownloadReceipt} disabled={loading} className="w-full mt-4 bg-slate-900 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center shadow-lg active:scale-95 transition hover:bg-slate-800">
                  <Download className="w-4 h-4 mr-2" /> {loading ? 'MEMPROSES...' : 'DOWNLOAD STRUK PNG'}
                </button>
              </div>
            </div>

            {/* TEMPLATE STRUK (KITA SEMBUNYIKAN DI LUAR LAYAR) */}
            {/* Template ini yang akan 'difoto' oleh sistem menjadi PNG */}
            <div className="fixed left-[-9999px] top-0">
              <div id="receipt-template" className="bg-white w-[420px] p-8" style={{ fontFamily: 'sans-serif' }}>
                
                {/* Header Struk & Logo */}
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-3">
                    <img 
                      src="/logo-umiwa.jpg" 
                      alt="Logo Pempek Umiwa" 
                      loading="eager" 
                      decoding="sync" 
                      crossOrigin="anonymous"
                      className="w-24 h-24 rounded-full border-[3px] border-emerald-100 object-cover" 
                    />
                  </div>
                  <h1 className="text-3xl font-black text-emerald-700 tracking-tighter mb-0.5">PEMPEK UMIWA</h1>
                  <p className="text-[10px] font-bold text-emerald-600 tracking-widest uppercase mb-2">Frozen Food Pempek Asli Ikan Tenggiri 100%</p>
                  
                  {/* Alamat Tanpa Kotak (Langsung di atas background putih) */}
                  <p className="text-[9px] font-bold text-slate-400 leading-relaxed max-w-[300px] mx-auto uppercase tracking-tight">
                    Jl Warga Bakti No.18, RT.02, RW.11, Kel. Leuwigajah, Kec. Cimahi Selatan, Kota Cimahi, 40532
                  </p>
                </div>

                {/* Info Pelanggan & Waktu Transaksi */}
                <div className="bg-slate-50 rounded-xl p-3.5 mb-6 border border-slate-100 flex justify-between items-center">
                    <div className="text-left flex-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pelanggan</p>
                        <p className="text-[13px] font-black text-emerald-700 uppercase truncate leading-tight pr-2">
                            {currentReceipt?.customer_name || currentReceipt?.items?.[0]?.customer_name || 'Hamba Allah'}
                        </p>
                    </div>
                    <div className="text-right border-l border-slate-200 pl-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Waktu Transaksi</p>
                        <p className="text-[10px] font-bold text-slate-700">
                            {new Date(currentReceipt?.items?.[0]?.created_at || currentReceipt?.key).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[9px] font-bold text-slate-500 mt-0.5">
                            {new Date(currentReceipt?.items?.[0]?.created_at || currentReceipt?.key).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </p>
                    </div>
                </div>

                {/* Daftar Belanjaan */}
                <div className="mb-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2 mb-3">Pesanan</p>
                  <div className="space-y-4">
                    {currentReceipt?.items.map((t: any, i: number) => (
                      <div key={i} className="flex justify-between items-start">
                        <div className="max-w-[240px]">
                          <p className="text-[13px] font-black text-slate-800 leading-snug">{t.product_name}</p>
                          <p className="text-[11px] font-bold text-slate-500 mt-0.5">{t.qty} x {formatIDR(t.selling_price)}</p>
                        </div>
                        <p className="text-sm font-black text-slate-800 mt-0.5">{formatIDR(t.qty * t.selling_price)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rincian Biaya & Total */}
                <div className="border-t-[2px] border-dashed border-slate-200 pt-4 space-y-2.5">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>Subtotal Belanja</span>
                    <span>{formatIDR(currentReceipt?.total || 0)}</span>
                  </div>
                  {(Number(customOngkir) > 0 || ongkir > 0) && (
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>Ongkos Kirim</span>
                      <span>{formatIDR(Number(customOngkir) || (ongkir === -1 ? 0 : ongkir))}</span>
                    </div>
                  )}
                  {packingFee > 0 && (
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>Biaya Packing Tambahan</span>
                      <span>{formatIDR(packingFee)}</span>
                    </div>
                  )}
                  
                  {/* Grand Total */}
                  <div className="flex justify-between items-end pt-3 mt-3 border-t-[3px] border-emerald-600">
                    <span className="text-[11px] font-black text-emerald-800 uppercase tracking-widest mb-1">Total Tagihan</span>
                    <span className="text-2xl font-black text-emerald-600 tracking-tight">
                        {formatIDR((currentReceipt?.total || 0) + (Number(customOngkir) || (ongkir === -1 ? 0 : ongkir)) + packingFee)}
                    </span>
                  </div>
                </div>

                {/* Footer Pesan Manis */}
                <div className="text-center mt-10 pt-6 border-t border-slate-100">
                  <p className="text-xs font-black text-emerald-600 mb-1.5 italic">"Terima kasih sudah berbelanja!"</p>
                  <p className="text-[9px] font-bold text-slate-400 tracking-widest">Instagram: @pempekumiwa</p>
                  <p className="text-[9px] font-bold text-slate-400 tracking-widest">Whatsapp: 0877-8847-2837</p>
                </div>
                
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL PREVIEW GAMBAR STRUK (TAMPIL FULL SCREEN DI HP/WEB) */}
        {/* ========================================================= */}
        {showImageModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-5 animate-in fade-in duration-300">
            <div className="relative w-full max-w-sm flex flex-col items-center">

              {/* Tombol Silang Buat Tutup (Pojok Kanan Atas) */}
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute -top-12 right-0 bg-white/20 text-white p-2.5 rounded-full hover:bg-white/40 transition-colors active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Hasil Gambar Struknya */}
              <div className="bg-white p-2 rounded-[24px] shadow-[0_0_40px_rgba(0,0,0,0.5)] mb-6 w-full flex justify-center border border-slate-200/20">
                <img
                  src={generatedImage}
                  alt="Struk Pempek Umiwa"
                  className="max-h-[60vh] w-auto rounded-[16px] object-contain"
                />
              </div>

              {/* Teks Arahan Untuk User (Warna Hijau) */}
              <div className="text-center w-full">
                <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-3xl p-5 inline-block w-full backdrop-blur-sm">
                   <p className="text-white text-sm font-black flex items-center justify-center mb-2.5 tracking-wide">
                     <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-2" />
                     STRUK SIAP DIKIRIM
                   </p>
                   <p className="text-slate-300 text-[11px] leading-relaxed font-medium">
                     <b className="text-emerald-300 text-xs">Tekan & Tahan</b> (Long Press) pada gambar struk di atas.<br/><br/>
                     Lalu pilih <b className="text-white">"Copy Image"</b> atau <b className="text-white">"Download Image"</b> untuk di-paste langsung ke chat pelanggan.
                   </p>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* --- MODAL POP-UP GANTI NAMA (PASTE DI SINI, DI ATAS </main>) --- */}
        {isEditNameModalOpen && (
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="font-black text-slate-800 text-lg">Ganti Nama Pelanggan</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Ubah nama dari <span className="font-bold text-rose-500">"{editNameData.currentName}"</span>
                        </p>
                    </div>
                    
                    <form onSubmit={submitNewGroupName} className="p-5 space-y-5">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                Nama Baru
                            </label>
                            <input 
                                type="text" 
                                autoFocus
                                required
                                value={newCustomerName}
                                onChange={(e) => setNewCustomerName(e.target.value)}
                                placeholder="Ketik nama baru di sini..."
                                className="w-full p-3.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-bold text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all"
                            />
                        </div>
                        
                        <div className="flex gap-3 pt-2">
                            <button 
                                type="button" 
                                onClick={() => setIsEditNameModalOpen(false)}
                                className="flex-1 p-3.5 text-slate-500 bg-slate-100 font-bold text-xs rounded-xl hover:bg-slate-200 transition active:scale-95"
                            >
                                BATAL
                            </button>
                            <button 
                                type="submit" 
                                disabled={loading}
                                className={`flex-1 p-3.5 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95 ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30'}`}
                            >
                                {loading ? 'MENYIMPAN...' : 'SIMPAN NAMA'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        {/* ========================================================= */}
        {/* MODAL INPUT RESI PENGIRIMAN & TEMPLATE THERMAL 80mm */}
        {/* ========================================================= */}
        {showResiModal && (
          <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[32px] p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto scrollbar-hide">
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 py-2 border-b border-slate-100">
                <div>
                  <h2 className="font-black text-slate-800 text-lg flex items-center"><Package className="w-5 h-5 mr-2 text-indigo-500"/> Data Pengiriman</h2>
                  <p className="text-[10px] text-slate-500 font-bold mt-1">Lengkapi alamat penerima</p>
                </div>
                <button onClick={() => setShowResiModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-rose-100 hover:text-rose-600 transition"><X className="w-4 h-4"/></button>
              </div>

              <div className="space-y-4">
                {/* Ekspedisi & Nama */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">Ekspedisi</label>
                        <select value={resiForm.courier} onChange={e => setResiForm({...resiForm, courier: e.target.value, customCourier: ''})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none mb-2">
                            <option value="AHSAN XPRESS">Ahsan Xpress</option>
                            <option value="PAXEL">Paxel</option>
                            <option value="GOSEND">GoSend</option>
                            <option value="KURIR UMIWA">Kurir Pempek Umiwa</option>
                            <option value="MANUAL">Lainnya (Manual)</option>
                        </select>
                        {resiForm.courier === 'MANUAL' && (
                            <input type="text" autoFocus value={resiForm.customCourier} onChange={e => setResiForm({...resiForm, customCourier: e.target.value})} placeholder="Ketik nama ekspedisi..." className="w-full p-3 bg-white border border-indigo-300 rounded-xl text-xs font-bold outline-none" />
                        )}
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">No. HP Penerima</label>
                        <input type="tel" value={resiForm.phone} onChange={e => setResiForm({...resiForm, phone: e.target.value.replace(/\D/g, '').replace(/(\d{4})(?=\d)/g, '$1-')})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none" />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">Nama Penerima</label>
                    <input type="text" value={resiForm.name} onChange={e => setResiForm({...resiForm, name: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" />
                </div>

                {/* Dropdown Alamat Pintar + Opsi Manual */}
                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-3">
                    <div>
                        <label className="text-[10px] font-black text-indigo-400 uppercase block mb-1.5">Kota / Kabupaten</label>
                        <select value={isManualAddress ? 'MANUAL' : resiForm.city} onChange={e => {
                            if (e.target.value === 'MANUAL') {
                                setIsManualAddress(true);
                                setResiForm({...resiForm, city: '', district: '', subdistrict: '', postalCode: ''});
                            } else {
                                setIsManualAddress(false);
                                setResiForm({...resiForm, city: e.target.value, district: '', subdistrict: '', postalCode: ''});
                            }
                        }} className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400">
                            <option value="" disabled>-- Pilih Kota --</option>
                            {Object.keys(ADDRESS_DATA).map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="MANUAL" className="font-black text-indigo-600">✍️ Ketik Manual (Luar Kota)</option>
                        </select>
                    </div>

                    {/* JIKA MODE MANUAL AKTIF */}
                    {isManualAddress && (
                        <div className="space-y-3 animate-in fade-in">
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" value={resiForm.city} onChange={e => setResiForm({...resiForm, city: e.target.value})} placeholder="Nama Kota/Kab" className="w-full p-3 bg-white border border-indigo-300 rounded-xl text-xs font-bold outline-none" />
                                <input type="text" value={resiForm.district} onChange={e => setResiForm({...resiForm, district: e.target.value})} placeholder="Kecamatan" className="w-full p-3 bg-white border border-indigo-300 rounded-xl text-xs font-bold outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" value={resiForm.subdistrict} onChange={e => setResiForm({...resiForm, subdistrict: e.target.value})} placeholder="Kelurahan / Desa" className="w-full p-3 bg-white border border-indigo-300 rounded-xl text-xs font-bold outline-none" />
                                <input type="text" value={resiForm.postalCode} onChange={e => setResiForm({...resiForm, postalCode: e.target.value})} placeholder="Kode Pos" className="w-full p-3 bg-white border border-indigo-300 rounded-xl text-xs font-bold outline-none" />
                            </div>
                        </div>
                    )}
                    
                    {/* JIKA MODE DROPDOWN (TIDAK MANUAL) */}
                    {!isManualAddress && resiForm.city && (
                        <div>
                            <label className="text-[10px] font-black text-indigo-400 uppercase block mb-1.5">Kecamatan</label>
                            <select value={resiForm.district} onChange={e => setResiForm({...resiForm, district: e.target.value, subdistrict: '', postalCode: ''})} className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none">
                                <option value="">-- Pilih Kecamatan --</option>
                                {Object.keys(ADDRESS_DATA[resiForm.city]).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    )}

                    {!isManualAddress && resiForm.district && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black text-indigo-400 uppercase block mb-1.5">Kelurahan</label>
                                <select value={resiForm.subdistrict} onChange={e => {
                                    const zip = ADDRESS_DATA[resiForm.city][resiForm.district][e.target.value];
                                    setResiForm({...resiForm, subdistrict: e.target.value, postalCode: zip});
                                }} className="w-full p-3 bg-white border border-indigo-200 rounded-xl text-xs font-bold outline-none">
                                    <option value="">-- Kelurahan --</option>
                                    {Object.keys(ADDRESS_DATA[resiForm.city][resiForm.district]).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-indigo-400 uppercase block mb-1.5">Kode Pos</label>
                                <input type="text" readOnly value={resiForm.postalCode} placeholder="Auto" className="w-full p-3 bg-slate-100 border border-indigo-200 rounded-xl text-xs font-bold text-slate-500 outline-none" />
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5">Detail Jalan / Patokan</label>
                    <textarea rows={3} value={resiForm.detailAddress} onChange={e => setResiForm({...resiForm, detailAddress: e.target.value})} placeholder="Contoh: Jl. Merdeka No 10, rumah pagar hitam..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none resize-none"></textarea>
                </div>

                <button onClick={handleDownloadResiImage} disabled={loading} className="w-full mt-4 bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center shadow-lg shadow-indigo-500/30 active:scale-95 transition hover:bg-indigo-700">
                  <Printer className="w-4 h-4 mr-2" /> {loading ? 'MENYIAPKAN...' : 'CETAK RESI THERMAL (80mm)'}
                </button>
              </div>
            </div>

            {/* TEMPLATE RAHASIA THERMAL 80mm */}
            <div className="fixed left-[-9999px] top-0">
              <div id="shipping-label-template" className="bg-white w-[302px] p-0 text-black border border-black" style={{ fontFamily: 'Arial, sans-serif' }}>
                
                {/* Header Ekspedisi */}
                <div className="border-b-[2px] border-black p-2 text-center bg-black text-white">
                    <h1 className="text-lg font-black tracking-widest uppercase">
                        {resiForm.courier === 'MANUAL' ? resiForm.customCourier : resiForm.courier}
                    </h1>
                </div>

                {/* ID Transaksi */}
                <div className="p-1.5 border-b-[2px] border-black text-center bg-gray-100">
                    <p className="text-[11px] font-bold tracking-[0.2em] uppercase">{currentResi?.key ? `UMW-${new Date(currentResi.key).getTime()}` : 'UMW-000000000'}</p>
                </div>

                {/* PENERIMA (SPASI DIRAPIKAN, ALAMAT DIBESARKAN) */}
                <div className="p-3 border-b-[2px] border-black">
                    <div className="flex items-start mb-0.5">
                        <span className="bg-black text-white text-[10px] font-bold px-2 py-1 mr-2 rounded-sm mt-0.5">KE</span>
                        <h2 className="text-xl font-black uppercase leading-tight tracking-tight">{resiForm.name}</h2>
                    </div>
                    <p className="text-sm font-black ml-9">{resiForm.phone}</p>
                    
                    {/* Alamat Penerima naik jadi text-sm, spasi otomatis hilang kalau patokan kosong */}
                    <p className="text-sm font-bold leading-snug ml-9 uppercase mt-1">
                        {resiForm.detailAddress && <>{resiForm.detailAddress}<br/></>}
                        Kel. {resiForm.subdistrict || '-'}, Kec. {resiForm.district || '-'}<br/>
                        {resiForm.city || 'Kota -'} - {resiForm.postalCode || ''}
                    </p>
                </div>

                {/* PENGIRIM (SPASI DIRAPIKAN, ALAMAT DIBESARKAN) */}
                <div className="p-3 border-b-[2px] border-black flex items-start">
                    <span className="border border-black text-black text-[10px] font-bold px-2 py-1 mr-2 mt-0.5">DARI</span>
                    <div>
                        <h2 className="text-sm font-black uppercase leading-tight">Pempek Umiwa (0877-8847-2837)</h2>
                        {/* Alamat Pengirim naik jadi text-xs dan jarak atasnya ditipiskan */}
                        <p className="text-xs font-bold leading-tight mt-0.5">
                            Jl. Warga Bakti No. 18, RT.02/RW.11<br/>
                            Kel. Leuwigajah, Kec. Cimahi Selatan, Kota Cimahi 40532
                        </p>
                    </div>
                </div>

                {/* DAFTAR PRODUK */}
                <div className="p-3 border-b-[2px] border-black">
                    <h3 className="text-xs font-black uppercase border-b border-black border-dashed pb-1 mb-2">Isi Paket (Frozen Food)</h3>
                    <ul className="space-y-1.5">
                        {currentResi?.items.map((item: any, idx: number) => (
                            <li key={idx} className="text-xs font-bold flex justify-between">
                                <span className="flex-1 pr-2 truncate uppercase">{item.product_name}</span>
                                <span>{item.qty} Pcs</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* FOOTER */}
                <div className="p-4 text-center">
                    <div className="border-2 border-black p-2.5 mb-4">
                        <p className="text-sm font-black uppercase tracking-widest">⚠️ FROZEN FOOD ⚠️</p>
                    </div>
                    <div className="flex justify-center items-center gap-2.5">
                        <img src="/logo-umiwa.jpg" className="w-10 h-10 rounded-full grayscale contrast-200 border-[1.5px] border-black" alt="Logo"/>
                        <p className="text-[10px] font-bold uppercase tracking-widest">Pempek Umiwa</p>
                    </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}