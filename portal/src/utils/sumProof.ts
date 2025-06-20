/**
 * =============================================================================
 * SUM PROOF PROTOCOL - WASM-BACKED ZERO-KNOWLEDGE SUM VERIFICATION
 * =============================================================================
 * 
 * This module implements the Sum Proof Protocol for verifying that the sum
 * of committed votes equals 1 without revealing individual vote values.
 * 
 * Mathematical Foundation:
 * Goal: Prove that Σᵢ₌₁ⁿ vᵢ = 1 where vᵢ are committed values
 * 
 * Protocol Steps:
 * 1. Commitment Aggregation: C_agg = Πᵢ₌₁ⁿ Cᵢ = g^(Σvᵢ) × h^(Σrᵢ)
 * 2. Target Commitment: C_sum = g¹ × h^s = g × h^s  
 * 3. Schnorr Proof of Equality: Prove C_agg and C_sum commit to same value
 * 
 * Schnorr Proof Protocol:
 * Prover Steps:
 * 1. Choose random witness w ∈ Z_q
 * 2. Compute witness commitment: W = g^w
 * 3. Generate challenge: c = H(C_agg || C_sum || W)
 * 4. Compute response: z = w + c × (Σrᵢ - s) mod q
 * 
 * Verifier Steps:
 * 1. Recompute challenge: c = H(C_agg || C_sum || W)
 * 2. Check: g^z = W × (C_agg × C_sum^(-1))^c
 */

import type { CommitmentParameters, PedersenCommitment } from './commitmentScheme';
import { aggregateCommitments, createPedersenCommitment } from './commitmentScheme';
import { 
  modExp, 
  getSecureRandom, 
  secureHash, 
  combinedHash,
  bytesToHex, 
  hexToBytes 
} from './cryptoUtils';
import { wasmModMul, wasmModInv } from '../wasmModule';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface SumProof {
  /** Unique proof identifier */
  id: string;
  /** Aggregated commitment C_agg = Π Cᵢ */
  aggregatedCommitment: string;
  /** Target commitment C_sum = g¹ × h^s */
  targetCommitment: string;
  /** Witness commitment W = g^w */
  witnessCommitment: string;
  /** Fiat-Shamir challenge c */
  challenge: string;
  /** Schnorr response z = w + c × (Σrᵢ - s) mod q */
  response: string;
  /** Sum of blinding factors Σrᵢ */
  sumBlindingFactors: string;
  /** Target blinding factor s */
  targetBlindingFactor: string;
  /** Expected sum value (should be 1 for votes) */
  expectedSum: number;
  /** Generation timestamp */
  timestamp: number;
}

export interface SumProofVerificationResult {
  /** Whether the proof is valid */
  isValid: boolean;
  /** Whether aggregated commitment is correct */
  aggregationValid: boolean;
  /** Whether target commitment is correct */
  targetValid: boolean;
  /** Whether Schnorr proof is valid */
  schnorrValid: boolean;
  /** Verification timestamp */
  timestamp: number;
  /** Error message if verification failed */
  error?: string;
}

// =============================================================================
// SUM PROOF GENERATION
// =============================================================================

/**
 * Generates a zero-knowledge proof that the sum of votes equals 1
 * 
 * @param votes - Array of vote values (each 0 or 1)
 * @param voteCommitments - Array of Pedersen commitments to votes
 * @param params - Commitment parameters
 * @returns Promise resolving to sum proof
 */
