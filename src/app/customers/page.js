'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [txns, setTxns] = useState([]);
  const [search, setSearch] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => { fetchCustomers(); }, []);

  async function fetchCustomers() {
    const [{ data: custs }, { data: txns }] = await Promise.all([
      supabase.from('customers').select('*'),
      supabase.from('transactions').select('customer_id').eq('status', 'completed'),
    ]);
    if (custs) {
      const countMap = {};
      txns?.forEach(t => { countMap[t.customer_id] = (countMap[t.customer_id] || 0) + 1; });
      const sorted = custs
        .map(c => ({ ...c, txnCount: countMap[c.id] || 0 }))
        .sort((a, b) => b.txnCount - a.txnCount);
      setCustomers(sorted);
    }
  }

  async function openCustomer(c) {
    setSelected(c);
    setEditName(c.name);
    setEditPhone(c.phone || '');
    setEditNotes(c.notes || '');
    setEditMode(false);
    const { data } = await supabase
      .from('transactions')
      .select('*, inventory(name), users(display_name, full_name)')
      .eq('customer_id', c.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });
    if (data) setTxns(data);
  }

  async function saveEdit() {
    setSaving(true);
    await supabase.from('customers')
      .update({ name: editName, phone: editPhone, notes: editNotes })
      .eq('id', selected.id);
    const updated = { ...selected, name: editName, phone: editPhone, notes: editNotes };
    setSelected(updated);
    setEditMode(false);
    setSaving(false);
    fetchCustomers();
  }

  async function deleteCustomer() {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    await supabase.from('customers').delete().eq('id', selected.id);
    setSelected(null);
    setTxns([]);
    fetchCustomers();
  }

  async function sendWhatsAppStatement() {
    if (!selected?.phone) {
      alert('هاد الزبون ما عنده رقم هاتف!');
      return;
    }

    // جيب العمليات اللي فيها دين فقط
    const openTxns = txns.filter(t => parseFloat(t.credit_amount) > 0);

    if (openTxns.length === 0) {
      alert('ما في ديون مفتوحة لهاد الزبون.');
      return;
    }

    const totalDebt = parseFloat(selected.total_debt || 0).toFixed(2);

    // بناء الرسالة
    let msg = `Hallo ${selected.name}, hier ist Ihre aktuelle Kontoübersicht (Offene Beträge):\n\n`;

    openTxns.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString('de-DE');
      const item = t.inventory?.name || '—';
      const qty  = `${parseFloat(t.quantity)} ${t.unit || ''}`.trim();
      const open = parseFloat(t.credit_amount).toFixed(2);
      msg += `📅 ${date}\n📦 Artikel: ${item} (${qty})\n🔴 Offen: ${open} €\n\n`;
    });

    msg += `💰 Gesamtsumme (Offen): ${totalDebt} €\n\nVielen Dank!`;

    // تنظيف رقم الهاتف وفتح واتساب
    const phone = selected.phone.replace(/[\s\-\+]/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  const filtered = search.trim()
    ? customers.filter(c => c.name.includes(search) || (c.phone && c.phone.includes(search)))
    : customers;

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: 'white', fontFamily: 'system-ui', paddingBottom: '60px' }}>

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #000 25%, #fff 25%, #fff 50%, #007A3D 50%, #007A3D 75%, #CE1126 75%)' }} />

      <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #151515' }}>
        <button onClick={() => {
          if (editMode) { setEditMode(false); return; }
          if (selected) { setSelected(null); setTxns([]); return; }
          router.push('/dashboard');
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
          <input type="text" placeholder="ابحث عن زبون..." value={search}
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

            {/* أكثر 20 زبون نشاطاً — bubble buttons */}
            {!search.trim() && filtered.filter(c => c.txnCount > 0).length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <p style={{ fontSize: '10px', color: '#e8971e', letterSpacing: '1px',
                  textAlign: 'right', marginBottom: '8px' }}>⭐ الأكثر نشاطاً</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end' }}>
                  {filtered.filter(c => c.txnCount > 0).slice(0, 20).map(c => (
                    <button key={`top-${c.id}`} onClick={() => openCustomer(c)}
                      style={{ padding: '8px 14px', borderRadius: '20px',
                        border: '1.5px solid rgba(232,151,30,0.4)',
                        background: 'rgba(232,151,30,0.08)',
                        color: '#e8971e', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p style={{ fontSize: '10px', color: '#333', letterSpacing: '2px',
              textTransform: 'uppercase', textAlign: 'right', marginBottom: '4px' }}>
              كل الزبائن
            </p>

            {filtered.map((c, i) => (
              <>
                {/* فاصل بعد أول 20 */}
                {!search.trim() && i === 20 && (
                  <div key="divider" style={{ fontSize: '10px', color: '#333', letterSpacing: '2px',
                    textTransform: 'uppercase', textAlign: 'right', marginTop: '8px', marginBottom: '4px' }}>
                    بقية الزبائن
                  </div>
                )}
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
              </>
            ))}
          </div>
        </div>
      )}

      {/* تفاصيل زبون */}
      {selected && !editMode && (
        <div style={{ padding: '20px' }}>

          <div style={{ background: '#0f0f0f', border: '1.5px solid #CE1126', borderRadius: '20px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setEditMode(true)}
                  style={{ background: 'rgba(232,151,30,0.1)', border: '1px solid rgba(232,151,30,0.3)', borderRadius: '10px', padding: '6px 12px', color: '#e8971e', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                  تعديل
                </button>
                <button onClick={deleteCustomer}
                  style={{ background: 'rgba(206,17,38,0.1)', border: '1px solid rgba(206,17,38,0.3)', borderRadius: '10px', padding: '6px 12px', color: '#CE1126', fontSize: '12px', cursor: 'pointer', fontWeight: 700 }}>
                  حذف
                </button>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 900, fontSize: '20px' }}>{selected.name}</div>
                {selected.phone && <div style={{ color: '#444', fontSize: '13px', marginTop: '2px' }}>📞 {selected.phone}</div>}
              </div>
            </div>

            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {parseFloat(selected.total_debt) > 0
                ? <span style={{ color: '#CE1126', fontWeight: 900, fontSize: '22px' }}>€{parseFloat(selected.total_debt).toFixed(2)}</span>
                : <span style={{ color: '#007A3D', fontWeight: 700 }}>حساب نظيف ✓</span>
              }
              <span style={{ color: '#555', fontSize: '12px' }}>الدين الحالي</span>
            </div>
          </div>

          {/* الملاحظات */}
          {selected.notes && (
            <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '14px 16px', marginBottom: '16px', textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#555', marginBottom: '6px' }}>📝 ملاحظات</div>
              <p style={{ color: 'white', fontSize: '13px', margin: 0 }}>{selected.notes}</p>
            </div>
          )}

          {/* زر بيع جديد */}
          <button onClick={() => router.push(`/new-sale?customer=${selected.id}`)}
            style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1.5px solid #CE1126', background: 'rgba(206,17,38,0.08)', color: '#CE1126', fontWeight: 700, fontSize: '14px', cursor: 'pointer', marginBottom: '10px' }}>
            بيع جديد لهاد الزبون ←
          </button>

          {/* زر كشف الحساب واتساب */}
          {parseFloat(selected.total_debt) > 0 && (
            <button onClick={sendWhatsAppStatement}
              style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1.5px solid #25D366', background: 'rgba(37,211,102,0.07)', color: '#25D366', fontWeight: 700, fontSize: '13px', cursor: 'pointer', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>📲</span> Kontoauszug per WhatsApp senden
            </button>
          )}

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

      {/* صفحة التعديل */}
      {selected && editMode && (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '10px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', textAlign: 'right', marginBottom: '4px' }}>تعديل معلومات الزبون</p>

          <input type="text" placeholder="اسم الزبون" value={editName}
            onChange={e => setEditName(e.target.value)}
            style={{ width: '100%', background: '#161616', border: '1.5px solid #222', borderRadius: '16px', padding: '14px 16px', color: 'white', fontSize: '14px', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#e8971e'}
            onBlur={e => e.target.style.borderColor = '#222'}
          />

          <input type="text" placeholder="رقم الهاتف" value={editPhone}
            onChange={e => setEditPhone(e.target.value)}
            style={{ width: '100%', background: '#161616', border: '1.5px solid #222', borderRadius: '16px', padding: '14px 16px', color: 'white', fontSize: '14px', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#e8971e'}
            onBlur={e => e.target.style.borderColor = '#222'}
          />

          <textarea placeholder="ملاحظات" value={editNotes}
            onChange={e => setEditNotes(e.target.value)} rows={3}
            style={{ width: '100%', background: '#161616', border: '1.5px solid #222', borderRadius: '16px', padding: '14px 16px', color: 'white', fontSize: '14px', textAlign: 'right', outline: 'none', boxSizing: 'border-box', resize: 'none', fontFamily: 'system-ui' }}
            onFocus={e => e.target.style.borderColor = '#e8971e'}
            onBlur={e => e.target.style.borderColor = '#222'}
          />

          <button onClick={saveEdit} disabled={saving}
            style={{ width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: saving ? '#1a1a1a' : 'linear-gradient(135deg, #e8971e, #c97d10)', color: saving ? '#333' : 'black', fontWeight: 900, fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? '...' : 'حفظ التعديل ←'}
          </button>
        </div>
      )}

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #CE1126 25%, #007A3D 25%, #007A3D 50%, #fff 50%, #fff 75%, #000 75%)', position: 'fixed', bottom: 0, width: '100%' }} />
    </div>
  );
}