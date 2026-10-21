import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { TrendingUp, DollarSign, Scissors, Calendar } from 'lucide-react';

export function DashboardMetrics({ refreshTrigger }) {
  const [metrics, setMetrics] = useState({
    monthCount: 0,
    monthRevenue: 0,
    avgTicket: 0,
    todayCount: 0,
    todayRevenue: 0,
  });

  useEffect(() => {
    async function calculateMetrics() {
      const allAppointments = await db.appointments.toArray();

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let monthCount = 0;
      let monthRevenue = 0;
      let todayCount = 0;
      let todayRevenue = 0;

      allAppointments.forEach((item) => {
        const itemDate = new Date(item.date);
        const price = Number(item.price) || 0;

        // Filtro do Mês Atual
        if (itemDate >= startOfMonth) {
          monthCount++;
          monthRevenue += price;
        }

        // Filtro de Hoje
        if (itemDate >= startOfToday) {
          todayCount++;
          todayRevenue += price;
        }
      });

      const avgTicket = monthCount > 0 ? monthRevenue / monthCount : 0;

      setMetrics({
        monthCount,
        monthRevenue,
        avgTicket,
        todayCount,
        todayRevenue,
      });
    }

    calculateMetrics();
  }, [refreshTrigger]);

  return (
    <div style={styles.grid}>
      {/* 1. FATURAMENTO DO MÊS */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>Faturamento (Mês)</span>
          <div style={{ ...styles.iconCircle, backgroundColor: '#25231F', color: '#E5A93C' }}>
            <DollarSign size={18} />
          </div>
        </div>
        <span style={styles.mainValue}>R$ {metrics.monthRevenue.toFixed(2)}</span>
        <span style={styles.subtext}>Acumulado no mês atual</span>
      </div>

      {/* 2. CORTES NO MÊS */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>Cortes no Mês</span>
          <div style={{ ...styles.iconCircle, backgroundColor: '#1E293B', color: '#38BDF8' }}>
            <Scissors size={18} />
          </div>
        </div>
        <span style={styles.mainValue}>{metrics.monthCount}</span>
        <span style={styles.subtext}>Atendimentos realizados</span>
      </div>

      {/* 3. TICKET MÉDIO */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>Ticket Médio</span>
          <div style={{ ...styles.iconCircle, backgroundColor: '#064E3B', color: '#34D399' }}>
            <TrendingUp size={18} />
          </div>
        </div>
        <span style={styles.mainValue}>R$ {metrics.avgTicket.toFixed(2)}</span>
        <span style={styles.subtext}>Média por cliente</span>
      </div>

      {/* 4. HOJE */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>Cortes Hoje</span>
          <div style={{ ...styles.iconCircle, backgroundColor: '#312E81', color: '#818CF8' }}>
            <Calendar size={18} />
          </div>
        </div>
        <span style={styles.mainValue}>{metrics.todayCount}</span>
        <span style={styles.subtext}>R$ {metrics.todayRevenue.toFixed(2)} faturados hoje</span>
      </div>
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '20px',
  },
  card: {
    backgroundColor: '#1E1E26',
    padding: '14px',
    borderRadius: '14px',
    border: '1px solid #2A2A36',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '12px',
    color: '#A1A1AA',
    fontWeight: '500',
  },
  iconCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainValue: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#FFF',
    marginBottom: '4px',
  },
  subtext: {
    fontSize: '11px',
    color: '#71717A',
  },
};