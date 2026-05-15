'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

// Simple hash function
async function hashPIN(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'mu3alem_salt');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function PinPage() {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState('loading'); // loading | set | confirm | enter
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/login'); return; }

    setUserId(session.user.id);

    const { data: userData } = await supabase
      .from('users')
      .select('pin_set, display_name, full_name')
      .eq('id', session.user.id)
      .single();

    setUserName(userData?.display_name || userData?.full_name || '');

    if (!userData?.pin_set) {
      setStep('set');
    } else {
      setStep('enter');
    }
  }

  function handlePadPress(val) {
    setError('');
    if (val === 'del') {
      if (step === 'confirm') setConfirmPin(p => p.slice(0, -1));
      else setPin(p => p.slice(0, -1));
      return;
    }

    if (step === 'set') {
      if (pin.length < 6) {
        const newPin = pin + val;
        setPin(newPin);
        if (newPin.length === 6) setStep('confirm');
      }
    } else if (step === 'confirm') {
      if (confirmPin.length < 6) {
        const newConfirm = confirmPin + val;
        setConfirmPin(newConfirm);
        if (newConfirm.length === 6) verifyNewPin(pin, newConfirm);
      }
    } else if (step === 'enter') {
      if (pin.length < 6) {
        const newPin = pin + val;
        setPin(newPin);
        if (newPin.length === 6) checkPin(newPin);
      }
    }
  }

  async function verifyNewPin(p1, p2) {
    if (p1 !== p2) {
      setError('الـ PIN ما تطابق — حاول من جديد');
      setPin('');
      setConfirmPin('');
      setStep('set');
      return;
    }
    const hashed = await hashPIN(p1);
    await supabase.from('users').update({ pin_hash: hashed, pin_set: true }).eq('id', userId);
    localStorage.removeItem('mu3alem_pin_locked');
    router.push('/dashboard');
  }

  async function checkPin(enteredPin) {
    const hashed = await hashPIN(enteredPin);
    const { data } = await supabase.from('users').select('pin_hash').eq('id', userId).single();

    if (data?.pin_hash === hashed) {
      localStorage.removeItem('mu3alem_pin_locked');
      localStorage.setItem('mu3alem_last_active', Date.now().toString());
      router.push('/dashboard');
    } else {
      setError('PIN غلط');
      setPin('');
    }
  }

  const currentPin = step === 'confirm' ? confirmPin : pin;
  const dots = Array(6).fill(0);

  const padButtons = [
    '1','2','3',
    '4','5','6',
    '7','8','9',
    '','0','del'
  ];

  if (step === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#080808', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#333' }}>...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080808', color: 'white', fontFamily: 'system-ui', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #000 25%, #fff 25%, #fff 50%, #007A3D 50%, #007A3D 75%, #CE1126 75%)', position: 'fixed', top: 0, width: '100%' }} />

      {/* Logo */}
      <div style={{ fontFamily: 'Georgia, serif', fontSize: '36px', color: '#CE1126', fontWeight: 900, marginBottom: '8px' }}>مُعلم</div>

      {/* Title */}
      <p style={{ color: '#555', fontSize: '13px', marginBottom: '8px' }}>
        {step === 'set' && 'حط PIN جديد — 6 أرقام'}
        {step === 'confirm' && 'كرر الـ PIN للتأكيد'}
        {step === 'enter' && `أهلاً ${userName} 👋`}
      </p>

      {step === 'enter' && (
        <p style={{ color: '#333', fontSize: '11px', marginBottom: '24px' }}>أدخل الـ PIN للدخول</p>
      )}

      {step !== 'enter' && <div style={{ marginBottom: '24px' }} />}

      {/* PIN Dots */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '16px' }}>
        {dots.map((_, i) => (
          <div key={i} style={{
            width: '16px', height: '16px', borderRadius: '50%',
            background: i < currentPin.length ? '#CE1126' : 'transparent',
            border: `2px solid ${i < currentPin.length ? '#CE1126' : '#333'}`,
            transition: 'all 0.15s'
          }} />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(206,17,38,0.1)', border: '1px solid rgba(206,17,38,0.2)', borderRadius: '12px', padding: '8px 16px', marginBottom: '16px' }}>
          <p style={{ color: '#CE1126', fontSize: '12px', margin: 0 }}>{error}</p>
        </div>
      )}

      {/* Number Pad */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', width: '100%', maxWidth: '280px' }}>
        {padButtons.map((btn, i) => (
          <button key={i} onClick={() => btn && handlePadPress(btn)}
            style={{
              height: '72px', borderRadius: '18px',
              border: btn ? '1.5px solid #1a1a1a' : 'none',
              background: btn ? '#0f0f0f' : 'transparent',
              color: btn === 'del' ? '#CE1126' : 'white',
              fontSize: btn === 'del' ? '18px' : '24px',
              fontWeight: 600, cursor: btn ? 'pointer' : 'default',
              transition: 'all 0.1s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseDown={e => { if (btn) e.currentTarget.style.background = '#1a1a1a'; }}
            onMouseUp={e => { if (btn) e.currentTarget.style.background = '#0f0f0f'; }}
            onTouchStart={e => { if (btn) e.currentTarget.style.background = '#1a1a1a'; }}
            onTouchEnd={e => { if (btn) e.currentTarget.style.background = '#0f0f0f'; }}
          >
            {btn === 'del' ? '⌫' : btn}
          </button>
        ))}
      </div>

      {/* Logout */}
      {step === 'enter' && (
        <button onClick={async () => {
          await supabase.auth.signOut();
          localStorage.removeItem('mu3alem_pin_locked');
          localStorage.removeItem('mu3alem_last_active');
          router.push('/login');
        }}
          style={{ marginTop: '24px', background: 'transparent', border: 'none', color: '#333', fontSize: '12px', cursor: 'pointer' }}>
          دخول بحساب ثاني
        </button>
      )}

      <div style={{ height: '4px', background: 'linear-gradient(90deg, #CE1126 25%, #007A3D 25%, #007A3D 50%, #fff 50%, #fff 75%, #000 75%)', position: 'fixed', bottom: 0, width: '100%' }} />
    </div>
  );
}