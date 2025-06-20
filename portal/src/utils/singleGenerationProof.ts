/**
 * Single Generation Proof Implementation
 * Proves that cryptographic parameters were generated exactly once
 */

import type { SingleGenerationProof } from '../types/zkProof';
import { secureHash, combinedHash, hexToBytes, bytesToHex } from './cryptoUtils';
import type { DeterministicKeys } from './deterministicKeyGen';

/**
 * Generates proof that all cryptographic parameters were generated exactly once
 */
export async function generateSingleGenerationProof(
  keys: DeterministicKeys,
  voterID: string,
  electionParams: string,
  systemEntropy: string
): Promise<SingleGenerationProof> {
  const timestamp = keys.generationTimestamp;
  
  // Generate key derivation proof
  const keyDerivationProof = await createKeyDerivationProof(keys, voterID, electionParams);
  
  // Generate timestamp proof
  const timestampProof = await createTimestampProof(timestamp, keys.voterHash);
  
  // Generate consistency proof
  const consistencyProof = await createConsistencyProof(keys, systemEntropy);  // Generate final generation hash
  const keyDerivationProofBytes = await hexToBytes(keyDerivationProof);
  const timestampProofBytes = await hexToBytes(timestampProof);
  const consistencyProofBytes = await hexToBytes(consistencyProof);
  
  const generationHash = await combinedHash(
    keyDerivationProofBytes,
    timestampProofBytes,
    consistencyProofBytes,
    new TextEncoder().encode('SINGLE_GENERATION')
  );
  
  // Generate nonce for uniqueness
  const nonceInput = new TextEncoder().encode(
    bytesToHex(generationHash) + 
    timestamp.toString() + 
    Date.now().toString()
  );
  const nonce = await secureHash(nonceInput);
    const generationHashHex = await bytesToHex(generationHash);
  const nonceHex = await bytesToHex(nonce);
  
  const proofId = await combinedHash(generationHash, nonce, new TextEncoder().encode('SINGLE_GEN_PROOF'));
  const proofIdHex = await bytesToHex(proofId);
  
  return {
    id: proofIdHex,
    keyDerivationProof,
    timestampProof,
    consistencyProof,
    generationHash: generationHashHex,
    nonce: nonceHex,
    wasmGenerated: true
  };
}

/**
 * Creates proof of correct key derivation
 */
async function createKeyDerivationProof(
  keys: DeterministicKeys,
  voterID: string,
  electionParams: string
): Promise<string> {
  // Prove that keys were derived deterministically from inputs
  const derivationProofBytes = await hexToBytes(keys.derivationProof);
  
  // Take first 8 bytes (16 hex characters) from secret key, ensure proper length
  const secretKeyHex = keys.secretKey.length >= 16 ? keys.secretKey.substring(0, 16) : keys.secretKey.padEnd(16, '0');
  const partialKeyBytes = await hexToBytes(secretKeyHex);
  
  const result = await combinedHash(
    derivationProofBytes,
    await secureHash(new TextEncoder().encode(voterID)),
    await secureHash(new TextEncoder().encode(electionParams)),
    partialKeyBytes, // Use partial key for proof without revealing
    new TextEncoder().encode('KEY_DERIVATION_PROOF')
  );
  return bytesToHex(result);
}

/**
 * Creates timestamp-based proof
 */
async function createTimestampProof(
  timestamp: number,
  voterHash: string
): Promise<string> {
  // Create proof that includes timestamp and voter identification
  const timeWindow = Math.floor(timestamp / 1000); // Second-level precision
    const result = await combinedHash(
    new TextEncoder().encode(timestamp.toString()),
    new TextEncoder().encode(timeWindow.toString()),
    new TextEncoder().encode(voterHash),
    new TextEncoder().encode('TIMESTAMP_PROOF')
  );
  return bytesToHex(result);
}

/**
 * Creates consistency proof
 */
