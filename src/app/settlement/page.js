'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Settlement() {
  const [salesmen, setSalesmen] = useState([]);
  const [selectedSalesman, setSelectedSalesman] = useState(null);
  const [salesmanStats, setSalesmanStats] = useState(null);
  const [cashHandled, setCashHandled] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else setUser(session.user);
    });
    fetchSalesmen();
  }, [router]);

  async function fetchSalesmen() {
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'salesman');

    if (!users) return;

    // جيب احصائيات كل مندوب من آخر تسوية
    const salesmenWithStats = await Promise.all(users.map(async u => {
      // آخر تسوية
      const { data: lastSettlement } = await supabase
        .from('settlements')
        .select('*')
        .eq('salesman_id', u.id)
        .order('settled_at', { ascending: false })
        .limit(1)
        .single();

      const lastSettledAt = lastSettlement?.settled_at || '2000-01-01';

      // عمليات بعد آخر تسوية
      const { data: txns } = await supabase
        .from('transactions')
        .select('*')
        .eq('salesman_id', u.id)
        .eq('status', 'completed')
        .gt('created_at', lastSettledAt);

      const totalSales = txns?.reduce((s, t) => s + parseFloat(t.total_amount || 0), 0) || 0;
      const totalCash = txns?.reduce((s, t) => s + parseFloat(t.cash_received || 0), 0) || 0;
      const totalDebt = txns?.reduce((s, t) => s + parseFloat(t.credit_amount || 0), 0) || 0;
      const prevRemaining = lastSettlement?.cash_remaining || 0;

      return {
        ...u,
        totalSales,
        totalCash,
        totalDebt,
        prevRemaining: parseFloat(prevRemaining),
        txnCount: txns?.length || 0,
        lastSettledAt,
      };
    }));

    setSalesmen(salesmenWithStats);
  }

  async function openSalesman(salesman) {
    setSelectedSalesman(salesman);
    setSalesmanStats(salesman);
    setCashHandled('');
    setNotes('');
    setMsg('');
  }

  async function handleSettle(e) {
    e.preventDefault();
    if (!selectedSalesman) return;
    setLoading(true);

    const handed = parseFloat(cashHandled) || 0;
    const totalAvailable = selectedSalesman.totalCash + selectedSalesman.prevRemaining;
    const remaining = totalAvailable - handed;

    const { error } = await supabase.from('settlements').insert({
      salesman_id: selectedSalesman.id,
      cash_collected: totalAvailable,
      cash_handed: handed,
      notes: notes,
      created_by: user.id,
      settled_at: new Date().toISOString(),
    });

    if (error) {
      setMsg('صار خطأ، جرب مرة ثانية');
      setLoading(false);
      return;
    }

    setMsg(`تمت التسوية! ضل عنده €${remaining.toFixed(2)} 💰`);
    setTimeout(() => {
      setSelectedSalesman(null);
      setSalesmanStats(null);
      fetchSalesmen();
      setMsg('');
    }, 2000);
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: 'white', fontFamily: 'system-ui', paddingBottom: '60px' }}>

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #000 25%, #fff 25%, #fff 50%, #007A3D 50%, #007A3D 75%, #CE1126 75%)' }} />

      <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #151515' }}>
        <button onClick={() => {
          if (selectedSalesman) { setSelectedSalesman(null); setSalesmanStats(null); }
          else router.push('/dashboard');
        }}
          style={{ background: 'transparent', border: '1px solid #222', borderRadius: '12px', padding: '8px 14px', color: '#555', cursor: 'pointer', fontSize: '13px' }}>
          رجوع
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#e8971e', letterSpacing: '2px', textTransform: 'uppercase' }}>Settlement</div>
          <div style={{ fontSize: '20px', fontWeight: 900 }}>التسوية 💰</div>
        </div>
      </div>

      {!selectedSalesman && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '10px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'right', marginBottom: '4px' }}>اختار المندوب</p>

          {salesmen.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#333' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
              <div style={{ fontSize: '13px' }}>ما في مناديب لهلأ</div>
            </div>
          )}

          {salesmen.map(s => (
            <button key={s.id} onClick={() => openSalesman(s)}
              style={{ width: '100%', padding: '16px', borderRadius: '18px', border: '1px solid #1a1a1a', background: '#0f0f0f', color: 'white', cursor: 'pointer', textAlign: 'right', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#e8971e'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: '#007A3D', fontWeight: 900, fontSize: '16px' }}>€{(s.totalCash + s.prevRemaining).toFixed(2)}</div>
                  <div style={{ color: '#444', fontSize: '11px', marginTop: '2px' }}>معه كاش</div>
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '16px' }}>{s.display_name || s.full_name}</div>
                  <div style={{ color: '#444', fontSize: '11px', marginTop: '2px' }}>{s.txnCount} عملية منذ آخر تسوية</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1a1a1a' }}>
                {[
                  { label: 'مبيعات', val: `€${s.totalSales.toFixed(2)}`, color: '#CE1126' },
                  { label: 'ديون زبائن', val: `€${s.totalDebt.toFixed(2)}`, color: '#e8971e' },
                  { label: 'من قبل', val: `€${s.prevRemaining.toFixed(2)}`, color: '#888' },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center', background: '#161616', borderRadius: '10px', padding: '8px 4px' }}>
                    <div style={{ fontSize: '9px', color: '#444', marginBottom: '3px' }}>{stat.label}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: stat.color }}>{stat.val}</div>
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedSalesman && (
        <div style={{ padding: '20px' }}>

          {/* معلومات المندوب */}
          <div style={{ background: '#0f0f0f', border: '1.5px solid #e8971e', borderRadius: '20px', padding: '18px', marginBottom: '20px' }}>
            <div style={{ textAlign: 'right', marginBottom: '14px' }}>
              <div style={{ fontWeight: 900, fontSize: '20px' }}>{selectedSalesman.display_name || selectedSalesman.full_name}</div>
              <div style={{ color: '#444', fontSize: '12px', marginTop: '2px' }}>{selectedSalesman.txnCount} عملية منذ آخر تسوية</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              {[
                { label: 'مبيعات', val: `€${selectedSalesman.totalSales.toFixed(2)}`, color: '#CE1126' },
                { label: 'ديون زبائن', val: `€${selectedSalesman.totalDebt.toFixed(2)}`, color: '#e8971e' },
                { label: 'كاش من مبيعات', val: `€${selectedSalesman.totalCash.toFixed(2)}`, color: '#007A3D' },
                { label: 'ضل من قبل', val: `€${selectedSalesman.prevRemaining.toFixed(2)}`, color: '#888' },
              ].map(stat => (
                <div key={stat.label} style={{ background: '#161616', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#444', marginBottom: '4px' }}>{stat.label}</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: stat.color }}>{stat.val}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#1a1a1a', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#007A3D', fontWeight: 900, fontSize: '20px' }}>
                €{(selectedSalesman.totalCash + selectedSalesman.prevRemaining).toFixed(2)}
              </span>
              <span style={{ color: '#555', fontSize: '12px' }}>اجمالي الكاش معه</span>
            </div>
          </div>

          {/* فورم التسوية */}
          <form onSubmit={handleSettle} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '10px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'right' }}>
              كم سلّمك؟
            </p>

            <input
              type="text"
              inputMode="decimal"
              placeholder="المبلغ €"
              value={cashHandled}
              onChange={e => setCashHandled(e.target.value)}
              required
              style={{ width: '100%', background: '#161616', border: '1.5px solid #222', borderRadius: '16px', padding: '18px 16px', color: 'white', fontSize: '22px', textAlign: 'right', outline: 'none', boxSizing: 'border-box', fontWeight: 700 }}
              onFocus={e => e.target.style.borderColor = '#007A3D'}
              onBlur={e => e.target.style.borderColor = '#222'}
            />

            {cashHandled && (
              <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 900, fontSize: '18px', color: (selectedSalesman.totalCash + selectedSalesman.prevRemaining - parseFloat(cashHandled || 0)) > 0 ? '#e8971e' : '#007A3D' }}>
                  €{Math.max(0, selectedSalesman.totalCash + selectedSalesman.prevRemaining - parseFloat(cashHandled || 0)).toFixed(2)}
                </span>
                <span style={{ color: '#555', fontSize: '12px' }}>ضل عنده</span>
              </div>
            )}

            <input
              type="text"
              placeholder="ملاحظات (اختياري)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ width: '100%', background: '#161616', border: '1.5px solid #222', borderRadius: '16px', padding: '14px 16px', color: 'white', fontSize: '14px', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#e8971e'}
              onBlur={e => e.target.style.borderColor = '#222'}
            />

            {msg && (
              <div style={{ background: msg.includes('خطأ') ? 'rgba(206,17,38,0.1)' : 'rgba(0,122,61,0.1)', border: `1px solid ${msg.includes('خطأ') ? 'rgba(206,17,38,0.2)' : 'rgba(0,122,61,0.2)'}`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
                <p style={{ color: msg.includes('خطأ') ? '#CE1126' : '#007A3D', fontWeight: 700, fontSize: '14px', margin: 0 }}>{msg}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '18px', borderRadius: '18px', border: 'none',
                background: loading ? '#1a1a1a' : 'linear-gradient(135deg, #e8971e, #c97d10)',
                color: loading ? '#333' : 'black', fontWeight: 900, fontSize: '16px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}>
              {loading ? '...' : 'تسجيل التسوية ←'}
            </button>
          </form>
        </div>
      )}

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #CE1126 25%, #007A3D 25%, #007A3D 50%, #fff 50%, #fff 75%, #000 75%)', position: 'fixed', bottom: 0, width: '100%' }} />
    </div>
  );
}