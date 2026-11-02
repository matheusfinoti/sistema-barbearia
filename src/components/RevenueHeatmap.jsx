import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../services/db';
import { ChevronLeft, ChevronRight, Flame, Scissors, Clock } from 'lucide-react';

export function RevenueHeatmap({ refreshTrigger, currentDate, setCurrentDate }) {
  const { t, i18n } = useTranslation();
  const [dailyData, setDailyData] = useState({});
  const [maxRevenue, setMaxRevenue] = useState(0);
  const [selectedDayInfo, setSelectedDayInfo] = useState(null);

  useEffect(() => { loadMonthData(); }, [currentDate, refreshTrigger]);

  async function loadMonthData() {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);
      const appointments = await db.appointments.toArray();
      
      const filtered = appointments.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= startOfMonth && itemDate <= endOfMonth;
      });

      const revenueByDay = {};
      let highestDayValue = 0;

      filtered.forEach(item => {
        const itemDate = new Date(item.date);
        const dayKey = itemDate.getDate();
        
        if (!revenueByDay[dayKey]) {
          revenueByDay[dayKey] = { total: 0, count: 0, items: [] };
        }
        
        const price = Number(item.price) || 0;
        revenueByDay[dayKey].total += price;
        revenueByDay[dayKey].count += 1;
        
        revenueByDay[dayKey].items.push({
          name: item.service_name || 'Serviço',
          price: price,
          time: itemDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        if (revenueByDay[dayKey].total > highestDayValue) {
          highestDayValue = revenueByDay[dayKey].total;
        }
      });

      setDailyData(revenueByDay);
      setMaxRevenue(highestDayValue);
      setSelectedDayInfo(null); // Reseta ao trocar de mês
    } catch (err) { console.error('Erro heatmap:', err); }
  }

  const handlePrevMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const getLocaleCode = () => { const lang = i18n.language?.slice(0, 2); return lang === 'en' ? 'en-US' : (lang === 'pt' ? 'pt-BR' : 'es-ES'); };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString(getLocaleCode(), { month: 'short', year: '2-digit' });
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const weekdays = t('heatmap.weekdays', { returnObjects: true }) || ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const getDayBackgroundColor = (dayRevenue) => {
    if (!dayRevenue || dayRevenue === 0 || maxRevenue === 0) return '#121214';
    const ratio = dayRevenue / maxRevenue;
    const alpha = Math.max(0.3, Math.min(1, ratio));
    return `rgba(16, 185, 129, ${alpha.toFixed(2)})`;
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.headerTitleGroup}>
          <Flame size={14} color="#10B981" />
          <h3 style={styles.cardTitle}>{t('heatmap.title')}</h3>
        </div>
        <div style={styles.navControls}>
          <button onClick={handlePrevMonth} style={styles.navBtn}><ChevronLeft size={12} color="#A1A1AA" /></button>
          <span style={styles.monthLabel}>{monthName}</span>
          <button onClick={handleNextMonth} style={styles.navBtn}><ChevronRight size={12} color="#A1A1AA" /></button>
        </div>
      </div>

      <div style={styles.weekdaysGrid}>
        {weekdays.map((day, idx) => <span key={idx} style={styles.weekdayText}>{day.slice(0, 1)}</span>)}
      </div>

      <div style={styles.daysGrid}>
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => <div key={`empty-${idx}`} style={styles.emptyCell} />)}
        {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
          const dayNumber = idx + 1;
          const dayInfo = dailyData[dayNumber] || { total: 0, count: 0, items: [] };
          const bgColor = getDayBackgroundColor(dayInfo.total);
          const hasData = dayInfo.total > 0;
          const isSelected = selectedDayInfo?.day === dayNumber;

          return (
            <div
              key={dayNumber}
              onClick={() => hasData && setSelectedDayInfo(isSelected ? null : { day: dayNumber, ...dayInfo })}
              style={{
                ...styles.dayCell,
                backgroundColor: bgColor,
                borderColor: isSelected ? '#E5A93C' : (hasData ? '#10B981' : '#2A2A36'),
                borderWidth: isSelected ? '2px' : '1px',
                color: hasData ? '#FFF' : '#52525B',
                cursor: hasData ? 'pointer' : 'default'
              }}
            >
              <span style={styles.dayNumber}>{dayNumber}</span>
              {hasData && (
                <>
                  <span style={styles.cellRevenue}>€{dayInfo.total % 1 === 0 ? dayInfo.total : dayInfo.total.toFixed(0)}</span>
                  <span style={styles.cellCount}>{dayInfo.count}x</span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* PAINEL DE DETALHES DO DIA SELECIONADO */}
      {selectedDayInfo && (
        <div style={styles.detailCard}>
          <div style={styles.detailHeader}>
            <span style={styles.detailDateText}>
              {selectedDayInfo.day} de {monthName}
            </span>
            <span style={styles.detailTotalText}>
              Total: € {selectedDayInfo.total.toFixed(2)}
            </span>
          </div>

          <div style={styles.detailList}>
            {selectedDayInfo.items.map((item, idx) => (
              <div key={idx} style={styles.detailItemRow}>
                <div style={styles.detailItemLeft}>
                  <div style={styles.miniIconBox}>
                    <Scissors size={10} color="#E5A93C" />
                  </div>
                  <span style={styles.detailItemName}>{item.name}</span>
                </div>
                <div style={styles.detailItemRight}>
                  <span style={styles.detailItemTime}><Clock size={9} /> {item.time}</span>
                  <span style={styles.detailItemPrice}>€ {item.price.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { backgroundColor: '#1E1E26', padding: '10px 8px', borderRadius: '12px', border: '1px solid #2A2A36', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', boxSizing: 'border-box' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' },
  headerTitleGroup: { display: 'flex', alignItems: 'center', gap: '4px' },
  cardTitle: { fontSize: '12px', fontWeight: '700', color: '#FFF', margin: 0 },
  navControls: { display: 'flex', alignItems: 'center', gap: '2px' },
  navBtn: { backgroundColor: '#121214', border: '1px solid #2A2A36', borderRadius: '4px', padding: '2px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: '11px', fontWeight: '600', color: '#E5A93C', textTransform: 'capitalize', padding: '0 4px' },
  weekdaysGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center' },
  weekdayText: { fontSize: '9px', fontWeight: '700', color: '#A1A1AA', textTransform: 'uppercase' },
  daysGrid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' },
  emptyCell: { minHeight: '38px' },
  dayCell: { minHeight: '38px', borderRadius: '6px', borderStyle: 'solid', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2px 1px', boxSizing: 'border-box', lineHeight: '1.1', overflow: 'hidden', transition: 'all 0.15s ease' },
  dayNumber: { fontSize: '8px', fontWeight: '700', opacity: 0.7 },
  cellRevenue: { fontSize: '9.5px', fontWeight: '800', color: '#FFF', marginTop: '1px' },
  cellCount: { fontSize: '7.5px', color: '#D1D5DB', fontWeight: '600', opacity: 0.85 },
  
  // Estilos da Gaveta de Detalhes
  detailCard: { backgroundColor: '#121214', border: '1px solid #E5A93C', borderRadius: '8px', padding: '10px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2A2A36', paddingBottom: '6px' },
  detailDateText: { fontSize: '11px', color: '#A1A1AA', fontWeight: '600', textTransform: 'capitalize' },
  detailTotalText: { fontSize: '12px', color: '#10B981', fontWeight: '800' },
  detailList: { display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '120px', overflowY: 'auto', paddingRight: '2px' },
  detailItemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E1E26', padding: '6px 8px', borderRadius: '6px', border: '1px solid #2A2A36' },
  detailItemLeft: { display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' },
  miniIconBox: { width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#25231F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  detailItemName: { fontSize: '11px', color: '#FFF', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  detailItemRight: { display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 },
  detailItemTime: { fontSize: '9px', color: '#71717A', display: 'flex', alignItems: 'center', gap: '2px' },
  detailItemPrice: { fontSize: '11px', color: '#E5A93C', fontWeight: '700' }
};