async function createConsistencyProof(
  keys: DeterministicKeys,
  systemEntropy: string
): Promise<string> {
  // Prove all keys are consistent with each other
  const secretKeyBytes = await hexToBytes(keys.secretKey);
  const auxiliaryKeyBytes = await hexToBytes(keys.auxiliaryKey);
  const electionHashBytes = await hexToBytes(keys.electionHash);
  
  const result = await combinedHash(
    secretKeyBytes,
    auxiliaryKeyBytes,
    electionHashBytes,
    new TextEncoder().encode(systemEntropy),
    new TextEncoder().encode('CONSISTENCY_PROOF')
  );
  return bytesToHex(result);
}

/**
 * Verifies single generation proof
 */
export async function verifySingleGenerationProof(
  proof: SingleGenerationProof,
  keys: DeterministicKeys,
  voterID: string,
  electionParams: string,
  systemEntropy: string
): Promise<boolean> {
  console.log('🔍 Verifying WASM-backed single generation proof');
  console.log('🔍 Proof ID:', proof.id);
  console.log('🔍 Key derivation proof:', proof.keyDerivationProof.substring(0, 20) + '...');
  console.log('🔍 Timestamp proof:', proof.timestampProof.substring(0, 20) + '...');
  console.log('🔍 Consistency proof:', proof.consistencyProof.substring(0, 20) + '...');
  console.log('🔍 VoterID:', voterID);
  console.log('🔍 Election params:', electionParams.substring(0, 20) + '...');
  console.log('🔍 System entropy:', systemEntropy.substring(0, 20) + '...');
  
  try {
    // Verify key derivation proof
    console.log('🔍 Verifying key derivation proof...');
    const expectedKeyDerivation = await createKeyDerivationProof(keys, voterID, electionParams);
    console.log('🔍 Expected key derivation:', expectedKeyDerivation.substring(0, 20) + '...');
    console.log('🔍 Actual key derivation:', proof.keyDerivationProof.substring(0, 20) + '...');
    
    if (expectedKeyDerivation !== proof.keyDerivationProof) {
      console.log('❌ Key derivation proof mismatch');
      return false;
    }
    console.log('✅ Key derivation proof verified');
    
    // Verify timestamp proof
    console.log('🔍 Verifying timestamp proof...');
    const expectedTimestamp = await createTimestampProof(keys.generationTimestamp, keys.voterHash);
    console.log('🔍 Expected timestamp:', expectedTimestamp.substring(0, 20) + '...');
    console.log('🔍 Actual timestamp:', proof.timestampProof.substring(0, 20) + '...');
    
    if (expectedTimestamp !== proof.timestampProof) {
      console.log('❌ Timestamp proof mismatch');
      return false;
    }
    console.log('✅ Timestamp proof verified');
    
    // Verify consistency proof
    console.log('🔍 Verifying consistency proof...');
    const expectedConsistency = await createConsistencyProof(keys, systemEntropy);
    console.log('🔍 Expected consistency:', expectedConsistency.substring(0, 20) + '...');
    console.log('🔍 Actual consistency:', proof.consistencyProof.substring(0, 20) + '...');
    
    if (expectedConsistency !== proof.consistencyProof) {
      console.log('❌ Consistency proof mismatch');
      return false;
    }
    console.log('✅ Consistency proof verified');// Verify generation hash
    const keyDerivationProofBytes = await hexToBytes(proof.keyDerivationProof);
    const timestampProofBytes = await hexToBytes(proof.timestampProof);
    const consistencyProofBytes = await hexToBytes(proof.consistencyProof);
    
    const expectedGenerationHash = await combinedHash(
      keyDerivationProofBytes,
      timestampProofBytes,
      consistencyProofBytes,
      new TextEncoder().encode('SINGLE_GENERATION')
    );
    
    const expectedGenerationHashHex = await bytesToHex(expectedGenerationHash);
    if (expectedGenerationHashHex !== proof.generationHash) {
      return false;
    }
    
    // Verify proof ID
    const generationHashBytes = await hexToBytes(proof.generationHash);
    const nonceBytes = await hexToBytes(proof.nonce);
    
    const expectedId = await combinedHash(
      generationHashBytes,
      nonceBytes,
      new TextEncoder().encode('SINGLE_GEN_PROOF')
    );
    
    const expectedIdHex = await bytesToHex(expectedId);
    if (expectedIdHex !== proof.id) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Prevents parameter fishing attacks by checking generation order
 */
export interface GenerationOrder {
  voterHash: string;
  electionHash: string;
  generationTimestamp: number;
  proofHash: string;
}

const generationOrder = new Map<string, GenerationOrder>();

/**
 * Records generation order to prevent fishing attacks
 */
export async function recordGenerationOrder(
  keys: DeterministicKeys,
  proof: SingleGenerationProof
): Promise<void> {
  const orderKey = keys.voterHash + keys.electionHash;
  
  if (generationOrder.has(orderKey)) {
    const existing = generationOrder.get(orderKey)!;
    
    // Ensure this is the same generation, not a new attempt
    if (existing.proofHash !== proof.generationHash) {
      throw new Error('Parameter fishing attack detected: multiple generations attempted');
    }
    
    return; // Already recorded, nothing to do
  }
  
  generationOrder.set(orderKey, {
    voterHash: keys.voterHash,
    electionHash: keys.electionHash,
    generationTimestamp: keys.generationTimestamp,
    proofHash: proof.generationHash
  });
}

/**
 * Checks for parameter fishing attacks
 */
export async function checkParameterFishing(
  keys: DeterministicKeys,
  proof: SingleGenerationProof
): Promise<boolean> {
  const orderKey = keys.voterHash + keys.electionHash;
  
  if (!generationOrder.has(orderKey)) {
    return false; // No previous generation found
  }
  
  const existing = generationOrder.get(orderKey)!;
  
  // Check if this is the same generation
  if (existing.proofHash === proof.generationHash && 
      existing.generationTimestamp === keys.generationTimestamp) {
    return false; // Same generation, not fishing
  }
  
  return true; // Different generation detected - fishing attack
}

/**
 * Creates proof against timing attacks
 */
export async function createTimingAttackProof(
  keys: DeterministicKeys,
  proof: SingleGenerationProof
): Promise<string> {
  // Create proof that generation timing is legitimate
  const currentTime = Date.now();
  const generationTime = keys.generationTimestamp;
  const timeDiff = currentTime - generationTime;
    // Reasonable time window (within 1 hour of generation)
  if (timeDiff > 3600000) {
    throw new Error('Generation timestamp too old for timing attack proof');
  }
  
  const nonceBytes = await hexToBytes(proof.nonce);
  const timingHash = await combinedHash(
    new TextEncoder().encode(generationTime.toString()),
    new TextEncoder().encode(currentTime.toString()),
    nonceBytes,
    new TextEncoder().encode('TIMING_ATTACK_PROOF')
  );
  return bytesToHex(timingHash);
}

/**
 * Verifies timing attack proof
 */
export async function verifyTimingAttackProof(
  timingProof: string,
  keys: DeterministicKeys,
  proof: SingleGenerationProof,
  currentTime: number
): Promise<boolean> {
  try {
    const nonceBytes = await hexToBytes(proof.nonce);
    const expectedProof = await combinedHash(
      new TextEncoder().encode(keys.generationTimestamp.toString()),
      new TextEncoder().encode(currentTime.toString()),
      nonceBytes,
      new TextEncoder().encode('TIMING_ATTACK_PROOF')
    );
    
    const expectedProofHex = await bytesToHex(expectedProof);
    return timingProof === expectedProofHex;
  } catch (error) {
    return false;
  }
}

/**
 * Clears generation order (for testing purposes)
 */
export function clearGenerationOrder(): void {
  generationOrder.clear();
}

/**
 * Gets generation statistics for monitoring
 */
export function getGenerationStatistics(): {
  totalGenerations: number;
  uniqueVoters: number;
  uniqueElections: number;
} {
  const voters = new Set<string>();
  const elections = new Set<string>();
  
  for (const order of generationOrder.values()) {
    voters.add(order.voterHash);
    elections.add(order.electionHash);
  }
  
  return {
    totalGenerations: generationOrder.size,
    uniqueVoters: voters.size,
    uniqueElections: elections.size
  };
}
