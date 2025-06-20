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
  commitments: string[]; // Hex-encoded Uint8Array commitments
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
  id: string;  sumCommitment: string; // Hex-encoded commitment to sum
  sumProof: string; // Hex-encoded proof that sum equals 1
  aggregatedCommitment: string; // Hex-encoded aggregated commitment
  witness: string; // Hex-encoded witness
  challenge: string; // Hex-encoded challenge
  response: string; // Hex-encoded response
  wasmComputed: boolean; // WASM computation flag
}

export interface SingleGenerationProof {
  id: string;
  keyDerivationProof: string; // Hex-encoded proof
  timestampProof: string; // Hex-encoded timestamp proof
  consistencyProof: string; // Hex-encoded consistency proof
  generationHash: string; // Hex-encoded generation hash
  nonce: string; // Hex-encoded nonce
  wasmGenerated: boolean; // WASM generation flag
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
