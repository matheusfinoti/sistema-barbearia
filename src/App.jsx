import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardMetrics } from './components/DashboardMetrics';
import { RevenueHeatmap } from './components/RevenueHeatmap';
import { AppointmentList } from './components/AppointmentList';
import { HaircutForm } from './components/HaircutForm';
import { AdminPanel } from './components/AdminPanel';
import { PinPad } from './components/PinPad';
import { LayoutDashboard, PlusCircle, ShieldAlert, Globe, Percent, ShieldCheck, Lock } from 'lucide-react';
import { hasSetupPassword, isUnlocked, lockApp, setupMasterPassword, unlockWithPassword } from './services/crypto';

export default function App() {
  const { t, i18n } = useTranslation();
  
  const [authStatus, setAuthStatus] = useState('CHECKING'); // SETUP, LOCKED, UNLOCKED
  const [authError, setAuthError] = useState('');
  
  const [setupStep, setSetupStep] = useState('ENTER'); 
  const [tempPin, setTempPin] = useState('');

  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [refreshKey, setRefreshKey] = useState(0);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isNetView, setIsNetView] = useState(false);

  const handleLock = useCallback(() => {
    lockApp();
    setAuthStatus('LOCKED');
    setAuthError('');
    setSetupStep('ENTER');
  }, []);

  useEffect(() => {
    if (authStatus !== 'UNLOCKED') return;
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => { handleLock(); }, 5 * 60 * 1000);
    };
    const events = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(event => window.addEventListener(event, resetTimer));
    resetTimer();
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [authStatus, handleLock]);

  useEffect(() => {
    if (!hasSetupPassword()) setAuthStatus('SETUP');
    else if (!isUnlocked()) setAuthStatus('LOCKED');
    else setAuthStatus('UNLOCKED');
  }, []);

  const handlePinComplete = async (pin) => {
    setAuthError('');
    if (authStatus === 'SETUP') {
      if (setupStep === 'ENTER') {
        setTempPin(pin);
        setSetupStep('CONFIRM');
      } else {
        if (pin === tempPin) {
          const success = await setupMasterPassword(pin);
          if (success) setAuthStatus('UNLOCKED');
        } else {
          setAuthError('Os números não coincidem. Tente novamente.');
          setSetupStep('ENTER');
        }
      }
    } else {
      const success = await unlockWithPassword(pin);
      if (success) {
        setAuthStatus('UNLOCKED');
      } else {
        setAuthError('PIN incorreto.');
      }
    }
  };

  const handleDataChange = () => setRefreshKey(prev => prev + 1);
  const changeLanguage = (lng) => i18n.changeLanguage(lng);
  const currentLang = i18n.language?.slice(0, 2) || 'es';

  if (authStatus === 'SETUP' || authStatus === 'LOCKED') {
    const isSetup = authStatus === 'SETUP';
    return (
      <div style={styles.authContainer}>
        <div style={styles.authIconCircle}>
          {isSetup ? <ShieldCheck size={32} color="#10B981" /> : <Lock size={32} color="#E5A93C" />}
        </div>
        <PinPad 
          key={setupStep} /* CHAVE PARA LIMPAR O TECLADO ENTRE AS ETAPAS */
          title={isSetup ? "Criar PIN Mestre" : "Aplicativo Bloqueado"}
          subtitle={isSetup ? (setupStep === 'ENTER' ? "Crie um PIN de 4 dígitos" : "Repita o PIN para confirmar") : "Digite seu PIN de 4 dígitos"}
          errorMsg={authError}
          onComplete={handlePinComplete}
        />
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <button onClick={() => setIsNetView(!isNetView)} style={{...styles.netToggleBtn, color: isNetView ? '#10B981' : '#71717A', borderColor: isNetView ? '#10B981' : '#2A2A36', backgroundColor: isNetView ? 'rgba(16, 185, 129, 0.1)' : '#1E1E26'}}>
          <Percent size={14} strokeWidth={isNetView ? 3 : 2} />
        </button>
        <div style={styles.langBar}>
          <Globe size={14} color="#A1A1AA" />
          <button onClick={() => changeLanguage('es')} style={{...styles.langBtn, color: currentLang === 'es' ? '#E5A93C' : '#71717A'}}>ES</button><span style={styles.langDivider}>|</span>
          <button onClick={() => changeLanguage('en')} style={{...styles.langBtn, color: currentLang === 'en' ? '#E5A93C' : '#71717A'}}>EN</button><span style={styles.langDivider}>|</span>
          <button onClick={() => changeLanguage('pt')} style={{...styles.langBtn, color: currentLang === 'pt' ? '#E5A93C' : '#71717A'}}>PT</button>
        </div>
        <h1 style={styles.brandTitle}>{t('app.title')}<span style={{ color: '#E5A93C' }}>{t('app.title_highlight')}</span></h1>
        <p style={styles.brandSubtitle}>{t('app.subtitle')}</p>
      </header>

      <nav style={styles.navBar}>
        <button onClick={() => setActiveTab('DASHBOARD')} style={{...styles.tabBtn, backgroundColor: activeTab === 'DASHBOARD' ? '#E5A93C' : '#1E1E26', color: activeTab === 'DASHBOARD' ? '#121214' : '#A1A1AA'}}>
          <LayoutDashboard size={18} /> {t('nav.home')}
        </button>
        <button onClick={() => setActiveTab('NEW_HAIRCUT')} style={{...styles.tabBtn, backgroundColor: activeTab === 'NEW_HAIRCUT' ? '#E5A93C' : '#1E1E26', color: activeTab === 'NEW_HAIRCUT' ? '#121214' : '#A1A1AA'}}>
          <PlusCircle size={18} /> {t('nav.new')}
        </button>
        <button onClick={() => setActiveTab('ADMIN')} style={{...styles.tabBtn, backgroundColor: activeTab === 'ADMIN' ? '#E5A93C' : '#1E1E26', color: activeTab === 'ADMIN' ? '#121214' : '#A1A1AA'}}>
          <ShieldAlert size={18} /> {t('nav.admin')}
        </button>
      </nav>

      <main style={styles.mainContent}>
        {activeTab === 'DASHBOARD' && (
          <><DashboardMetrics refreshTrigger={refreshKey} calendarDate={calendarDate} isNetView={isNetView} /><RevenueHeatmap refreshTrigger={refreshKey} currentDate={calendarDate} setCurrentDate={setCalendarDate} isNetView={isNetView} /><AppointmentList refreshTrigger={refreshKey} onDeleteSuccess={handleDataChange} isNetView={isNetView} /></>
        )}
        {activeTab === 'NEW_HAIRCUT' && <HaircutForm onSaveSuccess={() => { handleDataChange(); setActiveTab('DASHBOARD'); }} />}
        {activeTab === 'ADMIN' && <AdminPanel />}
      </main>
    </div>
  );
}

