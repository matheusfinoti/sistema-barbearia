import Dexie from 'dexie';
import { encryptObj, decryptObj } from './crypto';

export const db = new Dexie('BarbeariaDB');

db.version(2).stores({
  services: '++id, name, price, icon_name, is_active',
  appointments: '++id, date'
});

export const dbApi = {
  async getAppointments() {
    const raw = await db.appointments.toArray();
    const decryptedList = await Promise.all(raw.map(async item => {
      let data = item;
      if (item.encryptedData) {
        const dec = await decryptObj(item.encryptedData);
        data = { id: item.id, date: item.date, ...dec };
      }
      
      const parsedPrice = Number(data.price);
      const safePrice = isNaN(parsedPrice) ? 0 : parsedPrice;
      
      const safeItems = Array.isArray(data.items) 
        ? data.items.map(i => ({
            ...i,
            price: isNaN(Number(i.price)) ? 0 : Number(i.price)
          }))
        : [];

      return {
        ...data,
        price: safePrice,
        service_name: data.service_name || 'Serviço',
        items: safeItems
      };
    }));
    
    return decryptedList.sort((a, b) => new Date(b.date) - new Date(a.date));
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