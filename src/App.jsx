import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DashboardMetrics } from './components/DashboardMetrics';
import { AppointmentList } from './components/AppointmentList';
import { HaircutForm } from './components/HaircutForm';
import { AdminPanel } from './components/AdminPanel';
import { LayoutDashboard, PlusCircle, ShieldAlert, Globe } from 'lucide-react';

export default function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDataChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const currentLang = i18n.language?.slice(0, 2) || 'es';

  return (
    <div style={styles.appContainer}>
      {/* SELETOR DE IDIOMAS + CABEÇALHO */}
      <header style={styles.header}>
        <div style={styles.langBar}>
          <Globe size={14} color="#A1A1AA" />
          <button 
            onClick={() => changeLanguage('es')} 
            style={{
              ...styles.langBtn,
              color: currentLang === 'es' ? '#E5A93C' : '#71717A',
              fontWeight: currentLang === 'es' ? '700' : '400',
            }}
          >
            ES
          </button>
          <span style={styles.langDivider}>|</span>
          <button 
            onClick={() => changeLanguage('en')} 
            style={{
              ...styles.langBtn,
              color: currentLang === 'en' ? '#E5A93C' : '#71717A',
              fontWeight: currentLang === 'en' ? '700' : '400',
            }}
          >
            EN
          </button>
          <span style={styles.langDivider}>|</span>
          <button 
            onClick={() => changeLanguage('pt')} 
            style={{
              ...styles.langBtn,
              color: currentLang === 'pt' ? '#E5A93C' : '#71717A',
              fontWeight: currentLang === 'pt' ? '700' : '400',
            }}
          >
            PT
          </button>
        </div>

        <h1 style={styles.brandTitle}>
          {t('app.title')}<span style={{ color: '#E5A93C' }}>{t('app.title_highlight')}</span>
        </h1>
        <p style={styles.brandSubtitle}>{t('app.subtitle')}</p>
      </header>

      {/* ABA DE NAVEGAÇÃO */}
      <nav style={styles.navBar}>
        <button 
          onClick={() => setActiveTab('DASHBOARD')} 
          style={{
            ...styles.tabBtn,
            backgroundColor: activeTab === 'DASHBOARD' ? '#E5A93C' : '#1E1E26',
            color: activeTab === 'DASHBOARD' ? '#121214' : '#A1A1AA',
            fontWeight: activeTab === 'DASHBOARD' ? '700' : '500',
          }}
        >
          <LayoutDashboard size={18} /> {t('nav.home')}
        </button>

        <button 
          onClick={() => setActiveTab('NEW_HAIRCUT')} 
          style={{
            ...styles.tabBtn,
            backgroundColor: activeTab === 'NEW_HAIRCUT' ? '#E5A93C' : '#1E1E26',
            color: activeTab === 'NEW_HAIRCUT' ? '#121214' : '#A1A1AA',
            fontWeight: activeTab === 'NEW_HAIRCUT' ? '700' : '500',
          }}
        >
          <PlusCircle size={18} /> {t('nav.new')}
        </button>

        <button 
          onClick={() => setActiveTab('ADMIN')} 
          style={{
            ...styles.tabBtn,
            backgroundColor: activeTab === 'ADMIN' ? '#E5A93C' : '#1E1E26',
            color: activeTab === 'ADMIN' ? '#121214' : '#A1A1AA',
            fontWeight: activeTab === 'ADMIN' ? '700' : '500',
          }}
        >
          <ShieldAlert size={18} /> {t('nav.admin')}
        </button>
      </nav>

      <main style={styles.mainContent}>
        {activeTab === 'DASHBOARD' && (
          <>
            <DashboardMetrics refreshTrigger={refreshKey} />
            <AppointmentList 
              refreshTrigger={refreshKey} 
              onDeleteSuccess={handleDataChange} 
            />
          </>
        )}

        {activeTab === 'NEW_HAIRCUT' && (
          <HaircutForm 
            onSaveSuccess={() => {
              handleDataChange();
              setActiveTab('DASHBOARD');
            }} 
          />
        )}

        {activeTab === 'ADMIN' && (
          <AdminPanel />
        )}
      </main>
    </div>
  );
}

const styles = {
  appContainer: {
    backgroundColor: '#121214',
    minHeight: '100vh',
    maxWidth: '480px',
    margin: '0 auto',
    padding: '16px',
    color: '#F4F4F5',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box',
  },
  header: {
    textAlign: 'center',
    marginBottom: '16px',
    position: 'relative',
  },
  langBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginBottom: '8px',
  },
  langBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '12px',
    cursor: 'pointer',
    padding: '2px 4px',
  },
  langDivider: {
    fontSize: '10px',
    color: '#3F3F46',
  },
  brandTitle: {
    fontSize: '24px',
    fontWeight: '800',
    margin: 0,
    color: '#FFF',
    letterSpacing: '-0.5px',
  },
  brandSubtitle: {
    fontSize: '12px',
    color: '#71717A',
    margin: '2px 0 0 0',
  },
  navBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '16px',
  },
  tabBtn: {
    padding: '12px 0',
    border: 'none',
    borderRadius: '10px',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
  },
};