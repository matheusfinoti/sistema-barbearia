import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { 
  ShieldAlert, Share2, Database, CheckCircle, 
  Plus, Edit2, Trash2, Tag, Scissors, User, Zap, 
  Smile, Sparkles, Palette, Sun, Waves, Coins, Star, Heart, X
} from 'lucide-react';

const AVAILABLE_ICONS = [
  { name: 'Scissors', label: 'Tesoura', Icon: Scissors },
  { name: 'User', label: 'Pessoa', Icon: User },
  { name: 'Zap', label: 'Raio/Rapado', Icon: Zap },
  { name: 'Smile', label: 'Sorriso/Barba', Icon: Smile },
  { name: 'Sparkles', label: 'Brilho', Icon: Sparkles },
  { name: 'Palette', label: 'Paleta/Pintura', Icon: Palette },
  { name: 'Sun', label: 'Sol/Descoloração', Icon: Sun },
  { name: 'Waves', label: 'Ondas/Permanente', Icon: Waves },
  { name: 'Coins', label: 'Moedas/Propina', Icon: Coins },
  { name: 'Star', label: 'Estrela', Icon: Star },
  { name: 'Heart', label: 'Coração', Icon: Heart },
  { name: 'Tag', label: 'Etiqueta', Icon: Tag },
];

