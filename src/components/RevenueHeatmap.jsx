import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../services/db';
import { ChevronLeft, ChevronRight, Flame } from 'lucide-react';

export function RevenueHeatmap({ refreshTrigger }) {
  const { t, i18n } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyData, setDailyData] = useState({});
  const [maxRevenue, setMaxRevenue] = useState(0);

  useEffect(() => {
    loadMonthData();
  }, [currentDate, refreshTrigger]);

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
          revenueByDay[dayKey] = { total: 0, count: 0 };
        }

        const price = Number(item.price) || 0;
        revenueByDay[dayKey].total += price;
        revenueByDay[dayKey].count += 1;

        if (revenueByDay[dayKey].total > highestDayValue) {
          highestDayValue = revenueByDay[dayKey].total;
        }
      });

      setDailyData(revenueByDay);
      setMaxRevenue(highestDayValue);
    } catch (err) {
      console.error('Erro ao carregar dados do heatmap:', err);
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getLocaleCode = () => {
    const lang = i18n.language?.slice(0, 2);
    if (lang === 'en') return 'en-US';
    if (lang === 'pt') return 'pt-BR';
    return 'es-ES';
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleString(getLocaleCode(), { month: 'short', year: '2-digit' });
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const weekdays = t('heatmap.weekdays', { returnObjects: true }) || ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  const getDayBackgroundColor = (dayRevenue) => {
    if (!dayRevenue || dayRevenue === 0 || maxRevenue === 0) {
      return '#121214';
    }
    const ratio = dayRevenue / maxRevenue;
    const alpha = Math.max(0.3, Math.min(1, ratio));
    return `rgba(16, 185, 129, ${alpha.toFixed(2)})`;
  };

  return (
    <div style={styles.card}>
      {/* CABEÇALHO */}
      <div style={styles.header}>
        <div style={styles.headerTitleGroup}>
          <Flame size={14} color="#10B981" />
          <h3 style={styles.cardTitle}>{t('heatmap.title')}</h3>
        </div>

        <div style={styles.navControls}>
          <button onClick={handlePrevMonth} style={styles.navBtn}>
            <ChevronLeft size={12} color="#A1A1AA" />
          </button>
          <span style={styles.monthLabel}>{monthName}</span>
          <button onClick={handleNextMonth} style={styles.navBtn}>
            <ChevronRight size={12} color="#A1A1AA" />
          </button>
        </div>
      </div>

      {/* DIAS DA SEMANA */}
      <div style={styles.weekdaysGrid}>
        {weekdays.map((day, idx) => (
          <span key={idx} style={styles.weekdayText}>{day.slice(0, 1)}</span>
        ))}
      </div>

      {/* GRADE DOS DIAS COM VALOR E QUANTIDADE INTEGRADOS */}
      <div style={styles.daysGrid}>
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} style={styles.emptyCell} />
        ))}

        {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
          const dayNumber = idx + 1;
          const dayInfo = dailyData[dayNumber] || { total: 0, count: 0 };
          const bgColor = getDayBackgroundColor(dayInfo.total);
          const hasData = dayInfo.total > 0;

          return (
            <div
              key={dayNumber}
              style={{
                ...styles.dayCell,
                backgroundColor: bgColor,
                borderColor: hasData ? '#10B981' : '#2A2A36',
                color: hasData ? '#FFF' : '#52525B',
              }}
            >
              <span style={styles.dayNumber}>{dayNumber}</span>
              
              {hasData && (
                <>
                  <span style={styles.cellRevenue}>
                    €{dayInfo.total % 1 === 0 ? dayInfo.total : dayInfo.total.toFixed(0)}
                  </span>
                  <span style={styles.cellCount}>
                    {dayInfo.count}x
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#1E1E26',
    padding: '10px 8px',
    borderRadius: '12px',
    border: '1px solid #2A2A36',
    marginBottom: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 2px',
  },
  headerTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  cardTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#FFF',
    margin: 0,
  },
  navControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  navBtn: {
    backgroundColor: '#121214',
    border: '1px solid #2A2A36',
    borderRadius: '4px',
    padding: '2px 4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#E5A93C',
    textTransform: 'capitalize',
    padding: '0 4px',
  },
  weekdaysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    textAlign: 'center',
  },
  weekdayText: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#A1A1AA',
    textTransform: 'uppercase',
  },
  daysGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '3px',
  },
  emptyCell: {
    minHeight: '38px',
  },
  dayCell: {
    minHeight: '38px',
    borderRadius: '6px',
    border: '1px solid #2A2A36',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 1px',
    boxSizing: 'border-box',
    lineHeight: '1.1',
    overflow: 'hidden',
  },
  dayNumber: {
    fontSize: '8px',
    fontWeight: '700',
    opacity: 0.7,
  },
  cellRevenue: {
    fontSize: '9.5px',
    fontWeight: '800',
    color: '#FFF',
    marginTop: '1px',
  },
  cellCount: {
    fontSize: '7.5px',
    color: '#D1D5DB',
    fontWeight: '600',
    opacity: 0.85,
  },
};