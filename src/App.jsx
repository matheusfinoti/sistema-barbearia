import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardMetrics } from './components/DashboardMetrics';
import { RevenueHeatmap } from './components/RevenueHeatmap';
import { AppointmentList } from './components/AppointmentList';
import { HaircutForm } from './components/HaircutForm';
import { AdminPanel } from './components/AdminPanel';
import { LayoutDashboard, PlusCircle, ShieldAlert, Globe, Percent, Lock, Key, AlertTriangle, ShieldCheck } from 'lucide-react';
import { hasSetupPassword, isUnlocked, lockApp, setupMasterPassword, unlockWithPassword } from './services/crypto';

export default function App() {
  const { t, i18n } = useTranslation();
  
  const [authStatus, setAuthStatus] = useState('CHECKING'); // SETUP, LOCKED, UNLOCKED
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);

  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [refreshKey, setRefreshKey] = useState(0);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isNetView, setIsNetView] = useState(false);

  const handleLock = useCallback(() => {
    lockApp();
    setAuthStatus('LOCKED');
    setPasswordInput('');
  }, []);

  // Sistema de Inatividade (5 minutos)
  useEffect(() => {
    if (authStatus !== 'UNLOCKED') return;

    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        handleLock();
      }, 5 * 60 * 1000); // 5 minutos
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
    if (!hasSetupPassword()) {
      setAuthStatus('SETUP');
    } else if (!isUnlocked()) {
      setAuthStatus('LOCKED');
    } else {
      setAuthStatus('UNLOCKED');
    }
  }, []);

  const handleSetupPassword = async (e) => {
    e.preventDefault();
    if (passwordInput.length < 4) {
      setAuthError(true); return;
    }
    const success = await setupMasterPassword(passwordInput);
    if (success) {
      setAuthStatus('UNLOCKED');
      setPasswordInput('');
    }
  };

  const handleLoginPassword = async (e) => {
    e.preventDefault();
    setAuthError(false);
    const success = await unlockWithPassword(passwordInput);
    if (success) {
      setAuthStatus('UNLOCKED');
      setPasswordInput('');
    } else {
      setAuthError(true);
    }
  };

  const handleDataChange = () => setRefreshKey(prev => prev + 1);
  const changeLanguage = (lng) => i18n.changeLanguage(lng);
  const currentLang = i18n.language?.slice(0, 2) || 'es';

  if (authStatus === 'SETUP' || authStatus === 'LOCKED') {
    const isSetup = authStatus === 'SETUP';
    return (
      <div style={styles.authContainer}>
        <div style={styles.authCard}>
          <div style={styles.authIconCircle}>
            {isSetup ? <ShieldCheck size={32} color="#10B981" /> : <Lock size={32} color="#E5A93C" />}
          </div>
          <h2 style={styles.authTitle}>
            {isSetup ? 'Criar Senha Mestra' : 'Aplicativo Bloqueado'}
          </h2>
          <p style={styles.authDesc}>
            {isSetup 
              ? 'Defina uma senha segura para criptografar seus faturamentos localmente.' 
              : 'Sessão inativa ou aplicativo bloqueado. Digite sua Senha Mestra para continuar.'}
          </p>

          <form onSubmit={isSetup ? handleSetupPassword : handleLoginPassword} style={styles.authForm}>
            <div style={styles.authInputWrapper}>
              <Key size={18} color="#A1A1AA" style={styles.authInputIcon} />
              <input 
                type="password" 
                placeholder="Senha mestra..." 
                value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setAuthError(false); }}
                style={styles.authInput}
                autoFocus
              />
            </div>
            {authError && (
              <div style={styles.authErrorMsg}>
                <AlertTriangle size={14} /> {isSetup ? 'Mínimo de 4 caracteres.' : 'Senha incorreta.'}
              </div>
            )}
            <button type="submit" style={styles.authBtn}>
              {isSetup ? 'Criptografar Sistema' : 'Desbloquear'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <button 
          onClick={() => setIsNetView(!isNetView)} 
          style={{
            ...styles.netToggleBtn, 
            color: isNetView ? '#10B981' : '#71717A',
            borderColor: isNetView ? '#10B981' : '#2A2A36',
            backgroundColor: isNetView ? 'rgba(16, 185, 129, 0.1)' : '#1E1E26'
          }}
          title={isNetView ? 'Ver Bruto' : 'Ver Líquido'}
        >
          <Percent size={14} strokeWidth={isNetView ? 3 : 2} />
        </button>

        <div style={styles.langBar}>
          <Globe size={14} color="#A1A1AA" />
          <button onClick={() => changeLanguage('es')} style={{...styles.langBtn, color: currentLang === 'es' ? '#E5A93C' : '#71717A', fontWeight: currentLang === 'es' ? '700' : '400'}}>ES</button>
          <span style={styles.langDivider}>|</span>
          <button onClick={() => changeLanguage('en')} style={{...styles.langBtn, color: currentLang === 'en' ? '#E5A93C' : '#71717A', fontWeight: currentLang === 'en' ? '700' : '400'}}>EN</button>
          <span style={styles.langDivider}>|</span>
          <button onClick={() => changeLanguage('pt')} style={{...styles.langBtn, color: currentLang === 'pt' ? '#E5A93C' : '#71717A', fontWeight: currentLang === 'pt' ? '700' : '400'}}>PT</button>
        </div>
        
        <h1 style={styles.brandTitle}>{t('app.title')}<span style={{ color: '#E5A93C' }}>{t('app.title_highlight')}</span></h1>
        <p style={styles.brandSubtitle}>{t('app.subtitle')}</p>
      </header>

      <nav style={styles.navBar}>
        <button onClick={() => setActiveTab('DASHBOARD')} style={{...styles.tabBtn, backgroundColor: activeTab === 'DASHBOARD' ? '#E5A93C' : '#1E1E26', color: activeTab === 'DASHBOARD' ? '#121214' : '#A1A1AA', fontWeight: activeTab === 'DASHBOARD' ? '700' : '500'}}>
          <LayoutDashboard size={18} /> {t('nav.home')}
        </button>
        <button onClick={() => setActiveTab('NEW_HAIRCUT')} style={{...styles.tabBtn, backgroundColor: activeTab === 'NEW_HAIRCUT' ? '#E5A93C' : '#1E1E26', color: activeTab === 'NEW_HAIRCUT' ? '#121214' : '#A1A1AA', fontWeight: activeTab === 'NEW_HAIRCUT' ? '700' : '500'}}>
          <PlusCircle size={18} /> {t('nav.new')}
        </button>
        <button onClick={() => setActiveTab('ADMIN')} style={{...styles.tabBtn, backgroundColor: activeTab === 'ADMIN' ? '#E5A93C' : '#1E1E26', color: activeTab === 'ADMIN' ? '#121214' : '#A1A1AA', fontWeight: activeTab === 'ADMIN' ? '700' : '500'}}>
          <ShieldAlert size={18} /> {t('nav.admin')}
        </button>
      </nav>

      <main style={styles.mainContent}>
        {activeTab === 'DASHBOARD' && (
          <>
            <DashboardMetrics refreshTrigger={refreshKey} calendarDate={calendarDate} isNetView={isNetView} />
            <RevenueHeatmap refreshTrigger={refreshKey} currentDate={calendarDate} setCurrentDate={setCalendarDate} isNetView={isNetView} />
            <AppointmentList refreshTrigger={refreshKey} onDeleteSuccess={handleDataChange} isNetView={isNetView} />
          </>
        )}
        {activeTab === 'NEW_HAIRCUT' && (
          <HaircutForm onSaveSuccess={() => { handleDataChange(); setActiveTab('DASHBOARD'); }} />
        )}
        {activeTab === 'ADMIN' && <AdminPanel />}
      </main>
    </div>
  );
}

