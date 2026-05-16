'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useAutoLogout } from '../lib/useAutoLogout';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [pressed, setPressed] = useState(null);
  const [stats, setStats] = useState({ today: 0, cash: 0, debt: 0 });
  const [recentTxns, setRecentTxns] = useState([]);
  const router = useRouter();
  useAutoLogout();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else setUser(session.user);
    });
    fetchStats();
    fetchRecentTxns();
  }, [router]);

  useEffect(() => {
    const handleFocus = () => {
      fetchStats();
      fetchRecentTxns();
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) handleFocus();
    });
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      fetchRecentTxns();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { data } = await supabase
      .from('transactions')
      .select('total_amount, cash_received, credit_amount')
      .eq('status', 'completed')
      .gte('created_at', today.toISOString());
    if (data) {
      setStats({
        today: data.reduce((s, t) => s + parseFloat(t.total_amount || 0), 0),
        cash:  data.reduce((s, t) => s + parseFloat(t.cash_received || 0), 0),
        debt:  data.reduce((s, t) => s + parseFloat(t.credit_amount || 0), 0),
      });
    }
  }

  async function fetchRecentTxns() {
    const { data } = await supabase
      .from('transactions')
      .select('*, customers(name), inventory(name)')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setRecentTxns(data);
  }

  async function handleAddCustomer(e) {
    e.preventDefault();
    setLoading(true);
    setMsg('');
    const { error } = await supabase
      .from('customers')
      .insert({ name, phone, notes, created_by: user.id });
    if (error) {
      setMsg('صار خطأ، جرب مرة ثانية');
      setLoading(false);
      return;
    }
    setMsg('كبرت الشبكة يا معلم 🤝');
    setName(''); setPhone(''); setNotes('');
    setTimeout(() => { setShowAddCustomer(false); setMsg(''); }, 1500);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: 'white', fontFamily: 'system-ui' }}>

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #000 25%, #fff 25%, #fff 50%, #007A3D 50%, #007A3D 75%, #CE1126 75%)' }} />

      <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <button onClick={handleLogout}
          style={{ fontSize: '11px', color: '#555', border: '1px solid #222', borderRadius: '12px', padding: '6px 12px', background: 'transparent', cursor: 'pointer', marginTop: '6px' }}>
          خروج
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '34px', color: '#CE1126', fontWeight: 900, lineHeight: 1 }}>مُعلم</div>
          <div style={{ fontSize: '11px', color: '#444', marginTop: '2px' }}>{dateStr}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '16px 20px 0' }}>
        {[
          { label: 'اليوم', val: `€${stats.today.toFixed(2)}`, color: '#CE1126', bg: 'rgba(206,17,38,0.08)', border: 'rgba(206,17,38,0.2)' },
          { label: 'كاش', val: `€${stats.cash.toFixed(2)}`, color: '#007A3D', bg: 'rgba(0,122,61,0.08)', border: 'rgba(0,122,61,0.2)' },
          { label: 'دين', val: `€${stats.debt.toFixed(2)}`, color: '#e8971e', bg: 'rgba(232,151,30,0.08)', border: 'rgba(232,151,30,0.2)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: '16px', padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowAddCustomer(true)}
          onMouseDown={() => setPressed('cust')}
          onMouseUp={() => setPressed(null)}
          onTouchStart={() => setPressed('cust')}
          onTouchEnd={() => setPressed(null)}
          style={{
            background: pressed === 'cust' ? '#007A3D' : 'rgba(0,122,61,0.15)',
            border: '1.5px solid #007A3D', borderRadius: '14px',
            padding: '10px 16px', color: pressed === 'cust' ? '#000' : '#007A3D',
            fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            transition: 'all 0.1s', transform: pressed === 'cust' ? 'scale(0.95)' : 'scale(1)',
          }}>
          👤 زبون جديد
        </button>
      </div>

      <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p style={{ fontSize: '10px', color: '#333', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'right', marginBottom: '4px' }}>الإجراءات</p>

        <button
          onClick={() => router.push('/new-sale')}
          onMouseDown={() => setPressed('sale')}
          onMouseUp={() => setPressed(null)}
          onTouchStart={() => setPressed('sale')}
          onTouchEnd={() => setPressed(null)}
          style={{
            borderRadius: '20px', border: '1.5px solid #CE1126',
            background: pressed === 'sale' ? '#CE1126' : 'rgba(206,17,38,0.08)',
            cursor: 'pointer', transition: 'all 0.1s ease', width: '100%',
            textAlign: 'right', padding: '22px 20px', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            transform: pressed === 'sale' ? 'scale(0.97)' : 'scale(1)',
          }}>
          <span style={{ fontSize: '36px' }}>🧾</span>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: pressed === 'sale' ? '#000' : '#CE1126' }}>بيع جديد</div>
            <div style={{ fontSize: '11px', color: pressed === 'sale' ? '#333' : '#555' }}>New Sale</div>
          </div>
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {[
            { key: 'cash', emoji: '💵', ar: 'تحصيل', en: 'Cash', color: '#007A3D', bg: 'rgba(0,122,61,0.08)', fn: () => router.push('/collect-cash') },
            { key: 'inv', emoji: '📦', ar: 'مخزون', en: 'Inventory', color: '#e8971e', bg: 'rgba(232,151,30,0.08)', fn: () => router.push('/inventory') },
            { key: 'cust-list', emoji: '👥', ar: 'الزبائن', en: 'Customers', color: '#CE1126', bg: 'rgba(206,17,38,0.08)', fn: () => router.push('/customers') },
            { key: 'rep', emoji: '📊', ar: 'تقارير', en: 'Reports', color: '#888', bg: 'rgba(255,255,255,0.04)', fn: () => router.push('/reports') },
            { key: 'set', emoji: '🤝', ar: 'تسوية', en: 'Settlement', color: '#e8971e', bg: 'rgba(232,151,30,0.08)', fn: () => router.push('/settlement') },
          ].map(b => (
            <button key={b.key} onClick={b.fn}
              onMouseDown={() => setPressed(b.key)}
              onMouseUp={() => setPressed(null)}
              onTouchStart={() => setPressed(b.key)}
              onTouchEnd={() => setPressed(null)}
              style={{
                borderRadius: '18px',
                border: `1.5px solid ${pressed === b.key ? b.color : b.color + '55'}`,
                background: pressed === b.key ? b.color : b.bg,
                padding: '16px 8px', cursor: 'pointer', transition: 'all 0.1s',
                transform: pressed === b.key ? 'scale(0.93)' : 'scale(1)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              }}>
              <span style={{ fontSize: '26px' }}>{b.emoji}</span>
              <span style={{ fontSize: '12px', fontWeight: 800, color: pressed === b.key ? '#000' : b.color }}>{b.ar}</span>
              <span style={{ fontSize: '9px', color: pressed === b.key ? '#333' : '#444' }}>{b.en}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '24px 20px 60px' }}>
        <p style={{ fontSize: '10px', color: '#333', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'right', marginBottom: '12px' }}>آخر العمليات</p>
        {recentTxns.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #151515', borderRadius: '20px', padding: '30px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
            <div style={{ color: '#333', fontSize: '13px' }}>ما في عمليات لهلأ</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentTxns.map(t => (
              <div key={t.id} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#CE1126' }}>€{parseFloat(t.total_amount).toFixed(2)}</div>
                  {parseFloat(t.credit_amount) > 0 && (
                    <div style={{ fontSize: '11px', color: '#e8971e' }}>دين: €{parseFloat(t.credit_amount).toFixed(2)}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700 }}>{t.customers?.name}</div>
                  <div style={{ fontSize: '11px', color: '#444' }}>{t.inventory?.name} · {new Date(t.created_at).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #CE1126 25%, #007A3D 25%, #007A3D 50%, #fff 50%, #fff 75%, #000 75%)', position: 'fixed', bottom: 0, width: '100%' }} />

      {showAddCustomer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setShowAddCustomer(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '400px', borderRadius: '28px', overflow: 'hidden', background: '#0f0f0f', border: '1px solid #1a1a1a' }}>

            <div style={{ height: '3px', background: 'linear-gradient(90deg, #CE1126, #007A3D, #fff, #000)' }} />

            <div style={{ padding: '20px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #161616' }}>
              <button onClick={() => setShowAddCustomer(false)}
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #222', background: 'transparent', color: '#555', cursor: 'pointer', fontSize: '14px' }}>✕</button>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#007A3D', letterSpacing: '2px', textTransform: 'uppercase' }}>New Customer</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: 'white' }}>زبون جديد</div>
              </div>
            </div>

            <div style={{ padding: '20px', maxHeight: '65vh', overflowY: 'auto' }}>
              <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="text" placeholder="اسم الزبون" value={name}
                  onChange={e => setName(e.target.value)} required
                  style={{ width: '100%', background: '#161616', border: '1.5px solid #222', borderRadius: '16px', padding: '14px 16px', color: 'white', fontSize: '14px', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#CE1126'}
                  onBlur={e => e.target.style.borderColor = '#222'}
                />
                <input type="text" placeholder="رقم الهاتف (اختياري)" value={phone}
                  onChange={e => setPhone(e.target.value)}
                  style={{ width: '100%', background: '#161616', border: '1.5px solid #222', borderRadius: '16px', padding: '14px 16px', color: 'white', fontSize: '14px', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#CE1126'}
                  onBlur={e => e.target.style.borderColor = '#222'}
                />
                <textarea placeholder="ملاحظات (اختياري)" value={notes}
                  onChange={e => setNotes(e.target.value)} rows={2}
                  style={{ width: '100%', background: '#161616', border: '1.5px solid #222', borderRadius: '16px', padding: '14px 16px', color: 'white', fontSize: '14px', textAlign: 'right', outline: 'none', boxSizing: 'border-box', resize: 'none', fontFamily: 'system-ui' }}
                  onFocus={e => e.target.style.borderColor = '#CE1126'}
                  onBlur={e => e.target.style.borderColor = '#222'}
                />

                {msg && (
                  <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 700, color: msg.includes('خطأ') ? '#CE1126' : '#007A3D', padding: '8px', borderRadius: '12px', background: msg.includes('خطأ') ? 'rgba(206,17,38,0.1)' : 'rgba(0,122,61,0.1)' }}>
                    {msg}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  style={{
                    width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                    background: loading ? '#1a1a1a' : 'linear-gradient(135deg, #007A3D, #005f2f)',
                    color: loading ? '#333' : 'white', fontWeight: 900, fontSize: '14px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}>
                  {loading ? '...' : 'اضافة الزبون ←'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}