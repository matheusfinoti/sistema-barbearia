import Dexie from 'dexie';

export const db = new Dexie('BarbeariaLocalDB');

db.version(1).stores({
  services: '++id, name, price, icon_name, is_active',
  appointments: '++id, date, service_id, price, notes'
});

// Popula com os 9 serviços na grade 3x3
db.on('populate', () => {
  db.services.bulkAdd([
    { id: 1, name: 'Cabelo', price: 20, icon_name: 'Scissors', is_active: 1 },
    { id: 2, name: 'Corte niño', price: 15, icon_name: 'User', is_active: 1 },
    { id: 3, name: 'Rapado', price: 15, icon_name: 'Zap', is_active: 1 },
    { id: 4, name: 'Barba', price: 18, icon_name: 'Smile', is_active: 1 },
    { id: 5, name: 'Sobrancelha', price: 5, icon_name: 'Sparkles', is_active: 1 },
    { id: 6, name: 'Camuflagem', price: 35, icon_name: 'Palette', is_active: 1 },
    { id: 7, name: 'Descoloração', price: 100, icon_name: 'Sun', is_active: 1 },
    { id: 8, name: 'Permanente', price: 80, icon_name: 'Waves', is_active: 1 },
    { id: 9, name: 'Propina', price: 0, icon_name: 'Coins', is_active: 1 }
  ]);
});