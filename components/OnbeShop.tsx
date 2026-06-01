import React, { useState, useEffect, useMemo } from 'react';
import { AppEvent, OnbeDay, ShopProduct, ShopSale } from '../types';
import { 
  getShopProducts, 
  saveShopProduct, 
  deleteShopProduct, 
  getShopSales, 
  saveShopSale, 
  deleteShopSale,
  generateId 
} from '../services/storageService';
import { 
  ShoppingBag, 
  Package, 
  History, 
  Plus, 
  Trash2, 
  Tag, 
  TrendingUp, 
  Gift, 
  DollarSign, 
  ArrowLeft, 
  Users, 
  Search, 
  Edit2, 
  X, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { Button } from './Button';

interface OnbeShopProps {
  onBack: () => void;
  events?: AppEvent[];
  onbeDays?: OnbeDay[];
}

export const OnbeShop: React.FC<OnbeShopProps> = ({ onBack, events = [], onbeDays = [] }) => {
  const [activeTab, setActiveTab] = useState<'sell' | 'inventory' | 'history'>('sell');
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [sales, setSales] = useState<ShopSale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State for Adding / Editing Product
  const [isEditingProduct, setIsEditingProduct] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    quantity: '',
    costPrice: '',
    sellingPrice: ''
  });

  // Form State for Recording Sale
  const [saleForm, setSaleForm] = useState({
    productId: '',
    quantity: '1',
    buyerName: '',
    isGift: false,
    customPrice: '',
    priceType: 'standard' as 'standard' | 'custom' | 'gift'
  });

  // Filters for History and Inventory
  const [historySearch, setHistorySearch] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [filterGift, setFilterGift] = useState<'all' | 'gift' | 'paid'>('all');

  // Buyer Suggesions list based on names from AppEvent/OnbeDay attendees
  const buyerSuggestions = useMemo(() => {
    const names = new Set<string>();
    
    events.forEach(e => {
      (e.attendees || []).forEach(a => { if (a.name) names.add(a.name); });
      (e.waitingList || []).forEach(a => { if (a.name) names.add(a.name); });
    });

    onbeDays.forEach(od => {
      (od.attendees || []).forEach(a => { if (a.name) names.add(a.name); });
      (od.waitingList || []).forEach(a => { if (a.name) names.add(a.name); });
    });

    return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [events, onbeDays]);

  const [buyerInputSearch, setBuyerInputSearch] = useState('');
  const [showBuyerSuggestions, setShowBuyerSuggestions] = useState(false);

  useEffect(() => {
    loadShopData();
  }, []);

  const loadShopData = async () => {
    setIsLoading(true);
    try {
      const [prodsData, salesData] = await Promise.all([
        getShopProducts(),
        getShopSales()
      ]);
      setProducts(prodsData.sort((a,b) => a.name.localeCompare(b.name)));
      setSales(salesData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (e) {
      console.error("Error loading shop data", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Profit/Inventory Stats
  const stats = useMemo(() => {
    let totInventoryCostVal = 0;
    let totInventorySellVal = 0;
    let totItemsCount = 0;

    products.forEach(p => {
      totItemsCount += p.quantity;
      totInventoryCostVal += p.quantity * p.costPrice;
      totInventorySellVal += p.quantity * p.sellingPrice;
    });

    let totalRevenue = 0;
    let totalProfit = 0;
    let giftItemsSold = 0;

    sales.forEach(s => {
      totalRevenue += s.soldPrice * s.quantity;
      
      // Profit Margin: (soldPrice - productCostPrice) * soldQuantity
      const matchingProduct = products.find(p => p.id === s.productId);
      const costPriceUsed = matchingProduct ? matchingProduct.costPrice : 0;
      totalProfit += (s.soldPrice - costPriceUsed) * s.quantity;
      
      if (s.isGift) {
        giftItemsSold += s.quantity;
      }
    });

    return {
      totInventoryCostVal,
      totInventorySellVal,
      totItemsCount,
      totalRevenue,
      totalProfit,
      giftItemsSold,
      totalSalesCount: sales.reduce((acc, s) => acc + s.quantity, 0)
    };
  }, [products, sales]);

  // Handle Save (Create / Update) Product
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name || !productForm.quantity || !productForm.costPrice || !productForm.sellingPrice) {
      alert("Si prega di compilare tutti i campi.");
      return;
    }

    const qty = parseInt(productForm.quantity, 10);
    const cost = parseFloat(productForm.costPrice);
    const sell = parseFloat(productForm.sellingPrice);

    if (isNaN(qty) || qty < 0) {
      alert("La quantità deve essere un numero valido maggiore o uguale a 0.");
      return;
    }
    if (isNaN(cost) || cost < 0 || isNaN(sell) || sell < 0) {
      alert("I prezzi devono essere numeri coordinati maggiori o uguali a 0.");
      return;
    }

    const pid = isEditingProduct || generateId();
    const productData: ShopProduct = {
      id: pid,
      name: productForm.name.trim(),
      quantity: qty,
      costPrice: cost,
      sellingPrice: sell,
      createdAt: isEditingProduct 
        ? (products.find(p => p.id === isEditingProduct)?.createdAt || new Date().toISOString())
        : new Date().toISOString()
    };

    try {
      await saveShopProduct(productData);
      setIsEditingProduct(null);
      setProductForm({ name: '', quantity: '', costPrice: '', sellingPrice: '' });
      await loadShopData();
    } catch (err) {
      console.error("Failed to save product", err);
    }
  };

  const handleEditProductClick = (product: ShopProduct) => {
    setIsEditingProduct(product.id);
    setProductForm({
      name: product.name,
      quantity: product.quantity.toString(),
      costPrice: product.costPrice.toString(),
      sellingPrice: product.sellingPrice.toString()
    });
  };

  const handleDeleteProductClick = async (id: string, name: string) => {
    if (!confirm(`Sei sicuro di voler eliminare definitivo il prodotto "${name}" dal magazzino?`)) return;
    try {
      await deleteShopProduct(id);
      await loadShopData();
    } catch (e) {
      console.error("Error deleting product", e);
    }
  };

  // Perform Sale registration and stock deduction
  const handleSellSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForm.productId) {
      alert("Seleziona un prodotto.");
      return;
    }

    const selectedProduct = products.find(p => p.id === saleForm.productId);
    if (!selectedProduct) {
      alert("Prodotto non trovato.");
      return;
    }

    const sellQty = parseInt(saleForm.quantity, 10);
    if (isNaN(sellQty) || sellQty <= 0) {
      alert("La quantità deve essere maggiore di 0.");
      return;
    }

    if (sellQty > selectedProduct.quantity) {
      alert(`Scorte insufficienti in magazzino! Disponibili solo ${selectedProduct.quantity} unità.`);
      return;
    }

    let finalSoldPrice = 0;
    let isGift = false;

    if (saleForm.priceType === 'standard') {
      finalSoldPrice = selectedProduct.sellingPrice;
    } else if (saleForm.priceType === 'gift') {
      finalSoldPrice = 0;
      isGift = true;
    } else {
      finalSoldPrice = parseFloat(saleForm.customPrice);
      if (isNaN(finalSoldPrice) || finalSoldPrice < 0) {
        alert("Prezzo di vendita personalizzato non valido.");
        return;
      }
      if (finalSoldPrice === 0) {
        isGift = true;
      }
    }

    const buyerName = buyerInputSearch.trim() || 'Acquirente Anonimo';

    // 1. Create Sale entry
    const newSale: ShopSale = {
      id: generateId(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: sellQty,
      soldPrice: finalSoldPrice,
      buyerName,
      isGift,
      date: new Date().toISOString()
    };

    // 2. Decrement product stock qty
    const updatedProduct: ShopProduct = {
      ...selectedProduct,
      quantity: selectedProduct.quantity - sellQty
    };

    try {
      await saveShopSale(newSale);
      await saveShopProduct(updatedProduct);
      
      // Reset POS Form
      setSaleForm({
        productId: '',
        quantity: '1',
        buyerName: '',
        isGift: false,
        customPrice: '',
        priceType: 'standard'
      });
      setBuyerInputSearch('');
      await loadShopData();
      alert("Vendita registrata correttamente!");
    } catch (err) {
      console.error("Failed to commit sale", err);
    }
  };

  // Delete recorded sale and option to restore stock quantity
  const handleDeleteSaleClick = async (sale: ShopSale) => {
    const restore = confirm(`Vuoi annullare la vendita di ${sale.quantity}x "${sale.productName}"?\nSe premi OK, la quantità verrà reintegrata nel magazzino.`);
    try {
      await deleteShopSale(sale.id);
      
      if (restore) {
        // Find if product still exists
        const matchedProd = products.find(p => p.id === sale.productId);
        if (matchedProd) {
          const updatedProd = {
            ...matchedProd,
            quantity: matchedProd.quantity + sale.quantity
          };
          await saveShopProduct(updatedProd);
        }
      }
      await loadShopData();
    } catch (e) {
      console.error("Error reverting sale", e);
    }
  };

  // Filter lists
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const filteredSales = sales.filter(s => {
    const matchesSearch = s.productName.toLowerCase().includes(historySearch.toLowerCase()) || 
                          s.buyerName.toLowerCase().includes(historySearch.toLowerCase());
    
    if (filterGift === 'all') return matchesSearch;
    if (filterGift === 'gift') return matchesSearch && s.isGift;
    if (filterGift === 'paid') return matchesSearch && !s.isGift;
    return matchesSearch;
  });

  const matchingBuyerSuggestions = buyerSuggestions.filter(n => 
    n.toLowerCase().includes(buyerInputSearch.toLowerCase()) && 
    n.toLowerCase() !== buyerInputSearch.toLowerCase()
  );

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Upper Navigation & Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-xl transition-all border border-gray-100 shrink-0"
            title="Torna alla Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-pink-500" />
              <h1 className="text-2xl font-black text-gray-900">ONBEShop</h1>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 font-bold uppercase tracking-wider">Magazzino, Merchandising & Vendite POS</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
          <button 
            onClick={() => { setActiveTab('sell'); setIsEditingProduct(null); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'sell' ? 'bg-white text-pink-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <Tag className="w-3.5 h-3.5" />
            Vendi / POS
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'inventory' ? 'bg-white text-pink-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <Package className="w-3.5 h-3.5" />
            Magazzino
          </button>
          <button 
            onClick={() => { setActiveTab('history'); setIsEditingProduct(null); }}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-white text-pink-600 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <History className="w-3.5 h-3.5" />
            Storico
          </button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total revenue */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Ricavo Netto</span>
            <div className="p-1 px-2 rounded-full bg-green-50 text-green-600 border border-green-100 flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-green-600 leading-tight">€ {stats.totalRevenue.toFixed(2)}</h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight mt-1">Da {stats.totalSalesCount} transazioni</p>
          </div>
        </div>

        {/* Profit margins */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Margine Guadagno</span>
            <div className="p-1 px-2 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-indigo-700 leading-tight">€ {stats.totalProfit.toFixed(2)}</h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight mt-1">Margine totale vendite</p>
          </div>
        </div>

        {/* Inventory quantity & wholesale investment cost */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Valore Scorte</span>
            <div className="p-1 px-2 rounded-full bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-gray-800 leading-tight">€ {stats.totInventoryCostVal.toFixed(2)}</h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight mt-1">{stats.totItemsCount} pezzi in magazzino</p>
          </div>
        </div>

        {/* Free Gifts / Omaggi */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Omaggi Promossi</span>
            <div className="p-1 px-2 rounded-full bg-pink-50 text-pink-600 border border-pink-100 flex items-center gap-1">
              <Gift className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-pink-600 leading-tight">{stats.giftItemsSold} unità</h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight mt-1">Prodotti regalati / omaggio</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-gray-100 rounded-3xl p-16 text-center shadow-sm">
          <div className="inline-block relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-pink-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-pink-500 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-400 text-sm font-semibold mt-4">Caricamento delle scorte ONBEShop...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: VENDITA / POS SYSTEM */}
          {activeTab === 'sell' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Point of Sale Formulation */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm lg:col-span-4 space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Registra Vendita</h2>
                  <p className="text-xs text-gray-500">Seleziona e vendi merchandising ai membri dell'ONBE</p>
                </div>

                {products.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl p-4 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Nessun prodotto disponibile</p>
                      <p className="mt-1">Vai prima nella scheda <b>"Magazzino"</b> per inserire del merchandising con scorte prima di poter effettuare vendite.</p>
                      <button 
                        onClick={() => setActiveTab('inventory')} 
                        className="text-pink-600 hover:text-pink-700 font-black uppercase tracking-wider text-[10px] mt-2 block"
                      >
                        Aggiungi Prodotto Ora &rarr;
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSellSubmit} className="space-y-4">
                    {/* Item chosen */}
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Merchandising *</label>
                      <select 
                        required
                        className="w-full border border-gray-200 rounded-xl text-sm px-4 py-3 bg-white mt-1 h-12 outline-none focus:ring-2 focus:ring-pink-500 font-bold text-gray-800"
                        value={saleForm.productId}
                        onChange={e => {
                          const val = e.target.value;
                          setSaleForm(s => ({
                            ...s, 
                            productId: val,
                            quantity: '1' // reset qty to 1
                          }));
                        }}
                      >
                        <option value="">Seleziona Merchandising...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                            {p.name} {p.quantity <= 0 ? '(ESAURITO)' : `(${p.quantity} pz disp. - Std: €${p.sellingPrice})`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Selector */}
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Quantità *</label>
                      <div className="flex items-center gap-2 mt-1">
                        <button 
                          type="button"
                          className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center shrink-0"
                          onClick={() => {
                            const cur = parseInt(saleForm.quantity, 10);
                            if (cur > 1) setSaleForm(s => ({ ...s, quantity: (cur - 1).toString() }));
                          }}
                        >
                          -
                        </button>
                        <input 
                          type="number"
                          required
                          min="1"
                          max={products.find(p => p.id === saleForm.productId)?.quantity || 9999}
                          className="w-full border border-gray-200 rounded-xl text-center font-bold text-lg h-12 outline-none focus:ring-2 focus:ring-pink-500"
                          value={saleForm.quantity}
                          onChange={e => setSaleForm(s => ({ ...s, quantity: e.target.value }))}
                        />
                        <button 
                          type="button"
                          className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center shrink-0"
                          onClick={() => {
                            const cur = parseInt(saleForm.quantity, 10);
                            const stock = products.find(p => p.id === saleForm.productId)?.quantity || 0;
                            if (isNaN(cur) || cur < stock) {
                              setSaleForm(s => ({ ...s, quantity: (cur + 1).toString() }));
                            }
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Pricing Mode Toggle */}
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Prezzo di Vendita *</label>
                      <div className="grid grid-cols-3 bg-gray-100 p-1 rounded-xl gap-1 mt-1 text-center">
                        <button 
                          type="button"
                          onClick={() => setSaleForm(s => ({ ...s, priceType: 'standard' }))}
                          className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${saleForm.priceType === 'standard' ? 'bg-indigo-950 text-white shadow' : 'text-gray-500'}`}
                        >
                          Standard
                        </button>
                        <button 
                          type="button"
                          onClick={() => setSaleForm(s => ({ ...s, priceType: 'custom' }))}
                          className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${saleForm.priceType === 'custom' ? 'bg-indigo-950 text-white shadow' : 'text-gray-500'}`}
                        >
                          Personal.
                        </button>
                        <button 
                          type="button"
                          onClick={() => setSaleForm(s => ({ ...s, priceType: 'gift' }))}
                          className={`p-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${saleForm.priceType === 'gift' ? 'bg-pink-600 text-white shadow' : 'text-pink-500 hover:bg-slate-200/50'}`}
                        >
                          <Gift className="w-3.5 h-3.5 shrink-0" />
                          Regalo
                        </button>
                      </div>
                    </div>

                    {/* Conditional Price inputs */}
                    {saleForm.priceType === 'standard' && saleForm.productId && (
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex justify-between items-center text-sm font-bold mt-1">
                        <span className="text-gray-500">Prezzo Standard {saleForm.quantity}x</span>
                        <span className="text-indigo-600 text-lg">
                          € {((products.find(p => p.id === saleForm.productId)?.sellingPrice || 0) * parseInt(saleForm.quantity || '0', 10)).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {saleForm.priceType === 'gift' && (
                      <div className="bg-pink-50 border border-pink-100 p-4 rounded-2xl flex justify-between items-center text-xs font-bold text-pink-700 mt-1">
                        <span className="flex items-center gap-1"><Gift className="w-4 h-4 shrink-0" /> OMAGGIO</span>
                        <span>€ 0.00</span>
                      </div>
                    )}
                    {saleForm.priceType === 'custom' && (
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Inserisci Quota Unitaria (€) *</label>
                        <input 
                          type="number"
                          step="0.01"
                          required
                          placeholder="0.00"
                          className="w-full border border-gray-200 rounded-xl text-sm px-4 py-3 mt-1 h-12 font-bold text-indigo-600 outline-none focus:ring-2 focus:ring-pink-500"
                          value={saleForm.customPrice}
                          onChange={e => setSaleForm(s => ({ ...s, customPrice: e.target.value }))}
                        />
                      </div>
                    )}

                    {/* Buyer Selection suggestions */}
                    <div className="relative">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Acquirente (Membro / Testo Libero)</label>
                      <div className="relative mt-1">
                        <Users className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-300" />
                        <input 
                          type="text"
                          placeholder="Inizia a digitare o lascia vuoto..."
                          className="w-full border border-gray-200 rounded-xl text-sm pl-10 pr-4 py-3 h-12 outline-none focus:ring-2 focus:ring-pink-500 bg-white font-semibold"
                          value={buyerInputSearch}
                          onFocus={() => setShowBuyerSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowBuyerSuggestions(false), 200)}
                          onChange={e => {
                            setBuyerInputSearch(e.target.value);
                            setShowBuyerSuggestions(true);
                          }}
                        />
                      </div>

                      {showBuyerSuggestions && matchingBuyerSuggestions.length > 0 && (
                        <div className="absolute z-[70] left-0 right-0 mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto overflow-hidden text-sm divide-y divide-gray-50 border-t">
                          {matchingBuyerSuggestions.map(name => (
                            <button
                              key={name}
                              type="button"
                              className="w-full text-left px-4 py-2.5 hover:bg-pink-50/50 hover:text-pink-600 font-bold transition-all text-gray-700"
                              onMouseDown={() => {
                                setBuyerInputSearch(name);
                                setShowBuyerSuggestions(false);
                              }}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Button 
                      type="submit" 
                      variant={saleForm.priceType === 'gift' ? 'secondary' : 'primary'}
                      className="w-full h-12 uppercase tracking-widest font-black text-xs shadow-md mt-4"
                    >
                      <ShoppingBag className="w-4 h-4 mr-2" />
                      Registra Vendita
                    </Button>
                  </form>
                )}
              </div>

              {/* Quick Products status list */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm lg:col-span-8 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Merchandising Disponibile</h2>
                    <p className="text-xs text-gray-400">Scorte attuali per le vendite</p>
                  </div>
                  <div className="relative w-full sm:max-w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-300" />
                    <input 
                      type="text" 
                      placeholder="Cerca scorte..." 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-pink-500"
                      value={inventorySearch}
                      onChange={e => setInventorySearch(e.target.value)}
                    />
                  </div>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 italic">Nessun articolo trovato</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredProducts.map(p => {
                      const isLowStock = p.quantity <= 2;
                      const isOut = p.quantity === 0;

                      return (
                        <div 
                          key={p.id}
                          onClick={() => {
                            if (!isOut) {
                              setSaleForm(s => ({ ...s, productId: p.id }));
                            }
                          }}
                          className={`p-5 rounded-2xl border transition-all relative ${
                            saleForm.productId === p.id 
                              ? 'border-pink-500 bg-pink-50/25 ring-2 ring-pink-400 shadow-md transform -translate-y-0.5' 
                              : isOut 
                                ? 'opacity-50 bg-gray-50 border-gray-100 cursor-not-allowed'
                                : 'bg-white hover:bg-slate-50/50 hover:border-indigo-100 cursor-pointer border-slate-100 shadow-sm'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-extrabold text-gray-900 line-clamp-1 text-sm">{p.name}</h4>
                            {isOut ? (
                              <span className="text-[8px] bg-red-100 text-red-700 font-black px-1.5 py-0.5 rounded uppercase shrink-0">Esaurito</span>
                            ) : isLowStock ? (
                              <span className="text-[8px] bg-amber-100 text-amber-700 font-extrabold px-1.5 py-0.5 rounded uppercase shrink-0">Scorte Basse</span>
                            ) : null}
                          </div>

                          <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-50">
                            <div>
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide block leading-none mb-0.5">Scorte</span>
                              <span className={`text-base font-black ${isOut ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-gray-800'}`}>
                                {p.quantity} pz
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide block leading-none mb-0.5">Prezzo Vendita</span>
                              <span className="text-base font-black text-pink-600">
                                € {p.sellingPrice.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MAGAZZINO / INVENTARIO */}
          {activeTab === 'inventory' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Product Creation / Edition Form */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm lg:col-span-4 space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {isEditingProduct ? 'Modifica Articolo' : 'Nuovo Articolo Merch'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {isEditingProduct ? 'Modifica dati del merchandising' : 'Inserisci nuovo articolo nel magazzino dell\'ONBE'}
                  </p>
                </div>

                <form onSubmit={handleProductSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nome Articolo *</label>
                    <input 
                      type="text"
                      required
                      placeholder="E.g. T-Shirt ONBE Nera L"
                      className="w-full border border-gray-200 rounded-xl text-sm px-4 py-3 bg-white mt-1 h-12 outline-none focus:ring-2 focus:ring-pink-500 font-semibold"
                      value={productForm.name}
                      onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quantità scorte *</label>
                      <input 
                        type="number"
                        min="0"
                        required
                        placeholder="0"
                        className="w-full border border-gray-200 rounded-xl text-sm px-4 py-3 bg-white mt-1 h-12 outline-none focus:ring-2 focus:ring-pink-500 font-bold"
                        value={productForm.quantity}
                        onChange={e => setProductForm(p => ({ ...p, quantity: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none block mb-0.5">Costo Unitario Acquisto *</label>
                      <input 
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="0.00"
                        className="w-full border border-gray-200 rounded-xl text-sm px-4 py-3 bg-white mt-1 h-12 outline-none focus:ring-2 focus:ring-pink-500 font-bold"
                        value={productForm.costPrice}
                        onChange={e => setProductForm(p => ({ ...p, costPrice: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Prezzo Consigliato Vendita (€) *</label>
                    <input 
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="0.00"
                      className="w-full border border-gray-200 rounded-xl text-sm px-4 py-3 bg-white mt-1 h-12 outline-none focus:ring-2 focus:ring-pink-500 font-bold text-pink-600"
                      value={productForm.sellingPrice}
                      onChange={e => setProductForm(p => ({ ...p, sellingPrice: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    {isEditingProduct && (
                      <button 
                        type="button" 
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                        onClick={() => {
                          setIsEditingProduct(null);
                          setProductForm({ name: '', quantity: '', costPrice: '', sellingPrice: '' });
                        }}
                      >
                        Annulla
                      </button>
                    )}
                    <Button 
                      type="submit" 
                      className="flex-1 h-12 uppercase tracking-widest font-black text-xs"
                    >
                      {isEditingProduct ? 'Aggiorna Magazzino' : 'Aggiungi Prodotto'}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Warehouse Stocks List */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm lg:col-span-8 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Magazzino ONBEShop</h2>
                    <p className="text-xs text-gray-400">Riepilogo e tracciamento investimenti e profitti di merchandising</p>
                  </div>
                  <div className="relative w-full sm:max-w-64 animate-fade-in">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-300" />
                    <input 
                      type="text" 
                      placeholder="Cerca articoli..." 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-pink-500"
                      value={inventorySearch}
                      onChange={e => setInventorySearch(e.target.value)}
                    />
                  </div>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-xs font-semibold text-gray-300 bg-indigo-950 border-b border-indigo-900">
                        <th className="px-6 py-4 rounded-tl-2xl">ARTICOLO</th>
                        <th className="px-6 py-4 text-center">QUANTITÀ</th>
                        <th className="px-6 py-4 text-right">COSTO ACQUISTO</th>
                        <th className="px-6 py-4 text-right">PREZZO VENDITA STD</th>
                        <th className="px-6 py-4 text-center">RICAVO POTENZIALE</th>
                        <th className="px-6 py-4 text-right rounded-tr-2xl">AZIONI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic bg-slate-50/20">
                            Magazzino vuoto o nessun risultato trovato
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map(p => {
                          const totCost = p.quantity * p.costPrice;
                          const totRevPotential = p.quantity * p.sellingPrice;
                          const profitMargin = p.sellingPrice - p.costPrice;

                          return (
                            <tr key={p.id} className="hover:bg-pink-50/10 transition-colors">
                              <td className="px-6 py-4 font-extrabold text-gray-900">{p.name}</td>
                              <td className="px-6 py-4 text-center font-black">
                                <span className={`px-3 py-1 rounded-full ${p.quantity === 0 ? 'bg-red-50 text-red-600' : p.quantity <= 2 ? 'bg-amber-55 text-amber-700 bg-amber-50' : 'text-gray-800'}`}>
                                  {p.quantity} pz
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-gray-500 font-medium">€ {p.costPrice.toFixed(2)}</td>
                              <td className="px-6 py-4 text-right font-black text-pink-600">€ {p.sellingPrice.toFixed(2)}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`text-[11px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full ${profitMargin >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                  € {totRevPotential.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button 
                                    onClick={() => handleEditProductClick(p)} 
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                    title="Modifica articolo"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteProductClick(p.id, p.name)} 
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                    title="Elimina articolo"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile list version */}
                <div className="block md:hidden space-y-4">
                  {filteredProducts.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 italic bg-slate-50/20 rounded-2xl">
                      Magazzino vuoto o nessun risultato trovato
                    </div>
                  ) : (
                    filteredProducts.map(p => {
                      const totCost = p.quantity * p.costPrice;
                      const totRevPotential = p.quantity * p.sellingPrice;
                      const profitMargin = p.sellingPrice - p.costPrice;

                      return (
                        <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
                          <div className="flex justify-between items-start gap-3">
                            <h4 className="font-extrabold text-gray-900 text-base">{p.name}</h4>
                            <span className={`text-xs font-black px-3 py-1 rounded-full shrink-0 ${p.quantity === 0 ? 'bg-red-50 text-red-600' : p.quantity <= 2 ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-800'}`}>
                              {p.quantity} pz
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-50 text-xs">
                            <div>
                              <span className="text-gray-400 uppercase font-bold tracking-tight">Costo Unitario Cad:</span>
                              <p className="font-semibold text-gray-700 mt-0.5">€ {p.costPrice.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-gray-400 uppercase font-bold tracking-tight">Prezzo Vendita Std:</span>
                              <p className="font-black text-pink-600 mt-0.5">€ {p.sellingPrice.toFixed(2)}</p>
                            </div>
                            <div className="mt-2 text-left">
                              <span className="text-gray-400 uppercase font-bold tracking-tight block">Valore di Carico:</span>
                              <span className="text-xs font-bold text-gray-500">€ {totCost.toFixed(2)}</span>
                            </div>
                            <div className="mt-2 text-right">
                              <span className="text-gray-400 uppercase font-bold tracking-tight block">Valore Vendita Tot:</span>
                              <span className="text-xs font-black text-green-700 bg-green-50 px-2 py-0.5 rounded">€ {totRevPotential.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="flex justify-end gap-1.5 pt-3 border-t border-slate-50">
                            <button 
                              onClick={() => handleEditProductClick(p)} 
                              className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-black uppercase flex items-center gap-1 transition-all"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Modifica
                            </button>
                            <button 
                              onClick={() => handleDeleteProductClick(p.id, p.name)} 
                              className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-black uppercase flex items-center gap-1 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Rimuovi
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STORICO VENDITE */}
          {activeTab === 'history' && (
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Storico Vendite</h2>
                  <p className="text-xs text-gray-500">Visualizza resoconti, omaggi e margini generati</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  {/* Select gift filters */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setFilterGift('all')}
                      className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${filterGift === 'all' ? 'bg-indigo-950 text-white shadow' : 'text-gray-500'}`}
                    >
                      Tutto
                    </button>
                    <button 
                      onClick={() => setFilterGift('paid')}
                      className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${filterGift === 'paid' ? 'bg-indigo-950 text-white shadow' : 'text-gray-500'}`}
                    >
                      Transati
                    </button>
                    <button 
                      onClick={() => setFilterGift('gift')}
                      className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all ${filterGift === 'gift' ? 'bg-indigo-950 text-white shadow' : 'text-gray-500'}`}
                    >
                      Regali
                    </button>
                  </div>

                  <div className="relative w-full sm:max-w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-300" />
                    <input 
                      type="text" 
                      placeholder="Cerca per prodotto o acquirente..." 
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-pink-500"
                      value={historySearch}
                      onChange={e => setHistorySearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Desktop view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-semibold text-gray-300 bg-indigo-950 border-b border-indigo-900">
                      <th className="px-6 py-4 rounded-tl-2xl">DATA</th>
                      <th className="px-6 py-4">PRODOTTO</th>
                      <th className="px-6 py-4">ACQUIRENTE</th>
                      <th className="px-6 py-4 text-center">QUANTITÀ</th>
                      <th className="px-6 py-4 text-right">PREZZO VENDITA CAD</th>
                      <th className="px-6 py-4 text-right">TOTALE TRANSATO</th>
                      <th className="px-6 py-4 text-right">MARGINATO NETTO</th>
                      <th className="px-6 py-4 text-right rounded-tr-2xl">ANNULLA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredSales.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-400 italic bg-slate-50/20">
                          Nessuna vendita registrata
                        </td>
                      </tr>
                    ) : (
                      filteredSales.map(s => {
                        const originalProduct = products.find(p => p.id === s.productId);
                        const costPrice = originalProduct ? originalProduct.costPrice : 0;
                        const individualMargin = s.soldPrice - costPrice;
                        const totalMargin = individualMargin * s.quantity;

                        return (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-xs font-medium text-gray-400">
                              {new Date(s.date).toLocaleDateString('it-IT')} {new Date(s.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-4 font-extrabold text-gray-900">{s.productName}</td>
                            <td className="px-6 py-4">
                              <span className="font-semibold text-gray-600 bg-slate-100 px-2.5 py-1 rounded-xl text-xs">
                                {s.buyerName}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-gray-800">{s.quantity} pz</td>
                            <td className="px-6 py-4 text-right font-semibold">
                              {s.isGift ? (
                                <span className="text-pink-600 bg-pink-50 text-[10px] px-2 py-0.5 rounded-full font-black">OMAGGIO</span>
                              ) : (
                                `€ ${s.soldPrice.toFixed(2)}`
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-gray-900">
                              € {(s.soldPrice * s.quantity).toFixed(2)}
                            </td>
                            <td className={`px-6 py-4 text-right font-black ${totalMargin >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                              € {totalMargin.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleDeleteSaleClick(s)} 
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                title="Annulla Transazione"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card list */}
              <div className="block md:hidden space-y-4">
                {filteredSales.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 italic bg-slate-50/20 rounded-2xl">
                    Nessuna vendita registrata
                  </div>
                ) : (
                  filteredSales.map(s => {
                    const originalProduct = products.find(p => p.id === s.productId);
                    const costPrice = originalProduct ? originalProduct.costPrice : 0;
                    const totalMargin = (s.soldPrice - costPrice) * s.quantity;

                    return (
                      <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3 relative group">
                        <button 
                          onClick={() => handleDeleteSaleClick(s)} 
                          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 bg-slate-50 group-hover:bg-red-50 rounded-lg transition-all"
                          title="Annulla Transazione"
                        >
                          <X className="w-4 h-4" />
                        </button>

                        <div className="space-y-1">
                          <span className="text-[10px] text-gray-400 font-bold block">
                            {new Date(s.date).toLocaleDateString('it-IT')} ore {new Date(s.date).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <h4 className="font-extrabold text-gray-900 text-sm max-w-[85%]">{s.productName}</h4>
                          <p className="text-xs text-gray-500 font-medium">Acquirente: <span className="font-extrabold">{s.buyerName}</span></p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-50 text-xs mt-2">
                          <div>
                            <span className="text-gray-400 uppercase font-bold tracking-tight">Venduto:</span>
                            <p className="font-bold text-gray-700 mt-0.5">{s.quantity} unità</p>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-400 uppercase font-bold tracking-tight">Prezzo Cad:</span>
                            <p className="font-black mt-0.5">
                              {s.isGift ? (
                                <span className="text-pink-600 bg-pink-50 text-[9px] px-2 py-0.5 rounded-full font-black">OMAGGIO</span>
                              ) : (
                                `€ ${s.soldPrice.toFixed(2)}`
                              )}
                            </p>
                          </div>
                          <div className="pt-2 text-left">
                            <span className="text-gray-400 uppercase font-bold tracking-tight block">Ricavo Totale:</span>
                            <span className="text-sm font-black text-gray-900">€ {(s.soldPrice * s.quantity).toFixed(2)}</span>
                          </div>
                          <div className="pt-2 text-right">
                            <span className="text-gray-400 uppercase font-bold tracking-tight block">Margine Guadagno:</span>
                            <span className={`text-sm font-black px-2 py-0.5 rounded ${totalMargin >= 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-red-50 text-red-700'}`}>
                              € {totalMargin.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
