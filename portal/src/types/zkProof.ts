/**
 * WASM-Only Zero-Knowledge Proof Type Definitions
 * Updated for pure Uint8Array operations and production-level security
 */

export interface ZKProofData {
  id: string;
  timestamp: number;
  voterHash: string; // Hashed voter ID for privacy (hex string)
  electionId: string;
  rangeProof: RangeProof;
  sumProof: SumProof;
  generationProof: SingleGenerationProof;
  challenge: string; // Fiat-Shamir challenge (hex string)
  response: ChallengeResponse;
  verificationCode: string; // Short verification code (hex string)
  publicParameters: PublicParameters;
  wasmProofData: WasmProofMetadata; // WASM-specific metadata
}

export interface RangeProof {
  id: string;
  voteCommitment?: string; // For individual range proof compatibility
  auxiliaryCommitment?: string; // For individual range proof compatibility
  commitments: string[]; // Hex-encoded Uint8Array commitments (for batch compatibility)
  bulletproofs: BulletproofData[];
  binaryConstraints: BinaryConstraintProof[];
  proofSize: number;
  wasmGenerated: boolean; // Indicates WASM-only generation
}

export interface BulletproofData {
  position: number;
  commitment: string; // Hex-encoded Uint8Array
  proof: string; // Hex-encoded proof data
  witness: string; // Hex-encoded witness
  challenge: string; // Hex-encoded challenge
  response: string; // Hex-encoded response
  wasmBacked: boolean; // Indicates WASM-backed computation
}

export interface BinaryConstraintProof {
  position: number;
  zeroProof: string; // Hex-encoded proof that v_i * (v_i - 1) = 0
  commitment: string; // Hex-encoded commitment
  witness: string; // Hex-encoded witness
  wasmVerified: boolean; // WASM verification status
}

export interface SumProof {
  id: string;
  aggregatedCommitment: string; // Hex-encoded aggregated commitment C_agg = Π Cᵢ
  targetCommitment: string; // Hex-encoded target commitment C_sum = g¹ × h^s
  witnessCommitment: string; // Hex-encoded witness commitment W = g^w
  challenge: string; // Hex-encoded Fiat-Shamir challenge c
  response: string; // Hex-encoded Schnorr response z = w + c × (Σrᵢ - s) mod q
  sumBlindingFactors: string; // Hex-encoded sum of blinding factors Σrᵢ
  targetBlindingFactor: string; // Hex-encoded target blinding factor s
  expectedSum: number; // Expected sum value (should be 1 for votes)
  timestamp: number; // Generation timestamp
  wasmComputed?: boolean; // WASM computation flag (optional for compatibility)
}

export interface SingleGenerationProof {
  id: string;
  commitment: string; // Hex-encoded public commitment A = g^k mod p
  challenge: string; // Hex-encoded Fiat-Shamir challenge c = H(g || y || A)
  response: string; // Hex-encoded response s = k + cx mod q
  publicKey: string; // Hex-encoded public key y = g^x mod p
  voterHash: string; // Hex-encoded voter hash (derived from secret key)
  electionId: string; // Election identifier
  systemEntropy: string; // System entropy for uniqueness
  timestamp: number; // Generation timestamp
  metadata?: GenerationProofMetadata; // Proof metadata (optional for compatibility)
  // Legacy fields for backward compatibility
  keyDerivationProof?: string; // Hex-encoded proof
  timestampProof?: string; // Hex-encoded timestamp proof  
  consistencyProof?: string; // Hex-encoded consistency proof
  generationHash?: string; // Hex-encoded generation hash
  nonce?: string; // Hex-encoded nonce
  wasmGenerated?: boolean; // WASM generation flag
}

export interface ChallengeResponse {
  challenge: string; // Hex-encoded challenge
  responses: string[]; // Array of hex-encoded responses
  fiatShamirHash: string; // Hex-encoded Fiat-Shamir hash
  nonceCommitment: string; // Hex-encoded nonce commitment
  wasmVerified: boolean; // WASM verification status
}

export interface PublicParameters {
  g: string; // Generator g (hex-encoded)
  h: string; // Generator h (hex-encoded)
  p: string; // Prime modulus (hex-encoded, 2048+ bits)
  q: string; // Prime order (hex-encoded, 2048+ bits)
  electionHash: string; // Hex-encoded election hash
  systemEntropy: string; // Hex-encoded system entropy
  securityLevel: number; // Bit length (2048+)
  wasmBacked: boolean; // WASM-backed parameters
}

export interface WasmProofMetadata {
  wasmModuleVersion: string;
  generationMethod: 'pure-wasm' | 'hybrid' | 'fallback';
  securityLevel: number; // Bit length of parameters
  performanceMetrics: {
    generationTimeMs: number;
    verificationTimeMs: number;
    memoryUsageBytes: number;
  };
  wasmOperations: {
    modularExponentiations: number;
    secureRandomGenerations: number;
    hashOperations: number;
  };
}

export interface PublicVerificationData {
  verificationCode: string; // Hex-encoded verification code
  electionId: string;
  timestamp: number;
  publicParameters: PublicParameters;
  verificationUrl: string;
  qrCode?: string;
  wasmVerified: boolean; // WASM verification status
}

