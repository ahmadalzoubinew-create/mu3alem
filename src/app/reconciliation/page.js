'use client';
/**
 * Admin Reconciliation Tool
 * Path: src/app/reconciliation/page.js
 *
 * Shows per-salesman financial health check:
 * Expected cash vs actual, stock deltas, discrepancy flags.
 */
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Reconciliation() {
  const [salesmen, setSalesmen] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  async function checkAdminAndLoad() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    const { data: userData } = await supabase
      .from('users').select('role').eq('id', session.user.id).single();

    if (userData?.role !== 'admin') { router.push('/dashboard'); return; }
    setIsAdmin(true);
    await loadData();
  }

  async function loadData() {
    setLoading(true);

    const { data: users } = await supabase
      .from('users').select('*').eq('role', 'salesman');

    if (!users) { setLoading(false); return; }

    const results = await Promise.all(users.map(async u => {
      // Last settlement
      const { data: lastSettlement } = await supabase
        .from('settlements').select('*').eq('salesman_id', u.id)
        .order('settled_at', { ascending: false }).limit(1).maybeSingle();

      const since = lastSettlement?.settled_at || '2000-01-01';

      // Transactions since last settlement
      const { data: txns } = await supabase
        .from('transactions')
        .select('*, inventory(name, default_unit)')
        .eq('salesman_id', u.id)
        .eq('status', 'completed')
        .gt('created_at', since);

      const totalSales    = txns?.reduce((s, t) => s + parseFloat(t.total_amount || 0), 0) || 0;
      const totalCash     = txns?.reduce((s, t) => s + parseFloat(t.cash_received || 0), 0) || 0;
      const totalDebt     = txns?.reduce((s, t) => s + parseFloat(t.credit_amount || 0), 0) || 0;
      const prevRemaining = parseFloat(lastSettlement?.cash_remaining || 0);
      const expectedCash  = totalCash + prevRemaining;
      const handedIn      = parseFloat(lastSettlement?.cash_handed || 0);

      // Stock movement per item
      const stockMap = {};
      txns?.forEach(t => {
        if (!t.inventory_id) return;
        const key = t.inventory_id;
        if (!stockMap[key]) stockMap[key] = {
          name: t.inventory?.name,
          unit: t.inventory?.default_unit,
          qty: 0,
          revenue: 0,
        };
        stockMap[key].qty     += parseFloat(t.quantity || 0);
        stockMap[key].revenue += parseFloat(t.total_amount || 0);
      });

      // Discrepancy: cash in hand vs what they should have
      const discrepancyAmount = expectedCash - handedIn;
      const hasDiscrepancy = Math.abs(discrepancyAmount) > 0.01 && lastSettlement;

      return {
        ...u,
        totalSales,
        totalCash,
        totalDebt,
        prevRemaining,
        expectedCash,
        handedIn,
        discrepancyAmount,
        hasDiscrepancy,
        txnCount: txns?.length || 0,
        stockMoved: Object.values(stockMap),
        lastSettledAt: lastSettlement?.settled_at,
      };
    }));

    setSalesmen(results);
    setLoading(false);
  }

  const f = (n) => `€${parseFloat(n || 0).toFixed(2)}`;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex',
      alignItems: 'center', justifyContent: 'center', color: '#333' }}>
      جاري التحميل...
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: 'white',
      fontFamily: 'system-ui', paddingBottom: '40px' }}>

      <div style={{ height: '4px', background:
        'linear-gradient(90deg, #000 25%, #fff 25%, #fff 50%, #007A3D 50%, #007A3D 75%, #CE1126 75%)' }} />

      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderBottom: '1px solid #151515' }}>
        <button onClick={() => selected ? setSelected(null) : router.push('/dashboard')}
          style={{ background: 'transparent', border: '1px solid #222',
            borderRadius: '12px', padding: '8px 14px', color: '#555',
            cursor: 'pointer', fontSize: '13px' }}>
          رجوع
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: '#e8971e',
            letterSpacing: '2px', textTransform: 'uppercase' }}>Admin Only</div>
          <div style={{ fontSize: '18px', fontWeight: 900 }}>مطابقة الحسابات 🔍</div>
        </div>
      </div>

      {/* ── SALESMEN LIST ── */}
      {!selected && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {salesmen.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#333' }}>
              ما في مناديب لهلأ
            </div>
          )}
          {salesmen.map(s => (
            <button key={s.id} onClick={() => setSelected(s)}
              style={{ width: '100%', padding: '16px', borderRadius: '18px',
                border: `1.5px solid ${s.hasDiscrepancy ? '#CE1126' : '#1a1a1a'}`,
                background: s.hasDiscrepancy ? 'rgba(206,17,38,0.06)' : '#0f0f0f',
                color: 'white', cursor: 'pointer', textAlign: 'right' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between',
                marginBottom: '12px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {s.hasDiscrepancy && (
                    <span style={{ background: '#CE1126', color: 'white', fontSize: '10px',
                      padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>
                      ⚠️ فرق
                    </span>
                  )}
                  {!s.hasDiscrepancy && s.txnCount > 0 && (
                    <span style={{ background: 'rgba(0,122,61,0.2)', color: '#007A3D',
                      fontSize: '10px', padding: '2px 8px', borderRadius: '20px', fontWeight: 700 }}>
                      ✓ سليم
                    </span>
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '16px' }}>
                    {s.display_name || s.full_name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#444', marginTop: '2px' }}>
                    {s.txnCount} عملية منذ آخر تسوية
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                gap: '8px', borderTop: '1px solid #1a1a1a', paddingTop: '12px' }}>
                {[
                  { label: 'مبيعات', val: f(s.totalSales), color: '#CE1126' },
                  { label: 'كاش معه', val: f(s.expectedCash), color: '#007A3D' },
                  { label: 'ديون', val: f(s.totalDebt), color: '#e8971e' },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center',
                    background: '#161616', borderRadius: '10px', padding: '8px 4px' }}>
                    <div style={{ fontSize: '9px', color: '#444', marginBottom: '3px' }}>
                      {stat.label}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: stat.color }}>
                      {stat.val}
                    </div>
                  </div>
                ))}
              </div>
            </button>
          ))}

          <button onClick={loadData}
            style={{ width: '100%', padding: '13px', borderRadius: '14px',
              border: '1px solid #222', background: 'transparent',
              color: '#555', fontSize: '13px', cursor: 'pointer', marginTop: '4px' }}>
            🔄 تحديث
          </button>
        </div>
      )}

      {/* ── SALESMAN DETAIL ── */}
      {selected && (
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* Identity */}
          <div style={{ background: '#0f0f0f',
            border: `1.5px solid ${selected.hasDiscrepancy ? '#CE1126' : '#007A3D'}`,
            borderRadius: '18px', padding: '16px' }}>
            <div style={{ fontWeight: 900, fontSize: '20px', textAlign: 'right',
              marginBottom: '14px' }}>
              {selected.display_name || selected.full_name}
            </div>

            {/* Cash reconciliation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'إجمالي المبيعات', val: f(selected.totalSales), color: '#CE1126' },
                { label: 'كاش من مبيعات', val: f(selected.totalCash), color: '#007A3D' },
                { label: 'متبقي من قبل', val: f(selected.prevRemaining), color: '#888' },
                { label: 'إجمالي يجب أن يكون معه', val: f(selected.expectedCash),
                  color: '#e8971e', bold: true },
                { label: 'ديون الزبائن', val: f(selected.totalDebt), color: '#e8971e' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '8px 0',
                  borderBottom: '1px solid #1a1a1a' }}>
                  <span style={{ color: row.color, fontWeight: row.bold ? 900 : 700,
                    fontSize: row.bold ? '16px' : '14px' }}>
                    {row.val}
                  </span>
                  <span style={{ color: '#555', fontSize: '12px' }}>{row.label}</span>
                </div>
              ))}
            </div>

            {/* Discrepancy alert */}
            {selected.hasDiscrepancy && (
              <div style={{ marginTop: '12px', background: 'rgba(206,17,38,0.1)',
                border: '1px solid rgba(206,17,38,0.3)', borderRadius: '12px',
                padding: '12px', textAlign: 'right' }}>
                <div style={{ color: '#CE1126', fontWeight: 900, fontSize: '14px' }}>
                  ⚠️ فرق في الحساب
                </div>
                <div style={{ color: '#CE1126', fontSize: '13px', marginTop: '4px' }}>
                  {selected.discrepancyAmount > 0
                    ? `${f(selected.discrepancyAmount)} زيادة غير محسوبة`
                    : `${f(Math.abs(selected.discrepancyAmount))} ناقص من الحساب`
                  }
                </div>
              </div>
            )}

            {!selected.hasDiscrepancy && selected.txnCount > 0 && (
              <div style={{ marginTop: '12px', background: 'rgba(0,122,61,0.1)',
                border: '1px solid rgba(0,122,61,0.2)', borderRadius: '12px',
                padding: '10px', textAlign: 'center' }}>
                <span style={{ color: '#007A3D', fontWeight: 700 }}>
                  ✓ الحسابات سليمة
                </span>
              </div>
            )}
          </div>

          {/* Stock moved */}
          {selected.stockMoved.length > 0 && (
            <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a',
              borderRadius: '16px', padding: '14px' }}>
              <div style={{ fontSize: '10px', color: '#444', letterSpacing: '2px',
                textTransform: 'uppercase', textAlign: 'right', marginBottom: '10px' }}>
                البضاعة المباعة
              </div>
              {selected.stockMoved.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', padding: '8px 0',
                  borderBottom: i < selected.stockMoved.length - 1
                    ? '1px solid #1a1a1a' : 'none' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: '#CE1126', fontWeight: 700 }}>
                      {f(item.revenue)}
                    </div>
                    <div style={{ color: '#444', fontSize: '11px' }}>
                      {item.qty} {item.unit}
                    </div>
                  </div>
                  <div style={{ color: 'white', fontWeight: 700 }}>{item.name}</div>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <button onClick={() => router.push('/settlement')}
            style={{ width: '100%', padding: '15px', borderRadius: '16px', border: 'none',
              background: 'linear-gradient(135deg, #e8971e, #c97d10)',
              color: 'black', fontWeight: 900, fontSize: '14px', cursor: 'pointer' }}>
            🤝 اعمل تسوية معه
          </button>
        </div>
      )}

      <div style={{ height: '4px', background:
        'linear-gradient(90deg, #CE1126 25%, #007A3D 25%, #007A3D 50%, #fff 50%, #fff 75%, #000 75%)',
        position: 'fixed', bottom: 0, width: '100%' }} />
    </div>
  );
}
