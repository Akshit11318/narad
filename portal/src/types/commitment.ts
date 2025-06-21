/**
 * Commitment Scheme Type Definitions
 * Defines interfaces for Pedersen commitments and related cryptographic operations
 */

// =============================================================================
// CORE COMMITMENT TYPES (from commitmentScheme.ts)
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
// LEGACY COMMITMENT TYPES (for backward compatibility)
// =============================================================================

export interface LegacyPedersenCommitment {
  value: string; // The committed value (encrypted)
  randomness: string; // The randomness used in commitment
  commitment: string; // The actual commitment C = g^m * h^r mod p
  opening: CommitmentOpening;
}

export interface CommitmentOpening {
  value: string; // Original value
  randomness: string; // Randomness used
  isValid: boolean; // Whether opening is valid
  verificationData: OpeningVerificationData;
}

export interface OpeningVerificationData {
  expectedCommitment: string;
  actualCommitment: string;
  bindingCheck: boolean;
  hidingCheck: boolean;
  timestamp: number;
}

export interface CommitmentBatch {
  id: string;
  commitments: PedersenCommitment[];
  batchProof: string;
  aggregatedCommitment: string;
  totalRandomness: string;
}

export interface CommitmentVerificationResult {
  isValid: boolean;
  commitment: string;
  details: {
    mathematicallyValid: boolean;
    parametersValid: boolean;
    bindingProperty: boolean;
    hidingProperty: boolean;
  };
  errors: string[];
}

export const CommitmentStatus = {
  PENDING: 'pending',
  VALID: 'valid',
  INVALID: 'invalid',
  EXPIRED: 'expired'
} as const;

export type CommitmentStatus = typeof CommitmentStatus[keyof typeof CommitmentStatus];

export const CommitmentType = {
  PEDERSEN: 'pedersen',
  ELGAMAL: 'elgamal',
  POLYNOMIAL: 'polynomial'
} as const;

export type CommitmentType = typeof CommitmentType[keyof typeof CommitmentType];
