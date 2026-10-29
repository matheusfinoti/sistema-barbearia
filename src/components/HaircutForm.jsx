import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { 
  Scissors, User, Zap, Smile, Sparkles, 
  Palette, Sun, Waves, Coins, Check, Clock, FileText, Tag, AlertTriangle 
} from 'lucide-react';

const iconMap = {
  Scissors: Scissors,
  User: User,
  Zap: Zap,
  Smile: Smile,
  Sparkles: Sparkles,
  Palette: Palette,
  Sun: Sun,
  Waves: Waves,
  Coins: Coins,
};

const DEFAULT_SERVICES = [
  { id: 1, name: 'Cabelo', price: 20, icon_name: 'Scissors', is_active: 1 },
  { id: 2, name: 'Corte niño', price: 15, icon_name: 'User', is_active: 1 },
  { id: 3, name: 'Rapado', price: 15, icon_name: 'Zap', is_active: 1 },
  { id: 4, name: 'Barba', price: 18, icon_name: 'Smile', is_active: 1 },
  { id: 5, name: 'Sobrancelha', price: 5, icon_name: 'Sparkles', is_active: 1 },
  { id: 6, name: 'Camuflagem', price: 35, icon_name: 'Palette', is_active: 1 },
  { id: 7, name: 'Descoloração', price: 100, icon_name: 'Sun', is_active: 1 },
  { id: 8, name: 'Permanente', price: 80, icon_name: 'Waves', is_active: 1 },
  { id: 9, name: 'Propina', price: 0, icon_name: 'Coins', is_active: 1 }
];