export function AdminPanel() {
  const [services, setServices] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formIcon, setFormIcon] = useState('Scissors');

  useEffect(() => {
    loadServices();
  }, []);

  async function loadServices() {
    const list = await db.services.toArray();
    setServices(list);
  }

  const handleBackup = async () => {
    setStatusMessage('');
    setIsExporting(true);

    try {
      const currentServices = await db.services.toArray();
      const appointments = await db.appointments.toArray();

      const backupData = {
        data_exportacao: new Date().toISOString(),
        versao_banco: 1,
        total_atendimentos: appointments.length,
        services: currentServices,
        appointments
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const dataFormatada = new Date().toISOString().slice(0, 10);
      const fileName = `backup_barbearia_${dataFormatada}.json`;

      const blob = new Blob([jsonString], { type: 'text/plain;charset=utf-8' });
      const file = new File([blob], fileName, { type: 'text/plain' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Backup Barbearia',
            text: `Backup dos dados da barbearia (${dataFormatada})`,
            files: [file]
          });
          setStatusMessage('Backup enviado com sucesso!');
          setIsExporting(false);
          return;
        } catch (shareErr) {
          console.warn('Share nativo falhou, usando fallback:', shareErr);
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage('Arquivo baixado na pasta "Downloads". Envie-o pelo WhatsApp.');
    } catch (error) {
      console.error("Erro no backup:", error);
      alert('Erro ao acessar o banco para backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenForm = (service = null) => {
    if (service) {
      setEditingId(service.id);
      setFormName(service.name);
      setFormPrice(service.price);
      setFormIcon(service.icon_name || 'Scissors');
    } else {
      setEditingId(null);
      setFormName('');
      setFormPrice('');
      setFormIcon('Scissors');
    }
    setIsModalOpen(true);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!formName.trim() || formPrice === '') {
      return alert('Preencha o nome e o preço do serviço.');
    }

    const serviceData = {
      name: formName.trim(),
      price: Number(formPrice),
      icon_name: formIcon,
      is_active: 1
    };

    if (editingId) {
      await db.services.update(editingId, serviceData);
    } else {
      await db.services.add(serviceData);
    }

    setIsModalOpen(false);
    loadServices();
  };

  const handleDeleteService = async (id, name) => {
    if (window.confirm(`Deseja excluir o serviço "${name}"?\n\nOs atendimentos já registrados com este serviço continuarão intactos nos relatórios.`)) {
      await db.services.delete(id);
      loadServices();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <ShieldAlert size={28} color="#E5A93C" />
        <h2 style={styles.title}>Área Administrativa</h2>
        <p style={styles.subtitle}>Gerenciamento de dados e configurações</p>
      </div>

      {/* SEÇÃO 1: GERENCIAR SERVIÇOS */}
      <div style={styles.sectionCard}>
        <div style={styles.cardHeaderBetween}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={20} color="#E5A93C" />
            <h3 style={styles.cardTitle}>Gerenciar Serviços</h3>
          </div>
          <button onClick={() => handleOpenForm()} style={styles.addBtn}>
            <Plus size={16} /> Novo
          </button>
        </div>

        <div style={styles.servicesList}>
          {services.map((item) => {
            const iconObj = AVAILABLE_ICONS.find(i => i.name === item.icon_name) || AVAILABLE_ICONS[0];
            const IconComp = iconObj.Icon;

            return (
              <div key={item.id} style={styles.serviceRow}>
                <div style={styles.serviceRowLeft}>
                  <div style={styles.iconCircle}>
                    <IconComp size={18} color="#E5A93C" />
                  </div>
                  {/* Container ajustado com alinhamento explícito à esquerda */}
                  <div style={styles.serviceTextContainer}>
                    <div style={styles.serviceRowName}>{item.name}</div>
                    <div style={styles.serviceRowPrice}>€ {Number(item.price).toFixed(2)}</div>
                  </div>
                </div>

                <div style={styles.serviceRowActions}>
                  <button onClick={() => handleOpenForm(item)} style={styles.iconBtn} title="Editar">
                    <Edit2 size={16} color="#38BDF8" />
                  </button>
                  <button onClick={() => handleDeleteService(item.id, item.name)} style={styles.iconBtn} title="Excluir">
                    <Trash2 size={16} color="#EF4444" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEÇÃO 2: BACKUP */}
      <div style={styles.sectionCard}>
        <div style={styles.cardHeader}>
          <Database size={20} color="#38BDF8" />
          <h3 style={styles.cardTitle}>Backup dos Dados</h3>
        </div>
        <p style={styles.cardDescription}>
          Gere uma cópia de segurança de todos os cortes e serviços para enviar via WhatsApp ou salvar no dispositivo.
        </p>

        {statusMessage && (
          <div style={styles.statusBox}>
            <CheckCircle size={16} color="#10B981" />
            <span>{statusMessage}</span>
          </div>
        )}
        
        <button onClick={handleBackup} disabled={isExporting} style={styles.actionBtn}>
          <span style={styles.btnContent}>
            <Share2 size={18} /> Exportar Backup (WhatsApp)
          </span>
        </button>
      </div>

      {/* MODAL / FORMULÁRIO DE CRIAR OU EDITAR SERVIÇO */}
      {isModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBody}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editingId ? 'Editar Serviço' : 'Novo Serviço'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={styles.closeBtn}>
                <X size={20} color="#A1A1AA" />
              </button>
            </div>

            <form onSubmit={handleSaveService} style={styles.modalForm}>
              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Nome do Serviço:</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)} 
                  placeholder="Ex: Barba Premium" 
                  required 
                  style={styles.textInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Preço Padrão (€):</label>
                <input 
                  type="number" 
                  step="0.5" 
                  value={formPrice} 
                  onChange={(e) => setFormPrice(e.target.value)} 
                  placeholder="Ex: 20" 
                  required 
                  style={styles.textInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>Ícone:</label>
                <div style={styles.iconSelectorGrid}>
                  {AVAILABLE_ICONS.map((icon) => {
                    const IconC = icon.Icon;
                    const isSelected = formIcon === icon.name;

                    return (
                      <button
                        type="button"
                        key={icon.name}
                        onClick={() => setFormIcon(icon.name)}
                        style={{
                          ...styles.iconOptionBtn,
                          borderColor: isSelected ? '#E5A93C' : '#2A2A36',
                          backgroundColor: isSelected ? '#25231F' : '#121214',
                        }}
                      >
                        <IconC size={20} color={isSelected ? '#E5A93C' : '#A1A1AA'} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <button type="submit" style={styles.saveSubmitBtn}>
                Salvar Serviço
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '8px 0',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: '18px',
    backgroundColor: '#1E1E26',
    borderRadius: '14px',
    border: '1px solid #2A2A36',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#FFF',
    margin: '8px 0 2px 0',
  },
  subtitle: {
    fontSize: '12px',
    color: '#A1A1AA',
    margin: 0,
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
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardHeaderBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#FFF',
    margin: 0,
  },
  cardDescription: {
    fontSize: '13px',
    color: '#A1A1AA',
    lineHeight: '1.4',
    margin: 0,
  },
  addBtn: {
    backgroundColor: '#E5A93C',
    color: '#121214',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  servicesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginTop: '4px',
  },
  serviceRow: {
    backgroundColor: '#121214',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #2A2A36',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  serviceRowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  serviceTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: '2px',
    minWidth: 0,
  },
  iconCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#25231F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  serviceRowName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#FFF',
    margin: 0,
    padding: 0,
    textAlign: 'left',
    lineHeight: '1.2',
  },
  serviceRowPrice: {
    fontSize: '12px',
    color: '#E5A93C',
    fontWeight: '700',
    margin: 0,
    padding: 0,
    textAlign: 'left',
    lineHeight: '1.2',
  },
  serviceRowActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flexShrink: 0,
  },
  iconBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '6px',
    cursor: 'pointer',
    borderRadius: '6px',
  },
  statusBox: {
    backgroundColor: '#1E293B',
    border: '1px solid #10B981',
    color: '#F8FAFC',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  actionBtn: {
    backgroundColor: '#25231F',
    color: '#E5A93C',
    border: '1px solid #E5A93C',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  btnContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 9999,
  },
  modalBody: {
    backgroundColor: '#1E1E26',
    borderRadius: '14px',
    border: '1px solid #2A2A36',
    width: '100%',
    maxWidth: '400px',
    padding: '16px',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#FFF',
    margin: 0,
  },
  closeBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  inputLabel: {
    fontSize: '12px',
    color: '#A1A1AA',
  },
  textInput: {
    backgroundColor: '#121214',
    border: '1px solid #3F3F46',
    color: '#FFF',
    padding: '10px',
    borderRadius: '8px',
    fontSize: '14px',
  },
  iconSelectorGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '6px',
    marginTop: '4px',
  },
  iconOptionBtn: {
    padding: '8px',
    borderRadius: '8px',
    border: '1px solid #2A2A36',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveSubmitBtn: {
    backgroundColor: '#E5A93C',
    color: '#121214',
    border: 'none',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '700',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '6px',
  },
};