const styles = {
  authContainer: { backgroundColor: '#121214', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' },
  authCard: { backgroundColor: '#1E1E26', padding: '30px 20px', borderRadius: '16px', border: '1px solid #2A2A36', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  authIconCircle: { width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#25231F', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid #E5A93C' },
  authTitle: { fontSize: '20px', fontWeight: '800', color: '#FFF', margin: '0 0 8px 0' },
  authDesc: { fontSize: '13px', color: '#A1A1AA', lineHeight: '1.5', margin: '0 0 24px 0' },
  authForm: { width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' },
  authInputWrapper: { position: 'relative', width: '100%' },
  authInputIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' },
  authInput: { width: '100%', backgroundColor: '#121214', border: '1px solid #3F3F46', color: '#FFF', padding: '14px 14px 14px 40px', borderRadius: '10px', fontSize: '16px', boxSizing: 'border-box', outline: 'none' },
  authBtn: { backgroundColor: '#E5A93C', color: '#121214', border: 'none', padding: '14px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' },
  authErrorMsg: { color: '#F87171', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },

  appContainer: { backgroundColor: '#121214', minHeight: '100vh', maxWidth: '480px', width: '100%', margin: '0 auto', padding: '16px', color: '#F4F4F5', fontFamily: 'system-ui, -apple-system, sans-serif', boxSizing: 'border-box', overflowX: 'hidden' },
  header: { textAlign: 'center', marginBottom: '16px', width: '100%', boxSizing: 'border-box', position: 'relative' },
  langBar: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' },
  langBtn: { backgroundColor: 'transparent', border: 'none', fontSize: '12px', cursor: 'pointer', padding: '2px 4px' },
  langDivider: { fontSize: '10px', color: '#3F3F46' },
  brandTitle: { fontSize: '24px', fontWeight: '800', margin: 0, color: '#FFF', letterSpacing: '-0.5px' },
  brandSubtitle: { fontSize: '12px', color: '#71717A', margin: '2px 0 0 0' },
  netToggleBtn: { position: 'absolute', top: '0px', right: '0px', padding: '6px', borderRadius: '8px', border: '1px solid', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  navBar: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px', width: '100%', boxSizing: 'border-box' },
  tabBtn: { padding: '12px 0', border: 'none', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s ease' },
  mainContent: { display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', boxSizing: 'border-box' },
};