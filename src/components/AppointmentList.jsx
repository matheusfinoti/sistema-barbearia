import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { Filter, Trash2, ChevronLeft, ChevronRight, Calendar, Search } from 'lucide-react';

export function AppointmentList({ refreshTrigger, onDeleteSuccess }) {
  const [appointments, setAppointments] = useState([]);
  const [filterServiceOptions, setFilterServiceOptions] = useState([]);
  
  // Filtros
  const [selectedService, setSelectedService] = useState('ALL');
  const [dateRange, setDateRange] = useState('MONTH'); // 'TODAY', 'WEEK', 'MONTH', 'ALL'
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    async function loadData() {
      const activeServices = await db.services.toArray();
      const list = await db.appointments.reverse().sortBy('date');
      setAppointments(list);

      // Consolida nomes dos serviços ativos + nomes dos serviços no histórico
      const activeNames = activeServices.map(s => s.name);
      
      // Extrai nomes de serviços mesmo em combos (ex: "Cabelo + Barba" -> "Cabelo", "Barba")
      const historicalNames = list.flatMap(item => {
        if (!item.service_name) return [];
        return item.service_name.split(' + ');
      });

      const uniqueNames = Array.from(new Set([...activeNames, ...historicalNames])).filter(Boolean);
      setFilterServiceOptions(uniqueNames);
    }
    loadData();
  }, [refreshTrigger]);

  // Aplicação dos Filtros
  const filteredAppointments = appointments.filter((item) => {
    // 1. Filtro de Serviço (Verifica se o serviço selecionado faz parte do atendimento)
    if (selectedService !== 'ALL') {
      if (!item.service_name || !item.service_name.includes(selectedService)) {
        return false;
      }
    }

    // 2. Filtro de Data
    const itemDate = new Date(item.date);
    const now = new Date();

    if (dateRange === 'TODAY') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return itemDate >= startOfToday;
    }

    if (dateRange === 'WEEK') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return itemDate >= sevenDaysAgo;
    }

    if (dateRange === 'MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return itemDate >= startOfMonth;
    }

    return true; // 'ALL'
  });

  // Cálculo da Paginação
  const totalItems = filteredAppointments.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedAppointments = filteredAppointments.slice(startIndex, startIndex + pageSize);

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente remover este registro de corte?')) {
      await db.appointments.delete(id);
      if (onDeleteSuccess) onDeleteSuccess();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h3 style={styles.sectionTitle}>Últimos Cortes</h3>
        <span style={styles.badge}>{totalItems} registrados</span>
      </div>

      {/* BARRA DE FILTROS */}
      <div style={styles.filterCard}>
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}><Calendar size={14} color="#E5A93C" /> Período:</label>
          <select 
            value={dateRange} 
            onChange={(e) => { setDateRange(e.target.value); setCurrentPage(1); }}
            style={styles.selectInput}
          >
            <option value="TODAY">Hoje</option>
            <option value="WEEK">Últimos 7 dias</option>
            <option value="MONTH">Este Mês</option>
            <option value="ALL">Todo o Histórico</option>
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}><Filter size={14} color="#E5A93C" /> Serviço:</label>
          <select 
            value={selectedService} 
            onChange={(e) => { setSelectedService(e.target.value); setCurrentPage(1); }}
            style={styles.selectInput}
          >
            <option value="ALL">Todos os Serviços</option>
            {filterServiceOptions.map((serviceName, idx) => (
              <option key={idx} value={serviceName}>{serviceName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* LISTA DE CORTES */}
      {paginatedAppointments.length === 0 ? (
        <div style={styles.emptyState}>
          <Search size={32} color="#52525B" />
          <p>Nenhum corte encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {paginatedAppointments.map((item) => {
            const formattedDate = new Date(item.date).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });

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

                <button 
                  onClick={() => handleDelete(item.id)} 
                  style={styles.deleteBtn}
                  title="Excluir Registro"
                >
                  <Trash2 size={16} color="#EF4444" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINAÇÃO */}
      <div style={styles.paginationBar}>
        <div style={styles.pageSizeSelector}>
          <span style={styles.pageLabel}>Exibir:</span>
          <select 
            value={pageSize} 
            onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
            style={styles.pageSizeSelect}
          >
            <option value={20}>20 por pág.</option>
            <option value={30}>30 por pág.</option>
            <option value={40}>40 por pág.</option>
            <option value={50}>50 por pág.</option>
          </select>
        </div>

        <div style={styles.pageControls}>
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            style={{ ...styles.pageBtn, opacity: currentPage === 1 ? 0.4 : 1 }}
          >
            <ChevronLeft size={18} />
          </button>
          
          <span style={styles.pageIndicator}>{currentPage} / {totalPages}</span>

          <button 
            disabled={currentPage >= totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
            style={{ ...styles.pageBtn, opacity: currentPage >= totalPages ? 0.4 : 1 }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '8px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#FFF',
    margin: 0,
  },
  badge: {
    backgroundColor: '#2A2A36',
    color: '#E5A93C',
    fontSize: '12px',
    padding: '4px 10px',
    borderRadius: '20px',
    fontWeight: '600',
  },
  filterCard: {
    backgroundColor: '#1E1E26',
    padding: '12px',
    borderRadius: '12px',
    border: '1px solid #2A2A36',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  filterLabel: {
    fontSize: '11px',
    color: '#A1A1AA',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  selectInput: {
    backgroundColor: '#121214',
    border: '1px solid #3F3F46',
    color: '#FFF',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '13px',
    width: '100%',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  listItem: {
    backgroundColor: '#1E1E26',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid #2A2A36',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
  },
  itemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#FFF',
  },
  itemPrice: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#E5A93C',
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#71717A',
  },
  dateText: {
    color: '#A1A1AA',
  },
  notesText: {
    color: '#71717A',
    fontStyle: 'italic',
  },
  deleteBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
  },
  emptyState: {
    padding: '30px',
    textAlign: 'center',
    color: '#71717A',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
  },
  paginationBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E26',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #2A2A36',
    marginTop: '6px',
  },
  pageSizeSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  pageLabel: {
    fontSize: '12px',
    color: '#A1A1AA',
  },
  pageSizeSelect: {
    backgroundColor: '#121214',
    border: '1px solid #3F3F46',
    color: '#FFF',
    fontSize: '12px',
    padding: '4px 6px',
    borderRadius: '6px',
  },
  pageControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  pageIndicator: {
    fontSize: '12px',
    color: '#FFF',
    fontWeight: '600',
  },
  pageBtn: {
    backgroundColor: '#2A2A36',
    color: '#FFF',
    border: 'none',
    borderRadius: '6px',
    padding: '4px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
};