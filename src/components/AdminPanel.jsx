import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db, dbApi } from '../services/db';
import { encryptDataWithPassword, decryptDataWithPassword, encryptObj, isUnlocked, changeMasterPassword } from '../services/crypto';
import { PinPad } from './PinPad';
import { Shield, Download, Upload, Percent, Check, Plus, Edit2, Trash2, Scissors, User, Zap, Smile, Sparkles, Palette, Sun, Waves, Coins, X, Lock } from 'lucide-react';

const iconMap = { Scissors: Scissors, User: User, Zap: Zap, Smile: Smile, Sparkles: Sparkles, Palette: Palette, Sun: Sun, Waves: Waves, Coins: Coins };

export function AdminPanel() {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [commission, setCommission] = useState('100');
  const [successMsg, setSuccessMsg] = useState('');

  const [editingService, setEditingService] = useState(null);
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceIcon, setServiceIcon] = useState('Scissors');

  // Estados Troca de Senha
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [changeStep, setChangeStep] = useState('CURRENT'); // CURRENT, NEW, CONFIRM
  const [tempCurrentPin, setTempCurrentPin] = useState('');
  const [tempNewPin, setTempNewPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Estados Exportação/Importação
  const [showExportModal, setShowExportModal] = useState(false);
  const [pendingImportData, setPendingImportData] = useState(null);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadServices();
    const saved = localStorage.getItem('barber_commission_percent');
    if (saved) setCommission(saved);
  }, []);

  async function loadServices() {
    try { setServices(await db.services.toArray()); } 
    catch (err) { console.error('Erro ao carregar serviços:', err); }
  }

  const handleSaveCommission = (e) => {
    e.preventDefault();
    const val = Number(commission);
    if (isNaN(val) || val < 0 || val > 100) return;
    localStorage.setItem('barber_commission_percent', val.toString());
    setSuccessMsg('Configurações salvas!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleOpenNewService = () => {
    setEditingService('NEW'); setServiceName(''); setServicePrice(''); setServiceIcon('Scissors');
  };

  const handleOpenEditService = (srv) => {
    setEditingService(srv); setServiceName(srv.name); setServicePrice(srv.price.toString()); setServiceIcon(srv.icon_name || 'Scissors');
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!serviceName.trim() || isNaN(Number(servicePrice))) return;
    try {
      if (editingService === 'NEW') await db.services.add({ name: serviceName.trim(), price: Number(servicePrice), icon_name: serviceIcon, is_active: 1 });
      else if (editingService && editingService.id) await db.services.update(editingService.id, { name: serviceName.trim(), price: Number(servicePrice), icon_name: serviceIcon });
      setEditingService(null); loadServices();
    } catch (err) { console.error(err); }
  };

  const handleDeleteService = async (id) => {
    if (window.confirm('Excluir este serviço?')) {
      try { await db.services.delete(id); loadServices(); } catch (err) { console.error(err); }
    }
  };

  // Lógica da Troca de Senha com o PinPad
  const handleChangePinComplete = async (pin) => {
    setPinError('');
    if (changeStep === 'CURRENT') {
      setTempCurrentPin(pin);
      setChangeStep('NEW');
    } else if (changeStep === 'NEW') {
      setTempNewPin(pin);
      setChangeStep('CONFIRM');
    } else if (changeStep === 'CONFIRM') {
      if (pin !== tempNewPin) {
        setPinError('Os números não coincidem. Tente novamente.');
        setChangeStep('NEW');
        return;
      }
      try {
        await changeMasterPassword(tempCurrentPin, pin);
        setShowPasswordModal(false);
        setSuccessMsg('PIN alterado com sucesso!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } catch (err) {
        setPinError('O PIN atual está incorreto.');
        setChangeStep('CURRENT');
      }
    }
  };

  // Lógica de Exportação com o PinPad
  const handleExportPinComplete = async (pin) => {
    setPinError('');
    try {
      const dbServices = await db.services.toArray();
      const appointments = await dbApi.getAppointments();
      const payload = { services: dbServices, appointments };
      const encryptedContainer = await encryptDataWithPassword(pin, payload);

      const blob = new Blob([JSON.stringify(encryptedContainer, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `barbearia-backup-${new Date().toISOString().slice(0, 10)}.enc.json`;
      a.click();
      URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (err) {
      setPinError('Erro ao gerar backup.');
    }
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.version && (Array.isArray(parsed.services) || Array.isArray(parsed.appointments))) {
          await restoreDecryptedPayload(parsed);
          alert('Backup importado com sucesso!'); window.location.reload(); return;
        }
        if (parsed.version !== 'encrypted-backup-v1') { alert('Formato inválido.'); return; }
        setPendingImportData(parsed);
        setPinError('');
      } catch (err) { alert('Erro ao ler arquivo.'); }
    };
    reader.readAsText(file); e.target.value = '';
  };

  // Lógica de Importação com o PinPad
  const handleImportPinComplete = async (pin) => {
    setPinError('');
    try {
      const decryptedData = await decryptDataWithPassword(pin, pendingImportData);
      if (!decryptedData) throw new Error('Falha');
      await restoreDecryptedPayload(decryptedData);
      alert('Banco restaurado com sucesso!');
      setPendingImportData(null);
      window.location.reload();
    } catch (err) {
      if (err.name === 'OperationError' || (err.message && err.message.includes('pad'))) {
        setPinError('PIN de backup incorreto.');
      } else {
        setPinError(err.message || 'Erro ao processar dados.');
      }
    }
  };

  const restoreDecryptedPayload = async (decryptedData) => {
    const servicesToRestore = Array.isArray(decryptedData.services) ? decryptedData.services : [];
    const appointmentsToRestore = Array.isArray(decryptedData.appointments) ? decryptedData.appointments : [];
    const reEncryptedAppointments = await Promise.all(
      appointmentsToRestore.map(async (apt) => {
        if (apt.encryptedData && apt.service_name === undefined) throw new Error('Criptografia incompatível.');
        const cleanPayload = { service_name: apt.service_name || 'Serviço', price: Number(apt.price) || 0, items: Array.isArray(apt.items) ? apt.items : [], notes: apt.notes || '' };
        const enc = await encryptObj(cleanPayload);
        return { ...(apt.id !== undefined ? { id: apt.id } : {}), date: apt.date || new Date().toISOString(), encryptedData: enc };
      })
    );
    await db.transaction('rw', db.services, db.appointments, async () => {
      if (servicesToRestore.length > 0) { await db.services.clear(); await db.services.bulkPut(servicesToRestore); }
      if (reEncryptedAppointments.length > 0) { await db.appointments.clear(); await db.appointments.bulkPut(reEncryptedAppointments); }
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.headerTitle}><Shield size={18} color="#E5A93C" /><h3 style={styles.title}>Painel Administrativo</h3></div>
        {successMsg && <div style={styles.successBox}><Check size={16} /> {successMsg}</div>}
        <form onSubmit={handleSaveCommission} style={styles.formGroup}>
          <label style={styles.label}><Percent size={14} color="#E5A93C" /> Comissão (%)</label>
          <div style={styles.inputRow}>
            <input type="number" min="0" max="100" value={commission} onChange={(e) => setCommission(e.target.value)} style={styles.input} required />
            <button type="submit" style={styles.saveBtn}>Salvar</button>
          </div>
        </form>
      </div>

      <div style={styles.card}>
        <div style={styles.servicesHeaderRow}>
          <div style={styles.headerTitle}><Scissors size={18} color="#E5A93C" /><h3 style={styles.title}>Serviços</h3></div>
          <button onClick={handleOpenNewService} style={styles.addServiceBtn}><Plus size={16} /> Novo</button>
        </div>
        <div style={styles.servicesList}>
          {services.map((srv) => {
            const IconComp = iconMap[srv.icon_name] || Scissors;
            return (
              <div key={srv.id} style={styles.serviceItemRow}>
                <div style={styles.serviceItemLeft}><div style={styles.serviceIconBox}><IconComp size={16} color="#E5A93C" /></div><span style={styles.serviceItemName}>{srv.name}</span></div>
                <div style={styles.serviceItemRight}><span style={styles.serviceItemPrice}>€ {srv.price}</span>
                  <button onClick={() => handleOpenEditService(srv)} style={styles.iconActionBtn}><Edit2 size={14} color="#38BDF8" /></button>
                  <button onClick={() => handleDeleteService(srv.id)} style={styles.iconActionBtn}><Trash2 size={14} color="#EF4444" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.backupSection}>
          <h4 style={styles.subTitle}>Segurança e Backups</h4>
          <div style={styles.backupButtons}>
            <button type="button" onClick={() => { setPinError(''); setShowExportModal(true); }} style={styles.actionBtn}><Download size={16} /> Exportar Backup</button>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={styles.actionBtnSecondary}><Upload size={16} /> Restaurar Backup</button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelected} style={{ display: 'none' }} accept=".json" />
          </div>
          <button type="button" onClick={() => { setChangeStep('CURRENT'); setPinError(''); setShowPasswordModal(true); }} style={styles.changePasswordBtn}>
            <Lock size={15} color="#E5A93C" /> Alterar PIN Mestre
          </button>
        </div>
      </div>

      {/* MODAL ALTERAR SENHA MESTRA */}
      {showPasswordModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.pinModalCard}>
            <PinPad 
              key={changeStep} /* CHAVE PARA LIMPAR O TECLADO ENTRE AS ETAPAS */
              title="Alterar PIN Mestre"
              subtitle={changeStep === 'CURRENT' ? 'Digite o PIN atual' : changeStep === 'NEW' ? 'Digite o NOVO PIN' : 'Confirme o NOVO PIN'}
              errorMsg={pinError}
              onComplete={handleChangePinComplete}
              onCancel={() => setShowPasswordModal(false)}
            />
          </div>
        </div>
      )}

      {/* MODAL EXPORTAR BACKUP */}
      {showExportModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.pinModalCard}>
            <PinPad 
              title="Exportar Backup Seguro"
              subtitle="Crie um PIN (4 números) para trancar o arquivo"
              errorMsg={pinError}
              onComplete={handleExportPinComplete}
              onCancel={() => setShowExportModal(false)}
            />
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR BACKUP */}
      {pendingImportData && (
        <div style={styles.modalOverlay}>
          <div style={styles.pinModalCard}>
            <PinPad 
              title="Restaurar Backup"
              subtitle="Digite o PIN usado na exportação"
              errorMsg={pinError}
              onComplete={handleImportPinComplete}
              onCancel={() => setPendingImportData(null)}
            />
          </div>
        </div>
      )}

      {/* MODAL SERVIÇOS */}
      {editingService !== null && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.servicesHeaderRow}>
              <h3 style={styles.title}>{editingService === 'NEW' ? 'Novo Serviço' : 'Editar Serviço'}</h3>
              <button onClick={() => setEditingService(null)} style={styles.iconActionBtn}><X size={20} color="#A1A1AA" /></button>
            </div>
            <form onSubmit={handleSaveService} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <input type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Nome" style={styles.input} required />
              <input type="number" step="0.5" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} placeholder="Preço" style={styles.input} required />
              <select value={serviceIcon} onChange={(e) => setServiceIcon(e.target.value)} style={styles.selectInput}>
                {Object.keys(iconMap).map(iconKey => (<option key={iconKey} value={iconKey}>{iconKey}</option>))}
              </select>
              <button type="submit" style={styles.saveBtn}>Salvar</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', boxSizing: 'border-box' },
  card: { backgroundColor: '#1E1E26', padding: '16px', borderRadius: '12px', border: '1px solid #2A2A36', display: 'flex', flexDirection: 'column', gap: '16px', boxSizing: 'border-box' },
  headerTitle: { display: 'flex', alignItems: 'center', gap: '8px' },
  title: { fontSize: '16px', fontWeight: '700', color: '#FFF', margin: 0 },
  successBox: { backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', color: '#10B981', padding: '10px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '10px' },
  label: { fontSize: '12px', color: '#A1A1AA', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' },
  inputRow: { display: 'flex', gap: '8px' },
  input: { flex: 1, backgroundColor: '#121214', border: '1px solid #3F3F46', color: '#FFF', padding: '10px', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
  selectInput: { backgroundColor: '#121214', border: '1px solid #3F3F46', color: '#FFF', padding: '10px', borderRadius: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' },
  saveBtn: { backgroundColor: '#E5A93C', color: '#121214', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' },
  servicesHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  addServiceBtn: { backgroundColor: '#2A2A36', color: '#E5A93C', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' },
  servicesList: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '2px' },
  serviceItemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#121214', padding: '8px 10px', borderRadius: '8px', border: '1px solid #2A2A36' },
  serviceItemLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  serviceIconBox: { width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#1E1E26', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  serviceItemName: { fontSize: '13px', color: '#FFF', fontWeight: '600' },
  serviceItemRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  serviceItemPrice: { fontSize: '13px', color: '#E5A93C', fontWeight: '700' },
  iconActionBtn: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' },
  backupSection: { display: 'flex', flexDirection: 'column', gap: '12px' },
  subTitle: { fontSize: '14px', fontWeight: '700', color: '#FFF', margin: 0 },
  backupButtons: { display: 'flex', gap: '8px' },
  actionBtn: { flex: 1, backgroundColor: '#2A2A36', color: '#FFF', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  actionBtnSecondary: { flex: 1, backgroundColor: 'transparent', color: '#A1A1AA', border: '1px solid #2A2A36', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  changePasswordBtn: { width: '100%', backgroundColor: '#121214', color: '#E5A93C', border: '1px solid #2A2A36', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 },
  pinModalCard: { backgroundColor: '#121214', padding: '30px 20px', borderRadius: '16px', border: '1px solid #2A2A36', width: '100%', maxWidth: '340px' },
  modalCard: { backgroundColor: '#1E1E26', padding: '20px', borderRadius: '12px', border: '1px solid #2A2A36', width: '100%', maxWidth: '360px' }
};