import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db, dbApi } from '../services/db';
import { encryptDataWithPassword, decryptDataWithPassword, encryptObj, isUnlocked, changeMasterPassword } from '../services/crypto';
import { Shield, Download, Upload, Percent, Check, AlertTriangle, Key, Plus, Edit2, Trash2, Scissors, User, Zap, Smile, Sparkles, Palette, Sun, Waves, Coins, X, Lock } from 'lucide-react';

const iconMap = { Scissors: Scissors, User: User, Zap: Zap, Smile: Smile, Sparkles: Sparkles, Palette: Palette, Sun: Sun, Waves: Waves, Coins: Coins };

export function AdminPanel() {
  const { t } = useTranslation();
  const [services, setServices] = useState([]);
  const [commission, setCommission] = useState('100');
  const [successMsg, setSuccessMsg] = useState('');

  // Estados para edição/criação de serviço
  const [editingService, setEditingService] = useState(null);
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceIcon, setServiceIcon] = useState('Scissors');

  // Estados para modal de troca de senha mestra
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Estados para importação cifrada
  const [pendingImportData, setPendingImportData] = useState(null);
  const [importPassword, setImportPassword] = useState('');
  const [importError, setImportError] = useState('');

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadServices();
    const saved = localStorage.getItem('barber_commission_percent');
    if (saved) setCommission(saved);
  }, []);

  async function loadServices() {
    try {
      const list = await db.services.toArray();
      setServices(list);
    } catch (err) {
      console.error('Erro ao carregar serviços:', err);
    }
  }

  const handleSaveCommission = (e) => {
    e.preventDefault();
    const val = Number(commission);
    if (isNaN(val) || val < 0 || val > 100) return;
    localStorage.setItem('barber_commission_percent', val.toString());
    setSuccessMsg(t('admin.save_success', 'Configurações salvas com sucesso!'));
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleOpenPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordError('');
    setShowPasswordModal(true);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 4) {
      setPasswordError('A nova senha deve ter pelo menos 4 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('A nova senha e a confirmação não coincidem.');
      return;
    }

    try {
      await changeMasterPassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setSuccessMsg('Senha mestra alterada com sucesso!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setPasswordError(err.message || 'Erro ao alterar a senha.');
    }
  };

  const handleOpenNewService = () => {
    setEditingService('NEW');
    setServiceName('');
    setServicePrice('');
    setServiceIcon('Scissors');
  };

  const handleOpenEditService = (srv) => {
    setEditingService(srv);
    setServiceName(srv.name);
    setServicePrice(srv.price.toString());
    setServiceIcon(srv.icon_name || 'Scissors');
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    if (!serviceName.trim() || isNaN(Number(servicePrice))) return;
    try {
      if (editingService === 'NEW') {
        await db.services.add({ name: serviceName.trim(), price: Number(servicePrice), icon_name: serviceIcon, is_active: 1 });
      } else if (editingService && editingService.id) {
        await db.services.update(editingService.id, { name: serviceName.trim(), price: Number(servicePrice), icon_name: serviceIcon });
      }
      setEditingService(null);
      loadServices();
    } catch (err) {
      console.error('Erro ao salvar serviço:', err);
    }
  };

  const handleDeleteService = async (id) => {
    if (window.confirm('Deseja realmente excluir este serviço?')) {
      try {
        await db.services.delete(id);
        loadServices();
      } catch (err) {
        console.error('Erro ao deletar serviço:', err);
      }
    }
  };

  const handleExportBackup = async () => {
    if (!isUnlocked()) {
      alert('Desbloqueie o aplicativo antes de exportar.');
      return;
    }
    try {
      const passwordPrompt = window.prompt('Defina uma senha para proteger este arquivo de backup:');
      if (!passwordPrompt) return;

      const dbServices = await db.services.toArray();
      const appointments = await dbApi.getAppointments();

      const payload = { services: dbServices, appointments };
      const encryptedContainer = await encryptDataWithPassword(passwordPrompt, payload);

      const blob = new Blob([JSON.stringify(encryptedContainer, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `barbearia-backup-${new Date().toISOString().slice(0, 10)}.enc.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar backup:', err);
      alert('Erro ao gerar backup cifrado.');
    }
  };

  const restoreDecryptedPayload = async (decryptedData) => {
    if (!isUnlocked()) {
      throw new Error('Aplicativo bloqueado. Desbloqueie antes de importar.');
    }

    const servicesToRestore = Array.isArray(decryptedData.services) ? decryptedData.services : [];
    const appointmentsToRestore = Array.isArray(decryptedData.appointments) ? decryptedData.appointments : [];

    const reEncryptedAppointments = await Promise.all(
      appointmentsToRestore.map(async (apt) => {
        if (apt.encryptedData && apt.service_name === undefined) {
          throw new Error('Este arquivo contém registros cifrados com outra chave de dispositivo e não pode ser migrado. Exporte um novo backup atualizado do aparelho de origem.');
        }

        const cleanPayload = {
          service_name: apt.service_name || 'Serviço',
          price: Number(apt.price) || 0,
          items: Array.isArray(apt.items) ? apt.items : [],
          notes: apt.notes || ''
        };

        const enc = await encryptObj(cleanPayload);
        if (!enc) throw new Error('Falha ao criptografar os dados importados.');

        return {
          ...(apt.id !== undefined ? { id: apt.id } : {}),
          date: apt.date || new Date().toISOString(),
          encryptedData: enc
        };
      })
    );

    await db.transaction('rw', db.services, db.appointments, async () => {
      if (servicesToRestore.length > 0) {
        await db.services.clear();
        await db.services.bulkPut(servicesToRestore);
      }
      if (reEncryptedAppointments.length > 0) {
        await db.appointments.clear();
        await db.appointments.bulkPut(reEncryptedAppointments);
      }
    });
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
          alert('Backup legado importado e criptografado com sucesso!');
          window.location.reload();
          return;
        }

        if (parsed.version !== 'encrypted-backup-v1') {
          alert('Formato de backup inválido.');
          return;
        }

        setPendingImportData(parsed);
        setImportPassword('');
        setImportError('');
      } catch (err) {
        console.error(err);
        alert(err.message || 'Erro ao ler arquivo de backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImport = async (e) => {
    e.preventDefault();
    setImportError('');
    try {
      const decryptedData = await decryptDataWithPassword(importPassword, pendingImportData);
      if (!decryptedData) throw new Error('Falha ao descriptografar dados.');

      await restoreDecryptedPayload(decryptedData);

      alert('Banco de dados importado e restaurado com sucesso!');
      setPendingImportData(null);
      window.location.reload();
    } catch (err) {
      console.error('Erro na importação:', err);
      if (err.name === 'OperationError' || (err.message && err.message.includes('pad'))) {
        setImportError('Senha de backup incorreta.');
      } else {
        setImportError(err.message || 'Erro ao processar dados.');
      }
    }
  };

  return (
    <div style={styles.container}>
      {/* COMISSÃO */}
      <div style={styles.card}>
        <div style={styles.headerTitle}>
          <Shield size={18} color="#E5A93C" />
          <h3 style={styles.title}>Painel Administrativo</h3>
        </div>

        {successMsg && <div style={styles.successBox}><Check size={16} /> {successMsg}</div>}

        <form onSubmit={handleSaveCommission} style={styles.formGroup}>
          <label style={styles.label}><Percent size={14} color="#E5A93C" /> Porcentagem de Comissão (%)</label>
          <div style={styles.inputRow}>
            <input type="number" min="0" max="100" value={commission} onChange={(e) => setCommission(e.target.value)} style={styles.input} required />
            <button type="submit" style={styles.saveBtn}>Salvar</button>
          </div>
        </form>
      </div>

      {/* GERENCIAR SERVIÇOS */}
      <div style={styles.card}>
        <div style={styles.servicesHeaderRow}>
          <div style={styles.headerTitle}>
            <Scissors size={18} color="#E5A93C" />
            <h3 style={styles.title}>Gerenciar Serviços</h3>
          </div>
          <button onClick={handleOpenNewService} style={styles.addServiceBtn}>
            <Plus size={16} /> Novo Serviço
          </button>
        </div>

        <div style={styles.servicesList}>
          {services.map((srv) => {
            const IconComp = iconMap[srv.icon_name] || Scissors;
            return (
              <div key={srv.id} style={styles.serviceItemRow}>
                <div style={styles.serviceItemLeft}>
                  <div style={styles.serviceIconBox}><IconComp size={16} color="#E5A93C" /></div>
                  <span style={styles.serviceItemName}>{srv.name}</span>
                </div>
                <div style={styles.serviceItemRight}>
                  <span style={styles.serviceItemPrice}>€ {srv.price}</span>
                  <button onClick={() => handleOpenEditService(srv)} style={styles.iconActionBtn}><Edit2 size={14} color="#38BDF8" /></button>
                  <button onClick={() => handleDeleteService(srv.id)} style={styles.iconActionBtn}><Trash2 size={14} color="#EF4444" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEGURANÇA E BACKUPS CIFRADOS */}
      <div style={styles.card}>
        <div style={styles.backupSection}>
          <h4 style={styles.subTitle}>Segurança e Backups Cifrados</h4>
          <p style={styles.subDesc}>Exporte um backup protegido por senha, restaure seus dados ou altere sua senha mestra.</p>
          <div style={styles.backupButtons}>
            <button type="button" onClick={handleExportBackup} style={styles.actionBtn}>
              <Download size={16} /> Exportar Backup Seguro
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={styles.actionBtnSecondary}>
              <Upload size={16} /> Restaurar Backup
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelected} style={{ display: 'none' }} accept=".json" />
          </div>
          <button type="button" onClick={handleOpenPasswordModal} style={styles.changePasswordBtn}>
            <Lock size={15} color="#E5A93C" /> Alterar Senha Mestra
          </button>
        </div>
      </div>

      {/* MODAL ALTERAR SENHA MESTRA */}
      {showPasswordModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={18} color="#E5A93C" />
                <h3 style={styles.modalTitle}>Alterar Senha Mestra</h3>
              </div>
              <button onClick={() => setShowPasswordModal(false)} style={styles.closeBtn}><X size={20} color="#A1A1AA" /></button>
            </div>

            <form onSubmit={handleUpdatePassword} style={styles.modalForm}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Senha Atual</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); }}
                  placeholder="Digite sua senha atual..."
                  style={styles.input}
                  autoFocus
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                  placeholder="Mínimo 4 caracteres..."
                  style={styles.input}
                  required
                />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => { setConfirmNewPassword(e.target.value); setPasswordError(''); }}
                  placeholder="Repita a nova senha..."
                  style={styles.input}
                  required
                />
              </div>

              {passwordError && <div style={styles.errorMsg}><AlertTriangle size={14} /> {passwordError}</div>}

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setShowPasswordModal(false)} style={styles.cancelBtn}>Cancelar</button>
                <button type="submit" style={styles.confirmBtn}>Salvar Senha</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR/EDITAR SERVIÇO */}
      {editingService !== null && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editingService === 'NEW' ? 'Adicionar Serviço' : 'Editar Serviço'}</h3>
              <button onClick={() => setEditingService(null)} style={styles.closeBtn}><X size={20} color="#A1A1AA" /></button>
            </div>

            <form onSubmit={handleSaveService} style={styles.modalForm}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nome do Serviço</label>
                <input type="text" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Ex: Corte Degradê" style={styles.input} required />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Preço Padrão (€)</label>
                <input type="number" step="0.5" value={servicePrice} onChange={(e) => setServicePrice(e.target.value)} placeholder="20" style={styles.input} required />
              </div>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Ícone</label>
                <select value={serviceIcon} onChange={(e) => setServiceIcon(e.target.value)} style={styles.selectInput}>
                  {Object.keys(iconMap).map(iconKey => (<option key={iconKey} value={iconKey}>{iconKey}</option>))}
                </select>
              </div>
              <button type="submit" style={styles.confirmBtn}>Salvar Serviço</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DESCRIPTOGRAFAR BACKUP */}
      {pendingImportData && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={20} color="#E5A93C" />
                <h3 style={styles.modalTitle}>Descriptografar Backup</h3>
              </div>
              <button onClick={() => setPendingImportData(null)} style={styles.closeBtn}><X size={20} color="#A1A1AA" /></button>
            </div>
            <p style={styles.modalDesc}>Este arquivo de backup é criptografado. Digite a senha com a qual ele foi exportado:</p>
            <form onSubmit={handleConfirmImport} style={styles.modalForm}>
              <input type="password" placeholder="Senha do backup..." value={importPassword} onChange={(e) => { setImportPassword(e.target.value); setImportError(''); }} style={styles.input} autoFocus required />
              {importError && <div style={styles.errorMsg}><AlertTriangle size={14} /> {importError}</div>}
              <div style={styles.modalActions}>
                <button type="button" onClick={() => setPendingImportData(null)} style={styles.cancelBtn}>Cancelar</button>
                <button type="submit" style={styles.confirmBtn}>Restaurar</button>
              </div>
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
  input: { flex: 1, backgroundColor: '#121214', border: '1px solid #3F3F46', color: '#FFF', padding: '10px', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none', width: '100%' },
  selectInput: { backgroundColor: '#121214', border: '1px solid #3F3F46', color: '#FFF', padding: '10px', borderRadius: '8px', fontSize: '14px', width: '100%', boxSizing: 'border-box' },
  saveBtn: { backgroundColor: '#E5A93C', color: '#121214', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' },
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
  backupSection: { display: 'flex', flexDirection: 'column', gap: '8px' },
  subTitle: { fontSize: '14px', fontWeight: '700', color: '#FFF', margin: 0 },
  subDesc: { fontSize: '12px', color: '#71717A', margin: '0 0 8px 0' },
  backupButtons: { display: 'flex', gap: '8px' },
  actionBtn: { flex: 1, backgroundColor: '#2A2A36', color: '#FFF', border: 'none', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  actionBtnSecondary: { flex: 1, backgroundColor: 'transparent', color: '#A1A1AA', border: '1px solid #2A2A36', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' },
  changePasswordBtn: { width: '100%', backgroundColor: '#121214', color: '#E5A93C', border: '1px solid #2A2A36', padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 },
  modalCard: { backgroundColor: '#1E1E26', padding: '20px', borderRadius: '12px', border: '1px solid #2A2A36', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '12px' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: '16px', fontWeight: '700', color: '#FFF', margin: 0 },
  closeBtn: { backgroundColor: 'transparent', border: 'none', cursor: 'pointer' },
  modalDesc: { fontSize: '12px', color: '#A1A1AA', margin: 0, lineHeight: '1.4' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '12px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  errorMsg: { color: '#F87171', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' },
  modalActions: { display: 'flex', gap: '8px', marginTop: '4px' },
  cancelBtn: { flex: 1, backgroundColor: '#2A2A36', color: '#FFF', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  confirmBtn: { flex: 1, backgroundColor: '#E5A93C', color: '#121214', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }
};