/**
 * Commitment Scheme Type Definitions
 * Defines interfaces for Pedersen commitments and related cryptographic operations
 */

export interface PedersenCommitment {
  value: string; // The committed value (encrypted)
  randomness: string; // The randomness used in commitment
  commitment: string; // The actual commitment C = g^m * h^r mod p
  opening: CommitmentOpening;
}

export interface CommitmentParameters {
  g: string; // Generator g
  h: string; // Generator h
  p: string; // Prime modulus
  q: string; // Prime order
  generationSeed: string; // Seed used for deterministic generation
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
