import React, { useState } from 'react';
import { DashboardMetrics } from './components/DashboardMetrics';
import { AppointmentList } from './components/AppointmentList';
import { HaircutForm } from './components/HaircutForm';
import { LayoutDashboard, PlusCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('DASHBOARD'); // 'DASHBOARD' ou 'NEW_HAIRCUT'
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDataChange = () => {
    // Força a atualização do Dashboard e da Lista
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div style={styles.appContainer}>
      {/* CABEÇALHO */}
      <header style={styles.header}>
        <h1 style={styles.brandTitle}>Barber<span style={{ color: '#E5A93C' }}>System</span></h1>
        <p style={styles.brandSubtitle}>Painel de Gestão Local</p>
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
          <LayoutDashboard size={18} /> Dashboard
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
          <PlusCircle size={18} /> Novo Corte
        </button>
      </nav>

      {/* CONTEÚDO PRINCIPAL */}
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
              setActiveTab('DASHBOARD'); // Volta ao Dashboard após salvar
            }} 
          />
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
  },
  header: {
    textAlign: 'center',
    marginBottom: '16px',
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
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginBottom: '16px',
  },
  tabBtn: {
    padding: '12px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.15s ease',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
  },
};