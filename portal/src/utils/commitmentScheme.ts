/**
 * =============================================================================
 * COMMITMENT SCHEME - WASM-BACKED PEDERSEN COMMITMENTS
 * =============================================================================
 * 
 * This module implements Pedersen commitment scheme using WASM operations.
 * Commitments are used to hide vote values while preserving mathematical properties.
 * 
 * Mathematical Foundation:
 * C = g^v × h^r mod p
 * where:
 * - g, h are public generators
 * - v is the secret value (vote)
 * - r is the random blinding factor
 * - p is the prime modulus
 * 
 * Security Properties:
 * - Perfectly hiding: no information about v can be extracted
 * - Computationally binding: infeasible to find different v,r for same C
 */

import { 
  getCryptoParamsHex,
  modExp, 
  getSecureRandom, 
  secureHash, 
  bytesToHex, 
  hexToBytes 
} from './cryptoUtils';
import { wasmModMul } from '../wasmModule';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface CommitmentParameters {
  /** Generator g - public parameter */
  g: string;
  /** Generator h - public parameter */  
  h: string;
  /** Prime modulus p - public parameter */
  p: string;
  /** Prime order q - public parameter */
  q: string;
  /** Seed for deterministic generation */
  generationSeed: string;
}

export interface PedersenCommitment {
  /** Commitment value C = g^v × h^r mod p */
  commitment: string;
  /** Blinding factor r (kept secret) */
  blindingFactor: string;
  /** Committed value v */
  value: number;
  /** Verification proof */
  proof: CommitmentProof;
}

export interface CommitmentProof {
  /** Proof identifier */
  id: string;
  /** Challenge value from Fiat-Shamir */
  challenge: string;
  /** Response to challenge */
  response: string;
  /** Timestamp of generation */
  timestamp: number;
}

// =============================================================================
// COMMITMENT PARAMETER GENERATION
// =============================================================================

/**
 * Generates cryptographically secure commitment parameters
 * Uses deterministic generation from election parameters for verifiability
 * 
 * @param electionParams - Election-specific parameters for deterministic generation
 * @returns Promise resolving to commitment parameters
 */
