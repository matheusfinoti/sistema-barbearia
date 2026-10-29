import React, { useState } from 'react';
import { DashboardMetrics } from './components/DashboardMetrics';
import { AppointmentList } from './components/AppointmentList';
import { HaircutForm } from './components/HaircutForm';
import { AdminPanel } from './components/AdminPanel'; // IMPORTAMOS O PAINEL AQUI
import { LayoutDashboard, PlusCircle, ShieldAlert } from 'lucide-react'; // ADICIONADO ÍCONE SHIELD

export default function App() {
  const [activeTab, setActiveTab] = useState('DASHBOARD'); // 'DASHBOARD', 'NEW_HAIRCUT', 'ADMIN'
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDataChange = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div style={styles.appContainer}>
      <header style={styles.header}>
        <h1 style={styles.brandTitle}>Barber<span style={{ color: '#E5A93C' }}>System</span></h1>
        <p style={styles.brandSubtitle}>Painel de Gestão Local</p>
      </header>

      {/* ABA DE NAVEGAÇÃO - AGORA COM 3 BOTÕES */}
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
          <LayoutDashboard size={18} /> Início
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
          <PlusCircle size={18} /> Novo
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
          <ShieldAlert size={18} /> Admin
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

        {/* NOVA ÁREA ADMINISTRATIVA */}
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
    gridTemplateColumns: 'repeat(3, 1fr)', // ALTERADO PARA 3 COLUNAS
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