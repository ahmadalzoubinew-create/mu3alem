'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Setup() {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    // اذا عنده اسم محفوظ بالجهاز روح للداشبورد
    const savedName = localStorage.getItem(`display_name_${session.user.id}`);
    if (savedName) {
      router.push('/dashboard');
      return;
    }

    setChecking(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();

    // احفظ الاسم بالجهاز
    localStorage.setItem(`display_name_${session.user.id}`, displayName.trim());

    // واحفظه بقاعدة البيانات كمان
    await supabase
      .from('users')
      .upsert({
        id: session.user.id,
        email: session.user.email,
        full_name: displayName.trim(),
        display_name: displayName.trim(),
        role: 'salesman'
      });

    router.push('/dashboard');
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#333', fontSize: '13px' }}>...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: 'white', fontFamily: 'system-ui', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #000 25%, #fff 25%, #fff 50%, #007A3D 50%, #007A3D 75%, #CE1126 75%)', position: 'fixed', top: 0, width: '100%' }} />

      <div style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '48px', color: '#CE1126', fontWeight: 900, marginBottom: '8px' }}>مُعلم</div>
        <p style={{ color: '#444', fontSize: '12px', marginBottom: '40px', letterSpacing: '1px' }}>أول مرة؟ أهلاً 👋</p>

        <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '24px', padding: '28px 24px' }}>
          <p style={{ color: '#555', fontSize: '14px', textAlign: 'right', marginBottom: '20px' }}>
            كيف بدك اسمك يطلع بالتقارير؟
          </p>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="text"
              placeholder="مثال: أبو أحمد"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              autoFocus
              style={{ width: '100%', background: '#161616', border: '1.5px solid #222', borderRadius: '16px', padding: '16px', color: 'white', fontSize: '16px', textAlign: 'right', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#CE1126'}
              onBlur={e => e.target.style.borderColor = '#222'}
            />

            <button type="submit" disabled={loading || !displayName.trim()}
              style={{
                width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                background: loading || !displayName.trim() ? '#1a1a1a' : 'linear-gradient(135deg, #CE1126, #a00d1e)',
                color: loading || !displayName.trim() ? '#333' : 'white',
                fontWeight: 900, fontSize: '14px',
                cursor: loading || !displayName.trim() ? 'not-allowed' : 'pointer',
              }}>
              {loading ? '...' : 'يلا نبدأ ←'}
            </button>
          </form>
        </div>
      </div>

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #CE1126 25%, #007A3D 25%, #007A3D 50%, #fff 50%, #fff 75%, #000 75%)', position: 'fixed', bottom: 0, width: '100%' }} />
    </div>
  );
}