export interface ZKProofGenerationStatus {
  status: 'idle' | 'generating' | 'completed' | 'error';
  progress: number;
  currentStep: string;
  error?: string;
  proof?: ZKProofData;
  wasmStatus: 'loading' | 'ready' | 'computing' | 'error';
}

export interface VerificationResult {
  isValid: boolean;
  details: {
    rangeProofValid: boolean;
    sumProofValid: boolean;
    generationProofValid: boolean;
    challengeResponseValid: boolean;
    mathematicallySound: boolean;
    wasmVerified: boolean; // WASM verification flag
    securityLevel: number; // Security level verified
  };
  errors: string[];
  timestamp: number;
  wasmMetadata: WasmProofMetadata;
}

export interface GenerationProofMetadata {
  /** Cryptographic parameters used */
  parameters: {
    generator: string; // Hex-encoded generator g
    modulus: string; // Hex-encoded modulus p
    order: string; // Hex-encoded order q
  };
  /** Security and performance metrics */
  securityLevel: number; // Bit length of parameters
  computationTime: number; // Generation time in milliseconds
  /** WASM-specific metadata */
  wasmVersion: string; // WASM module version
  wasmOperations: number; // Number of WASM operations performed
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

export interface RangeProofVerificationResult {
  /** Whether all range proofs are valid */
  isValid: boolean;
  /** Individual proof validation results */
  individualResults: {
    position: number;
    isValid: boolean;
    error?: string;
  }[];
  /** Batch verification timestamp */
  timestamp: number;
  /** Error message if batch verification failed */
  error?: string;
}

export interface SingleGenerationProofVerificationResult {
  /** Whether the proof is valid */
  isValid: boolean;
  /** Whether commitment verification passed */
  commitmentValid: boolean;
  /** Whether challenge verification passed */
  challengeValid: boolean;
  /** Whether response verification passed */
  responseValid: boolean;
  /** Verification timestamp */
  timestamp: number;
  /** Error message if verification failed */
  error?: string;
}

export const ProofGenerationStep = {
  INITIALIZING: 'initializing',
  GENERATING_KEYS: 'generating_keys',
  CREATING_COMMITMENTS: 'creating_commitments',
  GENERATING_RANGE_PROOFS: 'generating_range_proofs',
  GENERATING_SUM_PROOF: 'generating_sum_proof',
  GENERATING_SINGLE_USE_PROOF: 'generating_single_use_proof',
  CREATING_CHALLENGE: 'creating_challenge',
  GENERATING_RESPONSE: 'generating_response',
  FINALIZING: 'finalizing'
} as const;

export type ProofGenerationStep = typeof ProofGenerationStep[keyof typeof ProofGenerationStep];

export const VerificationStatus = {
  PENDING: 'pending',
  VALID: 'valid',
  INVALID: 'invalid',
  ERROR: 'error'
} as const;

export type VerificationStatus = typeof VerificationStatus[keyof typeof VerificationStatus];

// =============================================================================
// IMPLEMENTATION-SPECIFIC TYPES
// =============================================================================

export interface CommitmentParameters {
  /** Generator g (hex-encoded) */
  g: string;
  /** Generator h (hex-encoded) */  
  h: string;
  /** Prime modulus p (hex-encoded) */
  p: string;
  /** Prime order q (hex-encoded) */
  q: string;
  /** Security level in bits */
  securityLevel: number;
}

export interface PedersenCommitment {
  /** Commitment value C = g^v × h^r mod p */
  commitment: string;
  /** Committed value v */
  value: number;
  /** Blinding factor r */
  blindingFactor: string;
  /** Hex-encoded commitment for serialization */
  commitmentHex: string;
}

export interface DeterministicKeys {
  /** Secret key (hex-encoded) */
  secretKey: string;
  /** Public key y = g^x mod p (hex-encoded) */
  publicKey: string;
  /** Voter hash for privacy (hex-encoded) */
  voterHash: string;
  /** Election-specific entropy (hex-encoded) */
  electionEntropy: string;
}

export interface RangeProofBatch {
  /** Array of individual range proofs */
  proofs: IndividualRangeProof[];
  /** Batch proof identifier */
  batchId: string;
  /** Number of proofs in batch */
  batchSize: number;
  /** Batch generation timestamp */
  timestamp: number;
  /** Batch verification result */
  batchValid?: boolean;
}

export interface IndividualRangeProof {
  /** Unique proof identifier */
  id: string;
  /** Original vote commitment Cᵢ = g^vᵢ × h^rᵢ */
  voteCommitment: string;
  /** Auxiliary commitment Dᵢ = g^(vᵢ-1) × h^sᵢ */
  auxiliaryCommitment: string;
  /** Witness commitment W = g^w */
  witnessCommitment: string;
  /** Fiat-Shamir challenge c */
  challenge: string;
  /** Response z = w + c × (vᵢ × sᵢ + rᵢ × (vᵢ-1)) mod q */
  response: string;
  /** Auxiliary blinding factor sᵢ */
  auxiliaryBlindingFactor: string;
  /** Vote value being proven (0 or 1) */
  voteValue: number;
  /** Generation timestamp */
  timestamp: number;
}
