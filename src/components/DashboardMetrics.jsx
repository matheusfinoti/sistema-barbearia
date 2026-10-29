import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../services/db';
import { Euro, Calendar, Users, TrendingUp } from 'lucide-react';

export function DashboardMetrics({ refreshTrigger }) {
  const { t } = useTranslation();
  const [metrics, setMetrics] = useState({
    todayRevenue: 0,
    monthRevenue: 0,
    todayCuts: 0,
    avgTicket: 0,
  });

  useEffect(() => {
    async function calculateMetrics() {
      try {
        const allAppointments = await db.appointments.toArray();
        const now = new Date();

        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let todayRevenue = 0;
        let monthRevenue = 0;
        let todayCuts = 0;

        allAppointments.forEach((item) => {
          const itemDate = new Date(item.date);
          const price = Number(item.price) || 0;

          if (itemDate >= startOfToday) {
            todayRevenue += price;
            todayCuts += 1;
          }

          if (itemDate >= startOfMonth) {
            monthRevenue += price;
          }
        });

        const avgTicket = todayCuts > 0 ? todayRevenue / todayCuts : 0;

        setMetrics({
          todayRevenue,
          monthRevenue,
          todayCuts,
          avgTicket,
        });
      } catch (err) {
        console.error('Erro ao calcular métricas:', err);
      }
    }

    calculateMetrics();
  }, [refreshTrigger]);

  return (
    <div style={styles.grid}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>{t('metrics.today_revenue')}</span>
          <Euro size={18} color="#10B981" />
        </div>
        <div style={styles.cardValue}>€ {metrics.todayRevenue.toFixed(2)}</div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>{t('metrics.month_revenue')}</span>
          <Calendar size={18} color="#38BDF8" />
        </div>
        <div style={styles.cardValue}>€ {metrics.monthRevenue.toFixed(2)}</div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>{t('metrics.today_cuts')}</span>
          <Users size={18} color="#E5A93C" />
        </div>
        <div style={styles.cardValue}>{metrics.todayCuts}</div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={styles.cardTitle}>{t('metrics.avg_ticket')}</span>
          <TrendingUp size={18} color="#A855F7" />
        </div>
        <div style={styles.cardValue}>€ {metrics.avgTicket.toFixed(2)}</div>
      </div>
    </div>
  );
}

const styles = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginBottom: '12px',
  },
  card: {
    backgroundColor: '#1E1E26',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #2A2A36',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: '11px',
    color: '#A1A1AA',
    fontWeight: '500',
  },
  cardValue: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#FFF',
  },
};