function getRoundedCurrentDateTime() {
  const now = new Date();
  const minutes = now.getMinutes();
  const roundedMinutes = Math.round(minutes / 10) * 10;
  now.setMinutes(roundedMinutes);
  now.setSeconds(0);
  
  const tzOffset = now.getTimezoneOffset() * 60000;
  return (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
}

export function HaircutForm({ onSaveSuccess }) {
  const [services, setServices] = useState([]);
  const [selectedItems, setSelectedItems] = useState({});
  const [activeComboMsg, setActiveComboMsg] = useState('');
  
  const [date, setDate] = useState(getRoundedCurrentDateTime());
  const [notes, setNotes] = useState('');
  const [savedToast, setSavedToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function syncAndLoadServices() {
      try {
        let list = await db.services.toArray();
        const isMatchingNew = list.length === 9 && list.some(s => s.name === 'Cabelo');
        
        if (!isMatchingNew) {
          await db.services.clear();
          await db.services.bulkPut(DEFAULT_SERVICES);
          list = DEFAULT_SERVICES;
        }

        setServices(list);
        
        const cabeloItem = list.find(s => s.name === 'Cabelo') || list[0];
        if (cabeloItem) {
          setSelectedItems({ [cabeloItem.id]: cabeloItem.price });
        }
      } catch (err) {
        console.error('Erro ao sincronizar serviços:', err);
        setErrorMessage('Falha ao acessar o banco de dados local.');
      }
    }
    syncAndLoadServices();
  }, []);

  const handleToggleService = (service) => {
    const isSelected = selectedItems.hasOwnProperty(service.id);
    let updated = { ...selectedItems };

    if (isSelected) {
      delete updated[service.id];
    } else {
      updated[service.id] = service.price;
    }

    const cabeloObj = services.find(s => s.name === 'Cabelo');
    const rapadoObj = services.find(s => s.name === 'Rapado');
    const barbaObj = services.find(s => s.name === 'Barba');

    const hasCabelo = cabeloObj && updated.hasOwnProperty(cabeloObj.id);
    const hasRapado = rapadoObj && updated.hasOwnProperty(rapadoObj.id);
    const hasBarba = barbaObj && updated.hasOwnProperty(barbaObj.id);

    let comboBanner = '';

    if (hasCabelo && hasBarba) {
      updated[cabeloObj.id] = 16;
      updated[barbaObj.id] = 14;
      comboBanner = 'Promoção Cabelo + Barba ativada! (€30)';
    } 
    else if (hasRapado && hasBarba) {
      updated[rapadoObj.id] = 11;
      updated[barbaObj.id] = 14;
      comboBanner = 'Promoção Rapado + Barba ativada! (€25)';
    }

    setSelectedItems(updated);
    setActiveComboMsg(comboBanner);
  };

  const handlePriceChange = (serviceId, newPrice) => {
    setSelectedItems(prev => ({
      ...prev,
      [serviceId]: Number(newPrice)
    }));
  };

  const adjustMinutes = (deltaMinutes) => {
    const currentDate = new Date(date);
    currentDate.setMinutes(currentDate.getMinutes() + deltaMinutes);
    const tzOffset = currentDate.getTimezoneOffset() * 60000;
    setDate((new Date(currentDate.getTime() - tzOffset)).toISOString().slice(0, 16));
  };

  const totalPrice = Object.values(selectedItems).reduce((sum, val) => sum + val, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const selectedIds = Object.keys(selectedItems);
    
    if (selectedIds.length === 0) {
      return alert('Selecione pelo menos um serviço!');
    }

    const selectedNames = services
      .filter(s => selectedItems.hasOwnProperty(s.id))
      .map(s => s.name)
      .join(' + ');

    const newAppointmentDate = new Date(date);

    try {
      // 1. Trava anti-fraude do relógio (Item 4)
      const lastAppointment = await db.appointments.orderBy('date').last();
      if (lastAppointment) {
        const lastDate = new Date(lastAppointment.date);
        // Se tentar lançar uma data anterior a mais de 24h do último registro sem motivo
        if (newAppointmentDate < new Date(lastDate.getTime() - 86400000)) {
          if (!window.confirm('A data selecionada é anterior aos registros mais recentes. Deseja confirmar?')) {
            return;
          }
        }
      }

      // 2. Gravando no IndexedDB com captura de erro (Item 3)
      await db.appointments.add({
        date: newAppointmentDate.toISOString(),
        service_id: Number(selectedIds[0]),
        service_name: selectedNames,
        price: totalPrice,
        notes: notes,
      });

      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2500);

      setNotes('');
      setDate(getRoundedCurrentDateTime());
      if (onSaveSuccess) onSaveSuccess();

    } catch (error) {
      console.error('Erro ao salvar corte:', error);
      if (error.name === 'QuotaExceededError') {
        setErrorMessage('Memória do celular cheia! Libere espaço de armazenamento.');
      } else {
        setErrorMessage('Erro ao gravar no banco local. Verifique as permissões do navegador.');
      }
    }
  };

  return (
    <div style={styles.container}>
      {savedToast && (
        <div style={styles.toast}>
          <Check size={20} color="#10B981" /> Corte registrado com sucesso!
        </div>
      )}

      {errorMessage && (
        <div style={styles.errorBox}>
          <AlertTriangle size={20} color="#EF4444" /> {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.header}>
          <h2 style={styles.title}>Novo Atendimento</h2>
          <span style={styles.subtitle}>Selecione um ou mais serviços</span>
        </div>

        {/* 1º CAMPO: DATA E HORA */}
        <div style={styles.sectionCard}>
          <label style={styles.label}>
            <Clock size={16} color="#E5A93C" /> 1. Data e Hora (passos de 10 min)
          </label>
          <input 
            type="datetime-local" 
            step="600" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            required 
            style={styles.dateTimeInput}
          />
          <div style={styles.quickTimeBar}>
            <button type="button" onClick={() => setDate(getRoundedCurrentDateTime())} style={styles.chipBtn}>Agora</button>
            <button type="button" onClick={() => adjustMinutes(-10)} style={styles.chipBtn}>-10 min</button>
            <button type="button" onClick={() => adjustMinutes(10)} style={styles.chipBtn}>+10 min</button>
            <button type="button" onClick={() => adjustMinutes(30)} style={styles.chipBtn}>+30 min</button>
          </div>
        </div>

        {/* 2º CAMPO: GRADE 3x3 DE SERVIÇOS */}
        <div style={styles.sectionCard}>
          <label style={styles.label}>
            <Tag size={16} color="#E5A93C" /> 2. Serviços Executados (Grade 3x3)
          </label>

          {activeComboMsg && (
            <div style={styles.comboBanner}>
              <Sparkles size={16} color="#E5A93C" /> {activeComboMsg}
            </div>
          )}

          <div style={styles.grid3x3}>
            {services.slice(0, 9).map((service) => {
              const IconComponent = iconMap[service.icon_name] || Scissors;
              const isSelected = selectedItems.hasOwnProperty(service.id);

              return (
                <button
                  type="button"
                  key={service.id}
                  onClick={() => handleToggleService(service)}
                  style={{
                    ...styles.card,
                    borderColor: isSelected ? '#E5A93C' : '#2A2A36',
                    backgroundColor: isSelected ? '#25231F' : '#121214',
                    boxShadow: isSelected ? '0 0 10px rgba(229, 169, 60, 0.25)' : 'none',
                  }}
                >
                  <div style={{
                    ...styles.iconCircle,
                    backgroundColor: isSelected ? '#E5A93C' : '#2A2A36',
                    color: isSelected ? '#121214' : '#A1A1AA',
                  }}>
                    <IconComponent size={20} />
                  </div>
                  <span style={{
                    ...styles.cardName,
                    color: isSelected ? '#FFF' : '#A1A1AA',
                    fontWeight: isSelected ? '700' : '400',
                  }}>
                    {service.name}
                  </span>
                  <span style={styles.cardPrice}>
                    € {isSelected ? selectedItems[service.id] : service.price}
                  </span>
                </button>
              );
            })}
          </div>

          {/* SLIDERS DE AJUSTE INDIVIDUAL */}
          {Object.keys(selectedItems).length > 0 && (
            <div style={styles.priceSlidersBox}>
              <span style={styles.sliderBoxTitle}>Ajuste de valor por serviço:</span>
              {services
                .filter(s => selectedItems.hasOwnProperty(s.id))
                .map((service) => (
                  <div key={service.id} style={styles.singleSliderRow}>
                    <div style={styles.sliderHeader}>
                      <span style={styles.sliderServiceName}>{service.name}</span>
                      <span style={styles.sliderValueText}>€ {selectedItems[service.id]}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="120" 
                      step="1" 
                      value={selectedItems[service.id]} 
                      onChange={(e) => handlePriceChange(service.id, e.target.value)}
                      style={styles.sliderInput}
                    />
                  </div>
                ))}
            </div>
          )}

          <div style={styles.totalBox}>
            <span>TOTAL DO ATENDIMENTO:</span>
            <span style={styles.totalPriceText}>€ {totalPrice}</span>
          </div>
        </div>

        {/* 3º CAMPO: OBSERVAÇÃO */}
        <div style={styles.sectionCard}>
          <label style={styles.label}>
            <FileText size={16} color="#A1A1AA" /> 3. Observação (opcional)
          </label>
          <input 
            type="text" 
            value={notes} 
            onChange={(e) => setNotes(e.target.value)} 
            placeholder="Ex: Pagamento em dinheiro, cliente habitual..." 
            style={styles.textInput}
          />
        </div>

        <button type="submit" style={styles.submitBtn}>
          <Check size={22} /> Confirmar Atendimento (€ {totalPrice})
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '480px',
    margin: '0 auto',
    padding: '16px',
    backgroundColor: '#121214',
    minHeight: '100vh',
    color: '#F4F4F5',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  toast: {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    padding: '12px 20px',
    borderRadius: '30px',
    border: '1px solid #10B981',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    zIndex: 9999,
    fontSize: '14px',
    fontWeight: '500',
  },
  errorBox: {
    backgroundColor: '#311212',
    border: '1px solid #EF4444',
    color: '#F87171',
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  header: {
    marginBottom: '2px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    margin: '0',
    color: '#FFF',
  },
  subtitle: {
    fontSize: '13px',
    color: '#A1A1AA',
  },
  sectionCard: {
    backgroundColor: '#1E1E26',
    padding: '16px',
    borderRadius: '14px',
    border: '1px solid #2A2A36',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  label: {
    fontSize: '13px',
    color: '#A1A1AA',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '600',
  },
  dateTimeInput: {
    backgroundColor: '#121214',
    border: '1px solid #3F3F46',
    color: '#FFF',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '15px',
    width: '100%',
    boxSizing: 'border-box',
  },
  quickTimeBar: {
    display: 'flex',
    gap: '8px',
  },
  chipBtn: {
    flex: 1,
    padding: '8px 0',
    backgroundColor: '#2A2A36',
    color: '#D4D4D8',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  comboBanner: {
    backgroundColor: '#25231F',
    border: '1px solid #E5A93C',
    color: '#E5A93C',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  grid3x3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px 4px',
    borderRadius: '10px',
    border: '1.5px solid #2A2A36',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  iconCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '6px',
  },
  cardName: {
    fontSize: '11px',
    textAlign: 'center',
    marginBottom: '2px',
    lineHeight: '1.2',
  },
  cardPrice: {
    fontSize: '12px',
    color: '#E5A93C',
    fontWeight: '700',
  },
  priceSlidersBox: {
    backgroundColor: '#121214',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #2A2A36',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '4px',
  },
  sliderBoxTitle: {
    fontSize: '12px',
    color: '#A1A1AA',
    fontWeight: '500',
  },
  singleSliderRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  sliderServiceName: {
    color: '#FFF',
    fontWeight: '600',
  },
  sliderValueText: {
    color: '#E5A93C',
    fontWeight: '700',
  },
  sliderInput: {
    width: '100%',
    accentColor: '#E5A93C',
    cursor: 'pointer',
    height: '6px',
  },
  totalBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#25231F',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #E5A93C',
    color: '#FFF',
    fontSize: '13px',
    fontWeight: '600',
    marginTop: '4px',
  },
  totalPriceText: {
    fontSize: '22px',
    fontWeight: '800',
    color: '#E5A93C',
  },
  textInput: {
    backgroundColor: '#121214',
    border: '1px solid #3F3F46',
    color: '#FFF',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
  },
  submitBtn: {
    backgroundColor: '#E5A93C',
    color: '#121214',
    border: 'none',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '700',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '4px',
    boxShadow: '0 4px 14px rgba(229, 169, 60, 0.3)',
  },
};