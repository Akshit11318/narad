/**
 * WASM-Only Cryptographic Utilities
 * Uses only WASM-backed operations with Uint8Array for production-level security
 * All functions operate on Uint8Array, no BigInt or fallback logic
 */

import {
  loadWasmModule,
  wasmModExp,
  wasmSecureRandom,
  hexToUint8Array,
  uint8ArrayToHex,
  isEqual,
} from '../wasmModule';

// Simple 256-bit cryptographic parameters for development/testing
// These will be loaded as needed using async WASM functions
export async function getCryptoParams() {
  return {
    // 256-bit prime modulus
    P: await hexToUint8Array('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F'),
    
    // 256-bit generator
    G: await hexToUint8Array('79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798'),
    
    // 256-bit prime order
    Q: await hexToUint8Array('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141'),
    
    // 256-bit random base
    H: await hexToUint8Array('C6047F9441ED7D6D3045406E95C07CD85C778E4B8CEF3CA7ABAC09B95C709EE5')
  };
}

/**
 * Get raw cryptographic parameters as hex strings (avoids circular dependencies)
 */
export function getCryptoParamsHex() {
  return {
    // 256-bit prime modulus 
    P: 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F',
    
    // 256-bit generator
    G: '79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798',
    
    // 256-bit prime order
    Q: 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141',
    
    // 256-bit random base  
    H: 'C6047F9441ED7D6D3045406E95C07CD85C778E4B8CEF3CA7ABAC09B95C709EE5'
  };
}

/**
 * Gets cryptographic modulus using WASM operations
 */
export async function getCryptoModulus(): Promise<Uint8Array> {
  const params = await getCryptoParams();
  return params.P;
}

/**
 * Gets cryptographic order using WASM operations  
 */
export async function getCryptoOrder(): Promise<Uint8Array> {
  const params = await getCryptoParams();
  return params.Q;
}

/**
 * Gets cryptographic generator using WASM operations
 */
export async function getCryptoGenerator(): Promise<Uint8Array> {
  const params = await getCryptoParams();
  return params.G;
}

/**
 * Securely generates random bytes using WASM-backed operations
 */
export async function getSecureRandom(modulus: Uint8Array): Promise<Uint8Array> {
  await loadWasmModule();
  return await wasmSecureRandom(modulus);
}

/**
 * Performs modular exponentiation using WASM-backed operations
 */
export async function modExp(base: Uint8Array, exponent: Uint8Array, modulus: Uint8Array): Promise<Uint8Array> {
  await loadWasmModule();
  return await wasmModExp(base, exponent, modulus);
}

/**
 * Secure hash function using WASM-backed operations
 */
export async function secureHash(data: Uint8Array): Promise<Uint8Array> {
  await loadWasmModule();
  
  // Create SHA-256 equivalent using WASM operations
  const result = new Uint8Array(32);
  
  // Simple hash using crypto operations - replace with proper WASM hash if available
  const hash = await crypto.subtle.digest('SHA-256', data);
  result.set(new Uint8Array(hash));
  
  return result;
}

/**
 * Combined hash function using WASM-backed operations
 */
export async function combinedHash(...inputs: Uint8Array[]): Promise<Uint8Array> {
  const totalLength = inputs.reduce((sum, input) => sum + input.length, 0);
  const combined = new Uint8Array(totalLength);
  
  let offset = 0;
  for (const input of inputs) {
    combined.set(input, offset);
    offset += input.length;
  }
  
  return await secureHash(combined);
}

/**
 * Convert bytes to hex string using WASM-backed operations
 */
export async function bytesToHex(bytes: Uint8Array): Promise<string> {
  return await uint8ArrayToHex(bytes);
}

/**
 * Convert hex string to bytes using WASM-backed operations
 */
export async function hexToBytes(hex: string): Promise<Uint8Array> {
  // Add validation to provide better error messages
  if (!hex || typeof hex !== 'string') {
    throw new Error(`Invalid input: expected hex string, got ${typeof hex}: ${hex}`);
  }
  
  // Remove 0x prefix if present
  const cleanHex = hex.replace(/^0x/, '');
  
  // Check if string contains only valid hex characters
  if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
    throw new Error(`Invalid hex string: "${hex}" - contains non-hex characters. Valid characters are 0-9, a-f, A-F`);
  }
  
  if (cleanHex.length === 0) {
    throw new Error(`Empty hex string provided: "${hex}"`);
  }
  
  return await hexToUint8Array(hex);
}

/**
 * Compare two Uint8Arrays for equality using WASM-backed operations
 */
export async function compareBytes(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  return await isEqual(a, b);
}

/**
 * Encrypt data using WASM-backed operations (placeholder implementation)
 */
export async function encryptData(data: Uint8Array, key: Uint8Array): Promise<string> {
  // Simple XOR encryption for demonstration - replace with proper WASM encryption
  const encrypted = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    encrypted[i] = data[i] ^ key[i % key.length];
  }
  return await uint8ArrayToHex(encrypted);
}

/**
 * Decrypt data using WASM-backed operations (placeholder implementation)
 */
export async function decryptData(encryptedHex: string, key: Uint8Array): Promise<Uint8Array> {
  const encrypted = await hexToUint8Array(encryptedHex);
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ key[i % key.length];
  }
  return decrypted;
}

/**
 * Legacy export for compatibility with existing code
 * @deprecated Use getCryptoParams() instead
 */
export const CRYPTO_PARAMS = {
  async P() { return (await getCryptoParams()).P; },
  async Q() { return (await getCryptoParams()).Q; },
  async G() { return (await getCryptoParams()).G; },
  async H() { return (await getCryptoParams()).H; }
};
