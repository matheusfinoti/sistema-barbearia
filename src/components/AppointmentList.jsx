import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../services/db';
import { Filter, Trash2, ChevronLeft, ChevronRight, Calendar, Search } from 'lucide-react';

export function AppointmentList({ refreshTrigger, onDeleteSuccess }) {
  const { t, i18n } = useTranslation();
  const [appointments, setAppointments] = useState([]);
  const [filterServiceOptions, setFilterServiceOptions] = useState([]);
  const [selectedService, setSelectedService] = useState('ALL');
  const [dateRange, setDateRange] = useState('MONTH');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    async function loadData() {
      const activeServices = await db.services.toArray();
      const list = await db.appointments.reverse().sortBy('date');
      setAppointments(list);
      const activeNames = activeServices.map(s => s.name);
      const historicalNames = list.flatMap(item => item.service_name ? item.service_name.split(' + ') : []);
      setFilterServiceOptions(Array.from(new Set([...activeNames, ...historicalNames])).filter(Boolean));
    }
    loadData();
  }, [refreshTrigger]);

  const filteredAppointments = appointments.filter((item) => {
    if (selectedService !== 'ALL' && (!item.service_name || !item.service_name.includes(selectedService))) return false;
    const itemDate = new Date(item.date);
    const now = new Date();
    if (dateRange === 'TODAY') return itemDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (dateRange === 'WEEK') { const d = new Date(); d.setDate(now.getDate() - 7); return itemDate >= d; }
    if (dateRange === 'MONTH') return itemDate >= new Date(now.getFullYear(), now.getMonth(), 1);
    return true;
  });

  const totalItems = filteredAppointments.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedAppointments = filteredAppointments.slice(startIndex, startIndex + pageSize);

  const handleDelete = async (id) => {
    if (window.confirm(t('list.delete_confirm'))) { await db.appointments.delete(id); if (onDeleteSuccess) onDeleteSuccess(); }
  };

  const getLocaleCode = () => { const lang = i18n.language?.slice(0, 2); return lang === 'en' ? 'en-US' : (lang === 'pt' ? 'pt-BR' : 'es-ES'); };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h3 style={styles.sectionTitle}>{t('list.title')}</h3>
        <span style={styles.badge}>{totalItems} {t('list.registered')}</span>
      </div>

      <div style={styles.filterCard}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}><Calendar size={14} color="#E5A93C" /> {t('list.period')}</label>
          <select value={dateRange} onChange={(e) => { setDateRange(e.target.value); setCurrentPage(1); }} style={styles.selectInput}>
            <option value="TODAY">{t('list.period_today')}</option><option value="WEEK">{t('list.period_week')}</option>
            <option value="MONTH">{t('list.period_month')}</option><option value="ALL">{t('list.period_all')}</option>
          </select>
        </div>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}><Filter size={14} color="#E5A93C" /> {t('list.service')}</label>
          <select value={selectedService} onChange={(e) => { setSelectedService(e.target.value); setCurrentPage(1); }} style={styles.selectInput}>
            <option value="ALL">{t('list.all_services')}</option>
            {filterServiceOptions.map((name, idx) => <option key={idx} value={name}>{name}</option>)}
          </select>
        </div>
      </div>

      {paginatedAppointments.length === 0 ? (
        <div style={styles.emptyState}><Search size={32} color="#52525B" /><p>{t('list.empty')}</p></div>
      ) : (
        <div style={styles.list}>
          {paginatedAppointments.map((item) => {
            const formattedDate = new Date(item.date).toLocaleString(getLocaleCode(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            return (
              <div key={item.id} style={styles.listItem}>
                <div style={styles.itemInfo}>
                  <div style={styles.itemHeader}>
                    <span style={styles.serviceName}>{item.service_name}</span>
                    <span style={styles.itemPrice}>€ {Number(item.price).toFixed(2)}</span>
                  </div>
                  <div style={styles.itemMeta}>
                    <span style={styles.dateText}>{formattedDate}</span>
                    {item.notes && <span style={styles.notesText}>• {item.notes}</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(item.id)} style={styles.deleteBtn}><Trash2 size={16} color="#EF4444" /></button>
              </div>
            );
          })}
        </div>
      )}

      <div style={styles.paginationBar}>
        <div style={styles.pageSizeSelector}>
          <span style={styles.pageLabel}>{t('list.show')}</span>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} style={styles.pageSizeSelect}>
            <option value={20}>20</option><option value={30}>30</option><option value={50}>50</option>
          </select>
        </div>
        <div style={styles.pageControls}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ ...styles.pageBtn, opacity: currentPage === 1 ? 0.4 : 1 }}><ChevronLeft size={18} /></button>
          <span style={styles.pageIndicator}>{currentPage} / {totalPages}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ ...styles.pageBtn, opacity: currentPage >= totalPages ? 0.4 : 1 }}><ChevronRight size={18} /></button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', boxSizing: 'border-box' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: '16px', fontWeight: '700', color: '#FFF', margin: 0 },
  badge: { backgroundColor: '#2A2A36', color: '#E5A93C', fontSize: '11px', padding: '4px 10px', borderRadius: '20px', fontWeight: '600' },
  filterCard: { backgroundColor: '#1E1E26', padding: '12px', borderRadius: '12px', border: '1px solid #2A2A36', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', width: '100%', boxSizing: 'border-box' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' },
  filterLabel: { fontSize: '11px', color: '#A1A1AA', display: 'flex', alignItems: 'center', gap: '4px' },
  selectInput: { backgroundColor: '#121214', border: '1px solid #3F3F46', color: '#FFF', padding: '8px', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box', textOverflow: 'ellipsis' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' },
  listItem: { backgroundColor: '#1E1E26', padding: '12px', borderRadius: '10px', border: '1px solid #2A2A36', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', boxSizing: 'border-box' },
  itemInfo: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 },
  itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' },
  serviceName: { fontSize: '13px', fontWeight: '600', color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemPrice: { fontSize: '13px', fontWeight: '700', color: '#E5A93C', flexShrink: 0 },
  itemMeta: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#71717A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  dateText: { color: '#A1A1AA' },
  notesText: { color: '#71717A', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis' },
  deleteBtn: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', flexShrink: 0 },
  emptyState: { padding: '30px', textAlign: 'center', color: '#71717A', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '13px' },
  paginationBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E1E26', padding: '10px 14px', borderRadius: '10px', border: '1px solid #2A2A36', width: '100%', boxSizing: 'border-box' },
  pageSizeSelector: { display: 'flex', alignItems: 'center', gap: '6px' },
  pageLabel: { fontSize: '12px', color: '#A1A1AA' },
  pageSizeSelect: { backgroundColor: '#121214', border: '1px solid #3F3F46', color: '#FFF', fontSize: '12px', padding: '4px', borderRadius: '6px' },
  pageControls: { display: 'flex', alignItems: 'center', gap: '10px' },
  pageIndicator: { fontSize: '12px', color: '#FFF', fontWeight: '600' },
  pageBtn: { backgroundColor: '#2A2A36', color: '#FFF', border: 'none', borderRadius: '6px', padding: '4px 8px', display: 'flex', alignItems: 'center' },
};