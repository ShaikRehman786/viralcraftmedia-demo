import React from 'react';
import { Film } from 'lucide-react';

export default function ShowcaseCard({ serviceName = "Clip Editing" }) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(145deg, #1E1E24 0%, #121215 100%)',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      textAlign: 'center',
      fontFamily: 'var(--font)',
      border: '1px solid rgba(255, 106, 0, 0.15)'
    }}>
      <div style={{ background: 'rgba(255, 106, 0, 0.1)', color: 'var(--accent)', padding: '8px', borderRadius: '50%', marginBottom: '12px' }}>
        <Film size={20} />
      </div>
      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)' }}>{serviceName}</div>
      <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '4px' }}>Portfolio showcase coming soon</div>
    </div>
  );
}
