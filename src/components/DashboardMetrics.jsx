import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../services/db';
import { Euro, Users, TrendingUp, RefreshCcw, Star, Target } from 'lucide-react';

export function DashboardMetrics({ refreshTrigger, calendarDate }) {
  const { t, i18n } = useTranslation();
  
  // Controles de Clique (0 = Hoje, 1 = Semana Atual, 2 = Mês)
  const [periodIndex, setPeriodIndex] = useState(0); 
  // Agora alternando apenas entre 2 estados: 0 = Top Serviço, 1 = Projeção Mês
  const [topRightIndex, setTopRightIndex] = useState(0); 
  const [bottomRightIndex, setBottomRightIndex] = useState(0); 
  
  const [metrics, setMetrics] = useState({
    dynamicRevenue: 0, 
    dynamicCuts: 0,
    topServiceName: '',
    topServiceCount: 0,
    forecast: 0,
    avgTicketMonth: 0,
    avgTicketAll: 0
  });

  useEffect(() => {
    async function calculateMetrics() {
      try {
        const allAppointments = await db.appointments.toArray();
        const now = new Date();

        const calYear = calendarDate.getFullYear();
        const calMonth = calendarDate.getMonth();
        const startOfCalMonth = new Date(calYear, calMonth, 1);
        const endOfCalMonth = new Date(calYear, calMonth + 1, 0, 23, 59, 59);

        let startOfDynamic, endOfDynamic;
        if (periodIndex === 0) { // Hoje
          startOfDynamic = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endOfDynamic = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        } else if (periodIndex === 1) { // Semana Atual (Segunda a Domingo)
          const dayOfWeek = now.getDay();
          const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          
          startOfDynamic = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday);
          startOfDynamic.setHours(0, 0, 0, 0);
          
          endOfDynamic = new Date(startOfDynamic);
          endOfDynamic.setDate(startOfDynamic.getDate() + 6);
          endOfDynamic.setHours(23, 59, 59, 999);
        } else { // Mês Selecionado
          startOfDynamic = startOfCalMonth;
          endOfDynamic = endOfCalMonth;
        }

        let calMonthRev = 0, calMonthCuts = 0;
        let dynRev = 0, dynCuts = 0;
        let allTimeRev = 0, allTimeCuts = 0;
        
        const serviceCounts = {};

        allAppointments.forEach(item => {
          const d = new Date(item.date);
          const price = Number(item.price) || 0;

          allTimeRev += price;
          allTimeCuts += 1;

          if (d >= startOfCalMonth && d <= endOfCalMonth) { 
            calMonthRev += price; 
            calMonthCuts += 1; 
            
            if (item.service_name) {
              const sNames = item.service_name.split(' + ');
              sNames.forEach(s => {
                if (s) serviceCounts[s] = (serviceCounts[s] || 0) + 1;
              });
            }
          }

          if (d >= startOfDynamic && d <= endOfDynamic) { 
            dynRev += price; 
            dynCuts += 1; 
          }
        });

        let topName = '-';
        let topCount = 0;
        Object.entries(serviceCounts).forEach(([name, count]) => {
          if (count > topCount) { topCount = count; topName = name; }
        });

        const isCurrentMonth = calYear === now.getFullYear() && calMonth === now.getMonth();
        const totalDaysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        let forecastVal = 0;
        
        if (isCurrentMonth) {
          const daysPassed = now.getDate();
          forecastVal = daysPassed > 0 ? (calMonthRev / daysPassed) * totalDaysInMonth : 0;
        } else {
          forecastVal = calMonthRev; 
        }

        setMetrics({
          dynamicRevenue: dynRev,
          dynamicCuts: dynCuts,
          topServiceName: topName,
          topServiceCount: topCount,
          forecast: forecastVal,
          avgTicketMonth: calMonthCuts > 0 ? calMonthRev / calMonthCuts : 0,
          avgTicketAll: allTimeCuts > 0 ? allTimeRev / allTimeCuts : 0
        });

      } catch (err) { console.error('Erro:', err); }
    }
    calculateMetrics();
  }, [refreshTrigger, calendarDate, periodIndex]);

  const togglePeriod = () => setPeriodIndex(prev => (prev + 1) % 3);
  // Alterna apenas entre 0 e 1 (Top Serviço e Projeção Mês)
  const toggleTopRight = () => setTopRightIndex(prev => (prev + 1) % 2);
  const toggleBottomRight = () => setBottomRightIndex(prev => (prev + 1) % 2);

  const lang = i18n.language?.slice(0, 2);
  const labelRev = lang === 'pt' ? 'Faturamento' : (lang === 'en' ? 'Revenue' : 'Facturación');
  const labelSrv = lang === 'pt' ? 'Serviços' : (lang === 'en' ? 'Services' : 'Servicios');
  
  const periodLabels = [
    t('list.period_today'), 
    lang === 'pt' ? 'Esta Semana' : (lang === 'en' ? 'This Week' : 'Esta Semana'), 
    t('list.period_month')
  ];
  
  // Títulos limitados às 2 opções solicitadas
  const trTitles = [
    lang === 'pt' ? 'Top Serviço' : (lang === 'en' ? 'Top Service' : 'Top Servicio'), 
    lang === 'pt' ? 'Projeção Mês' : (lang === 'en' ? 'Forecast' : 'Proyección Mes')
  ];

  const brTitles = [
    t('metrics.avg_ticket') + (lang === 'pt' ? ' (Mês)' : (lang === 'en' ? ' (Month)' : ' (Mes)')),
    t('metrics.avg_ticket') + (lang === 'pt' ? ' (Geral)' : (lang === 'en' ? ' (All)' : ' (Gral)'))
  ];

  return (
    <div style={styles.grid}>
      <div style={styles.mainCard} onClick={togglePeriod}>
        <div style={styles.mainCardHeader}>
          <span>{periodLabels[periodIndex]}</span>
          <RefreshCcw size={14} color="#71717A" />
        </div>
        
        <div style={styles.mainCardBody}>
          <div style={styles.halfCol}>
            <Euro size={22} color="#10B981" style={styles.iconWrapper} />
            <span style={styles.statLabel}>{labelRev}</span>
            <span style={styles.statValue}>€ {metrics.dynamicRevenue.toFixed(2)}</span>
          </div>
          <div style={styles.divider} />
          <div style={styles.halfCol}>
            <Users size={22} color="#E5A93C" style={styles.iconWrapper} />
            <span style={styles.statLabel}>{labelSrv}</span>
            <span style={styles.statValue}>{metrics.dynamicCuts}</span>
          </div>
        </div>
      </div>

      <div style={styles.rightStack}>
        <div style={styles.smallCard} onClick={toggleTopRight}>
          <div style={styles.smallCardHeader}>
            <span style={styles.smallCardTitle}>{trTitles[topRightIndex]}</span>
            {topRightIndex === 0 && <Star size={14} color="#E5A93C" />}
            {topRightIndex === 1 && <Target size={14} color="#10B981" />}
          </div>
          <div style={styles.smallCardValue}>
            {topRightIndex === 0 && (metrics.topServiceCount > 0 ? `${metrics.topServiceName} (${metrics.topServiceCount}x)` : '-')}
            {topRightIndex === 1 && `€ ${metrics.forecast.toFixed(2)}`}
          </div>
        </div>

        <div style={styles.smallCard} onClick={toggleBottomRight}>
          <div style={styles.smallCardHeader}>
            <span style={styles.smallCardTitle}>{brTitles[bottomRightIndex]}</span>
            <TrendingUp size={14} color="#A855F7" />
          </div>
          <div style={styles.smallCardValue}>
            {bottomRightIndex === 0 && `€ ${metrics.avgTicketMonth.toFixed(2)}`}
            {bottomRightIndex === 1 && `€ ${metrics.avgTicketAll.toFixed(2)}`}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: '10px', marginBottom: '12px', width: '100%', boxSizing: 'border-box' },
  mainCard: { backgroundColor: '#1E1E26', borderRadius: '12px', border: '1px solid #2A2A36', padding: '14px', display: 'flex', flexDirection: 'column', cursor: 'pointer', userSelect: 'none', width: '100%', boxSizing: 'border-box', overflow: 'hidden' },
  mainCardHeader: { fontSize: '13px', color: '#A1A1AA', fontWeight: '500', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  mainCardBody: { display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  halfCol: { width: '48%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', overflow: 'hidden' },
  divider: { width: '1px', height: '60px', backgroundColor: '#2A2A36', margin: '0 4px' },
  iconWrapper: { marginBottom: '4px' },
  statLabel: { fontSize: '11px', color: '#A1A1AA' },
  statValue: { fontSize: '15px', fontWeight: '800', color: '#FFF', width: '100%', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  rightStack: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', boxSizing: 'border-box' },
  smallCard: { backgroundColor: '#1E1E26', padding: '12px', borderRadius: '12px', border: '1px solid #2A2A36', display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', gap: '6px', width: '100%', boxSizing: 'border-box', cursor: 'pointer', userSelect: 'none' },
  smallCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  smallCardTitle: { fontSize: '11px', color: '#A1A1AA', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '4px' },
  smallCardValue: { fontSize: '15px', fontWeight: '800', color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
};