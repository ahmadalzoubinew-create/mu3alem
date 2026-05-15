'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('البريد أو الباسورد غلط');
      setLoading(false);
    } else {
      router.push('/setup');
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '60px 24px', fontFamily: 'system-ui' }}>

      {/* Palestine stripe top */}
      <div style={{ height: '4px', background: 'linear-gradient(90deg, #000 25%, #fff 25%, #fff 50%, #007A3D 50%, #007A3D 75%, #CE1126 75%)', position: 'fixed', top: 0, width: '100%' }} />

      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px' }}>
        <div style={{
          width: '88px', height: '88px', borderRadius: '28px',
          background: '#0f0f0f',
          border: '1.5px solid #CE1126',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '20px',
          boxShadow: '0 0 30px rgba(206,17,38,0.15)'
        }}>
          <span style={{ fontFamily: 'Georgia, serif', fontSize: '40px', color: '#CE1126', fontWeight: 900 }}>M</span>
        </div>

        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '44px', color: '#CE1126', fontWeight: 900, margin: 0, lineHeight: 1 }}>مُعلم</h1>
        <p style={{ color: '#333', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', marginTop: '6px' }}>Sales OS · v1.0</p>
      </div>

      {/* Form */}
      <div style={{ width: '100%', maxWidth: '360px' }}>

        {/* Palestine stripe mini */}
        <div style={{ height: '2px', borderRadius: '2px', background: 'linear-gradient(90deg, #CE1126, #007A3D, #fff, #000)', marginBottom: '20px' }} />

        <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '24px', padding: '24px' }}>
          <p style={{ color: '#444', fontSize: '13px', textAlign: 'right', marginBottom: '20px' }}>أهلاً، سجّل دخولك 👋</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%', background: '#161616', border: '1.5px solid #222', borderRadius: '16px', padding: '14px 16px', color: 'white', fontSize: '14px', textAlign: 'right', outline: 'none', fontFamily: 'system-ui', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#CE1126'}
              onBlur={e => e.target.style.borderColor = '#222'}
            />
            <input
              type="password"
              placeholder="الباسورد"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', background: '#161616', border: '1.5px solid #222', borderRadius: '16px', padding: '14px 16px', color: 'white', fontSize: '14px', textAlign: 'right', outline: 'none', fontFamily: 'system-ui', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = '#CE1126'}
              onBlur={e => e.target.style.borderColor = '#222'}
            />

            {error && (
              <div style={{ background: 'rgba(206,17,38,0.1)', border: '1px solid rgba(206,17,38,0.2)', borderRadius: '12px', padding: '10px', textAlign: 'center' }}>
                <p style={{ color: '#CE1126', fontSize: '12px', margin: 0 }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                background: loading ? '#1a1a1a' : 'linear-gradient(135deg, #CE1126, #a00d1e)',
                color: loading ? '#333' : 'white',
                fontWeight: 900, fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.1s', letterSpacing: '0.5px', marginTop: '4px'
              }}>
              {loading ? '...' : 'دخول ←'}
            </button>
          </form>
        </div>

        <p style={{ color: '#222', fontSize: '12px', textAlign: 'center', marginTop: '16px' }}>
          للدخول تواصل مع المُعلم
        </p>
      </div>

      {/* Bottom */}
      <p style={{ color: '#1a1a1a', fontSize: '11px' }}>Mu3alem © 2026</p>

      {/* Palestine stripe bottom */}
      <div style={{ height: '4px', background: 'linear-gradient(90deg, #CE1126 25%, #007A3D 25%, #007A3D 50%, #fff 50%, #fff 75%, #000 75%)', position: 'fixed', bottom: 0, width: '100%' }} />

    </div>
  );
}