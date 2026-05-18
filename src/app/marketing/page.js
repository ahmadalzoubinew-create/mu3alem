'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

const LETTERS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
const STORAGE_KEY = 'mu3alem_campaign_start_letter';

export default function Marketing() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startLetter, setStartLetter] = useState('A');
  const [filterWa, setFilterWa] = useState('Active');
  const [filterInterest, setFilterInterest] = useState('Interested');
  const [sent, setSent] = useState(new Set());
  const [campaignActive, setCampaignActive] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return; }
      supabase.from('users').select('role').eq('id', session.user.id).single()
        .then(({ data }) => {
          if (data?.role !== 'admin') router.push('/dashboard');
        });
    });
    // استرجع آخر حرف محفوظ
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setStartLetter(saved);
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, whatsapp_status, interest_level, total_debt')
      .order('name');
    if (data) setCustomers(data);
    setLoading(false);
  }

  function openWhatsApp(phone) {
    if (!phone) return;
    let p = phone.replace(/[\s\-\(\)]/g, '');
    if (p.startsWith('+')) p = p.slice(1);
    else if (p.startsWith('00')) p = p.slice(2);
    else if (p.startsWith('0')) p = '49' + p.slice(1);
    window.open(`https://wa.me/${p}`, '_blank');
  }

  function markSent(id) {
    setSent(prev => new Set([...prev, id]));
  }

  function startCampaign() {
    localStorage.setItem(STORAGE_KEY, startLetter);
    setSent(new Set());
    setCampaignActive(true);
  }

  function finishCampaign() {
    localStorage.removeItem(STORAGE_KEY); // reset — الحملة الجاية تبدأ من A
    setStartLetter('A');
    setCampaignActive(false);
    setSent(new Set());
  }

  // فلترة الزبائن
  const queue = customers.filter(c => {
    // فلتر الحرف
    const firstChar = (c.name || '').trim().toUpperCase()[0] || '';
    if (firstChar < startLetter) return false;
    // فلتر WhatsApp
    const ws = c.whatsapp_status || 'Active';
    if (filterWa !== 'all' && ws !== filterWa) return false;
    // فلتر الاهتمام
    const il = c.interest_level || 'Interested';
    if (filterInterest !== 'all' && il !== filterInterest) return false;
    return true;
  });

  const progress = campaignActive ? Math.round((sent.size / Math.max(queue.length, 1)) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: 'white',
      fontFamily: 'system-ui', paddingBottom: '40px', maxWidth: '480px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', borderBottom: '1px solid #1a1a1a' }}>
        <button onClick={() => router.push('/dashboard')}
          style={{ background: '#1a1a1a', border: 'none', color: 'white', padding: '8px 14px',
            borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>رجوع</button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: '#444', letterSpacing: '2px' }}>MARKETING</div>
          <div style={{ fontSize: '20px', fontWeight: 900 }}>📣 الحملات</div>
        </div>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* إعدادات الحملة */}
        <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '16px' }}>
          <p style={{ fontSize: '10px', color: '#444', letterSpacing: '2px', marginBottom: '12px', textAlign: 'right' }}>
            إعدادات الحملة
          </p>

          {/* ابدأ من حرف */}
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: '#555', textAlign: 'right', marginBottom: '6px' }}>ابدأ من الحرف</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'flex-end' }}>
              {LETTERS.map(l => (
                <button key={l} onClick={() => !campaignActive && setStartLetter(l)}
                  disabled={campaignActive}
                  style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                    background: startLetter === l ? '#CE1126' : '#1a1a1a',
                    color: startLetter === l ? 'white' : '#555',
                    fontWeight: startLetter === l ? 700 : 400,
                    cursor: campaignActive ? 'default' : 'pointer', fontSize: '11px' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* فلتر WhatsApp */}
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: '#555', textAlign: 'right', marginBottom: '6px' }}>حالة WhatsApp</p>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              {[['all','الكل'],['Active','نشط'],['No_Reply','ما رد'],['No_WhatsApp','بدون WA']].map(([v,l]) => (
                <button key={v} onClick={() => !campaignActive && setFilterWa(v)}
                  disabled={campaignActive}
                  style={{ padding: '6px 10px', borderRadius: '10px', border: 'none', fontSize: '11px',
                    background: filterWa === v ? '#007A3D' : '#1a1a1a',
                    color: filterWa === v ? 'white' : '#555', cursor: campaignActive ? 'default' : 'pointer' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* فلتر الاهتمام */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', color: '#555', textAlign: 'right', marginBottom: '6px' }}>مستوى الاهتمام</p>
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
              {[['all','الكل'],['Interested','مهتم'],['Not_Interested','غير مهتم']].map(([v,l]) => (
                <button key={v} onClick={() => !campaignActive && setFilterInterest(v)}
                  disabled={campaignActive}
                  style={{ padding: '6px 10px', borderRadius: '10px', border: 'none', fontSize: '11px',
                    background: filterInterest === v ? '#e8971e' : '#1a1a1a',
                    color: filterInterest === v ? 'white' : '#555', cursor: campaignActive ? 'default' : 'pointer' }}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* عداد + زر البدء */}
          <div style={{ background: '#161616', borderRadius: '12px', padding: '12px', marginBottom: '12px', textAlign: 'right' }}>
            <span style={{ fontSize: '13px', color: '#aaa' }}>عدد الزبائن بالطابور: </span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#CE1126' }}>{queue.length}</span>
          </div>

          {!campaignActive ? (
            <button onClick={startCampaign} disabled={queue.length === 0}
              style={{ width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
                background: queue.length === 0 ? '#1a1a1a' : '#CE1126',
                color: queue.length === 0 ? '#333' : 'white',
                fontWeight: 700, fontSize: '14px', cursor: queue.length === 0 ? 'default' : 'pointer' }}>
              🚀 ابدأ الحملة ({queue.length} زبون)
            </button>
          ) : (
            <div>
              {/* Progress bar */}
              <div style={{ background: '#1a1a1a', borderRadius: '8px', height: '6px', marginBottom: '10px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#007A3D', width: `${progress}%`, transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555', marginBottom: '10px' }}>
                <span>{progress}%</span>
                <span>{sent.size} / {queue.length} تم الإرسال</span>
              </div>
              <button onClick={finishCampaign}
                style={{ width: '100%', padding: '12px', borderRadius: '14px', border: '1.5px solid #007A3D',
                  background: 'rgba(0,122,61,0.1)', color: '#007A3D',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                ✅ انتهت الحملة — إعادة ضبط للبداية
              </button>
            </div>
          )}
        </div>

        {/* قائمة الطابور */}
        {campaignActive && (
          <div>
            <p style={{ fontSize: '10px', color: '#444', letterSpacing: '2px', textAlign: 'right', marginBottom: '10px' }}>
              طابور الحملة
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {queue.map(c => {
                const isSent = sent.has(c.id);
                return (
                  <div key={c.id} style={{ background: isSent ? '#0a1a0a' : '#0f0f0f',
                    border: `1px solid ${isSent ? '#007A3D33' : '#1a1a1a'}`,
                    borderRadius: '14px', padding: '12px 14px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    opacity: isSent ? 0.5 : 1 }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {!isSent ? (
                        <button onClick={() => { openWhatsApp(c.phone); markSent(c.id); }}
                          style={{ padding: '8px 12px', borderRadius: '10px', border: 'none',
                            background: 'rgba(37,211,102,0.15)', color: '#25D366',
                            fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                          💬 إرسال
                        </button>
                      ) : (
                        <span style={{ fontSize: '16px' }}>✅</span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.name}</div>
                      <div style={{ fontSize: '11px', color: '#444' }}>{c.phone}</div>
                      {parseFloat(c.total_debt) > 0 && (
                        <div style={{ fontSize: '11px', color: '#e8971e' }}>دين: €{parseFloat(c.total_debt).toFixed(2)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}