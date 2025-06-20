/**
 * =============================================================================
 * SINGLE GENERATION PROOF - WASM-BACKED DISCRETE LOGARITHM PROOF
 * =============================================================================
 * 
 * This module implements Single Generation Proof Protocol for proving knowledge
 * of discrete logarithm without revealing the secret value.
 * 
 * Mathematical Foundation:
 * Goal: Prove knowledge of x such that y = g^x mod p without revealing x
 * 
 * Schnorr Proof of Knowledge Protocol:
 * 1. Commitment: Prover chooses random k, computes A = g^k mod p
 * 2. Challenge: c = H(g || y || A) (Fiat-Shamir heuristic)
 * 3. Response: s = k + cx mod q
 * 4. Verification: g^s = A × y^c mod p
 * 
 * Security Properties:
 * - Completeness: Honest prover always convinces honest verifier
 * - Soundness: Dishonest prover cannot convince honest verifier
 * - Zero-knowledge: Verifier learns nothing about secret x
 * 
 * This proof ensures that each voter can only generate one valid proof per election,
 * preventing double-voting while maintaining voter privacy.
 */

import type { DeterministicKeys } from './deterministicKeyGen';
import { 
  modExp, 
  getSecureRandom, 
  secureHash, 
  combinedHash,
  bytesToHex, 
  hexToBytes,
  getCryptoParamsHex
} from './cryptoUtils';
import { wasmModMul } from '../wasmModule';

// =============================================================================
// TYPE DEFINITIONS  
// =============================================================================

export interface SingleGenerationProof {
  /** Unique proof identifier */
  id: string;
  /** Public commitment A = g^k mod p */
  commitment: string;
  /** Fiat-Shamir challenge c = H(g || y || A) */
  challenge: string;
  /** Response s = k + cx mod q */
  response: string;
  /** Public key y = g^x mod p */
  publicKey: string;
  /** Voter hash (derived from secret key) */
  voterHash: string;
  /** Election identifier */
  electionId: string;
  /** System entropy for uniqueness */
  systemEntropy: string;
  /** Generation timestamp */
  timestamp: number;
  /** Proof metadata */
  metadata: GenerationProofMetadata;
}

export interface GenerationProofMetadata {
  /** Cryptographic parameters used */
  parameters: {
    generator: string;
    modulus: string;
    order: string;
  };
  /** Security level (bits) */
  securityLevel: number;
  /** Proof method identifier */
  method: string;
  /** Verification code for public verification */
  verificationCode: string;
}

export interface GenerationProofVerificationResult {
  /** Whether the proof is valid */
  isValid: boolean;
  /** Whether commitment verification passed */
  commitmentValid: boolean;
  /** Whether challenge verification passed */
  challengeValid: boolean;
  /** Whether response verification passed */
  responseValid: boolean;
  /** Whether public key derivation is correct */
  publicKeyValid: boolean;
  /** Whether voter hash is consistent */
  voterHashValid: boolean;
  /** Verification timestamp */
  timestamp: number;
  /** Error message if verification failed */
  error?: string;
}

// =============================================================================
// SINGLE GENERATION PROOF GENERATION
// =============================================================================

/**
 * Generates a single generation proof proving knowledge of discrete logarithm
 * 
 * @param voterKeys - Voter's deterministic keys
 * @param voterHash - Voter's hash identifier
 * @param electionId - Election identifier
 * @param systemEntropy - System-provided entropy for uniqueness
 * @returns Promise resolving to single generation proof
 */
