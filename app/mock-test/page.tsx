'use client';
import { useEffect, useState } from 'react';
import { onAuthStateChanged }  from 'firebase/auth';
import { auth }                from '../lib/firebase';
import { useRouter }           from 'next/navigation';
import { MockTestPage }        from '../practice/components/MockTestPage';

export default function MockPage() {
  const router   = useRouter();
  const [user,     setUser]     = useState<any>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.replace('/login'); return; }
      setUser(u);
      setChecking(false);
    });
    return () => unsub();
  }, [router]);

  if (checking) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2px solid #ccc', borderTopColor: '#1a1a18', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return <MockTestPage user={user} dark={false} onExit={() => router.push('/practice')} />;
}