import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../services/db';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Flame } from 'lucide-react';

export function RevenueHeatmap({ refreshTrigger }) {
  const { t, i18n } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyData, setDailyData] = useState({});
  const [maxRevenue, setMaxRevenue] = useState(0);
  const [selectedDayInfo, setSelectedDayInfo] = useState(null);

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
      setSelectedDayInfo(null);
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
    const alpha = Math.max(0.25, Math.min(1, ratio));
    return `rgba(16, 185, 129, ${alpha.toFixed(2)})`;
  };

  return (
    <div style={styles.card}>
      {/* CABEÇALHO COMPACTO */}
      <div style={styles.header}>
        <div style={styles.headerTitleGroup}>
          <Flame size={14} color="#10B981" />
          <h3 style={styles.cardTitle}>{t('heatmap.title')}</h3>
        </div>

        <div style={styles.navControls}>
          <button onClick={handlePrevMonth} style={styles.navBtn}>
            <ChevronLeft size={14} color="#A1A1AA" />
          </button>
          <span style={styles.monthLabel}>{monthName}</span>
          <button onClick={handleNextMonth} style={styles.navBtn}>
            <ChevronRight size={14} color="#A1A1AA" />
          </button>
        </div>
      </div>

      {/* DIAS DA SEMANA */}
      <div style={styles.weekdaysGrid}>
        {weekdays.map((day, idx) => (
          <span key={idx} style={styles.weekdayText}>{day.slice(0, 1)}</span>
        ))}
      </div>

      {/* GRADE REDUZIDA DE DIAS DO MÊS */}
      <div style={styles.daysGrid}>
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} style={styles.emptyCell} />
        ))}

        {Array.from({ length: totalDaysInMonth }).map((_, idx) => {
          const dayNumber = idx + 1;
          const dayInfo = dailyData[dayNumber] || { total: 0, count: 0 };
          const bgColor = getDayBackgroundColor(dayInfo.total);
          const isSelected = selectedDayInfo?.day === dayNumber;

          return (
            <button
              key={dayNumber}
              onClick={() => setSelectedDayInfo({ day: dayNumber, ...dayInfo })}
              style={{
                ...styles.dayCell,
                backgroundColor: bgColor,
                borderColor: isSelected ? '#E5A93C' : (dayInfo.total > 0 ? '#10B981' : '#2A2A36'),
                borderWidth: isSelected ? '1.5px' : '1px',
                color: dayInfo.total > 0 ? '#FFF' : '#52525B',
              }}
            >
              <span style={styles.dayNumber}>{dayNumber}</span>
            </button>
          );
        })}
      </div>

      {/* DETALHE REDUZIDO AO TOCAR EM UM DIA */}
      {selectedDayInfo && (
        <div style={styles.detailBox}>
          <div style={styles.detailHeader}>
            <CalendarIcon size={12} color="#E5A93C" />
            <span>Dia {selectedDayInfo.day}</span>
          </div>
          {selectedDayInfo.total > 0 ? (
            <div style={styles.detailValues}>
              <span style={styles.detailTotal}>€ {selectedDayInfo.total.toFixed(2)}</span>
              <span style={styles.detailCount}>
                ({selectedDayInfo.count})
              </span>
            </div>
          ) : (
            <span style={styles.noDataText}>{t('heatmap.no_data')}</span>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#1E1E26',
    padding: '10px',
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
    padding: '2px',
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
    aspectRatio: '1',
  },
  dayCell: {
    aspectRatio: '1',
    borderRadius: '4px',
    borderStyle: 'solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.1s ease',
  },
  dayNumber: {
    fontSize: '9px',
    fontWeight: '600',
  },
  detailBox: {
    backgroundColor: '#121214',
    padding: '6px 8px',
    borderRadius: '6px',
    border: '1px solid #2A2A36',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '2px',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    color: '#A1A1AA',
  },
  detailValues: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  detailTotal: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#10B981',
  },
  detailCount: {
    fontSize: '11px',
    color: '#71717A',
  },
  noDataText: {
    fontSize: '10px',
    color: '#71717A',
    fontStyle: 'italic',
  },
};