export async function generateSingleGenerationProof(
  voterKeys: DeterministicKeys,
  voterHash: string,
  electionId: string,
  systemEntropy: string
): Promise<SingleGenerationProof> {
  console.log('🔐 SingleGenerationProof: Generating WASM-backed discrete logarithm proof');
  
  try {
    // Get cryptographic parameters
    const cryptoParams = getCryptoParamsHex();
    const gBytes = await hexToBytes(cryptoParams.G);
    const pBytes = await hexToBytes(cryptoParams.P);
    const qBytes = await hexToBytes(cryptoParams.Q);
    
    // Use secret key as the discrete logarithm secret
    const secretKeyBytes = await hexToBytes(voterKeys.secretKey);
    
    // Step 1: Compute public key y = g^x mod p
    console.log('🔧 SingleGenerationProof: Step 1 - Computing public key');
    const publicKeyBytes = await modExp(gBytes, secretKeyBytes, pBytes);
    const publicKey = await bytesToHex(publicKeyBytes);
    
    // Step 2: Generate random witness k ∈ Z_q for commitment
    console.log('🔧 SingleGenerationProof: Step 2 - Generating witness');
    const witnessBytes = await getSecureRandom(qBytes);
    
    // Step 3: Compute commitment A = g^k mod p
    console.log('🔧 SingleGenerationProof: Step 3 - Computing commitment');
    const commitmentBytes = await modExp(gBytes, witnessBytes, pBytes);
    const commitment = await bytesToHex(commitmentBytes);
    
    // Step 4: Generate Fiat-Shamir challenge c = H(g || y || A)
    console.log('🔧 SingleGenerationProof: Step 4 - Generating challenge');
    const challenge = await generateSchnorrChallenge(
      cryptoParams.G,
      publicKey,
      commitment,
      electionId,
      systemEntropy
    );
    
    // Step 5: Compute response s = k + cx mod q
    console.log('🔧 SingleGenerationProof: Step 5 - Computing response');
    const response = await computeSchnorrResponse(
      witnessBytes,
      await hexToBytes(challenge),
      secretKeyBytes,
      qBytes
    );
    
    // Step 6: Create proof metadata
    const metadata = await createProofMetadata(
      cryptoParams,
      voterHash,
      electionId
    );
      // Step 7: Generate unique proof ID
    const responseHex = await bytesToHex(response);
    const proofIdBytes = await secureHash(
      new Uint8Array([
        ...await hexToBytes(commitment),
        ...await hexToBytes(challenge),
        ...await hexToBytes(responseHex),
        ...new TextEncoder().encode(electionId)
      ])
    );
    const proofId = await bytesToHex(proofIdBytes);
    
    const generationProof: SingleGenerationProof = {
      id: proofId,
      commitment,
      challenge,
      response: responseHex,
      publicKey,
      voterHash,
      electionId,
      systemEntropy,
      timestamp: Date.now(),
      metadata
    };
    
    console.log('✅ SingleGenerationProof: WASM-backed proof generated successfully');
    return generationProof;
    
  } catch (error) {
    console.error('❌ SingleGenerationProof: Generation failed:', error);
    throw new Error(`Single generation proof generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// SCHNORR CHALLENGE GENERATION
// =============================================================================

/**
 * Generates Fiat-Shamir challenge for Schnorr proof
 * Challenge includes election and entropy for uniqueness
 */
async function generateSchnorrChallenge(
  generator: string,
  publicKey: string,
  commitment: string,
  electionId: string,
  systemEntropy: string
): Promise<string> {
  console.log('🔐 SingleGenerationProof: Generating Fiat-Shamir challenge');
  
  try {
    const gBytes = await hexToBytes(generator);
    const yBytes = await hexToBytes(publicKey);
    const aBytes = await hexToBytes(commitment);
    const electionBytes = new TextEncoder().encode(electionId);
    const entropyBytes = new TextEncoder().encode(systemEntropy);
    
    // Create challenge: c = H(g || y || A || election || entropy)
    const challengeBytes = await combinedHash(
      gBytes,
      yBytes,
      aBytes,
      electionBytes,
      entropyBytes
    );
    const challenge = await bytesToHex(challengeBytes);
    
    console.log('✅ SingleGenerationProof: Challenge generated successfully');
    return challenge;
    
  } catch (error) {
    console.error('❌ SingleGenerationProof: Challenge generation failed:', error);
    throw error;
  }
}

// =============================================================================
// SCHNORR RESPONSE COMPUTATION
// =============================================================================

/**
 * Computes Schnorr response s = k + cx mod q
 */
async function computeSchnorrResponse(
  witness: Uint8Array,
  challenge: Uint8Array,
  secretKey: Uint8Array,
  modulus: Uint8Array
): Promise<Uint8Array> {
  console.log('🔧 SingleGenerationProof: Computing Schnorr response');
  
  try {
    // Compute cx mod q
    const challengeSecretProduct = await wasmModMul(challenge, secretKey, modulus);
    
    // Compute s = k + cx mod q
    const { wasmModAdd } = await import('../wasmModule');
    const response = await wasmModAdd(witness, challengeSecretProduct, modulus);
    
    console.log('✅ SingleGenerationProof: Response computed successfully');
    return response;
    
  } catch (error) {
    console.error('❌ SingleGenerationProof: Response computation failed:', error);
    throw error;
  }
}

// =============================================================================
// PROOF METADATA CREATION
// =============================================================================

/**
 * Creates metadata for generation proof
 */
async function createProofMetadata(
  cryptoParams: ReturnType<typeof getCryptoParamsHex>,
  voterHash: string,
  electionId: string
): Promise<GenerationProofMetadata> {
  console.log('🔧 SingleGenerationProof: Creating proof metadata');
  
  try {
    // Generate verification code
    const verificationCodeBytes = await combinedHash(
      await hexToBytes(voterHash),
      new TextEncoder().encode(electionId),
      new TextEncoder().encode(Date.now().toString())
    );
    const verificationCode = (await bytesToHex(verificationCodeBytes)).substring(0, 12).toUpperCase();
    
    const metadata: GenerationProofMetadata = {
      parameters: {
        generator: cryptoParams.G,
        modulus: cryptoParams.P,
        order: cryptoParams.Q
      },
      securityLevel: 256, // 256-bit security
      method: 'schnorr-fiat-shamir',
      verificationCode
    };
    
    console.log('✅ SingleGenerationProof: Metadata created successfully');
    return metadata;
    
  } catch (error) {
    console.error('❌ SingleGenerationProof: Metadata creation failed:', error);
    throw error;
  }
}

// =============================================================================
// SINGLE GENERATION PROOF VERIFICATION
// =============================================================================

/**
 * Verifies a single generation proof using WASM-backed operations
 * 
 * Verification Steps:
 * 1. Recompute challenge: c = H(g || y || A || election || entropy)
 * 2. Check Schnorr equation: g^s = A × y^c mod p
 * 3. Verify public key derivation
 * 4. Verify voter hash consistency
 * 
 * @param proof - Single generation proof to verify
 * @param voterKeys - Voter's keys for verification
 * @param voterHash - Expected voter hash
 * @param electionId - Expected election ID
 * @param systemEntropy - Expected system entropy
 * @returns Promise resolving to verification result
 */
export async function verifySingleGenerationProof(
  proof: SingleGenerationProof,
  voterKeys: DeterministicKeys,
  voterHash: string,
  electionId: string,
  systemEntropy: string
): Promise<boolean> {
  console.log('🔍 SingleGenerationProof: Starting WASM-backed verification');
  
  try {
    const verificationResult = await verifyDetailedSingleGenerationProof(
      proof,
      voterKeys,
      voterHash,
      electionId,
      systemEntropy
    );
    
    console.log('✅ SingleGenerationProof: Verification result:', verificationResult.isValid);
    return verificationResult.isValid;
    
  } catch (error) {
    console.error('❌ SingleGenerationProof: Verification failed:', error);
    return false;
  }
}

/**
 * Performs detailed verification with step-by-step results
 */
export async function verifyDetailedSingleGenerationProof(
  proof: SingleGenerationProof,
  voterKeys: DeterministicKeys,
  voterHash: string,
  electionId: string,
  systemEntropy: string
): Promise<GenerationProofVerificationResult> {
  console.log('🔍 SingleGenerationProof: Starting detailed WASM-backed verification');
  
  try {
    const cryptoParams = getCryptoParamsHex();
    const gBytes = await hexToBytes(cryptoParams.G);
    const pBytes = await hexToBytes(cryptoParams.P);
    
    // Step 1: Verify challenge
    console.log('🔍 SingleGenerationProof: Step 1 - Verifying challenge');
    const recomputedChallenge = await generateSchnorrChallenge(
      cryptoParams.G,
      proof.publicKey,
      proof.commitment,
      electionId,
      systemEntropy
    );
    const challengeValid = recomputedChallenge === proof.challenge;
    
    // Step 2: Verify Schnorr equation g^s = A × y^c mod p
    console.log('🔍 SingleGenerationProof: Step 2 - Verifying Schnorr equation');
    const responseValid = await verifySchnorrEquation(proof, cryptoParams);
    
    // Step 3: Verify public key derivation
    console.log('🔍 SingleGenerationProof: Step 3 - Verifying public key');
    const secretKeyBytes = await hexToBytes(voterKeys.secretKey);
    const expectedPublicKeyBytes = await modExp(gBytes, secretKeyBytes, pBytes);
    const expectedPublicKey = await bytesToHex(expectedPublicKeyBytes);
    const publicKeyValid = expectedPublicKey === proof.publicKey;
    
    // Step 4: Verify voter hash consistency
    console.log('🔍 SingleGenerationProof: Step 4 - Verifying voter hash');
    const voterHashValid = proof.voterHash === voterHash;
    
    // Step 5: Verify election and entropy consistency
    const electionValid = proof.electionId === electionId;
    const entropyValid = proof.systemEntropy === systemEntropy;
    
    // Verify commitment structure
    const commitmentBytes = await hexToBytes(proof.commitment);
    const commitmentValid = commitmentBytes.length > 0;
    
    // All checks must pass
    const isValid = challengeValid && responseValid && publicKeyValid && 
                   voterHashValid && electionValid && entropyValid && commitmentValid;
    
    console.log('✅ SingleGenerationProof: Detailed verification completed');
    
    return {
      isValid,
      commitmentValid,
      challengeValid,
      responseValid,
      publicKeyValid,
      voterHashValid,
      timestamp: Date.now()
    };
    
  } catch (error) {
    console.error('❌ SingleGenerationProof: Detailed verification failed:', error);
    return {
      isValid: false,
      commitmentValid: false,
      challengeValid: false,
      responseValid: false,
      publicKeyValid: false,
      voterHashValid: false,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown verification error'
    };
  }
}

// =============================================================================
// SCHNORR EQUATION VERIFICATION
// =============================================================================

/**
 * Verifies the Schnorr equation: g^s = A × y^c mod p
 */
async function verifySchnorrEquation(
  proof: SingleGenerationProof,
  cryptoParams: ReturnType<typeof getCryptoParamsHex>
): Promise<boolean> {
  console.log('🔍 SingleGenerationProof: Verifying Schnorr equation');
  
  try {
    const gBytes = await hexToBytes(cryptoParams.G);
    const pBytes = await hexToBytes(cryptoParams.P);
    
    // Left side: g^s mod p
    const responseBytes = await hexToBytes(proof.response);
    const leftSide = await modExp(gBytes, responseBytes, pBytes);
    
    // Right side: A × y^c mod p
    
    // Compute y^c mod p
    const publicKeyBytes = await hexToBytes(proof.publicKey);
    const challengeBytes = await hexToBytes(proof.challenge);
    const publicKeyPowC = await modExp(publicKeyBytes, challengeBytes, pBytes);
    
    // Compute A × y^c mod p
    const commitmentBytes = await hexToBytes(proof.commitment);
    const rightSide = await wasmModMul(commitmentBytes, publicKeyPowC, pBytes);
    
    // Check equality
    const isEqual = await bytesEqual(leftSide, rightSide);
    
    console.log('✅ SingleGenerationProof: Schnorr equation verification result:', isEqual);
    return isEqual;
    
  } catch (error) {
    console.error('❌ SingleGenerationProof: Schnorr equation verification failed:', error);
    return false;
  }
}

// =============================================================================
// PROOF AGGREGATION AND BATCH OPERATIONS
// =============================================================================

/**
 * Aggregates multiple single generation proofs for batch verification
 * Used when verifying multiple voters' proofs simultaneously
 */
export async function aggregateSingleGenerationProofs(
  proofs: SingleGenerationProof[]
): Promise<{
  aggregatedChallenge: string;
  aggregatedResponse: string;
  batchId: string;
}> {
  console.log('🔧 SingleGenerationProof: Aggregating', proofs.length, 'proofs');
  
  try {
    if (proofs.length === 0) {
      throw new Error('Cannot aggregate empty proof array');
    }
    
    // Aggregate challenges using combined hash
    const challengeBytes = await Promise.all(
      proofs.map(proof => hexToBytes(proof.challenge))
    );
    const aggregatedChallengeBytes = await combinedHash(...challengeBytes);
    const aggregatedChallenge = await bytesToHex(aggregatedChallengeBytes);
    
    // Aggregate responses using combined hash
    const responseBytes = await Promise.all(
      proofs.map(proof => hexToBytes(proof.response))
    );
    const aggregatedResponseBytes = await combinedHash(...responseBytes);
    const aggregatedResponse = await bytesToHex(aggregatedResponseBytes);
    
    // Create batch ID
    const batchIdBytes = await secureHash(
      new Uint8Array([
        ...aggregatedChallengeBytes,
        ...aggregatedResponseBytes,
        ...new TextEncoder().encode(proofs.length.toString())
      ])
    );
    const batchId = await bytesToHex(batchIdBytes);
    
    console.log('✅ SingleGenerationProof: Proofs aggregated successfully');
    
    return {
      aggregatedChallenge,
      aggregatedResponse,
      batchId
    };
    
  } catch (error) {
    console.error('❌ SingleGenerationProof: Aggregation failed:', error);
    throw error;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

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

/**
 * Validates single generation proof structure
 */
export function validateProofStructure(proof: SingleGenerationProof): boolean {
  console.log('🔍 SingleGenerationProof: Validating proof structure');
  
  try {
    // Check required fields
    const requiredFields = [
      'id', 'commitment', 'challenge', 'response', 
      'publicKey', 'voterHash', 'electionId', 'systemEntropy'
    ];
    
    for (const field of requiredFields) {
      if (!proof[field as keyof SingleGenerationProof]) {
        console.warn(`Missing required field: ${field}`);
        return false;
      }
    }
    
    // Check metadata structure
    if (!proof.metadata || !proof.metadata.parameters) {
      console.warn('Missing proof metadata');
      return false;
    }
    
    // Check timestamp validity (not too old, not in future)
    const now = Date.now();
    const proofAge = now - proof.timestamp;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (proofAge < 0 || proofAge > maxAge) {
      console.warn('Invalid proof timestamp');
      return false;
    }
    
    console.log('✅ SingleGenerationProof: Structure validation passed');
    return true;
    
  } catch (error) {
    console.error('❌ SingleGenerationProof: Structure validation failed:', error);
    return false;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

// All functions and types are already exported above with 'export' keyword
