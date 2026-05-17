'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const router = useRouter();

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }
    fetchItems();
  }

  async function fetchItems() {
    const { data } = await supabase.from('inventory')
      .select('*').eq('is_active', true).order('name');
    if (data) setItems(data);
  }

  async function handleSave(e) {
    e.preventDefault();
    setLoading(true);
    if (editItem) {
      await supabase.from('inventory')
        .update({ name, stock_quantity: quantity, default_unit: unit })
        .eq('id', editItem.id);
      setMsg('تم التعديل ✅');
      fetchItems();
      setTimeout(() => { setEditItem(null); setMsg(''); }, 1200);
    } else {
      await supabase.from('inventory')
        .insert({ name, stock_quantity: quantity, default_unit: unit });
      setMsg('تمت الاضافة ✅');
      setName(''); setQuantity(''); setUnit('pcs');
      fetchItems();
      setTimeout(() => { setShowAdd(false); setMsg(''); }, 1200);
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm('تأكيد الحذف؟')) return;
    await supabase.from('inventory').update({ is_active: false }).eq('id', id);
    fetchItems();
  }

  function openEdit(item) {
    setEditItem(item);
    setName(item.name);
    setQuantity(item.stock_quantity);
    setUnit(item.default_unit);
  }

  const unitLabel = { pcs: 'قطعة', g: 'غرام', ctn: 'كرتون' };

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: 'white',
      fontFamily: 'system-ui', paddingBottom: '60px' }}>

      <div style={{ height: '4px', background:
        'linear-gradient(90deg, #000 25%, #fff 25%, #fff 50%, #007A3D 50%, #007A3D 75%, #CE1126 75%)' }} />

      <div style={{ padding: '20px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid #151515' }}>
        <button onClick={() => router.back()}
          style={{ background: 'transparent', border: '1px solid #222',
            borderRadius: '12px', padding: '8px 14px', color: '#555',
            cursor: 'pointer', fontSize: '13px' }}>
          رجوع
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#e8971e',
            letterSpacing: '2px', textTransform: 'uppercase' }}>Inventory</div>
          <div style={{ fontSize: '20px', fontWeight: 900 }}>المخزون 📦</div>
        </div>
      </div>

      <div style={{ padding: '16px 20px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => { setShowAdd(true); setEditItem(null);
          setName(''); setQuantity(''); setUnit('pcs'); }}
          style={{ background: 'rgba(232,151,30,0.15)', border: '1.5px solid #e8971e',
            borderRadius: '14px', padding: '10px 16px', color: '#e8971e',
            fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
          + سلعة جديدة
        </button>
      </div>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#333' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
            <div style={{ fontSize: '13px' }}>ما في سلع لهلأ</div>
          </div>
        )}
        {items.map(item => (
          <div key={item.id} style={{ background: '#0f0f0f', border: '1px solid #1a1a1a',
            borderRadius: '16px', padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => openEdit(item)}
                style={{ background: 'rgba(232,151,30,0.1)',
                  border: '1px solid rgba(232,151,30,0.3)', borderRadius: '10px',
                  padding: '6px 12px', color: '#e8971e', fontSize: '12px',
                  cursor: 'pointer' }}>
                تعديل
              </button>
              <button onClick={() => handleDelete(item.id)}
                style={{ background: 'rgba(206,17,38,0.1)',
                  border: '1px solid rgba(206,17,38,0.3)', borderRadius: '10px',
                  padding: '6px 12px', color: '#CE1126', fontSize: '12px',
                  cursor: 'pointer' }}>
                حذف
              </button>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>{item.name}</div>
              <div style={{ color: parseFloat(item.stock_quantity) <= (item.low_stock_alert || 10)
                ? '#CE1126' : '#444', fontSize: '12px', marginTop: '2px' }}>
                {parseFloat(item.stock_quantity)} {unitLabel[item.default_unit]}
                {parseFloat(item.stock_quantity) <= (item.low_stock_alert || 10) && ' ⚠️'}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: '4px', background:
        'linear-gradient(90deg, #CE1126 25%, #007A3D 25%, #007A3D 50%, #fff 50%, #fff 75%, #000 75%)',
        position: 'fixed', bottom: 0, width: '100%' }} />

      {(showAdd || editItem) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px', background: 'rgba(0,0,0,0.92)' }}
          onClick={() => { setShowAdd(false); setEditItem(null); }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '400px', borderRadius: '28px',
              overflow: 'hidden', background: '#0f0f0f', border: '1px solid #1a1a1a' }}>

            <div style={{ height: '3px', background:
              'linear-gradient(90deg, #CE1126, #007A3D, #fff, #000)' }} />

            <div style={{ padding: '20px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', borderBottom: '1px solid #161616' }}>
              <button onClick={() => { setShowAdd(false); setEditItem(null); }}
                style={{ width: '32px', height: '32px', borderRadius: '50%',
                  border: '1px solid #222', background: 'transparent',
                  color: '#555', cursor: 'pointer', fontSize: '14px' }}>✕</button>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: '#e8971e',
                  letterSpacing: '2px', textTransform: 'uppercase' }}>
                  {editItem ? 'Edit Item' : 'New Item'}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: 'white' }}>
                  {editItem ? 'تعديل السلعة' : 'سلعة جديدة'}
                </div>
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              <form onSubmit={handleSave}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input type="text" placeholder="اسم السلعة" value={name}
                  onChange={e => setName(e.target.value)} required
                  style={{ width: '100%', background: '#161616', border: '1.5px solid #222',
                    borderRadius: '16px', padding: '14px 16px', color: 'white',
                    fontSize: '14px', textAlign: 'right', outline: 'none',
                    boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = '#e8971e'}
                  onBlur={e => e.target.style.borderColor = '#222'}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input type="text" inputMode="decimal" placeholder="الكمية" value={quantity}
                    onChange={e => setQuantity(e.target.value.replace(',', '.'))} required
                    style={{ background: '#161616', border: '1.5px solid #222',
                      borderRadius: '16px', padding: '14px 16px', color: 'white',
                      fontSize: '14px', textAlign: 'right', outline: 'none',
                      width: '100%', boxSizing: 'border-box' }}
                    onFocus={e => e.target.style.borderColor = '#e8971e'}
                    onBlur={e => e.target.style.borderColor = '#222'}
                  />
                  <select value={unit} onChange={e => setUnit(e.target.value)}
                    style={{ background: '#161616', border: '1.5px solid #222',
                      borderRadius: '16px', padding: '14px 16px', color: 'white',
                      fontSize: '14px', outline: 'none', width: '100%',
                      boxSizing: 'border-box' }}>
                    <option value="pcs">قطعة</option>
                    <option value="g">غرام</option>
                    <option value="ctn">كرتون</option>
                  </select>
                </div>

                {msg && (
                  <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 700,
                    color: '#007A3D', padding: '8px', borderRadius: '12px',
                    background: 'rgba(0,122,61,0.1)' }}>
                    {msg}
                  </div>
                )}

                <button type="submit" disabled={loading}
                  style={{ width: '100%', padding: '16px', borderRadius: '16px',
                    border: 'none',
                    background: loading ? '#1a1a1a' : 'linear-gradient(135deg, #e8971e, #c97d10)',
                    color: loading ? '#333' : 'black', fontWeight: 900,
                    fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                  {loading ? '...' : editItem ? 'حفظ التعديل ←' : 'اضافة السلعة ←'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}