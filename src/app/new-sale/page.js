'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { parseDecimal } from '../lib/formatNumber';

function NewSaleContent() {
  const [customers, setCustomers] = useState([]);
  const [topByCount, setTopByCount] = useState([]);
  const [topByValue, setTopByValue] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDebt, setCustomerDebt] = useState(null);
  const [customerLastSales, setCustomerLastSales] = useState([]);
  const [showDebtDetails, setShowDebtDetails] = useState(false);
  const [saleItems, setSaleItems] = useState([]);
  const [cashReceived, setCashReceived] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [user, setUser] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else setUser(session.user);
    });
    fetchData();
  }, [router]);

  async function fetchData() {
    const [{ data: custs }, { data: inv }, { data: txns }] = await Promise.all([
      supabase.from('customers').select('*').order('name'),
      supabase.from('inventory').select('*').eq('is_active', true).order('name'),
      supabase.from('transactions').select('customer_id, total_amount').eq('status', 'completed'),
    ]);

    if (custs) setCustomers(custs);
    if (inv) setInventory(inv);

    const customerId = searchParams.get('customer');
    if (customerId && custs) {
      const preSelected = custs.find(c => c.id === customerId);
      if (preSelected) onCustomerSelect(preSelected);
    }

    if (txns && custs) {
      const countMap = {};
      const valueMap = {};
      txns.forEach(t => {
        countMap[t.customer_id] = (countMap[t.customer_id] || 0) + 1;
        valueMap[t.customer_id] = (valueMap[t.customer_id] || 0) + parseDecimal(t.total_amount);
      });
      const custMap = {};
      custs.forEach(c => custMap[c.id] = c);
      const byCount = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => custMap[id]).filter(Boolean);
      const byValue = Object.entries(valueMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => custMap[id]).filter(Boolean);
      setTopByCount(byCount);
      setTopByValue(byValue);
    }
  }

  async function onCustomerSelect(customer) {
    setSelectedCustomer(customer);
    setSaleItems([]);
    setMsg('');
    setCashReceived('');
    setShowDebtDetails(false);

    const [{ data: memories }, { data: lastSales }] = await Promise.all([
      supabase.from('price_memory').select('*, inventory(*)').eq('customer_id', customer.id).order('last_used_at', { ascending: false }),
      supabase.from('transactions').select('*, inventory(name)').eq('customer_id', customer.id).eq('status', 'completed').order('created_at', { ascending: false }).limit(5),
    ]);

    setCustomerDebt(parseDecimal(customer.total_debt) || 0);
    setCustomerLastSales(lastSales || []);

    if (memories && memories.length > 0) {
      setSaleItems(memories.map(m => ({
        inventoryId: m.inventory_id,
        name: m.inventory.name,
        unit: m.unit,
        quantity: m.quantity.toString(),
        price: m.unit_price.toString(),
      })));
    }
  }

  function toggleInventoryItem(item) {
    const exists = saleItems.find(i => i.inventoryId === item.id);
    if (exists) {
      setSaleItems(saleItems.filter(i => i.inventoryId !== item.id));
    } else {
      setSaleItems([...saleItems, {
        inventoryId: item.id, name: item.name,
        unit: item.default_unit, quantity: '', price: '',
        maxQty: parseDecimal(item.stock_quantity),
      }]);
    }
  }

  function updateField(inventoryId, field, value) {
    const normalized = value.replace(/[,،]/g, '.');
    if (field === 'quantity') {
      const item = inventory.find(i => i.id === inventoryId);
      const maxQty = item ? parseDecimal(item.stock_quantity) : 999999;
      if (parseDecimal(normalized) > maxQty) return;
    }
    setSaleItems(saleItems.map(i =>
      i.inventoryId === inventoryId ? { ...i, [field]: normalized } : i
    ));
  }

  const total = saleItems.reduce((sum, i) =>
    sum + ((parseDecimal(i.quantity) || 0) * (parseDecimal(i.price) || 0)), 0);
  const debt = Math.max(0, total - (parseDecimal(cashReceived) || 0));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedCustomer || saleItems.length === 0) return;

    // ── Validation: cash can't exceed total ──
    const cashVal = parseDecimal(cashReceived) || 0;
    if (cashVal > total) {
      setMsg('الكاش المدخل أكثر من قيمة الفاتورة!');
      return;
    }

    setLoading(true);
    try {
      let isFirstItem = true;
      for (const item of saleItems) {
        const qty = parseDecimal(item.quantity);
        const price = parseDecimal(item.price);
        if (!qty || !price) continue;
        await supabase.from('transactions').insert({
          customer_id: selectedCustomer.id,
          salesman_id: user.id,
          inventory_id: item.inventoryId,
          quantity: qty, unit: item.unit,
          unit_price: price, total_amount: qty * price,
          // الكاش بيتحط بأول منتج بس — الباقي صفر
          cash_received: isFirstItem ? cashVal : 0,
          status: 'completed',
        });
        isFirstItem = false;
        await supabase.from('price_memory').upsert({
          customer_id: selectedCustomer.id,
          inventory_id: item.inventoryId,
          quantity: qty, unit: item.unit,
          unit_price: price, total_price: qty * price,
          last_used_at: new Date().toISOString(), use_count: 1,
        }, { onConflict: 'customer_id,inventory_id,quantity,unit' });
      }
      setMsg('هيك الشغل ولا بلاش! 💸');
      setTimeout(() => window.location.href = '/dashboard', 1500);
    } catch (err) {
      console.error('Sale error:', err);
      setMsg('صار خطأ: ' + (err.message || JSON.stringify(err)));
    }
    setLoading(false);
  }

  const unitLabel = { pcs: 'قطعة', g: 'غرام', ctn: 'كرتون' };
  const filteredCustomers = search.trim()
    ? customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search)))
    : customers;
  const showTop = !search.trim() && !selectedCustomer;

  function CustomerBtn({ c }) {
    const isSelected = selectedCustomer?.id === c.id;
    return (
      <button type="button" onClick={() => onCustomerSelect(c)}
        style={{
          width: '100%', padding: '14px 16px', borderRadius: '16px',
          border: `1.5px solid ${isSelected ? '#CE1126' : '#1a1a1a'}`,
          background: isSelected ? 'rgba(206,17,38,0.08)' : '#0f0f0f',
          color: 'white', cursor: 'pointer', textAlign: 'right',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          transition: 'all 0.15s'
        }}>
        <div style={{ textAlign: 'left' }}>
          {parseDecimal(c.total_debt) > 0 && (
            <span style={{ fontSize: '11px', color: '#CE1126', fontWeight: 700 }}>€{parseDecimal(c.total_debt).toFixed(2)}</span>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.name}</div>
          {c.phone && <div style={{ color: '#444', fontSize: '11px' }}>{c.phone}</div>}
        </div>
      </button>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: 'white', fontFamily: 'system-ui', paddingBottom: '60px' }}>

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #000 25%, #fff 25%, #fff 50%, #007A3D 50%, #007A3D 75%, #CE1126 75%)' }} />

      <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #151515' }}>
        <button onClick={() => router.back()}
          style={{ background: 'transparent', border: '1px solid #222', borderRadius: '12px', padding: '8px 14px', color: '#555', cursor: 'pointer', fontSize: '13px' }}>
          رجوع
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#CE1126', letterSpacing: '2px', textTransform: 'uppercase' }}>New Sale</div>
          <div style={{ fontSize: '20px', fontWeight: 900 }}>بيع جديد 🧾</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {!selectedCustomer && (
          <div>
            <p style={{ fontSize: '10px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'right', marginBottom: '12px' }}>اختار الزبون</p>
            <input type="text" placeholder="ابحث عن زبون..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: '#161616', border: '1.5px solid #333', borderRadius: '16px', padding: '14px 16px', color: 'white', fontSize: '14px', textAlign: 'right', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
              onFocus={e => e.target.style.borderColor = '#CE1126'}
              onBlur={e => e.target.style.borderColor = '#333'}
            />
            {showTop && topByCount.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '10px', color: '#007A3D', letterSpacing: '1px', textAlign: 'right', marginBottom: '8px' }}>الاكثر تعاملا</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
                  {topByCount.map(c => (
                    <button key={c.id} type="button" onClick={() => onCustomerSelect(c)}
                      style={{ padding: '8px 14px', borderRadius: '20px', border: '1.5px solid rgba(0,122,61,0.4)', background: 'rgba(0,122,61,0.08)', color: '#007A3D', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {showTop && topByValue.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '10px', color: '#e8971e', letterSpacing: '1px', textAlign: 'right', marginBottom: '8px' }}>الاعلى قيمة</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
                  {topByValue.map(c => (
                    <button key={c.id} type="button" onClick={() => onCustomerSelect(c)}
                      style={{ padding: '8px 14px', borderRadius: '20px', border: '1.5px solid rgba(232,151,30,0.4)', background: 'rgba(232,151,30,0.08)', color: '#e8971e', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {filteredCustomers.length === 0 && (
                <div style={{ textAlign: 'center', padding: '20px', color: '#333', fontSize: '13px' }}>ما في زبون بهاد الاسم</div>
              )}
              {filteredCustomers.map(c => <CustomerBtn key={c.id} c={c} />)}
            </div>
          </div>
        )}

        {selectedCustomer && (
          <>
            <div style={{ background: '#0f0f0f', border: '1.5px solid #CE1126', borderRadius: '18px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button type="button" onClick={() => { setSelectedCustomer(null); setSaleItems([]); setSearch(''); }}
                  style={{ background: 'transparent', border: '1px solid #333', borderRadius: '10px', padding: '6px 10px', color: '#555', cursor: 'pointer', fontSize: '12px' }}>
                  تغيير
                </button>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 900, fontSize: '18px' }}>{selectedCustomer.name}</div>
                  {selectedCustomer.phone && <div style={{ color: '#444', fontSize: '12px' }}>{selectedCustomer.phone}</div>}
                </div>
              </div>
              {customerDebt > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1a1a1a' }}>
                  <button type="button" onClick={() => setShowDebtDetails(!showDebtDetails)}
                    style={{ width: '100%', background: 'rgba(206,17,38,0.08)', border: '1px solid rgba(206,17,38,0.3)', borderRadius: '12px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <span style={{ color: '#CE1126', fontSize: '12px' }}>{showDebtDetails ? '▲ اخفي' : '▼ التفاصيل'}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#555', fontSize: '11px' }}>دين مستحق: </span>
                      <span style={{ color: '#CE1126', fontWeight: 900, fontSize: '16px' }}>€{customerDebt.toFixed(2)}</span>
                    </div>
                  </button>
                  {showDebtDetails && customerLastSales.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {customerLastSales.map(s => (
                        <div key={s.id} style={{ background: '#111', borderRadius: '12px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ textAlign: 'left' }}>
                            {parseDecimal(s.credit_amount) > 0 && (
                              <span style={{ color: '#CE1126', fontSize: '12px', fontWeight: 700 }}>دين: €{parseDecimal(s.credit_amount).toFixed(2)}</span>
                            )}
                            <div style={{ color: '#333', fontSize: '10px' }}>{new Date(s.created_at).toLocaleDateString('ar')}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'white', fontSize: '13px', fontWeight: 700 }}>{s.inventory?.name}</div>
                            <div style={{ color: '#555', fontSize: '11px' }}>€{parseDecimal(s.total_amount).toFixed(2)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {customerDebt === 0 && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #1a1a1a', textAlign: 'right' }}>
                  <span style={{ color: '#007A3D', fontSize: '12px' }}>حساب نظيف ✓</span>
                </div>
              )}
            </div>

            <div>
              <p style={{ fontSize: '10px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'right', marginBottom: '12px' }}>الاصناف والاسعار</p>
              {saleItems.length > 0 && (
                <div style={{ background: 'rgba(0,122,61,0.08)', border: '1px solid rgba(0,122,61,0.2)', borderRadius: '12px', padding: '10px 14px', marginBottom: '12px', textAlign: 'right' }}>
                  <p style={{ color: '#007A3D', fontSize: '12px', margin: 0 }}>آخر اسعار {selectedCustomer.name} — عدّل اذا بدك</p>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {inventory.map(item => {
                  const selected = saleItems.find(i => i.inventoryId === item.id);
                  const maxQty = parseDecimal(item.stock_quantity);
                  return (
                    <div key={item.id} style={{ borderRadius: '16px', border: `1.5px solid ${selected ? '#CE1126' : '#1a1a1a'}`, background: selected ? 'rgba(206,17,38,0.05)' : '#0f0f0f', overflow: 'hidden', transition: 'all 0.15s' }}>
                      <button type="button" onClick={() => toggleInventoryItem(item)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${selected ? '#CE1126' : '#333'}`, background: selected ? '#CE1126' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected && <span style={{ color: 'white', fontSize: '10px' }}>✓</span>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>{item.name}</div>
                          <div style={{ color: '#444', fontSize: '11px' }}>
                            {unitLabel[item.default_unit]} · متوفر: {maxQty}
                          </div>
                        </div>
                      </button>
                      {selected && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '0 14px 14px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <input type="text" inputMode="decimal" placeholder="الكمية"
                              value={selected.quantity}
                              onChange={e => updateField(item.id, 'quantity', e.target.value)}
                              style={{ background: '#0a0a0a', border: '1.5px solid #222', borderRadius: '12px', padding: '10px 12px', color: 'white', fontSize: '13px', textAlign: 'right', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                              onFocus={e => e.target.style.borderColor = '#CE1126'}
                              onBlur={e => e.target.style.borderColor = '#222'}
                            />
                            <input type="text" inputMode="decimal" placeholder="السعر €"
                              value={selected.price}
                              onChange={e => updateField(item.id, 'price', e.target.value)}
                              style={{ background: '#0a0a0a', border: '1.5px solid #222', borderRadius: '12px', padding: '10px 12px', color: 'white', fontSize: '13px', textAlign: 'right', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                              onFocus={e => e.target.style.borderColor = '#007A3D'}
                              onBlur={e => e.target.style.borderColor = '#222'}
                            />
                          </div>
                          {parseDecimal(selected.quantity) > maxQty && (
                            <div style={{ background: 'rgba(206,17,38,0.1)', border: '1px solid rgba(206,17,38,0.2)', borderRadius: '10px', padding: '6px 10px', textAlign: 'right' }}>
                              <span style={{ color: '#CE1126', fontSize: '11px' }}>الكمية المتوفرة: {maxQty} فقط!</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {saleItems.length > 0 && (
              <div>
                <p style={{ fontSize: '10px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'right', marginBottom: '12px' }}>الدفع</p>
                <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ color: '#CE1126', fontWeight: 900, fontSize: '22px' }}>€{total.toFixed(2)}</span>
                    <span style={{ color: '#444', fontSize: '12px' }}>المجموع</span>
                  </div>
                  <input type="text" inputMode="decimal" placeholder="كم دفع؟ €"
                    value={cashReceived}
                    onChange={e => {
                      const val = e.target.value.replace(/[,،]/g, '.');
                      if (parseDecimal(val) > total) return;
                      setCashReceived(val);
                    }}
                    style={{ width: '100%', background: '#161616', border: '1.5px solid #222', borderRadius: '12px', padding: '12px 14px', color: 'white', fontSize: '14px', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#007A3D'}
                    onBlur={e => e.target.style.borderColor = '#222'}
                  />
                  {cashReceived !== '' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1a1a1a' }}>
                      <span style={{ fontWeight: 900, fontSize: '18px', color: debt > 0 ? '#CE1126' : '#007A3D' }}>
                        {debt > 0 ? `دين: €${debt.toFixed(2)}` : 'مدفوع بالكامل ✓'}
                      </span>
                      <span style={{ color: '#444', fontSize: '12px' }}>الباقي</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {msg && (
              <div style={{ background: msg.includes('خطأ') ? 'rgba(206,17,38,0.1)' : 'rgba(0,122,61,0.1)', border: `1px solid ${msg.includes('خطأ') ? 'rgba(206,17,38,0.2)' : 'rgba(0,122,61,0.2)'}`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                <p style={{ color: msg.includes('خطأ') ? '#CE1126' : '#007A3D', fontWeight: 700, fontSize: '14px', margin: 0 }}>{msg}</p>
              </div>
            )}

            {saleItems.length > 0 && (
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '18px', borderRadius: '18px', border: 'none', background: loading ? '#1a1a1a' : 'linear-gradient(135deg, #CE1126, #a00d1e)', color: loading ? '#333' : 'white', fontWeight: 900, fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? '...' : 'تسجيل البيع ←'}
              </button>
            )}
          </>
        )}
      </form>

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #CE1126 25%, #007A3D 25%, #007A3D 50%, #fff 50%, #fff 75%, #000 75%)', position: 'fixed', bottom: 0, width: '100%' }} />
    </div>
  );
}

export default function NewSale() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#080808' }} />}>
      <NewSaleContent />
    </Suspense>
  );
}