'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useAutoLogout } from '../lib/useAutoLogout';

// ─── Bottom Nav Tab ────────────────────────────────────────
function NavTab({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: '3px', padding: '10px 0',
      background: 'transparent', border: 'none', cursor: 'pointer',
      borderTop: active ? '2px solid #CE1126' : '2px solid transparent',
    }}>
      <span style={{ fontSize: '22px' }}>{icon}</span>
      <span style={{ fontSize: '10px', fontWeight: active ? 700 : 400,
        color: active ? '#CE1126' : '#444', letterSpacing: '0.5px' }}>
        {label}
      </span>
    </button>
  );
}

// ─── KPI Card ─────────────────────────────────────────────
function KpiCard({ label, value, color, bg, border }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${border}`,
      borderRadius: '16px', padding: '14px 10px', textAlign: 'center', flex: 1 }}>
      <div style={{ fontSize: '10px', color: '#555', marginBottom: '4px',
        textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

// ─── Big Action Button ─────────────────────────────────────
function BigBtn({ emoji, label, sub, color, bg, border, onClick }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{
        flex: 1, padding: '24px 12px', borderRadius: '22px',
        border: `2px solid ${pressed ? color : border}`,
        background: pressed ? color : bg,
        cursor: 'pointer', transition: 'all 0.1s',
        transform: pressed ? 'scale(0.96)' : 'scale(1)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
      }}>
      <span style={{ fontSize: '36px' }}>{emoji}</span>
      <span style={{ fontSize: '16px', fontWeight: 900,
        color: pressed ? '#000' : color }}>{label}</span>
      <span style={{ fontSize: '11px', color: pressed ? '#333' : '#555' }}>{sub}</span>
    </button>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({ today: 0, cash: 0, debt: 0 });
  const [recentTxns, setRecentTxns] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState('home');
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custNotes, setCustNotes] = useState('');
  const [custLoading, setCustLoading] = useState(false);
  const [custMsg, setCustMsg] = useState('');
  const router = useRouter();
  useAutoLogout();

  const fetchAll = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ data: txns }, { data: recent }, { data: custs }, { data: inv }] = await Promise.all([
      supabase.from('transactions').select('total_amount,cash_received,credit_amount')
        .eq('status', 'completed').gte('created_at', today.toISOString()),
      supabase.from('transactions').select('*, customers(name), inventory(name)')
        .eq('status', 'completed').order('created_at', { ascending: false }).limit(8),
      supabase.from('customers').select('*').order('name'),
      supabase.from('inventory').select('*').eq('is_active', true).order('name'),
    ]);

    if (txns) setStats({
      today: txns.reduce((s, t) => s + parseFloat(t.total_amount || 0), 0),
      cash:  txns.reduce((s, t) => s + parseFloat(t.cash_received || 0), 0),
      debt:  txns.reduce((s, t) => s + parseFloat(t.credit_amount || 0), 0),
    });
    if (recent) setRecentTxns(recent);
    if (custs)  setCustomers(custs);
    if (inv)    setInventory(inv);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push('/login');
      else setUser(session.user);
    });
    fetchAll();
    // Refresh on visibility change (return from sale page)
    const onVisible = () => { if (!document.hidden) fetchAll(); };
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(fetchAll, 30000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, [router, fetchAll]);

  async function handleAddCustomer(e) {
    e.preventDefault();
    setCustLoading(true);
    const { error } = await supabase.from('customers')
      .insert({ name: custName, phone: custPhone, notes: custNotes, created_by: user.id });
    if (error) { setCustMsg('صار خطأ'); }
    else {
      setCustMsg('كبرت الشبكة يا معلم 🤝');
      setCustName(''); setCustPhone(''); setCustNotes('');
      fetchAll();
      setTimeout(() => { setShowAddCustomer(false); setCustMsg(''); }, 1400);
    }
    setCustLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    localStorage.removeItem('mu3alem_pin_locked');
    localStorage.removeItem('mu3alem_last_active');
    router.push('/login');
  }

  const f = (n) => `€${parseFloat(n || 0).toFixed(2)}`;

  // ── HOME TAB ─────────────────────────────────────────────
  const HomeTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px',
      padding: '16px 16px 0' }}>

      {/* KPI Row */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <KpiCard label="اليوم" value={f(stats.today)}
          color="#CE1126" bg="rgba(206,17,38,0.08)" border="rgba(206,17,38,0.2)" />
        <KpiCard label="كاش" value={f(stats.cash)}
          color="#007A3D" bg="rgba(0,122,61,0.08)" border="rgba(0,122,61,0.2)" />
        <KpiCard label="دين" value={f(stats.debt)}
          color="#e8971e" bg="rgba(232,151,30,0.08)" border="rgba(232,151,30,0.2)" />
      </div>

      {/* TWO BIG BUTTONS — thumb zone */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <BigBtn emoji="🧾" label="بيع جديد" sub="New Sale"
          color="#007A3D" bg="rgba(0,122,61,0.08)"
          border="rgba(0,122,61,0.3)"
          onClick={() => router.push('/new-sale')} />
        <BigBtn emoji="💵" label="تحصيل" sub="Collect Debt"
          color="#1d6fa4" bg="rgba(29,111,164,0.08)"
          border="rgba(29,111,164,0.3)"
          onClick={() => router.push('/collect-cash')} />
      </div>

      {/* Add Customer Quick Button */}
      <button onClick={() => setShowAddCustomer(true)} style={{
        width: '100%', padding: '14px', borderRadius: '16px',
        border: '1.5px solid rgba(232,151,30,0.4)',
        background: 'rgba(232,151,30,0.06)',
        color: '#e8971e', fontWeight: 700, fontSize: '14px',
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', gap: '8px',
      }}>
        👤 زبون جديد
      </button>

      {/* Recent Transactions */}
      <div>
        <p style={{ fontSize: '10px', color: '#333', letterSpacing: '2px',
          textTransform: 'uppercase', textAlign: 'right', marginBottom: '10px' }}>
          آخر العمليات
        </p>
        {recentTxns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#333' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>📭</div>
            <div style={{ fontSize: '13px' }}>ابدأ ببيع جديد</div>
          </div>
        ) : recentTxns.map(t => (
          <div key={t.id} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a',
            borderRadius: '14px', padding: '11px 14px', marginBottom: '7px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#CE1126' }}>
                {f(t.total_amount)}
              </div>
              {parseFloat(t.credit_amount) > 0 && (
                <div style={{ fontSize: '11px', color: '#e8971e' }}>
                  دين: {f(t.credit_amount)}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{t.customers?.name}</div>
              <div style={{ fontSize: '10px', color: '#444' }}>
                {t.inventory?.name} · {new Date(t.created_at)
                  .toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── CUSTOMERS TAB ─────────────────────────────────────────
  const CustomersTab = () => {
    const [search, setSearch] = useState('');
    const filtered = search.trim()
      ? customers.filter(c => c.name.includes(search) || (c.phone && c.phone.includes(search)))
      : customers;
    return (
      <div style={{ padding: '16px' }}>
        <input type="text" placeholder="ابحث..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', background: '#161616', border: '1.5px solid #333',
            borderRadius: '14px', padding: '12px 14px', color: 'white', fontSize: '14px',
            textAlign: 'right', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
          onFocus={e => e.target.style.borderColor = '#CE1126'}
          onBlur={e => e.target.style.borderColor = '#333'}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(c => (
            <button key={c.id}
              onClick={() => router.push(`/customers?id=${c.id}`)}
              style={{ width: '100%', padding: '13px 14px', borderRadius: '14px',
                border: '1px solid #1a1a1a', background: '#0f0f0f', color: 'white',
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#CE1126'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}>
              <div style={{ textAlign: 'left' }}>
                {parseFloat(c.total_debt) > 0
                  ? <span style={{ color: '#CE1126', fontWeight: 700, fontSize: '13px' }}>
                      {f(c.total_debt)}
                    </span>
                  : <span style={{ color: '#007A3D', fontSize: '11px' }}>نظيف ✓</span>
                }
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.name}</div>
                {c.phone && <div style={{ color: '#444', fontSize: '11px' }}>{c.phone}</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // ── STOCK TAB ─────────────────────────────────────────────
  const StockTab = () => {
    const unitLabel = { pcs: 'قطعة', g: 'غرام', ctn: 'كرتون' };
    return (
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {inventory.map(item => (
          <div key={item.id} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a',
            borderRadius: '14px', padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{
                fontSize: '16px', fontWeight: 900,
                color: parseFloat(item.stock_quantity) <= (item.low_stock_alert || 10)
                  ? '#CE1126' : '#007A3D'
              }}>
                {parseFloat(item.stock_quantity)}
              </div>
              <div style={{ fontSize: '10px', color: '#444' }}>
                {unitLabel[item.default_unit]}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{item.name}</div>
              {parseFloat(item.stock_quantity) <= (item.low_stock_alert || 10) && (
                <div style={{ fontSize: '10px', color: '#CE1126' }}>⚠️ مخزون منخفض</div>
              )}
            </div>
          </div>
        ))}
        {inventory.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#333' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>📦</div>
            <div>ما في مخزون</div>
          </div>
        )}
      </div>
    );
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('ar', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: 'white',
      fontFamily: 'system-ui', paddingBottom: '72px' }}>

      {/* Palestine stripe */}
      <div style={{ height: '4px', background:
        'linear-gradient(90deg, #000 25%, #fff 25%, #fff 50%, #007A3D 50%, #007A3D 75%, #CE1126 75%)' }} />

      {/* Top bar */}
      <div style={{ padding: '14px 16px', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #151515' }}>
        <button onClick={handleLogout} style={{ fontSize: '11px', color: '#555',
          border: '1px solid #222', borderRadius: '10px', padding: '5px 10px',
          background: 'transparent', cursor: 'pointer' }}>
          خروج
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '28px',
            color: '#CE1126', fontWeight: 900, lineHeight: 1 }}>مُعلم</div>
          <div style={{ fontSize: '10px', color: '#444' }}>{dateStr}</div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ overflowY: 'auto' }}>
        {activeTab === 'home'      && <HomeTab />}
        {activeTab === 'customers' && <CustomersTab />}
        {activeTab === 'stock'     && <StockTab />}
      </div>

      {/* ── BOTTOM NAV BAR (sticky) ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#0a0a0a', borderTop: '1px solid #1a1a1a',
        display: 'flex', zIndex: 100 }}>
        <NavTab icon="🏠" label="الرئيسية"
          active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavTab icon="👥" label="الزبائن"
          active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
        <NavTab icon="📦" label="مخزوني"
          active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} />
      </div>

      {/* ── ADD CUSTOMER MODAL ── */}
      {showAddCustomer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px', background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setShowAddCustomer(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: '400px', borderRadius: '24px',
            overflow: 'hidden', background: '#0f0f0f', border: '1px solid #1a1a1a' }}>

            <div style={{ height: '3px', background:
              'linear-gradient(90deg, #CE1126, #007A3D, #fff, #000)' }} />

            <div style={{ padding: '18px 18px 8px', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid #161616' }}>
              <button onClick={() => setShowAddCustomer(false)} style={{
                width: '30px', height: '30px', borderRadius: '50%',
                border: '1px solid #222', background: 'transparent',
                color: '#555', cursor: 'pointer', fontSize: '13px' }}>✕</button>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: '#007A3D',
                  letterSpacing: '2px', textTransform: 'uppercase' }}>New Customer</div>
                <div style={{ fontSize: '18px', fontWeight: 900 }}>زبون جديد</div>
              </div>
            </div>

            <div style={{ padding: '18px' }}>
              <form onSubmit={handleAddCustomer}
                style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { ph: 'اسم الزبون', val: custName, fn: setCustName, req: true },
                  { ph: 'رقم الهاتف (اختياري)', val: custPhone, fn: setCustPhone, req: false },
                ].map((f, i) => (
                  <input key={i} type="text" placeholder={f.ph} value={f.val}
                    required={f.req} onChange={e => f.fn(e.target.value)}
                    style={{ width: '100%', background: '#161616', border: '1.5px solid #222',
                      borderRadius: '14px', padding: '13px 14px', color: 'white',
                      fontSize: '14px', textAlign: 'right', outline: 'none',
                      boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#CE1126'}
                    onBlur={e => e.target.style.borderColor = '#222'}
                  />
                ))}
                <textarea placeholder="ملاحظات (اختياري)" value={custNotes}
                  onChange={e => setCustNotes(e.target.value)} rows={2}
                  style={{ width: '100%', background: '#161616', border: '1.5px solid #222',
                    borderRadius: '14px', padding: '13px 14px', color: 'white',
                    fontSize: '14px', textAlign: 'right', outline: 'none',
                    resize: 'none', boxSizing: 'border-box', fontFamily: 'system-ui' }}
                  onFocus={e => e.target.style.borderColor = '#CE1126'}
                  onBlur={e => e.target.style.borderColor = '#222'}
                />
                {custMsg && (
                  <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 700,
                    color: custMsg.includes('خطأ') ? '#CE1126' : '#007A3D',
                    padding: '8px', borderRadius: '10px',
                    background: custMsg.includes('خطأ')
                      ? 'rgba(206,17,38,0.1)' : 'rgba(0,122,61,0.1)' }}>
                    {custMsg}
                  </div>
                )}
                <button type="submit" disabled={custLoading} style={{
                  width: '100%', padding: '15px', borderRadius: '14px', border: 'none',
                  background: custLoading ? '#1a1a1a'
                    : 'linear-gradient(135deg, #007A3D, #005f2f)',
                  color: custLoading ? '#333' : 'white',
                  fontWeight: 900, fontSize: '14px',
                  cursor: custLoading ? 'not-allowed' : 'pointer' }}>
                  {custLoading ? '...' : 'اضافة الزبون ←'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
