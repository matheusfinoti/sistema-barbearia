import Dexie from 'dexie';
import { encryptObj, decryptObj } from './crypto';

// Mantemos exatamente o mesmo nome original para não perder nada
export const db = new Dexie('BarbeariaLocalDB');

// Histórico: Como o banco foi criado inicialmente
db.version(1).stores({
  services: '++id, name, price, icon_name, is_active',
  appointments: '++id, date, service_name, price, items, notes'
});

// Atualização: Como o banco deve se comportar agora (sem perder os dados)
db.version(2).stores({
  services: '++id, name, price, icon_name, is_active',
  appointments: '++id, date' // O Dexie remove a indexação dos outros campos, mas não apaga os dados
});

export const dbApi = {
  async getAppointments() {
    try {
      // Lê diretamente do seu banco original
      const raw = await db.appointments.toArray();
      
      const decryptedList = await Promise.all(
        raw.map(async (item) => {
          let data = item;
          
          // Se for um registro novo (com criptografia), ele descriptografa.
          // Se for um registro antigo, ele pula essa etapa e lê direto (preservando o histórico).
          if (item.encryptedData) {
            const dec = await decryptObj(item.encryptedData);
            data = { id: item.id, date: item.date, ...dec };
          }

          // Tratamento para evitar o erro de NaN
          const parsedPrice = Number(data.price);
          const safePrice = isNaN(parsedPrice) ? 0 : parsedPrice;
          
          let safeItems = [];
          if (Array.isArray(data.items) && data.items.length > 0) {
            safeItems = data.items.map(i => ({
              ...i,
              price: isNaN(Number(i.price)) ? 0 : Number(i.price)
            }));
          }

          return {
            ...data,
            id: item.id,
            date: item.date || new Date().toISOString(),
            price: safePrice,
            service_name: data.service_name || 'Serviço',
            items: safeItems
          };
        })
      );
      
      return decryptedList.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (err) {
      console.error('Erro ao buscar atendimentos:', err);
      return [];
    }
  },
  
  async addAppointment(data) {
    const { date, ...rest } = data;
    const encryptedData = await encryptObj(rest);
    // Salva os novos registros já criptografados
    return db.appointments.add({ date, encryptedData });
  },
  
  async updateAppointment(id, data) {
    const { date, ...rest } = data;
    const encryptedData = await encryptObj(rest);
    // Ao editar um registro antigo, ele o converte para criptografado
    return db.appointments.update(id, { date, encryptedData, service_name: undefined, price: undefined, items: undefined, notes: undefined });
  },
  
  async deleteAppointment(id) {
    return db.appointments.delete(id);
  }
};