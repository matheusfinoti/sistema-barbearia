import React, { useState, useEffect } from 'react';
import { Delete } from 'lucide-react';

export function PinPad({ onComplete, errorMsg, title, subtitle, onCancel }) {
  const [pin, setPin] = useState('');

  // Limpa o teclado se receber uma mensagem de erro
  useEffect(() => {
    if (errorMsg) setPin('');
  }, [errorMsg]);

  const handlePress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      // Quando atinge 4 dígitos, dispara automaticamente após um micro-atraso visual
      if (newPin.length === 4) {
        setTimeout(() => onComplete(newPin), 150);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <div style={styles.container}>
      {title && <h2 style={styles.title}>{title}</h2>}
      {subtitle && <p style={styles.subtitle}>{subtitle}</p>}

      <div style={styles.dotsContainer}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{
            ...styles.dot,
            backgroundColor: i < pin.length ? '#E5A93C' : '#2A2A36',
            border: i < pin.length ? 'none' : '1px solid #3F3F46'
          }} />
        ))}
      </div>

      <div style={styles.errorWrapper}>
        {errorMsg && <span style={styles.errorText}>{errorMsg}</span>}
      </div>

      <div style={styles.keypad}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button key={num} onClick={() => handlePress(num.toString())} style={styles.key}>
            {num}
          </button>
        ))}
        <div style={styles.emptyKey} />
        <button onClick={() => handlePress('0')} style={styles.key}>0</button>
        <button onClick={handleBackspace} style={styles.actionKey}>
          <Delete size={28} color="#A1A1AA" />
        </button>
      </div>

      {onCancel && (
        <button onClick={onCancel} style={styles.cancelBtn}>Cancelar</button>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '300px', margin: '0 auto', userSelect: 'none' },
  title: { fontSize: '18px', fontWeight: '800', color: '#FFF', margin: '0 0 4px 0', textAlign: 'center' },
  subtitle: { fontSize: '12px', color: '#A1A1AA', textAlign: 'center', margin: '0 0 20px 0' },
  dotsContainer: { display: 'flex', gap: '16px', marginBottom: '16px' },
  dot: { width: '16px', height: '16px', borderRadius: '50%', transition: 'all 0.15s ease' },
  errorWrapper: { minHeight: '20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#F87171', fontSize: '12px', textAlign: 'center', fontWeight: '600' },
  keypad: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', width: '100%' },
  key: { width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#1E1E26', border: '1px solid #2A2A36', color: '#FFF', fontSize: '24px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 auto', transition: 'background 0.1s' },
  emptyKey: { width: '64px', height: '64px' },
  actionKey: { width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 auto' },
  cancelBtn: { marginTop: '24px', backgroundColor: 'transparent', color: '#A1A1AA', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', padding: '10px' }
};