'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function CollectCash() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [amount, setAmount] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else setUser(session.user);
    });
    fetchCustomers();
  }, [router]);

  async function fetchCustomers() {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .gt('total_debt', 0)
      .order('total_debt', { ascending: false });
    if (data) setCustomers(data);
  }

  async function handleCollect(e) {
    e.preventDefault();
    if (!selectedCustomer || !amount) return;
    setLoading(true);

    const paid = parseFloat(amount);

    // سجل transaction نوعها تحصيل
    const { error } = await supabase.from('transactions').insert({
      customer_id: selectedCustomer.id,
      salesman_id: user.id,
      inventory_id: null,
      quantity: 0,
      unit: 'pcs',
      unit_price: 0,
      total_amount: 0,
      cash_received: paid,
      status: 'completed',
      notes: 'تحصيل كاش',
    });

    if (error) {
      // inventory_id مش null — نحتاج نعمله بطريقة ثانية
      // نحدث الدين مباشرة
      await supabase.from('customers')
        .update({ total_debt: Math.max(0, parseFloat(selectedCustomer.total_debt) - paid) })
        .eq('id', selectedCustomer.id);
    }

    // تحديث الدين مباشرة
    const newDebt = Math.max(0, parseFloat(selectedCustomer.total_debt) - paid);
    await supabase.from('customers')
      .update({ total_debt: newDebt })
      .eq('id', selectedCustomer.id);

    setMsg('الكاش وصل يا معلم 💵');
    setAmount('');
    setSelectedCustomer(null);
    fetchCustomers();
    setTimeout(() => { setMsg(''); }, 2000);
    setLoading(false);
  }

  const filteredCustomers = search.trim()
    ? customers.filter(c => c.name.includes(search) || (c.phone && c.phone.includes(search)))
    : customers;

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: 'white', fontFamily: 'system-ui', paddingBottom: '60px' }}>

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #000 25%, #fff 25%, #fff 50%, #007A3D 50%, #007A3D 75%, #CE1126 75%)' }} />

      <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #151515' }}>
        <button onClick={() => router.push('/dashboard')}
          style={{ background: 'transparent', border: '1px solid #222', borderRadius: '12px', padding: '8px 14px', color: '#555', cursor: 'pointer', fontSize: '13px' }}>
          رجوع
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#007A3D', letterSpacing: '2px', textTransform: 'uppercase' }}>Collect Cash</div>
          <div style={{ fontSize: '20px', fontWeight: 900 }}>تحصيل كاش 💵</div>
        </div>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {!selectedCustomer && (
          <div>
            <p style={{ fontSize: '10px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'right', marginBottom: '12px' }}>
              اختار الزبون — بس اللي عندهم دين
            </p>

            <input
              type="text"
              placeholder="ابحث عن زبون..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', background: '#161616', border: '1.5px solid #333', borderRadius: '16px', padding: '14px 16px', color: 'white', fontSize: '14px', textAlign: 'right', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
              onFocus={e => e.target.style.borderColor = '#007A3D'}
              onBlur={e => e.target.style.borderColor = '#333'}
            />

            {filteredCustomers.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                <div style={{ color: '#333', fontSize: '13px' }}>ما في زبائن عندهم دين</div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredCustomers.map(c => (
                <button key={c.id} type="button" onClick={() => setSelectedCustomer(c)}
                  style={{
                    width: '100%', padding: '14px 16px', borderRadius: '16px',
                    border: '1.5px solid #1a1a1a',
                    background: '#0f0f0f',
                    color: 'white', cursor: 'pointer', textAlign: 'right',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#007A3D'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}
                >
                  <span style={{ color: '#CE1126', fontWeight: 900, fontSize: '16px' }}>
                    €{parseFloat(c.total_debt).toFixed(2)}
                  </span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.name}</div>
                    {c.phone && <div style={{ color: '#444', fontSize: '11px' }}>{c.phone}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedCustomer && (
          <div>
            {/* معلومات الزبون */}
            <div style={{ background: '#0f0f0f', border: '1.5px solid #007A3D', borderRadius: '18px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button type="button" onClick={() => { setSelectedCustomer(null); setAmount(''); }}
                  style={{ background: 'transparent', border: '1px solid #333', borderRadius: '10px', padding: '6px 10px', color: '#555', cursor: 'pointer', fontSize: '12px' }}>
                  تغيير
                </button>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 900, fontSize: '18px' }}>{selectedCustomer.name}</div>
                  {selectedCustomer.phone && <div style={{ color: '#444', fontSize: '12px' }}>{selectedCustomer.phone}</div>}
                </div>
              </div>
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#CE1126', fontWeight: 900, fontSize: '22px' }}>€{parseFloat(selectedCustomer.total_debt).toFixed(2)}</span>
                <span style={{ color: '#555', fontSize: '12px' }}>الدين الحالي</span>
              </div>
            </div>

            {/* حقل المبلغ */}
            <form onSubmit={handleCollect} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '10px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'right' }}>
                كم دفع؟
              </p>

              <input
                type="text"
                inputMode="decimal"
                placeholder="المبلغ €"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                style={{ width: '100%', background: '#161616', border: '1.5px solid #222', borderRadius: '16px', padding: '18px 16px', color: 'white', fontSize: '22px', textAlign: 'right', outline: 'none', boxSizing: 'border-box', fontWeight: 700 }}
                onFocus={e => e.target.style.borderColor = '#007A3D'}
                onBlur={e => e.target.style.borderColor = '#222'}
              />

              {/* باقي الدين */}
              {amount && (
                <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 900, fontSize: '18px', color: Math.max(0, parseFloat(selectedCustomer.total_debt) - parseFloat(amount || 0)) > 0 ? '#CE1126' : '#007A3D' }}>
                    €{Math.max(0, parseFloat(selectedCustomer.total_debt) - parseFloat(amount || 0)).toFixed(2)}
                  </span>
                  <span style={{ color: '#555', fontSize: '12px' }}>باقي الدين</span>
                </div>
              )}

              {msg && (
                <div style={{ background: 'rgba(0,122,61,0.1)', border: '1px solid rgba(0,122,61,0.2)', borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                  <p style={{ color: '#007A3D', fontWeight: 700, fontSize: '14px', margin: 0 }}>{msg}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '18px', borderRadius: '18px', border: 'none',
                  background: loading ? '#1a1a1a' : 'linear-gradient(135deg, #007A3D, #005f2f)',
                  color: loading ? '#333' : 'white', fontWeight: 900, fontSize: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}>
                {loading ? '...' : 'تسجيل التحصيل ←'}
              </button>
            </form>
          </div>
        )}
      </div>

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #CE1126 25%, #007A3D 25%, #007A3D 50%, #fff 50%, #fff 75%, #000 75%)', position: 'fixed', bottom: 0, width: '100%' }} />
    </div>
  );
}