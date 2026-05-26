import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, Search } from "lucide-react";

const norm = (t) => (t || '').toLowerCase()
  .replace(/ş/g,'s').replace(/ç/g,'c').replace(/ğ/g,'g')
  .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ü/g,'u');

const INIT_FORM = {
  name: '', sku: '', cost: '', printing_cost: '', extra_cost: '',
  desi: '', multi_package: false, packages: [], category_id: '',
  vat_rate: 20, same_day_delivery: false, is_active: true,
  ref_product_id: null, cost_addon: '', cost_addon_type: 'total_tl', ref_product_qty: '',
  unit_quantity: '',
};

export default function ProductModal({
  open, onOpenChange, product, categories, packages = [],
  products = [], onSave, isSaving,
}) {
  const [form, setForm] = useState(INIT_FORM);
  const [showPackages, setShowPackages] = useState(false);
  const [chainMembers, setChainMembers] = useState([]);
  const [matchMembers, setMatchMembers] = useState([]);
  const [chainSearch, setChainSearch] = useState('');
  const [matchSearch, setMatchSearch] = useState('');
  const [refSearch, setRefSearch] = useState('');
  const [showChainSearch, setShowChainSearch] = useState(false);
  const [showMatchSearch, setShowMatchSearch] = useState(false);
  const [showRefSearch, setShowRefSearch] = useState(false);
  const [chainConflict, setChainConflict] = useState(null);

  const upd = (key, val) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    if (!open) return;
    if (product) {
      let pkgs = [];
      try {
        pkgs = product.packages
          ? (typeof product.packages === 'string' ? JSON.parse(product.packages) : product.packages)
          : [];
      } catch (e) {}
      setForm({
        name: product.name || '', sku: product.sku || '',
        cost: product.cost || '', printing_cost: product.printing_cost || '',
        extra_cost: product.extra_cost || '', desi: product.desi || '',
        multi_package: product.multi_package || false, packages: pkgs,
        category_id: product.category_id || '', vat_rate: product.vat_rate || 20,
        same_day_delivery: product.same_day_delivery === true,
        is_active: product.is_active !== false,
        ref_product_id: product.ref_product_id || null,
        cost_addon: product.cost_addon || '',
        cost_addon_type: product.cost_addon_type || 'total_tl',
        ref_product_qty: product.ref_product_qty || '',
        unit_quantity: product.unit_quantity || '',
      });
      setShowPackages(product.multi_package || false);
      setChainMembers(
        product.chain_group_id
          ? products.filter(p => p.chain_group_id === product.chain_group_id && p.id !== product.id)
          : []
      );
      setMatchMembers(
        product.match_group_id
          ? products.filter(p => p.match_group_id === product.match_group_id && p.id !== product.id)
          : []
      );
    } else {
      setForm(INIT_FORM);
      setShowPackages(false);
      setChainMembers([]);
      setMatchMembers([]);
    }
    setChainSearch(''); setMatchSearch(''); setRefSearch('');
    setShowChainSearch(false); setShowMatchSearch(false); setShowRefSearch(false);
    setChainConflict(null);
  }, [product, open]);

  const baseCost = useMemo(() => {
    if (!form.ref_product_id) return null;
    const ref = products.find(p => p.id === form.ref_product_id);
    if (!ref) return null;
    const refCost = (ref.ref_product_id && ref.base_cost > 0)
      ? ref.base_cost : (parseFloat(ref.cost) || 0);
    const addon = parseFloat(form.cost_addon) || 0;
    const normalCost = parseFloat(form.cost) || 0;
    let baz = 0;
    if (form.cost_addon_type === 'total_tl') baz = refCost + addon;
    else if (form.cost_addon_type === 'total_pct') baz = refCost * (1 + addon / 100);
    else if (form.cost_addon_type === 'unit_tl') {
      const qty = parseFloat(form.ref_product_qty) || 1;
      baz = (refCost / qty + addon) * qty;
    }
    return Math.max(baz, normalCost);
  }, [form.ref_product_id, form.cost_addon, form.cost_addon_type, form.ref_product_qty, form.cost, products]);

  const availableRefProducts = useMemo(() => {
    const refsThis = new Set(products.filter(p => p.ref_product_id === product?.id).map(p => p.id));
    return products.filter(p => p.id !== product?.id && !refsThis.has(p.id));
  }, [products, product]);

  const filterProds = (list, search, excludeIds = []) => {
    const excl = new Set([...excludeIds, product?.id].filter(Boolean));
    const base = list.filter(p => !excl.has(p.id));
    if (!search.trim()) return base.slice(0, 30);
    const words = search.trim().split(/\s+/).map(norm);
    return base.filter(p => {
      const t = norm(`${p.name || ''} ${p.sku || ''}`);
      return words.every(w => t.includes(w));
    }).slice(0, 30);
  };

  const refResults = useMemo(() => filterProds(availableRefProducts, refSearch), [availableRefProducts, refSearch]);
  const chainResults = useMemo(() => filterProds(products, chainSearch, chainMembers.map(p => p.id)), [products, chainSearch, chainMembers, product]);
  const matchResults = useMemo(() => filterProds(products, matchSearch, matchMembers.map(p => p.id)), [products, matchSearch, matchMembers, product]);

  const refProduct = products.find(p => p.id === form.ref_product_id);

  const handleAddChain = (p) => {
    setChainMembers(prev => [...prev, p]);
    setChainSearch(''); setShowChainSearch(false);
  };

  const handleAddMatch = (p) => {
    if (p.chain_group_id) {
      const pChain = products.filter(pp => pp.chain_group_id === p.chain_group_id);
      setChainConflict({ product: p, chainMembers: pChain });
      return;
    }
    setMatchMembers(prev => [...prev, p]);
    setMatchSearch(''); setShowMatchSearch(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cat = categories.find(c => c.id === form.category_id);
    let validPkgs = form.multi_package
      ? form.packages.filter(pkg => pkg.desi && parseFloat(pkg.desi) > 0)
      : [];
    const finalMulti = form.multi_package && validPkgs.length > 1;
    if (!finalMulti) validPkgs = [];
    const finalBaseCost = baseCost ?? (parseFloat(form.cost) || 0);

    onSave({
      ...form,
      cost: parseFloat(form.cost) || 0,
      printing_cost: parseFloat(form.printing_cost) || 0,
      extra_cost: parseFloat(form.extra_cost) || 0,
      desi: parseFloat(form.desi) || 0,
      vat_rate: parseFloat(form.vat_rate) || 20,
      category_name: cat?.name || '',
      sku: form.sku || `SKU-${Date.now()}`,
      multi_package: finalMulti,
      packages: finalMulti ? JSON.stringify(validPkgs) : null,
      special_shipping: false,
      ref_product_id: form.ref_product_id || null,
      cost_addon: parseFloat(form.cost_addon) || 0,
      cost_addon_type: form.cost_addon_type,
      base_cost: finalBaseCost,
      ref_product_qty: parseFloat(form.ref_product_qty) || 0,
      unit_quantity: parseInt(form.unit_quantity) || 0,
      _chainMembers: chainMembers.map(p => p.id),
      _matchMembers: matchMembers.map(p => p.id),
    });
  };

  const addPkg = () => setForm(f => ({ ...f, packages: [...f.packages, { desi: 0, package_id: '' }] }));
  const rmPkg = (i) => setForm(f => ({ ...f, packages: f.packages.filter((_, idx) => idx !== i) }));
  const updPkg = (i, key, val) => setForm(f => {
    const p = [...f.packages]; p[i] = { ...p[i], [key]: val }; return { ...f, packages: p };
  });

  const SearchList = ({ results, onSelect }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden mt-1 bg-white shadow-sm">
      {results.length === 0
        ? <div className="px-3 py-3 text-sm text-gray-400">Sonuç bulunamadı — farklı kelime deneyin</div>
        : results.map(p => (
          <button key={p.id} type="button" onClick={() => onSelect(p)}
            className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center justify-between gap-2">
            <span className="text-gray-800 truncate">{p.name}</span>
            <span className="text-xs text-indigo-500 shrink-0 font-medium">Ekle</span>
          </button>
        ))
      }
    </div>
  );

  const Tag = ({ label, onRemove }) => (
    <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 rounded-md px-2 py-1 text-xs text-indigo-700 max-w-full">
      <span className="truncate max-w-[200px]">{label}</span>
      <button type="button" onClick={onRemove} className="text-indigo-400 hover:text-indigo-700 shrink-0 text-base leading-none">×</button>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg flex flex-col p-0 gap-0" style={{ maxHeight: '90dvh' }}>
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 flex-shrink-0">
            <DialogTitle className="text-xl font-semibold">
              {product ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

              <div className="space-y-2">
                <Label>Ürün Adı *</Label>
                <Input value={form.name} onChange={e => upd('name', e.target.value)} placeholder="Ürün adını girin" required />
              </div>

              <div className="space-y-2">
                <Label>SKU (Opsiyonel)</Label>
                <Input value={form.sku} onChange={e => upd('sku', e.target.value)} placeholder="SKU-001" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Maliyet (KDV Dahil) *</Label>
                  <Input type="number" step="0.01" min="0" value={form.cost} onChange={e => upd('cost', e.target.value)} placeholder="0.00" required />
                </div>
                <div className="space-y-2">
                  <Label>Baskı Maliyeti</Label>
                  <Input type="number" step="0.01" min="0" value={form.printing_cost} onChange={e => upd('printing_cost', e.target.value)} placeholder="0.00" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ek Maliyet (KDV Dahil)</Label>
                <Input type="number" step="0.01" min="0" value={form.extra_cost} onChange={e => upd('extra_cost', e.target.value)} placeholder="0.00" />
              </div>

              {!form.multi_package && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Desi *</Label>
                    <Input type="number" step="0.1" min="0" value={form.desi} onChange={e => upd('desi', e.target.value)} placeholder="1.0" required />
                  </div>
                  <div className="space-y-2">
                    <Label>KDV Oranı (%)</Label>
                    <Select value={String(form.vat_rate)} onValueChange={v => upd('vat_rate', parseFloat(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">%1</SelectItem>
                        <SelectItem value="10">%10</SelectItem>
                        <SelectItem value="20">%20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {form.multi_package && (
                <div className="space-y-2">
                  <Label>KDV Oranı (%)</Label>
                  <Select value={String(form.vat_rate)} onValueChange={v => upd('vat_rate', parseFloat(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">%1</SelectItem>
                      <SelectItem value="10">%10</SelectItem>
                      <SelectItem value="20">%20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* REFERANS ÜRÜN */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div>
                    <Label className="font-medium text-sm">Referans Ürün</Label>
                    <p className="text-xs text-gray-500 mt-0.5">Büyük/pahalı ürün, küçük/ucuz ürünü referans alır. Baz maliyet otomatik hesaplanır.</p>
                  </div>
                  {form.ref_product_id && (
                    <button type="button"
                      onClick={() => { upd('ref_product_id', null); upd('cost_addon', ''); upd('ref_product_qty', ''); }}
                      className="text-xs text-red-500 hover:text-red-700 shrink-0 ml-2">
                      Kaldır
                    </button>
                  )}
                </div>
                <div className="p-4 space-y-4">
                  {refProduct ? (
                    <div className="flex items-center gap-2 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
                      <span className="font-medium text-indigo-800 flex-1 truncate">{refProduct.name}</span>
                      <span className="text-indigo-600 shrink-0">₺{parseFloat(refProduct.cost).toFixed(2)}</span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white focus-within:border-indigo-300">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <input
                          value={refSearch}
                          onChange={e => { setRefSearch(e.target.value); setShowRefSearch(true); }}
                          onFocus={() => setShowRefSearch(true)}
                          placeholder="Referans ürün ara (ölçü, renk, adet)..."
                          className="flex-1 text-sm outline-none bg-transparent"
                        />
                      </div>
                      {showRefSearch && <SearchList results={refResults} onSelect={p => { upd('ref_product_id', p.id); setRefSearch(''); setShowRefSearch(false); }} />}
                    </div>
                  )}

                  {form.ref_product_id && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm">Maliyet eki türü</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { val: 'total_tl', label: 'Toplam ₺' },
                            { val: 'total_pct', label: 'Toplam %' },
                            { val: 'unit_tl', label: 'Birim ₺/adet' },
                          ].map(opt => (
                            <button key={opt.val} type="button"
                              onClick={() => upd('cost_addon_type', opt.val)}
                              className={`py-2 px-2 text-xs rounded-lg border transition-colors ${form.cost_addon_type === opt.val
                                ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-medium'
                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-sm">
                            {form.cost_addon_type === 'total_tl' ? 'Maliyet eki (₺)'
                              : form.cost_addon_type === 'total_pct' ? 'Maliyet eki (%)'
                              : 'Birim ek (₺/adet)'}
                          </Label>
                          <Input type="number" step="0.01" value={form.cost_addon} onChange={e => upd('cost_addon', e.target.value)} placeholder="0.00" />
                        </div>
                        {form.cost_addon_type === 'unit_tl' && (
                          <div className="space-y-2">
                            <Label className="text-sm">Referans ürünün adeti</Label>
                            <Input type="number" step="1" min="1" value={form.ref_product_qty} onChange={e => upd('ref_product_qty', e.target.value)} placeholder="100" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Baz maliyet (otomatik)</Label>
                        {baseCost !== null ? (
                          <div className="px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold flex items-center justify-between">
                            <span>₺{baseCost.toFixed(2)}</span>
                            {baseCost <= (parseFloat(form.cost) || 0) && (
                              <span className="text-xs text-amber-600 font-normal">Normal maliyet esas alınıyor</span>
                            )}
                          </div>
                        ) : (
                          <div className="px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-400 text-sm">
                            — maliyet eki girince hesaplanır
                          </div>
                        )}
                      </div>

                      {baseCost !== null && baseCost <= (parseFloat(form.cost) || 0) && (
                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                          <span className="mt-0.5 shrink-0">⚠️</span>
                          <span>Baz maliyet normal maliyetten düşük. Fiyat hesaplama normal maliyet (₺{parseFloat(form.cost || 0).toFixed(2)}) üzerinden yapılacak.</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ADET BAZLI ZİNCİR */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <Label className="font-medium text-sm">Adet Bazlı Ürün Zinciri</Label>
                  <p className="text-xs text-gray-500 mt-0.5">Aynı ürünün farklı adetli varyantlarını bağla. Birinin maliyeti değişince tüm zincir birim maliyete göre güncellenir.</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Bu ürünün adeti</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number" step="1" min="0"
                        value={form.unit_quantity}
                        onChange={e => upd('unit_quantity', e.target.value)}
                        placeholder="örn: 100"
                        className="w-32"
                      />
                      <p className="text-xs text-gray-400">Zincir tutarsızlığı kontrolü için kullanılır</p>
                    </div>
                  </div>

                  {chainMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {chainMembers.map(p => (
                        <Tag key={p.id} label={`${p.name}${p.unit_quantity ? ` (${p.unit_quantity} adet)` : ''}`}
                          onRemove={() => setChainMembers(prev => prev.filter(m => m.id !== p.id))} />
                      ))}
                    </div>
                  )}
                  {chainMembers.length === 0 && !showChainSearch && (
                    <p className="text-sm text-gray-400">Henüz eklenmedi</p>
                  )}
                  {showChainSearch && (
                    <div>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white focus-within:border-indigo-300">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <input autoFocus value={chainSearch} onChange={e => setChainSearch(e.target.value)}
                          placeholder="Ürün adı, ölçü, adet ile ara..."
                          className="flex-1 text-sm outline-none bg-transparent" />
                        <button type="button" onClick={() => { setShowChainSearch(false); setChainSearch(''); }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                      </div>
                      <SearchList results={chainResults} onSelect={handleAddChain} />
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" className="w-full border-dashed text-gray-500"
                    onClick={() => setShowChainSearch(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Varyant Ekle
                  </Button>
                </div>
              </div>

              {/* ÜRÜN EŞLEŞTİRME */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <Label className="font-medium text-sm">Ürün Eşleştirme</Label>
                  <p className="text-xs text-gray-500 mt-0.5">Eşleştirilen ürünlerin maliyeti her zaman aynı olur. Birini güncellersen hepsi güncellenir.</p>
                </div>
                <div className="p-4 space-y-3">
                  {matchMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {matchMembers.map(p => (
                        <Tag key={p.id} label={p.name} onRemove={() => setMatchMembers(prev => prev.filter(m => m.id !== p.id))} />
                      ))}
                    </div>
                  )}
                  {matchMembers.length === 0 && !showMatchSearch && (
                    <p className="text-sm text-gray-400">Henüz eşleştirilmedi</p>
                  )}
                  {showMatchSearch && (
                    <div>
                      <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white focus-within:border-indigo-300">
                        <Search className="h-4 w-4 text-gray-400 shrink-0" />
                        <input autoFocus value={matchSearch} onChange={e => setMatchSearch(e.target.value)}
                          placeholder="Ürün adı, renk veya ölçü ile ara..."
                          className="flex-1 text-sm outline-none bg-transparent" />
                        <button type="button" onClick={() => { setShowMatchSearch(false); setMatchSearch(''); }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
                      </div>
                      <SearchList results={matchResults} onSelect={handleAddMatch} />
                    </div>
                  )}
                  <Button type="button" variant="outline" size="sm" className="w-full border-dashed text-gray-500"
                    onClick={() => setShowMatchSearch(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Ürün Ekle
                  </Button>
                </div>
              </div>

              {/* ÇOK PAKETLİ */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between cursor-pointer"
                  onClick={() => {
                    setShowPackages(!showPackages);
                    if (!showPackages && form.packages.length === 0) upd('packages', [{ desi: 0, package_id: '' }]);
                  }}>
                  <Label className="cursor-pointer flex items-center gap-2">
                    Çok Paketli Gönderim
                    {showPackages ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Label>
                  <Switch checked={form.multi_package}
                    onCheckedChange={v => {
                      upd('multi_package', v);
                      upd('packages', v ? (form.packages.length > 0 ? form.packages : [{ desi: 0, package_id: '' }]) : []);
                      setShowPackages(v);
                    }}
                    onClick={e => e.stopPropagation()} />
                </div>
                {showPackages && form.multi_package && (
                  <div className="space-y-3 pt-2">
                    {form.packages.map((pkg, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Paket Seç</Label>
                            <Select value={pkg.package_id || ''} onValueChange={v => updPkg(i, 'package_id', v)}>
                              <SelectTrigger className="mt-1"><SelectValue placeholder="Paket seçin" /></SelectTrigger>
                              <SelectContent>{packages.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Desi</Label>
                            <Input type="number" step="0.1" min="0" value={pkg.desi || ''} onChange={e => updPkg(i, 'desi', parseFloat(e.target.value) || 0)} placeholder="0.0" className="mt-1" />
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => rmPkg(i)} disabled={form.packages.length === 1} className="text-rose-500 hover:text-rose-700 w-full justify-center">
                          <Trash2 className="h-4 w-4 mr-2" />Sil
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addPkg} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />Paket Ekle
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Kategori *</Label>
                <Select value={form.category_id} onValueChange={v => upd('category_id', v)} required>
                  <SelectTrigger><SelectValue placeholder="Kategori seçin" /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-2">
                <Label>Bugün Kargoda</Label>
                <Switch checked={form.same_day_delivery} onCheckedChange={v => upd('same_day_delivery', v)} />
              </div>

              <div className="flex items-center justify-between py-2">
                <Label>Aktif</Label>
                <Switch checked={form.is_active} onCheckedChange={v => upd('is_active', v)} />
              </div>

            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
              <Button type="submit" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {product ? 'Güncelle' : 'Ekle'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!chainConflict} onOpenChange={() => setChainConflict(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Eşleştirme Uyarısı</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>"{chainConflict?.product?.name}"</strong> şu adet zincirine bağlı:</p>
                <ul className="mt-2 space-y-1 border border-gray-200 rounded-lg p-3 bg-gray-50">
                  {chainConflict?.chainMembers?.map(p => (
                    <li key={p.id} className="text-sm text-gray-700">• {p.name}</li>
                  ))}
                </ul>
                <p className="mt-2">Eşleştirme yaparsanız bu zincirde maliyet çakışması oluşabilir. Raporlar sayfasına uyarı düşecek.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setMatchMembers(prev => [...prev, chainConflict.product]);
                setMatchSearch(''); setShowMatchSearch(false);
                setChainConflict(null);
              }}
              className="bg-amber-500 hover:bg-amber-600">
              Yine de Eşleştir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}