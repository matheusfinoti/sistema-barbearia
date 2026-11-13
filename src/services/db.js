import Dexie from 'dexie';
import { encryptObj, decryptObj, isUnlocked } from './crypto';

export const db = new Dexie('BarbeariaLocalDB');

db.version(2).stores({
  services: '++id, name, price, icon_name, is_active',
  appointments: '++id, date'
});

export const dbApi = {
  async getAppointments() {
    const raw = await db.appointments.toArray();
    const decryptedList = await Promise.all(
      raw.map(async (item) => {
        let decData = null;

        if (item.encryptedData) {
          decData = await decryptObj(item.encryptedData);
          // Caso tenha ocorrido duplo encapsulamento em backup anterior
          if (decData && decData.encryptedData && !decData.service_name) {
            decData = await decryptObj(decData.encryptedData);
          }
        } else if (item.service_name !== undefined || item.price !== undefined) {
          // Registro legado ainda em texto claro: lê os dados e migra para criptografado
          decData = {
            service_name: item.service_name,
            price: item.price,
            items: item.items,
            notes: item.notes
          };
          if (isUnlocked()) {
            const enc = await encryptObj(decData);
            if (enc) {
              await db.appointments.put({
                id: item.id,
                date: item.date || new Date().toISOString(),
                encryptedData: enc
              });
            }
          }
        }

        const safeObj = decData || {};
        const parsedPrice = Number(safeObj.price);
        const safePrice = isNaN(parsedPrice) ? 0 : parsedPrice;

        return {
          id: item.id,
          date: item.date,
          service_name: safeObj.service_name || 'Serviço',
          price: safePrice,
          items: Array.isArray(safeObj.items) ? safeObj.items : [],
          notes: safeObj.notes || ''
        };
      })
    );
    return decryptedList.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  async addAppointment(data) {
    if (!isUnlocked()) throw new Error('Aplicativo bloqueado.');
    const { date, ...rest } = data;
    const encryptedData = await encryptObj(rest);
    if (!encryptedData) throw new Error('Falha ao criptografar registro.');
    return db.appointments.add({
      date: date || new Date().toISOString(),
      encryptedData
    });
  },

  async updateAppointment(id, data) {
    if (!isUnlocked()) throw new Error('Aplicativo bloqueado.');
    const { date, ...rest } = data;
    const encryptedData = await encryptObj(rest);
    if (!encryptedData) throw new Error('Falha ao criptografar registro.');
    return db.appointments.put({
      id,
      date: date || new Date().toISOString(),
      encryptedData
    });
  },

  async deleteAppointment(id) {
    return db.appointments.delete(id);
  }
};