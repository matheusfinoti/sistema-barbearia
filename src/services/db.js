import Dexie from 'dexie';
import { encryptObj, decryptObj } from './crypto';

// Nome principal do banco
export const db = new Dexie('BarbeariaDB');

// Mapeamento de versões para garantir retrocompatibilidade total
db.version(1).stores({
  services: '++id, name, price, icon_name, is_active',
  appointments: '++id, date, service_name, price, items, notes'
});

db.version(2).stores({
  services: '++id, name, price, icon_name, is_active',
  appointments: '++id, date'
});

export const dbApi = {
  async getAppointments() {
    try {
      const raw = await db.appointments.toArray();
      
      const decryptedList = await Promise.all(raw.map(async item => {
        let data = item;
        
        // Se o item foi salvo com o novo formato criptografado
        if (item.encryptedData) {
          const dec = await decryptObj(item.encryptedData);
          data = { id: item.id, date: item.date, ...dec };
        }

        // Recupera preço e itens garantindo fallbacks limpos para dados antigos/não criptografados
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
      }));
      
      return decryptedList.sort((a, b) => new Date(b.date) - new Date(a.date));
    } catch (err) {
      console.error("Erro ao carregar atendimentos:", err);
      return [];
    }
  },
  
  async addAppointment(data) {
    const { date, ...rest } = data;
    const encryptedData = await encryptObj(rest);
    return db.appointments.add({ date, encryptedData });
  },
  
  async updateAppointment(id, data) {
    const { date, ...rest } = data;
    const encryptedData = await encryptObj(rest);
    return db.appointments.update(id, { date, encryptedData });
  },
  
  async deleteAppointment(id) {
    return db.appointments.delete(id);
  }
};