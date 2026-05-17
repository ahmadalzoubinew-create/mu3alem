'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Reports() {
  const [stats, setStats] = useState({ totalDebt: 0, totalCash: 0, totalInventory: 0 });
  const [customers, setCustomers] = useState([]);
  const [salesmen, setSalesmen] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedSalesman, setSelectedSalesman] = useState(null);
  const [customerTxns, setCustomerTxns] = useState([]);
  const [salesmanTxns, setSalesmanTxns] = useState([]);
  const [activeTab, setActiveTab] = useState('customers');
  const [search, setSearch] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter'); // 'cash' | 'debt' | null

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    const [{ data: custs }, { data: inv }, { data: txns }, { data: users }] = await Promise.all([
      supabase.from('customers').select('*').order('total_debt', { ascending: false }),
      supabase.from('inventory').select('*').eq('is_active', true),
      supabase.from('transactions').select('*').eq('status', 'completed'),
      supabase.from('users').select('*').eq('role', 'salesman'),
    ]);

    if (custs) setCustomers(custs);
    if (inv) setStats(prev => ({ ...prev, totalInventory: inv.reduce((s, i) => s + (parseFloat(i.stock_quantity) * (parseFloat(i.cost_price) || 0)), 0) }));
    if (txns) setStats(prev => ({ ...prev, totalCash: txns.reduce((s, t) => s + parseFloat(t.cash_received || 0), 0) }));
    if (custs) setStats(prev => ({ ...prev, totalDebt: custs.reduce((s, c) => s + parseFloat(c.total_debt || 0), 0) }));
    if (users && txns) {
      setSalesmen(users.map(u => {
        const ut = txns.filter(t => t.salesman_id === u.id);
        return { ...u,
          totalSales: ut.reduce((s, t) => s + parseFloat(t.total_amount || 0), 0),
          totalCash:  ut.reduce((s, t) => s + parseFloat(t.cash_received || 0), 0),
          txnCount: ut.length,
        };
      }));
    }
  }

  async function openCustomer(customer) {
    setSelectedCustomer(customer);
    setSelectedSalesman(null);
    const { data } = await supabase.from('transactions')
      .select('*, inventory(name), users(display_name, full_name)')
      .eq('customer_id', customer.id).eq('status', 'completed')
      .order('created_at', { ascending: false });
    if (data) setCustomerTxns(data);
  }

  async function openSalesman(salesman) {
    setSelectedSalesman(salesman);
    setSelectedCustomer(null);
    const { data } = await supabase.from('transactions')
      .select('*, inventory(name), customers(name)')
      .eq('salesman_id', salesman.id).eq('status', 'completed')
      .order('created_at', { ascending: false });
    if (data) setSalesmanTxns(data);
  }

  const filteredCustomers = (() => {
    let list = search.trim()
      ? customers.filter(c => c.name.includes(search))
      : customers;
    if (filter === 'debt') list = list.filter(c => parseFloat(c.total_debt) > 0);
    if (filter === 'cash') list = list.filter(c => parseFloat(c.total_debt) === 0);
    return list;
  })();

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: 'white', fontFamily: 'system-ui', paddingBottom: '60px' }}>

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #000 25%, #fff 25%, #fff 50%, #007A3D 50%, #007A3D 75%, #CE1126 75%)' }} />

      <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #151515' }}>
        <button onClick={() => {
          if (selectedCustomer || selectedSalesman) { setSelectedCustomer(null); setSelectedSalesman(null); }
          else router.push('/dashboard');
        }} style={{ background: 'transparent', border: '1px solid #222', borderRadius: '12px', padding: '8px 14px', color: '#555', cursor: 'pointer', fontSize: '13px' }}>
          رجوع
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#888', letterSpacing: '2px', textTransform: 'uppercase' }}>Reports</div>
          <div style={{ fontSize: '20px', fontWeight: 900 }}>التقارير 📊</div>
          {filter === 'debt' && <div style={{ fontSize: '11px', color: '#e8971e', marginTop: '2px' }}>عرض: الزبائن عليهم دين</div>}
          {filter === 'cash' && <div style={{ fontSize: '11px', color: '#007A3D', marginTop: '2px' }}>عرض: الزبائن دفعوا كاش</div>}
        </div>
      </div>

      {!selectedCustomer && !selectedSalesman && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '16px 20px 0' }}>
            {[
              { label: 'اجمالي الديون', val: `€${stats.totalDebt.toFixed(2)}`, color: '#CE1126', bg: 'rgba(206,17,38,0.08)', border: 'rgba(206,17,38,0.2)' },
              { label: 'اجمالي الكاش', val: `€${stats.totalCash.toFixed(2)}`, color: '#007A3D', bg: 'rgba(0,122,61,0.08)', border: 'rgba(0,122,61,0.2)' },
              { label: 'قيمة المخزون', val: `€${stats.totalInventory.toFixed(2)}`, color: '#e8971e', bg: 'rgba(232,151,30,0.08)', border: 'rgba(232,151,30,0.2)' },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: '16px', padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '9px', color: '#555', marginBottom: '4px' }}>{s.label}</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Reconciliation Button */}
          <div style={{ padding: '12px 20px 0' }}>
            <button onClick={() => router.push('/reconciliation')}
              style={{ width: '100%', padding: '14px', borderRadius: '16px',
                border: '1.5px solid rgba(232,151,30,0.4)',
                background: 'rgba(232,151,30,0.06)',
                color: '#e8971e', fontWeight: 700, fontSize: '14px',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px' }}>
              🔍 مطابقة الحسابات — Admin
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '12px 20px 0' }}>
            {[{ key: 'customers', label: 'الزبائن' }, { key: 'salesmen', label: 'المناديب' }].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{ padding: '12px', borderRadius: '14px', border: '1.5px solid',
                  borderColor: activeTab === tab.key ? '#CE1126' : '#1a1a1a',
                  background: activeTab === tab.key ? 'rgba(206,17,38,0.08)' : '#0f0f0f',
                  color: activeTab === tab.key ? '#CE1126' : '#555',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <div style={{ padding: '12px 20px 0' }}>
              <input type="text" placeholder="ابحث عن زبون..." value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%', background: '#161616', border: '1.5px solid #333', borderRadius: '16px', padding: '12px 16px', color: 'white', fontSize: '14px', textAlign: 'right', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
                onFocus={e => e.target.style.borderColor = '#CE1126'}
                onBlur={e => e.target.style.borderColor = '#333'}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredCustomers.map(c => (
                  <button key={c.id} onClick={() => openCustomer(c)}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid #1a1a1a', background: '#0f0f0f', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#CE1126'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}>
                    <div>
                      {parseFloat(c.total_debt) > 0
                        ? <span style={{ color: '#CE1126', fontWeight: 700, fontSize: '14px' }}>€{parseFloat(c.total_debt).toFixed(2)}</span>
                        : <span style={{ color: '#007A3D', fontSize: '12px' }}>نظيف ✓</span>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.name}</div>
                      {c.phone && <div style={{ color: '#444', fontSize: '11px' }}>{c.phone}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Salesmen Tab */}
          {activeTab === 'salesmen' && (
            <div style={{ padding: '12px 20px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {salesmen.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#333' }}>ما في مناديب لهلأ</div>
              )}
              {salesmen.map(s => (
                <button key={s.id} onClick={() => openSalesman(s)}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid #1a1a1a', background: '#0f0f0f', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#007A3D'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: '#007A3D', fontWeight: 700, fontSize: '14px' }}>€{s.totalCash.toFixed(2)}</div>
                    <div style={{ color: '#444', fontSize: '11px' }}>{s.txnCount} عملية</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{s.display_name || s.full_name}</div>
                    <div style={{ color: '#444', fontSize: '11px' }}>مجموع: €{s.totalSales.toFixed(2)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* تفاصيل زبون */}
      {selectedCustomer && (
        <div style={{ padding: '20px' }}>
          <div style={{ background: '#0f0f0f', border: '1.5px solid #CE1126', borderRadius: '18px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 900, fontSize: '18px' }}>{selectedCustomer.name}</div>
              {selectedCustomer.phone && <div style={{ color: '#444', fontSize: '12px' }}>{selectedCustomer.phone}</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1a1a1a' }}>
              <span style={{ color: '#CE1126', fontWeight: 900, fontSize: '20px' }}>€{parseFloat(selectedCustomer.total_debt).toFixed(2)}</span>
              <span style={{ color: '#555', fontSize: '12px' }}>الدين الحالي</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {customerTxns.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: '#333' }}>ما في عمليات</div>}
            {customerTxns.map(t => (
              <div key={t.id} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#CE1126', fontWeight: 900, fontSize: '16px' }}>€{parseFloat(t.total_amount).toFixed(2)}</span>
                  <span style={{ color: 'white', fontWeight: 700 }}>{t.inventory?.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    {parseFloat(t.credit_amount) > 0 && (
                      <span style={{ color: '#e8971e', fontSize: '12px' }}>دين: €{parseFloat(t.credit_amount).toFixed(2)}</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#444', fontSize: '11px' }}>{t.users?.display_name || t.users?.full_name}</div>
                    <div style={{ color: '#333', fontSize: '10px' }}>
                      {new Date(t.created_at).toLocaleDateString('ar')} · {new Date(t.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* تفاصيل مندوب */}
      {selectedSalesman && (
        <div style={{ padding: '20px' }}>
          <div style={{ background: '#0f0f0f', border: '1.5px solid #007A3D', borderRadius: '18px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ textAlign: 'right', marginBottom: '12px' }}>
              <div style={{ fontWeight: 900, fontSize: '18px' }}>{selectedSalesman.display_name || selectedSalesman.full_name}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'اجمالي المبيعات', val: `€${selectedSalesman.totalSales.toFixed(2)}`, color: '#CE1126' },
                { label: 'اجمالي الكاش', val: `€${selectedSalesman.totalCash.toFixed(2)}`, color: '#007A3D' },
              ].map(s => (
                <div key={s.label} style={{ background: '#161616', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>{s.label}</div>
                  <div style={{ fontSize: '16px', fontWeight: 900, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {salesmanTxns.map(t => (
              <div key={t.id} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#CE1126', fontWeight: 900, fontSize: '15px' }}>€{parseFloat(t.total_amount).toFixed(2)}</span>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: '13px' }}>{t.customers?.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ color: '#007A3D', fontSize: '12px' }}>كاش: €{parseFloat(t.cash_received).toFixed(2)}</span>
                    {parseFloat(t.credit_amount) > 0 && (
                      <span style={{ color: '#e8971e', fontSize: '12px', marginRight: '8px' }}> · دين: €{parseFloat(t.credit_amount).toFixed(2)}</span>
                    )}
                  </div>
                  <div style={{ color: '#333', fontSize: '10px', textAlign: 'right' }}>
                    {new Date(t.created_at).toLocaleDateString('ar')} · {new Date(t.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {t.inventory?.name && (
                  <div style={{ textAlign: 'right', marginTop: '4px' }}>
                    <span style={{ color: '#444', fontSize: '11px' }}>{t.inventory.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #CE1126 25%, #007A3D 25%, #007A3D 50%, #fff 50%, #fff 75%, #000 75%)', position: 'fixed', bottom: 0, width: '100%' }} />
    </div>
  );
}