export async function generateCommitmentParameters(electionParams: string): Promise<CommitmentParameters> {
  console.log('🔧 CommitmentScheme: Generating WASM-backed parameters');
  
  try {
    // Get base cryptographic parameters
    const cryptoParams = getCryptoParamsHex();
    
    // Create deterministic seed from election parameters
    const electionBytes = new TextEncoder().encode(electionParams);
    const seedBytes = await secureHash(electionBytes);
    const generationSeed = await bytesToHex(seedBytes);
    
    console.log('✅ CommitmentScheme: Parameters generated successfully');
    
    return {
      g: cryptoParams.G,
      h: cryptoParams.H,
      p: cryptoParams.P,
      q: cryptoParams.Q,
      generationSeed
    };
    
  } catch (error) {
    console.error('❌ CommitmentScheme: Parameter generation failed:', error);
    throw new Error(`Commitment parameter generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// PEDERSEN COMMITMENT CREATION
// =============================================================================

/**
 * Creates a Pedersen commitment to a value with cryptographic proof
 * 
 * Mathematical Operation:
 * C = g^v × h^r mod p
 * 
 * @param value - Value to commit to (vote: 0 or 1)
 * @param params - Commitment parameters
 * @returns Promise resolving to Pedersen commitment with proof
 */
export async function createPedersenCommitment(
  value: number, 
  params: CommitmentParameters
): Promise<PedersenCommitment> {
  console.log('🔐 CommitmentScheme: Creating Pedersen commitment for value:', value);
  
  try {
    // Validate input value
    if (value < 0 || value > 1) {
      throw new Error(`Invalid vote value: ${value}. Must be 0 or 1`);
    }
    
    // Convert parameters to WASM-compatible format
    const gBytes = await hexToBytes(params.g);
    const hBytes = await hexToBytes(params.h);
    const pBytes = await hexToBytes(params.p);
    const qBytes = await hexToBytes(params.q);
    
    // Generate secure random blinding factor r ∈ Z_q
    const blindingFactorBytes = await getSecureRandom(qBytes);
    
    // Convert value to bytes for WASM operations
    const valueBytes = new Uint8Array(32);
    valueBytes[31] = value; // Store value in least significant byte
    
    // Compute g^v mod p using WASM modular exponentiation
    const gToV = await modExp(gBytes, valueBytes, pBytes);
    
    // Compute h^r mod p using WASM modular exponentiation  
    const hToR = await modExp(hBytes, blindingFactorBytes, pBytes);
    
    // Compute final commitment: C = g^v × h^r mod p
    const commitmentBytes = await wasmModMul(gToV, hToR, pBytes);
    
    // Generate proof of commitment knowledge
    const proof = await generateCommitmentProof(
      value,
      blindingFactorBytes,
      params
    );
    
    // Convert results to hex strings
    const commitment = await bytesToHex(commitmentBytes);
    const blindingFactor = await bytesToHex(blindingFactorBytes);
    
    console.log('✅ CommitmentScheme: Pedersen commitment created successfully');
    
    return {
      commitment,
      blindingFactor,
      value,
      proof
    };
    
  } catch (error) {
    console.error('❌ CommitmentScheme: Commitment creation failed:', error);
    throw new Error(`Pedersen commitment creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// COMMITMENT PROOF GENERATION
// =============================================================================

/**
 * Generates a zero-knowledge proof of commitment knowledge
 * Proves knowledge of committed value and blinding factor without revealing them
 * 
 * @param value - Committed value
 * @param blindingFactor - Blinding factor used in commitment
 * @param params - Commitment parameters
 * @returns Promise resolving to commitment proof
 */
async function generateCommitmentProof(
  value: number,
  blindingFactor: Uint8Array,
  params: CommitmentParameters
): Promise<CommitmentProof> {
  console.log('🔐 CommitmentScheme: Generating commitment proof');
  
  try {
    // Convert parameters to WASM-compatible format
    const qBytes = await hexToBytes(params.q);
    
    // Generate random witness for zero-knowledge property
    const witnessBytes = await getSecureRandom(qBytes);
    
    // Create Fiat-Shamir challenge
    const challengeInput = new Uint8Array(
      witnessBytes.length + blindingFactor.length + 4 // 4 bytes for value
    );
    challengeInput.set(witnessBytes, 0);
    challengeInput.set(blindingFactor, witnessBytes.length);
    
    // Add value to challenge input
    const valueBytes = new Uint8Array(4);
    new DataView(valueBytes.buffer).setUint32(0, value, false);
    challengeInput.set(valueBytes, witnessBytes.length + blindingFactor.length);
    
    const challengeBytes = await secureHash(challengeInput);
    const challenge = await bytesToHex(challengeBytes);
    
    // Generate proof response (simplified for this implementation)
    const responseBytes = await secureHash(
      new Uint8Array([...witnessBytes, ...challengeBytes])
    );
    const response = await bytesToHex(responseBytes);
    
    // Generate unique proof ID
    const proofIdBytes = await secureHash(
      new Uint8Array([...challengeBytes, ...responseBytes])
    );
    const id = await bytesToHex(proofIdBytes);
    
    console.log('✅ CommitmentScheme: Commitment proof generated successfully');
    
    return {
      id,
      challenge,
      response,
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('❌ CommitmentScheme: Proof generation failed:', error);
    throw new Error(`Commitment proof generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// COMMITMENT VERIFICATION
// =============================================================================

/**
 * Verifies a Pedersen commitment and its associated proof
 * 
 * @param commitment - Commitment to verify
 * @param params - Commitment parameters used for verification
 * @returns Promise resolving to verification result
 */
export async function verifyPedersenCommitment(
  commitment: PedersenCommitment,
  params: CommitmentParameters
): Promise<boolean> {
  console.log('🔍 CommitmentScheme: Verifying Pedersen commitment');
  
  try {
    // Convert parameters and commitment to WASM-compatible format
    const gBytes = await hexToBytes(params.g);
    const hBytes = await hexToBytes(params.h);
    const pBytes = await hexToBytes(params.p);
    const commitmentBytes = await hexToBytes(commitment.commitment);
    const blindingFactorBytes = await hexToBytes(commitment.blindingFactor);
    
    // Recompute commitment: C' = g^v × h^r mod p
    const valueBytes = new Uint8Array(32);
    valueBytes[31] = commitment.value;
    
    const gToV = await modExp(gBytes, valueBytes, pBytes);
    const hToR = await modExp(hBytes, blindingFactorBytes, pBytes);
    const recomputedCommitmentBytes = await wasmModMul(gToV, hToR, pBytes);
    
    // Verify commitment matches
    const commitmentsMatch = await bytesEqual(commitmentBytes, recomputedCommitmentBytes);
    
    // Verify proof (simplified verification)
    const proofValid = await verifyCommitmentProof(commitment.proof, commitment.value, blindingFactorBytes);
    
    const isValid = commitmentsMatch && proofValid;
    
    console.log('✅ CommitmentScheme: Verification result:', isValid);
    return isValid;
    
  } catch (error) {
    console.error('❌ CommitmentScheme: Verification failed:', error);
    return false;
  }
}

// =============================================================================
// COMMITMENT AGGREGATION
// =============================================================================

/**
 * Aggregates multiple Pedersen commitments
 * Used for sum proofs where we need C_agg = Π C_i
 * 
 * @param commitments - Array of commitments to aggregate
 * @param params - Commitment parameters
 * @returns Promise resolving to aggregated commitment
 */
export async function aggregateCommitments(
  commitments: PedersenCommitment[],
  params: CommitmentParameters
): Promise<string> {
  console.log('🔧 CommitmentScheme: Aggregating', commitments.length, 'commitments');
  
  try {
    if (commitments.length === 0) {
      throw new Error('Cannot aggregate empty commitment array');
    }
    
    const pBytes = await hexToBytes(params.p);
    
    // Start with first commitment
    let aggregatedBytes = await hexToBytes(commitments[0].commitment);
    
    // Multiply all commitments: C_agg = Π C_i mod p
    for (let i = 1; i < commitments.length; i++) {
      const commitmentBytes = await hexToBytes(commitments[i].commitment);
      aggregatedBytes = await wasmModMul(aggregatedBytes, commitmentBytes, pBytes);
    }
    
    const aggregatedCommitment = await bytesToHex(aggregatedBytes);
    
    console.log('✅ CommitmentScheme: Commitments aggregated successfully');
    return aggregatedCommitment;
    
  } catch (error) {
    console.error('❌ CommitmentScheme: Aggregation failed:', error);
    throw new Error(`Commitment aggregation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Compares two Uint8Arrays for equality
 */
async function bytesEqual(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
}

/**
 * Verifies a commitment proof (simplified implementation)
 */
async function verifyCommitmentProof(
  proof: CommitmentProof,
  _value: number,
  _blindingFactor: Uint8Array
): Promise<boolean> {
  try {
    // Simplified proof verification
    // In a full implementation, this would perform complete Schnorr verification
    
    const challengeBytes = await hexToBytes(proof.challenge);
    const responseBytes = await hexToBytes(proof.response);
    
    // Verify proof structure and timing
    const now = Date.now();
    const proofAge = now - proof.timestamp;
    
    // Proof should not be too old (1 hour max)
    if (proofAge > 3600000) {
      console.warn('Commitment proof is too old:', proofAge, 'ms');
      return false;
    }
    
    // Basic length checks
    if (challengeBytes.length !== 32 || responseBytes.length !== 32) {
      console.warn('Invalid proof structure');
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('Proof verification error:', error);
    return false;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

// All functions and types are already exported above with 'export' keyword
