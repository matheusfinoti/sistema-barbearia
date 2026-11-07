const ALGORITHM = 'AES-GCM';
const STORE_KEY = 'barbearia_crypto_key';

async function getKey() {
  if (!window.crypto?.subtle) return null;
  const stored = localStorage.getItem(STORE_KEY);
  if (stored) {
    try {
      const jwk = JSON.parse(stored);
      return await window.crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: ALGORITHM },
        true,
        ['encrypt', 'decrypt']
      );
    } catch (e) {
      console.warn("Erro ao carregar chave de criptografia:", e);
    }
  }
  try {
    const key = await window.crypto.subtle.generateKey(
      { name: ALGORITHM, length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const exported = await window.crypto.subtle.exportKey('jwk', key);
    localStorage.setItem(STORE_KEY, JSON.stringify(exported));
    return key;
  } catch (e) {
    console.error("Falha ao gerar chave crypto:", e);
    return null;
  }
}

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

export async function encryptObj(obj) {
  if (!obj) return {};
  try {
    const key = await getKey();
    if (!key) return obj; 
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(obj));
    const cipherText = await window.crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);
    
    return {
      iv: bufferToBase64(iv),
      data: bufferToBase64(cipherText)
    };
  } catch (err) {
    console.error("Erro ao criptografar objeto:", err);
    return obj;
  }
}

export async function decryptObj(encryptedObj) {
  if (!encryptedObj) return {};
  // Retorna o objeto original se for um registro antigo não criptografado
  if (!encryptedObj.iv || !encryptedObj.data) return encryptedObj;
  
  try {
    const key = await getKey();
    if (!key) return {};
    
    const iv = base64ToBuffer(encryptedObj.iv);
    const data = base64ToBuffer(encryptedObj.data);
    const decryptedBuffer = await window.crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data);
    
    // Corrigido: TextDecoder correto para decodificar o buffer
    const decoded = new TextDecoder().decode(decryptedBuffer); 
    return JSON.parse(decoded);
  } catch (err) {
    console.error("Erro ao descriptografar objeto:", err);
    return {};
  }
}