const styles = {
  authContainer: { backgroundColor: '#121214', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' },
  authIconCircle: { width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#1E1E26', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', border: '1px solid #2A2A36' },
  appContainer: { backgroundColor: '#121214', minHeight: '100vh', maxWidth: '480px', width: '100%', margin: '0 auto', padding: '16px', color: '#F4F4F5', fontFamily: 'system-ui, -apple-system, sans-serif', boxSizing: 'border-box' },
  header: { textAlign: 'center', marginBottom: '16px', width: '100%', position: 'relative' },
  langBar: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' },
  langBtn: { backgroundColor: 'transparent', border: 'none', fontSize: '12px', cursor: 'pointer', padding: '2px 4px', fontWeight: '700' },
  langDivider: { fontSize: '10px', color: '#3F3F46' },
  brandTitle: { fontSize: '24px', fontWeight: '800', margin: 0, color: '#FFF' },
  brandSubtitle: { fontSize: '12px', color: '#71717A', margin: '2px 0 0 0' },
  netToggleBtn: { position: 'absolute', top: '0px', right: '0px', padding: '6px', borderRadius: '8px', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  navBar: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' },
  tabBtn: { padding: '12px 0', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: '700' },
  mainContent: { display: 'flex', flexDirection: 'column', width: '100%' },
}; 