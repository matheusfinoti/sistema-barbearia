import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db, dbApi } from '../services/db';
import { Filter, Trash2, Edit2, ChevronLeft, ChevronRight, Calendar, Search, X, Check } from 'lucide-react';

export function AppointmentList({ refreshTrigger, onDeleteSuccess, isNetView }) {
  const { t, i18n } = useTranslation();
  const [appointments, setAppointments] = useState([]);
  const [filterServiceOptions, setFilterServiceOptions] = useState([]);
  const [selectedService, setSelectedService] = useState('ALL');
  const [dateRange, setDateRange] = useState('MONTH');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [availableServices, setAvailableServices] = useState([]);

  const lang = i18n.language?.slice(0, 2) || 'es';
  const rawCommission = Number(localStorage.getItem('barber_commission_percent'));
  const commissionPercent = isNaN(rawCommission) ? 100 : rawCommission;
  const factor = isNetView ? (commissionPercent / 100) : 1;

  useEffect(() => {
    async function loadData() {
      try {
        const activeServices = await db.services.toArray();
        setAvailableServices(activeServices);
        
        // Busca os atendimentos descriptografados pela dbApi
        const list = await dbApi.getAppointments();
        setAppointments(list);
        
        const activeNames = activeServices.map(s => s.name);
        const historicalNames = list.flatMap(item => item.service_name ? item.service_name.split(' + ') : []);
        setFilterServiceOptions(Array.from(new Set([...activeNames, ...historicalNames])).filter(Boolean));
      } catch (err) {
        console.error('Erro ao carregar lista de atendimentos:', err);
      }
    }
    loadData();
  }, [refreshTrigger]);

  const handleOpenEdit = (item) => {
    setEditingAppointment(item);
    setEditDate(item.date ? new Date(item.date).toISOString().slice(0, 16) : '');
    setEditNotes(item.notes || '');

    if (item.items && Array.isArray(item.items) && item.items.length > 0) {
      setEditItems(item.items.map(i => ({ name: i.name, price: isNaN(Number(i.price)) ? 0 : Number(i.price) })));
    } else {
      setEditItems([{ name: item.service_name || 'Serviço', price: isNaN(Number(item.price)) ? 0 : Number(item.price) }]);
    }
  };

  const handleEditPriceChange = (index, val) => {
    const updated = [...editItems];
    updated[index].price = Number(val) || 0;
    setEditItems(updated);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingAppointment) return;

    let totalPrice = 0;
    const detailedItems = editItems.map(i => {
      const p = Number(i.price) || 0;
      totalPrice += p;
      return { name: i.name, price: p };
    });

    const updatedServiceNames = detailedItems.map(i => i.name).join(' + ');

    try {
      await dbApi.updateAppointment(editingAppointment.id, {
        date: new Date(editDate).toISOString(),
        service_name: updatedServiceNames,
        price: totalPrice,
        items: detailedItems,
        notes: editNotes
      });

      setEditingAppointment(null);
      const list = await dbApi.getAppointments();
      setAppointments(list);
      if (onDeleteSuccess) onDeleteSuccess();
    } catch (err) { 
      console.error('Erro ao atualizar atendimento:', err); 
    }
  };

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
    const confirmMsg = lang === 'pt' ? 'Deseja realmente excluir este atendimento?' : (lang === 'en' ? 'Are you sure you want to delete this appointment?' : '¿Realmente deseas eliminar esta cita?');
    if (window.confirm(confirmMsg)) { 
      await dbApi.deleteAppointment(id); 
      if (onDeleteSuccess) onDeleteSuccess(); 
    }
  };

  const getLocaleCode = () => { return lang === 'en' ? 'en-US' : (lang === 'pt' ? 'pt-BR' : 'es-ES'); };

  const modalTexts = {
    title: lang === 'pt' ? 'Editar Atendimento' : (lang === 'en' ? 'Edit Appointment' : 'Editar Cita'),
    datetime: lang === 'pt' ? 'Data e Hora' : (lang === 'en' ? 'Date & Time' : 'Fecha y Hora'),
    servicesValues: lang === 'pt' ? 'Valores dos Serviços (Bruto)' : (lang === 'en' ? 'Service Prices (Gross)' : 'Valores de los Servicios (Bruto)'),
    notes: lang === 'pt' ? 'Observações' : (lang === 'en' ? 'Notes' : 'Observaciones'),
    save: lang === 'pt' ? 'Salvar Alterações' : (lang === 'en' ? 'Save Changes' : 'Guardar Cambios')
  };

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
            const itemPriceNumber = isNaN(Number(item.price)) ? 0 : Number(item.price);
            const calculatedPrice = itemPriceNumber * factor;
            
            return (
              <div key={item.id} style={styles.listItem}>
                <div style={styles.itemInfo}>
                  <div style={styles.itemHeader}>
                    <span style={styles.serviceName}>{item.service_name || 'Serviço'}</span>
                    <span style={styles.itemPrice}>€ {calculatedPrice.toFixed(2)}</span>
                  </div>
                  <div style={styles.itemMeta}>
                    <span style={styles.dateText}>{formattedDate}</span>
                    {item.notes && <span style={styles.notesText}>• {item.notes}</span>}
                  </div>
                </div>
                <div style={styles.actionButtonsRow}>
                  <button onClick={() => handleOpenEdit(item)} style={styles.iconBtn}><Edit2 size={16} color="#38BDF8" /></button>
                  <button onClick={() => handleDelete(item.id)} style={styles.iconBtn}><Trash2 size={16} color="#EF4444" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingAppointment && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBody}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{modalTexts.title}</h3>
              <button onClick={() => setEditingAppointment(null)} style={styles.closeBtn}><X size={20} color="#A1A1AA" /></button>
            </div>
            
            <form onSubmit={handleSaveEdit} style={styles.modalForm}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>{modalTexts.datetime}</label>
                <input type="datetime-local" value={editDate} onChange={(e) => setEditDate(e.target.value)} required style={styles.textInput} />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>{modalTexts.servicesValues}</label>
                {editItems.map((item, idx) => (
                  <div key={idx} style={styles.editServiceRow}>
                    <span style={styles.editServiceName}>{item.name}</span>
                    <div style={styles.editPriceWrapper}>
                      <span>€</span>
                      <input 
                        type="number" 
                        step="0.5" 
                        value={item.price} 
                        onChange={(e) => handleEditPriceChange(idx, e.target.value)} 
                        style={styles.numberInput} 
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>{modalTexts.notes}</label>
                <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} style={styles.textInput} />
              </div>

              <button type="submit" style={styles.saveSubmitBtn}>
                <Check size={18} /> {modalTexts.save}
              </button>
            </form>
          </div>
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
  selectInput: { backgroundColor: '#121214', border: '1px solid #3F3F46', color: '#FFF', padding: '8px', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box' },
  list: { display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' },
  listItem: { backgroundColor: '#1E1E26', padding: '12px', borderRadius: '10px', border: '1px solid #2A2A36', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', boxSizing: 'border-box' },
  itemInfo: { display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 },
  itemHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' },
  serviceName: { fontSize: '13px', fontWeight: '600', color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemPrice: { fontSize: '13px', fontWeight: '700', color: '#E5A93C', flexShrink: 0 },
  itemMeta: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#71717A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  dateText: { color: '#A1A1AA' },
  notesText: { color: '#71717A', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis' },
  actionButtonsRow: { display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 },
  iconBtn: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', borderRadius: '6px' },
  emptyState: { padding: '30px', textAlign: 'center', color: '#71717A', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', fontSize: '13px' },
  paginationBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1E1E26', padding: '10px 14px', borderRadius: '10px', border: '1px solid #2A2A36', width: '100%', boxSizing: 'border-box' },
  pageSizeSelector: { display: 'flex', alignItems: 'center', gap: '6px' },
  pageLabel: { fontSize: '12px', color: '#A1A1AA' },
  pageSizeSelect: { backgroundColor: '#121214', border: '1px solid #3F3F46', color: '#FFF', fontSize: '12px', padding: '4px', borderRadius: '6px' },
  pageControls: { display: 'flex', alignItems: 'center', gap: '10px' },
  pageIndicator: { fontSize: '12px', color: '#FFF', fontWeight: '600' },
  pageBtn: { backgroundColor: '#2A2A36', color: '#FFF', border: 'none', borderRadius: '6px', padding: '4px 8px', display: 'flex', alignItems: 'center' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 },
  modalBody: { backgroundColor: '#1E1E26', borderRadius: '14px', border: '1px solid #2A2A36', width: '100%', maxWidth: '400px', padding: '16px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' },
  modalTitle: { fontSize: '16px', fontWeight: '700', color: '#FFF', margin: 0 },
  closeBtn: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '12px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  inputLabel: { fontSize: '12px', color: '#A1A1AA', fontWeight: '600' },
  textInput: { backgroundColor: '#121214', border: '1px solid #3F3F46', color: '#FFF', padding: '10px', borderRadius: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' },
  editServiceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#121214', padding: '8px 10px', borderRadius: '8px', border: '1px solid #2A2A36' },
  editServiceName: { fontSize: '13px', color: '#FFF', fontWeight: '500' },
  editPriceWrapper: { display: 'flex', alignItems: 'center', gap: '4px', color: '#E5A93C', fontWeight: '700' },
  numberInput: { backgroundColor: '#1E1E26', border: '1px solid #3F3F46', color: '#E5A93C', padding: '6px', borderRadius: '6px', fontSize: '13px', fontWeight: '700', width: '70px', textAlign: 'right' },
  saveSubmitBtn: { backgroundColor: '#E5A93C', color: '#121214', border: 'none', padding: '12px', fontSize: '14px', fontWeight: '700', borderRadius: '8px', cursor: 'pointer', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }
};