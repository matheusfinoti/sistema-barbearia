import React, { useState } from 'react';
import { db } from '../services/db';
import { ShieldAlert, Share2, Database, Download, CheckCircle } from 'lucide-react';

export function AdminPanel() {
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleBackup = async () => {
    setStatusMessage('');
    setIsExporting(true);

    try {
      // 1. Busca os dados no IndexedDB
      const services = await db.services.toArray();
      const appointments = await db.appointments.toArray();

      const backupData = {
        data_exportacao: new Date().toISOString(),
        versao_banco: 1,
        total_atendimentos: appointments.length,
        services,
        appointments
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const dataFormatada = new Date().toISOString().slice(0, 10);
      const fileName = `backup_barbearia_${dataFormatada}.json`;

      // 2. Transforma em arquivo do tipo 'text/plain' para passar no filtro do Android/iOS
      const blob = new Blob([jsonString], { type: 'text/plain;charset=utf-8' });
      const file = new File([blob], fileName, { type: 'text/plain' });

      // 3. Tenta compartilhar via Web Share API
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
          // Se o usuário cancelar ou o sistema negar a permissão do Share
          console.warn('Compartilhamento via WebShare falhou, usando download direto:', shareErr);
        }
      }

      // 4. FALLBACK: Download direto para a pasta de Downloads do celular
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage('Arquivo baixado em "Downloads"! Agora você pode anexa-lo no WhatsApp.');

    } catch (error) {
      console.error("Erro ao gerar backup:", error);
      alert('Erro ao acessar o banco para backup.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <ShieldAlert size={28} color="#E5A93C" />
        <h2 style={styles.title}>Área Administrativa</h2>
        <p style={styles.subtitle}>Gerenciamento de dados e segurança</p>
        <p style={styles.warning}>(Em breve: Bloqueio por senha de símbolos)</p>
      </div>

      <div style={styles.sectionCard}>
        <div style={styles.cardHeader}>
          <Database size={20} color="#38BDF8" />
          <h3 style={styles.cardTitle}>Backup dos Dados</h3>
        </div>
        <p style={styles.cardDescription}>
          Gere uma cópia de segurança de todos os cortes e serviços para enviar via WhatsApp ou salvar no celular.
        </p>

        {statusMessage && (
          <div style={styles.statusBox}>
            <CheckCircle size={16} color="#10B981" />
            <span>{statusMessage}</span>
          </div>
        )}
        
        <button 
          onClick={handleBackup} 
          disabled={isExporting}
          style={styles.actionBtn}
        >
          {isExporting ? (
            <span style={styles.btnContent}>Gerando arquivo...</span>
          ) : (
            <span style={styles.btnContent}>
              <Share2 size={18} /> Exportar Backup (WhatsApp / Download)
            </span>
          )}
        </button>
      </div>

      <div style={{ ...styles.sectionCard, opacity: 0.5 }}>
        <h3 style={styles.cardTitle}>Outras opções em breve...</h3>
      </div>
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
    padding: '20px',
    backgroundColor: '#1E1E26',
    borderRadius: '14px',
    border: '1px solid #2A2A36',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#FFF',
    margin: '10px 0 4px 0',
  },
  subtitle: {
    fontSize: '13px',
    color: '#A1A1AA',
    margin: 0,
  },
  warning: {
    fontSize: '11px',
    color: '#E5A93C',
    marginTop: '6px',
    fontStyle: 'italic',
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
    marginTop: '4px',
  },
  actionBtn: {
    backgroundColor: '#25231F',
    color: '#E5A93C',
    border: '1px solid #E5A93C',
    padding: '14px',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '10px',
    cursor: 'pointer',
    marginTop: '4px',
  },
  btnContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  }
};