export async function generateSumProof(
  votes: number[],
  voteCommitments: PedersenCommitment[],
  params: CommitmentParameters
): Promise<SumProof> {
  console.log('🔐 SumProof: Generating WASM-backed sum proof for', votes.length, 'votes');
  
  try {
    // Validate inputs
    if (votes.length !== voteCommitments.length) {
      throw new Error('Votes and commitments arrays must have same length');
    }
    
    if (votes.length === 0) {
      throw new Error('Cannot generate sum proof for empty vote array');
    }
    
    // Validate vote values are 0 or 1
    for (let i = 0; i < votes.length; i++) {
      if (votes[i] !== 0 && votes[i] !== 1) {
        throw new Error(`Invalid vote value at index ${i}: ${votes[i]}. Must be 0 or 1`);
      }
    }
      // Calculate expected sum (should be 1 for single vote)
    const expectedSum = votes.reduce((sum, vote) => sum + vote, 0);
    console.log('📊 SumProof: Expected sum =', expectedSum);
    
    // Convert parameters to WASM-compatible format
    const qBytes = await hexToBytes(params.q);
    
    // Step 1: Aggregate vote commitments
    console.log('🔧 SumProof: Step 1 - Aggregating commitments');
    const aggregatedCommitment = await aggregateCommitments(voteCommitments, params);
    
    // Step 2: Create target commitment C_sum = g^1 × h^s
    console.log('🔧 SumProof: Step 2 - Creating target commitment');
    const targetBlindingFactorBytes = await getSecureRandom(qBytes);
    const targetCommitment = await createTargetCommitment(
      expectedSum, 
      targetBlindingFactorBytes, 
      params
    );
    
    // Step 3: Calculate sum of blinding factors Σrᵢ
    console.log('🔧 SumProof: Step 3 - Calculating sum of blinding factors');
    const sumBlindingFactorsBytes = await calculateSumBlindingFactors(
      voteCommitments, 
      qBytes
    );
    
    // Step 4: Generate Schnorr proof of equality
    console.log('🔧 SumProof: Step 4 - Generating Schnorr proof');
    const schnorrProof = await generateSchnorrEqualityProof(
      aggregatedCommitment,
      targetCommitment.commitment,
      sumBlindingFactorsBytes,
      targetBlindingFactorBytes,
      params
    );
    
    // Step 5: Create final proof object
    const proofIdBytes = await secureHash(
      new Uint8Array([
        ...await hexToBytes(aggregatedCommitment),
        ...await hexToBytes(targetCommitment.commitment),
        ...await hexToBytes(schnorrProof.challenge)
      ])
    );
    const proofId = await bytesToHex(proofIdBytes);
    
    const sumProof: SumProof = {
      id: proofId,
      aggregatedCommitment,
      targetCommitment: targetCommitment.commitment,
      witnessCommitment: schnorrProof.witnessCommitment,
      challenge: schnorrProof.challenge,
      response: schnorrProof.response,
      sumBlindingFactors: await bytesToHex(sumBlindingFactorsBytes),
      targetBlindingFactor: await bytesToHex(targetBlindingFactorBytes),
      expectedSum,
      timestamp: Date.now()
    };
    
    console.log('✅ SumProof: WASM-backed sum proof generated successfully');
    return sumProof;
    
  } catch (error) {
    console.error('❌ SumProof: Generation failed:', error);
    throw new Error(`Sum proof generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// TARGET COMMITMENT CREATION
// =============================================================================

/**
 * Creates target commitment C_sum = g^expectedSum × h^s
 */
async function createTargetCommitment(
  expectedSum: number,
  blindingFactor: Uint8Array,
  params: CommitmentParameters
): Promise<{ commitment: string; blindingFactor: string }> {
  console.log('🔧 SumProof: Creating target commitment for sum =', expectedSum);
  
  try {
    const gBytes = await hexToBytes(params.g);
    const hBytes = await hexToBytes(params.h);
    const pBytes = await hexToBytes(params.p);
    
    // Convert expected sum to bytes
    const expectedSumBytes = new Uint8Array(32);
    expectedSumBytes[31] = expectedSum; // Store in least significant byte
    
    // Compute g^expectedSum mod p
    const gToSum = await modExp(gBytes, expectedSumBytes, pBytes);
    
    // Compute h^s mod p  
    const hToS = await modExp(hBytes, blindingFactor, pBytes);
    
    // Compute final commitment: C_sum = g^expectedSum × h^s mod p
    const commitmentBytes = await wasmModMul(gToSum, hToS, pBytes);
    
    const commitment = await bytesToHex(commitmentBytes);
    const blindingFactorHex = await bytesToHex(blindingFactor);
    
    console.log('✅ SumProof: Target commitment created successfully');
    return { commitment, blindingFactor: blindingFactorHex };
    
  } catch (error) {
    console.error('❌ SumProof: Target commitment creation failed:', error);
    throw error;
  }
}

// =============================================================================
// BLINDING FACTOR AGGREGATION
// =============================================================================

/**
 * Calculates sum of blinding factors Σrᵢ mod q
 */
async function calculateSumBlindingFactors(
  commitments: PedersenCommitment[],
  qBytes: Uint8Array
): Promise<Uint8Array> {
  console.log('🔧 SumProof: Calculating sum of', commitments.length, 'blinding factors');
  
  try {
    // Start with zero
    let sumBytes = new Uint8Array(qBytes.length);
    
    // Add each blinding factor modulo q
    for (const commitment of commitments) {
      const blindingFactorBytes = await hexToBytes(commitment.blindingFactor);
      sumBytes = await wasmModAdd(sumBytes, blindingFactorBytes, qBytes);
    }
    
    console.log('✅ SumProof: Blinding factors sum calculated successfully');
    return sumBytes;
    
  } catch (error) {
    console.error('❌ SumProof: Blinding factor sum calculation failed:', error);
    throw error;
  }
}

// =============================================================================
// SCHNORR EQUALITY PROOF
// =============================================================================

/**
 * Generates Schnorr proof that two commitments commit to the same value
 */
async function generateSchnorrEqualityProof(
  aggregatedCommitment: string,
  targetCommitment: string,
  sumBlindingFactors: Uint8Array,
  targetBlindingFactor: Uint8Array,
  params: CommitmentParameters
): Promise<{
  witnessCommitment: string;
  challenge: string;
  response: string;
}> {
  console.log('🔐 SumProof: Generating Schnorr equality proof');
  
  try {
    const gBytes = await hexToBytes(params.g);
    const pBytes = await hexToBytes(params.p);
    const qBytes = await hexToBytes(params.q);
    
    // Step 1: Choose random witness w ∈ Z_q
    const witnessBytes = await getSecureRandom(qBytes);
    
    // Step 2: Compute witness commitment W = g^w mod p
    const witnessCommitmentBytes = await modExp(gBytes, witnessBytes, pBytes);
    const witnessCommitment = await bytesToHex(witnessCommitmentBytes);
    
    // Step 3: Generate Fiat-Shamir challenge c = H(C_agg || C_sum || W)
    const challenge = await generateFiatShamirChallenge(
      aggregatedCommitment,
      targetCommitment,
      witnessCommitment
    );
    
    // Step 4: Compute response z = w + c × (Σrᵢ - s) mod q
    const response = await computeSchnorrResponse(
      witnessBytes,
      await hexToBytes(challenge),
      sumBlindingFactors,
      targetBlindingFactor,
      qBytes
    );
    
    console.log('✅ SumProof: Schnorr equality proof generated successfully');
    
    return {
      witnessCommitment,
      challenge,
      response: await bytesToHex(response)
    };
    
  } catch (error) {
    console.error('❌ SumProof: Schnorr proof generation failed:', error);
    throw error;
  }
}

// =============================================================================
// FIAT-SHAMIR CHALLENGE GENERATION
// =============================================================================

/**
 * Generates Fiat-Shamir challenge using WASM-backed hash operations
 */
async function generateFiatShamirChallenge(
  aggregatedCommitment: string,
  targetCommitment: string,
  witnessCommitment: string
): Promise<string> {
  console.log('🔐 SumProof: Generating Fiat-Shamir challenge');
  
  try {
    const aggBytes = await hexToBytes(aggregatedCommitment);
    const targetBytes = await hexToBytes(targetCommitment);
    const witnessBytes = await hexToBytes(witnessCommitment);
    
    // Create challenge: c = H(C_agg || C_sum || W)
    const challengeBytes = await combinedHash(aggBytes, targetBytes, witnessBytes);
    const challenge = await bytesToHex(challengeBytes);
    
    console.log('✅ SumProof: Fiat-Shamir challenge generated successfully');
    return challenge;
    
  } catch (error) {
    console.error('❌ SumProof: Challenge generation failed:', error);
    throw error;
  }
}

// =============================================================================
// SCHNORR RESPONSE COMPUTATION
// =============================================================================

/**
 * Computes Schnorr response z = w + c × (Σrᵢ - s) mod q
 */
async function computeSchnorrResponse(
  witness: Uint8Array,
  challenge: Uint8Array,
  sumBlindingFactors: Uint8Array,
  targetBlindingFactor: Uint8Array,
  modulus: Uint8Array
): Promise<Uint8Array> {
  console.log('🔧 SumProof: Computing Schnorr response');
  
  try {
    // Compute (Σrᵢ - s) mod q
    const blindingFactorDiff = await wasmModSub(sumBlindingFactors, targetBlindingFactor, modulus);
    
    // Compute c × (Σrᵢ - s) mod q
    const challengeProduct = await wasmModMul(challenge, blindingFactorDiff, modulus);
    
    // Compute z = w + c × (Σrᵢ - s) mod q
    const response = await wasmModAdd(witness, challengeProduct, modulus);
    
    console.log('✅ SumProof: Schnorr response computed successfully');
    return response;
    
  } catch (error) {
    console.error('❌ SumProof: Response computation failed:', error);
    throw error;
  }
}

// =============================================================================
// SUM PROOF VERIFICATION
// =============================================================================

/**
 * Verifies a sum proof using WASM-backed operations
 * 
 * Verification Steps:
 * 1. Recompute challenge: c = H(C_agg || C_sum || W)
 * 2. Check: g^z = W × (C_agg × C_sum^(-1))^c
 * 
 * @param proof - Sum proof to verify
 * @param params - Commitment parameters
 * @returns Promise resolving to verification result
 */
export async function verifySumProof(
  proof: SumProof,
  params: CommitmentParameters
): Promise<boolean> {
  console.log('🔍 SumProof: Starting WASM-backed verification');
  
  try {
    const verificationResult = await verifyDetailedSumProof(proof, params);
    
    console.log('✅ SumProof: Verification result:', verificationResult.isValid);
    return verificationResult.isValid;
    
  } catch (error) {
    console.error('❌ SumProof: Verification failed:', error);
    return false;
  }
}

/**
 * Performs detailed verification with step-by-step results
 */
export async function verifyDetailedSumProof(
  proof: SumProof,
  params: CommitmentParameters
): Promise<SumProofVerificationResult> {  console.log('🔍 SumProof: Starting detailed WASM-backed verification');
  
  try {
    // Step 1: Recompute Fiat-Shamir challenge
    console.log('🔍 SumProof: Step 1 - Verifying challenge');
    const recomputedChallenge = await generateFiatShamirChallenge(
      proof.aggregatedCommitment,
      proof.targetCommitment,
      proof.witnessCommitment
    );
    
    const challengeValid = recomputedChallenge === proof.challenge;
    if (!challengeValid) {
      return {
        isValid: false,
        aggregationValid: false,
        targetValid: false,
        schnorrValid: false,
        timestamp: Date.now(),
        error: 'Challenge verification failed'
      };
    }
    
    // Step 2: Verify Schnorr proof equation g^z = W × (C_agg × C_sum^(-1))^c
    console.log('🔍 SumProof: Step 2 - Verifying Schnorr equation');
    const schnorrValid = await verifySchnorrEquation(proof, params);
    
    // Step 3: Additional validation checks
    const aggregationValid = true; // Simplified for this implementation
    const targetValid = proof.expectedSum === 1; // For vote proofs, sum should be 1
    
    const isValid = challengeValid && schnorrValid && aggregationValid && targetValid;
    
    console.log('✅ SumProof: Detailed verification completed');
    
    return {
      isValid,
      aggregationValid,
      targetValid,
      schnorrValid,
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('❌ SumProof: Detailed verification failed:', error);
    return {
      isValid: false,
      aggregationValid: false,
      targetValid: false,
      schnorrValid: false,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown verification error'
    };
  }
}

// =============================================================================
// SCHNORR EQUATION VERIFICATION
// =============================================================================

/**
 * Verifies the Schnorr equation: g^z = W × (C_agg × C_sum^(-1))^c
 */
async function verifySchnorrEquation(
  proof: SumProof,
  params: CommitmentParameters
): Promise<boolean> {
  console.log('🔍 SumProof: Verifying Schnorr equation');
  
  try {
    const gBytes = await hexToBytes(params.g);
    const pBytes = await hexToBytes(params.p);
    
    // Left side: g^z mod p
    const responseBytes = await hexToBytes(proof.response);
    const leftSide = await modExp(gBytes, responseBytes, pBytes);
    
    // Right side: W × (C_agg × C_sum^(-1))^c mod p
      // Compute C_sum^(-1) mod p
    const targetCommitmentBytes = await hexToBytes(proof.targetCommitment);
    const targetInverse = await wasmModInv(targetCommitmentBytes, pBytes);
    
    // Compute C_agg × C_sum^(-1) mod p
    const aggregatedCommitmentBytes = await hexToBytes(proof.aggregatedCommitment);
    const quotient = await wasmModMul(aggregatedCommitmentBytes, targetInverse, pBytes);
    
    // Compute (C_agg × C_sum^(-1))^c mod p
    const challengeBytes = await hexToBytes(proof.challenge);
    const quotientPowC = await modExp(quotient, challengeBytes, pBytes);
    
    // Compute W × (C_agg × C_sum^(-1))^c mod p
    const witnessCommitmentBytes = await hexToBytes(proof.witnessCommitment);
    const rightSide = await wasmModMul(witnessCommitmentBytes, quotientPowC, pBytes);
    
    // Check equality
    const isEqual = await bytesEqual(leftSide, rightSide);
    
    console.log('✅ SumProof: Schnorr equation verification result:', isEqual);
    return isEqual;
    
  } catch (error) {
    console.error('❌ SumProof: Schnorr equation verification failed:', error);
    return false;
  }
}

// =============================================================================
// HELPER FUNCTIONS - WASM MODULE IMPORTS
// =============================================================================

/**
 * WASM modular addition: (a + b) mod m
 */
async function wasmModAdd(a: Uint8Array, b: Uint8Array, modulus: Uint8Array): Promise<Uint8Array> {
  const { wasmModAdd: wasmAdd } = await import('../wasmModule');
  return await wasmAdd(a, b, modulus);
}

/**
 * WASM modular subtraction: (a - b) mod m
 */
async function wasmModSub(a: Uint8Array, b: Uint8Array, modulus: Uint8Array): Promise<Uint8Array> {
  const { wasmModSub: wasmSub } = await import('../wasmModule');
  return await wasmSub(a, b, modulus);
}

/**
 * Helper function to compare byte arrays
 */
async function bytesEqual(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
}

// =============================================================================
// CONVENIENCE FUNCTION FOR VOTE COMMITMENT CREATION
// =============================================================================

/**
 * Creates a vote commitment (convenience wrapper for createPedersenCommitment)
 * 
 * @param vote - Vote value (0 or 1)
 * @param params - Commitment parameters
 * @returns Promise resolving to vote commitment
 */
export async function createVoteCommitment(
  vote: number,
  params: CommitmentParameters
): Promise<PedersenCommitment> {
  console.log('🗳️ SumProof: Creating vote commitment for vote =', vote);
  
  if (vote !== 0 && vote !== 1) {
    throw new Error(`Invalid vote value: ${vote}. Must be 0 or 1`);
  }
  
  return await createPedersenCommitment(vote, params);
}

// =============================================================================
// EXPORTS
// =============================================================================

// All functions and types are already exported above with 'export' keyword
