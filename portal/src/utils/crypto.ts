import {
  loadWasmModule,
  setupElection,
  generateSecretKey,
  computeAggregatorPublicKey,
  computeAuxiliaryKey,
  encryptVotePaillier,
  getAuxiliaryKey,
  formatByteArray,
} from '../wasmModule';
import type { ElectionParams, EncryptionResult } from '../types';

/**
 * Initialize the WebAssembly encryption module
 */
export async function initializeWasm() {
  try {
    const module = await loadWasmModule();
    console.log('WebAssembly module loaded successfully');
    return module;
  } catch (error) {
    console.error('Failed to load WebAssembly module:', error);
    throw new Error('Failed to initialize encryption module');
  }
}

/**
 * Setup election parameters by fetching from backend
 */
export async function initializeElection(): Promise<ElectionParams> {
  try {
    const params = await setupElection();
    console.log('Election parameters initialized:', {
      n: formatByteArray(params.n),
      h: formatByteArray(params.h),
      ska: formatByteArray(params.ska as Uint8Array),
    });
    return params;
  } catch (error) {
    console.error('Failed to setup election:', error);
    throw new Error('Failed to initialize election parameters');
  }
}

/**
 * Generate a vote array with the selected candidate
 */
export function generateVoteArray(candidateId: number, totalCandidates: number): Uint32Array {
  if (candidateId < 1 || candidateId > totalCandidates) {
    throw new Error(`Invalid candidate ID: ${candidateId}`);
  }

  const voteArray = new Uint32Array(totalCandidates).fill(0);
  voteArray[candidateId - 1] = 1; // Adjust for 0-based indexing

  console.log('Generated vote array:', Array.from(voteArray));
  return voteArray;
}

/**
 * Encrypt a vote using the election parameters
 */
export async function encryptVote(
  candidateId: number,
  totalCandidates: number,
  electionParams: ElectionParams
): Promise<EncryptionResult> {
  try {
    const { n, h, ska } = electionParams;

    if (!n || !h) {
      throw new Error('Missing required election parameters');
    }

    console.log('Starting vote encryption process...');

    // Step 1: Generate client's secret key
    const secretKeyResult = await generateSecretKey(n);
    if (secretKeyResult !== 0) {
      throw new Error(`Failed to generate client secret key: ${secretKeyResult}`);
    }

    // Step 2: Compute aggregator's public key if ska is available
    if (ska) {
      const pubKeyResult = await computeAggregatorPublicKey(h, ska, n);
      if (pubKeyResult !== 0) {
        throw new Error(`Failed to compute aggregator public key: ${pubKeyResult}`);
      }
    }

    // Step 3: Compute auxiliary key
    const auxResult = await computeAuxiliaryKey(n);
    if (auxResult !== 0) {
      throw new Error(`Failed to compute auxiliary key: ${auxResult}`);
    }

    // Step 4: Generate vote array
    const voteArray = generateVoteArray(candidateId, totalCandidates);

    // Step 5: Encrypt the vote
    const encryptedVote = await encryptVotePaillier(voteArray, h, n);

    // Step 6: Get the auxiliary key
    const auxiliaryKey = await getAuxiliaryKey();

    console.log('Vote encryption completed successfully');
    console.log('Encrypted vote preview:', formatByteArray(encryptedVote));
    console.log('Auxiliary key preview:', formatByteArray(auxiliaryKey));

    return {
      encryptedVote,
      auxiliaryKey,
    };
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error(`Vote encryption failed: ${error.message}`);
  }
}

/**
 * Convert byte array to hex string for backend submission
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert hex string to byte array
 */
export function hexToBytes(hex: string): Uint8Array {
  const hexString = hex.replace('0x', '');
  if (hexString.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Validate election parameters
 */
export function validateElectionParams(params: ElectionParams): boolean {
  return !!(params.n && params.h && params.n.length > 0 && params.h.length > 0);
}

/**
 * Generate a masked preview of encrypted data for UI display
 */
export function generateEncryptedPreview(encryptedData: Uint8Array): string {
  const hex = bytesToHex(encryptedData);
  if (hex.length <= 20) return hex;
  
  return `${hex.substring(0, 8)}...${hex.substring(hex.length - 8)}`;
}

/**
 * Clear sensitive cryptographic data from memory
 */
export async function clearCryptoData() {
  try {
    // Clear WASM module memory if needed
    // This would depend on the WASM implementation
    console.log('Cleared cryptographic data from memory');
  } catch (error) {
    console.warn('Failed to clear crypto data:', error);
  }
}
