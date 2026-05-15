'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [txns, setTxns] = useState([]);
  const [search, setSearch] = useState('');
  const [editNotes, setEditNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('name');
    if (data) setCustomers(data);
  }

  async function openCustomer(c) {
    setSelected(c);
    setNotes(c.notes || '');
    setEditNotes(false);
    const { data } = await supabase
      .from('transactions')
      .select('*, inventory(name), users(display_name, full_name)')
      .eq('customer_id', c.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    if (data) setTxns(data);
  }

  async function saveNotes() {
    setSaving(true);
    await supabase.from('customers').update({ notes }).eq('id', selected.id);
    setSelected({ ...selected, notes });
    setEditNotes(false);
    setSaving(false);
    fetchCustomers();
  }

  const filtered = search.trim()
    ? customers.filter(c => c.name.includes(search) || (c.phone && c.phone.includes(search)))
    : customers;

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: 'white', fontFamily: 'system-ui', paddingBottom: '60px' }}>

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #000 25%, #fff 25%, #fff 50%, #007A3D 50%, #007A3D 75%, #CE1126 75%)' }} />

      <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #151515' }}>
        <button onClick={() => {
          if (selected) { setSelected(null); setTxns([]); }
          else router.push('/dashboard');
        }}
          style={{ background: 'transparent', border: '1px solid #222', borderRadius: '12px', padding: '8px 14px', color: '#555', cursor: 'pointer', fontSize: '13px' }}>
          رجوع
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#007A3D', letterSpacing: '2px', textTransform: 'uppercase' }}>Customers</div>
          <div style={{ fontSize: '20px', fontWeight: 900 }}>الزبائن 👥</div>
        </div>
      </div>

      {/* قائمة الزبائن */}
      {!selected && (
        <div style={{ padding: '16px 20px 0' }}>
          <input
            type="text"
            placeholder="ابحث عن زبون..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', background: '#161616', border: '1.5px solid #333', borderRadius: '16px', padding: '14px 16px', color: 'white', fontSize: '14px', textAlign: 'right', outline: 'none', boxSizing: 'border-box', marginBottom: '14px' }}
            onFocus={e => e.target.style.borderColor = '#CE1126'}
            onBlur={e => e.target.style.borderColor = '#333'}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: '#333' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
                <div>ما في زبائن</div>
              </div>
            )}
            {filtered.map(c => (
              <button key={c.id} onClick={() => openCustomer(c)}
                style={{ width: '100%', padding: '14px 16px', borderRadius: '16px', border: '1px solid #1a1a1a', background: '#0f0f0f', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#CE1126'}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a1a'}>
                <div style={{ textAlign: 'left' }}>
                  {parseFloat(c.total_debt) > 0
                    ? <span style={{ color: '#CE1126', fontWeight: 700, fontSize: '14px' }}>€{parseFloat(c.total_debt).toFixed(2)}</span>
                    : <span style={{ color: '#007A3D', fontSize: '12px' }}>نظيف ✓</span>
                  }
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.name}</div>
                  {c.phone && <div style={{ color: '#444', fontSize: '11px' }}>{c.phone}</div>}
                  {c.notes && <div style={{ color: '#555', fontSize: '10px', marginTop: '2px' }}>📝 {c.notes.slice(0, 30)}{c.notes.length > 30 ? '...' : ''}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* تفاصيل زبون */}
      {selected && (
        <div style={{ padding: '20px' }}>

          {/* معلومات */}
          <div style={{ background: '#0f0f0f', border: '1.5px solid #CE1126', borderRadius: '20px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <button onClick={() => router.push('/new-sale')}
                style={{ background: 'rgba(206,17,38,0.1)', border: '1px solid rgba(206,17,38,0.3)', borderRadius: '10px', padding: '6px 12px', color: '#CE1126', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                بيع جديد ←
              </button>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 900, fontSize: '20px' }}>{selected.name}</div>
                {selected.phone && <div style={{ color: '#444', fontSize: '13px', marginTop: '2px' }}>📞 {selected.phone}</div>}
              </div>
            </div>

            {/* الدين */}
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {parseFloat(selected.total_debt) > 0
                ? <span style={{ color: '#CE1126', fontWeight: 900, fontSize: '22px' }}>€{parseFloat(selected.total_debt).toFixed(2)}</span>
                : <span style={{ color: '#007A3D', fontWeight: 700 }}>حساب نظيف ✓</span>
              }
              <span style={{ color: '#555', fontSize: '12px' }}>الدين الحالي</span>
            </div>
          </div>

          {/* الملاحظات */}
          <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '14px 16px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <button onClick={() => setEditNotes(!editNotes)}
                style={{ background: 'transparent', border: '1px solid #222', borderRadius: '8px', padding: '4px 10px', color: '#555', fontSize: '11px', cursor: 'pointer' }}>
                {editNotes ? 'إلغاء' : 'تعديل'}
              </button>
              <span style={{ color: '#555', fontSize: '11px' }}>📝 ملاحظات</span>
            </div>
            {editNotes ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="اكتب ملاحظة عن هاد الزبون..."
                  rows={3}
                  style={{ width: '100%', background: '#161616', border: '1.5px solid #333', borderRadius: '12px', padding: '10px 12px', color: 'white', fontSize: '13px', textAlign: 'right', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'system-ui' }}
                  onFocus={e => e.target.style.borderColor = '#CE1126'}
                  onBlur={e => e.target.style.borderColor = '#333'}
                />
                <button onClick={saveNotes} disabled={saving}
                  style={{ width: '100%', padding: '10px', borderRadius: '12px', border: 'none', background: saving ? '#1a1a1a' : '#CE1126', color: saving ? '#333' : 'white', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  {saving ? '...' : 'حفظ الملاحظة'}
                </button>
              </div>
            ) : (
              <p style={{ color: selected.notes ? 'white' : '#333', fontSize: '13px', textAlign: 'right', margin: 0 }}>
                {selected.notes || 'ما في ملاحظات'}
              </p>
            )}
          </div>

          {/* سجل العمليات */}
          <p style={{ fontSize: '10px', color: '#333', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'right', marginBottom: '10px' }}>سجل العمليات</p>

          {txns.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', color: '#333' }}>ما في عمليات</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {txns.map(t => (
              <div key={t.id} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '12px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#CE1126', fontWeight: 900, fontSize: '15px' }}>€{parseFloat(t.total_amount).toFixed(2)}</span>
                  <span style={{ color: 'white', fontWeight: 700 }}>{t.inventory?.name}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ color: '#007A3D', fontSize: '11px' }}>كاش: €{parseFloat(t.cash_received).toFixed(2)}</span>
                    {parseFloat(t.credit_amount) > 0 && (
                      <span style={{ color: '#e8971e', fontSize: '11px', marginRight: '8px' }}> · دين: €{parseFloat(t.credit_amount).toFixed(2)}</span>
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

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #CE1126 25%, #007A3D 25%, #007A3D 50%, #fff 50%, #fff 75%, #000 75%)', position: 'fixed', bottom: 0, width: '100%' }} />
    </div>
  );
}