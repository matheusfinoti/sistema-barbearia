const ALGORITHM = 'AES-GCM';
const SALT_KEY = 'barbearia_crypto_salt';
const WRAPPED_KEY = 'barbearia_wrapped_key';
const LEGACY_KEYS = ['barbearia_device_key', 'barbearia_crypto_key'];

let sessionKey = null;

function bufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKEK(password, saltUint8) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits', 'deriveKey']
  );
  return await window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltUint8, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: ALGORITHM, length: 256 }, false, ['encrypt', 'decrypt']
  );
}

export function hasSetupPassword() {
  return !!localStorage.getItem(SALT_KEY);
}

export function isUnlocked() {
  return sessionKey !== null;
}

export function lockApp() {
  sessionKey = null;
}

export async function setupMasterPassword(password) {
  const dataEncryptionKey = await window.crypto.subtle.generateKey(
    { name: ALGORITHM, length: 256 }, true, ['encrypt', 'decrypt']
  );
  const exportedDEK = await window.crypto.subtle.exportKey('jwk', dataEncryptionKey);
  const dekString = JSON.stringify(exportedDEK);

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const kek = await deriveKEK(password, salt);

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedDEK = new TextEncoder().encode(dekString);
  const cipherText = await window.crypto.subtle.encrypt({ name: ALGORITHM, iv }, kek, encodedDEK);

  localStorage.setItem(SALT_KEY, bufferToBase64(salt));
  localStorage.setItem(WRAPPED_KEY, JSON.stringify({ iv: bufferToBase64(iv), data: bufferToBase64(cipherText) }));

  sessionKey = dataEncryptionKey;
  return true;
}

export async function unlockWithPassword(password) {
  const saltB64 = localStorage.getItem(SALT_KEY);
  const wrappedStr = localStorage.getItem(WRAPPED_KEY);
  if (!saltB64 || !wrappedStr) return false;

  try {
    const salt = base64ToBuffer(saltB64);
    const kek = await deriveKEK(password, salt);

    const wrappedData = JSON.parse(wrappedStr);
    const iv = base64ToBuffer(wrappedData.iv);
    const data = base64ToBuffer(wrappedData.data);

    const decryptedDEKBuffer = await window.crypto.subtle.decrypt({ name: ALGORITHM, iv }, kek, data);
    const dekString = new TextDecoder().decode(decryptedDEKBuffer);
    const jwk = JSON.parse(dekString);

    sessionKey = await window.crypto.subtle.importKey('jwk', jwk, { name: ALGORITHM }, true, ['encrypt', 'decrypt']);
    return true;
  } catch (e) {
    return false;
  }
}

export async function changeMasterPassword(currentPassword, newPassword) {
  const saltB64 = localStorage.getItem(SALT_KEY);
  const wrappedStr = localStorage.getItem(WRAPPED_KEY);
  if (!saltB64 || !wrappedStr) {
    throw new Error('Configuração de senha não encontrada.');
  }

  let dekString;
  try {
    const oldSalt = base64ToBuffer(saltB64);
    const oldKek = await deriveKEK(currentPassword, oldSalt);

    const wrappedData = JSON.parse(wrappedStr);
    const oldIv = base64ToBuffer(wrappedData.iv);
    const oldCipher = base64ToBuffer(wrappedData.data);

    const decryptedDEKBuffer = await window.crypto.subtle.decrypt({ name: ALGORITHM, iv: oldIv }, oldKek, oldCipher);
    dekString = new TextDecoder().decode(decryptedDEKBuffer);
  } catch (e) {
    throw new Error('Senha atual incorreta.');
  }

  const newSalt = window.crypto.getRandomValues(new Uint8Array(16));
  const newKek = await deriveKEK(newPassword, newSalt);

  const newIv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedDEK = new TextEncoder().encode(dekString);
  const newCipherText = await window.crypto.subtle.encrypt({ name: ALGORITHM, iv: newIv }, newKek, encodedDEK);

  localStorage.setItem(SALT_KEY, bufferToBase64(newSalt));
  localStorage.setItem(WRAPPED_KEY, JSON.stringify({ iv: bufferToBase64(newIv), data: bufferToBase64(newCipherText) }));

  const jwk = JSON.parse(dekString);
  sessionKey = await window.crypto.subtle.importKey('jwk', jwk, { name: ALGORITHM }, true, ['encrypt', 'decrypt']);
  return true;
}

export async function encryptObj(obj) {
  if (!obj || !sessionKey) return null;
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(obj));
  const cipherText = await window.crypto.subtle.encrypt({ name: ALGORITHM, iv }, sessionKey, encoded);
  return { iv: bufferToBase64(iv), data: bufferToBase64(cipherText) };
}

export async function decryptObj(encryptedObj) {
  if (!encryptedObj || !encryptedObj.iv || !encryptedObj.data || !sessionKey) return null;
  try {
    const iv = base64ToBuffer(encryptedObj.iv);
    const data = base64ToBuffer(encryptedObj.data);
    const decryptedBuffer = await window.crypto.subtle.decrypt({ name: ALGORITHM, iv }, sessionKey, data);
    return JSON.parse(new TextDecoder().decode(decryptedBuffer));
  } catch (e) {
    return null;
  }
}

// Tenta descriptografar registros antigos salvos antes do sistema de PIN
export async function decryptWithLegacyKeys(encryptedObj) {
  if (!encryptedObj || !encryptedObj.iv || !encryptedObj.data) return null;
  const iv = base64ToBuffer(encryptedObj.iv);
  const data = base64ToBuffer(encryptedObj.data);

  for (const storageKey of LEGACY_KEYS) {
    const rawJwk = localStorage.getItem(storageKey);
    if (!rawJwk) continue;
    try {
      const jwk = JSON.parse(rawJwk);
      const legacyKey = await window.crypto.subtle.importKey(
        'jwk', jwk, { name: ALGORITHM }, false, ['decrypt']
      );
      const decryptedBuffer = await window.crypto.subtle.decrypt({ name: ALGORITHM, iv }, legacyKey, data);
      return JSON.parse(new TextDecoder().decode(decryptedBuffer));
    } catch (e) {
      // Tenta a próxima chave legada
    }
  }
  return null;
}

export async function encryptDataWithPassword(password, dataObj) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const kek = await deriveKEK(password, salt);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(dataObj));
  const cipherText = await window.crypto.subtle.encrypt({ name: ALGORITHM, iv }, kek, encoded);
  return {
    version: 'encrypted-backup-v1',
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    data: bufferToBase64(cipherText)
  };
}

export async function decryptDataWithPassword(password, encryptedContainer) {
  const salt = base64ToBuffer(encryptedContainer.salt);
  const kek = await deriveKEK(password, salt);
  const iv = base64ToBuffer(encryptedContainer.iv);
  const data = base64ToBuffer(encryptedContainer.data);
  const decryptedBuffer = await window.crypto.subtle.decrypt({ name: ALGORITHM, iv }, kek, data);
  return JSON.parse(new TextDecoder().decode(decryptedBuffer));
}