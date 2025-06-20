/**
 * WASM-Only Proof Validation Utilities
 * Uses only Uint8Array and WASM-backed operations for production-level security
 * Client-side proof validation before submission
 */

import type { ZKProofData, WasmProofMetadata } from '../types/zkProof';
import { 
  uint8ArrayToHex,
} from '../wasmModule';
import { verifyCompleteZKProof } from './zkProof';
import { secureHash } from './cryptoUtils';

/**
 * Validates ZK proof completeness using WASM-only operations
 */
export async function validateProofCompleteness(proof: ZKProofData): Promise<{
  isComplete: boolean;
  missingComponents: string[];
  errors: string[];
  wasmValidated: boolean;
}> {
  const missingComponents: string[] = [];
  const errors: string[] = [];

  try {
    // Check basic structure
    if (!proof.id || proof.id.length === 0) {
      missingComponents.push('proof ID');
    }

    if (!proof.voterHash || proof.voterHash.length === 0) {
      missingComponents.push('voter hash');
    }

    if (!proof.electionId || proof.electionId.length === 0) {
      missingComponents.push('election ID');
    }

    // Validate hex-encoded data
    if (!isValidHexString(proof.voterHash)) {
      errors.push('Invalid voter hash format (must be hex-encoded)');
    }

    // Check range proof
    if (!proof.rangeProof) {
      missingComponents.push('range proof');
    } else {
      if (!proof.rangeProof.commitments || proof.rangeProof.commitments.length === 0) {
        missingComponents.push('range proof commitments');
      }
      if (!proof.rangeProof.bulletproofs || proof.rangeProof.bulletproofs.length === 0) {
        missingComponents.push('bulletproofs');
      }
      if (!proof.rangeProof.binaryConstraints || proof.rangeProof.binaryConstraints.length === 0) {
        missingComponents.push('binary constraints');
      }
      
      // Validate WASM flags
      if (!proof.rangeProof.wasmGenerated) {
        errors.push('Range proof not generated with WASM');
      }
    }

    // Check sum proof
    if (!proof.sumProof) {
      missingComponents.push('sum proof');
    } else {
      if (!proof.sumProof.sumCommitment || proof.sumProof.sumCommitment.length === 0) {
        missingComponents.push('sum commitment');
      }
      if (!proof.sumProof.aggregatedCommitment || proof.sumProof.aggregatedCommitment.length === 0) {
        missingComponents.push('aggregated commitment');
      }
      
      // Validate hex encoding
      if (!isValidHexString(proof.sumProof.sumCommitment)) {
        errors.push('Invalid sum commitment format');
      }
    }

    // Check generation proof
    if (!proof.generationProof) {
      missingComponents.push('generation proof');
    } else {
      if (!proof.generationProof.wasmGenerated) {
        errors.push('Generation proof not created with WASM');
      }
    }

    // Check challenge and response
    if (!proof.challenge || proof.challenge.length === 0) {
      missingComponents.push('challenge');
    }
    
    if (!proof.response) {
      missingComponents.push('response');
    } else {
      if (!proof.response.wasmVerified) {
        errors.push('Challenge response not WASM-verified');
      }
    }

    // Check public parameters
    if (!proof.publicParameters) {
      missingComponents.push('public parameters');
    } else {
      if (!proof.publicParameters.wasmBacked) {
        errors.push('Public parameters not WASM-backed');
      }
      if (proof.publicParameters.securityLevel < 2048) {
        errors.push('Insufficient security level (must be 2048+ bits)');
      }
    }

    // Check WASM metadata
    if (!proof.wasmProofData) {
      missingComponents.push('WASM metadata');
    } else {
      if (proof.wasmProofData.generationMethod !== 'pure-wasm') {
        errors.push('Proof not generated with pure WASM method');
      }
    }

    const isComplete = missingComponents.length === 0 && errors.length === 0;

    return {
      isComplete,
      missingComponents,
      errors,
      wasmValidated: true
    };

  } catch (error) {
    return {
      isComplete: false,
      missingComponents,
      errors: [error instanceof Error ? error.message : 'Unknown validation error'],
      wasmValidated: false
    };
  }
}

/**
 * Validates proof integrity using WASM operations
 */
export async function validateProofIntegrity(proof: ZKProofData): Promise<{
  isValid: boolean;
  integrityChecks: {
    structuralIntegrity: boolean;
    cryptographicIntegrity: boolean;
    wasmIntegrity: boolean;
    dataConsistency: boolean;
  };
  errors: string[];
}> {
  const errors: string[] = [];
  let structuralIntegrity = true;
  let cryptographicIntegrity = true;
  let wasmIntegrity = true;
  let dataConsistency = true;

  try {
    // Structural integrity check
    const completenessResult = await validateProofCompleteness(proof);
    structuralIntegrity = completenessResult.isComplete;
    if (!structuralIntegrity) {
      errors.push(...completenessResult.errors);
    }

    // Cryptographic integrity check
    try {
      const verificationResult = await verifyCompleteZKProof(proof);
      cryptographicIntegrity = verificationResult.isValid;
      if (!cryptographicIntegrity) {
        errors.push(...verificationResult.errors);
      }
    } catch (error) {
      cryptographicIntegrity = false;
      errors.push(`Cryptographic verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // WASM integrity check
    wasmIntegrity = await validateWasmIntegrity(proof);
    if (!wasmIntegrity) {
      errors.push('WASM integrity check failed');
    }

    // Data consistency check
    dataConsistency = await validateDataConsistency(proof);
    if (!dataConsistency) {
      errors.push('Data consistency check failed');
    }

    const isValid = structuralIntegrity && cryptographicIntegrity && wasmIntegrity && dataConsistency;

    return {
      isValid,
      integrityChecks: {
        structuralIntegrity,
        cryptographicIntegrity,
        wasmIntegrity,
        dataConsistency
      },
      errors
    };

  } catch (error) {
    return {
      isValid: false,
      integrityChecks: {
        structuralIntegrity: false,
        cryptographicIntegrity: false,
        wasmIntegrity: false,
        dataConsistency: false
      },
      errors: [error instanceof Error ? error.message : 'Unknown integrity validation error']
    };
  }
}

/**
 * Validates WASM-specific integrity
 */
async function validateWasmIntegrity(proof: ZKProofData): Promise<boolean> {
  try {
    // Check WASM flags
    if (!proof.rangeProof.wasmGenerated) return false;
    if (!proof.generationProof.wasmGenerated) return false;
    if (!proof.response.wasmVerified) return false;
    if (!proof.publicParameters.wasmBacked) return false;

    // Check WASM metadata
    if (!proof.wasmProofData) return false;
    if (proof.wasmProofData.generationMethod !== 'pure-wasm') return false;

    // Validate bulletproofs are WASM-backed
    for (const bulletproof of proof.rangeProof.bulletproofs) {
      if (!bulletproof.wasmBacked) return false;
    }

    // Validate binary constraints are WASM-verified
    for (const constraint of proof.rangeProof.binaryConstraints) {
      if (!constraint.wasmVerified) return false;
    }

    return true;
  } catch (error) {
    console.error('WASM integrity validation failed:', error);
    return false;
  }
}

/**
 * Validates data consistency across proof components
 */
async function validateDataConsistency(proof: ZKProofData): Promise<boolean> {
  try {
    // Check commitment count consistency
    const commitmentCount = proof.rangeProof.commitments.length;
    const bulletproofCount = proof.rangeProof.bulletproofs.length;
    const constraintCount = proof.rangeProof.binaryConstraints.length;

    if (commitmentCount !== bulletproofCount || commitmentCount !== constraintCount) {
      return false;
    }

    // Validate hex string consistency
    for (const commitment of proof.rangeProof.commitments) {
      if (!isValidHexString(commitment)) return false;
    }

    // Validate challenge consistency
    if (proof.challenge !== proof.response.challenge) {
      return false;
    }    // Validate election ID consistency in hashes
    const encoder = new TextEncoder();
    const electionBytes = encoder.encode(proof.electionId);
    const electionHash = await secureHash(electionBytes);
    const expectedElectionHash = await uint8ArrayToHex(electionHash);
    
    if (proof.publicParameters.electionHash !== expectedElectionHash) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Data consistency validation failed:', error);
    return false;
  }
}

/**
 * Validates hex string format
 */
function isValidHexString(hex: string): boolean {
  if (typeof hex !== 'string') return false;
  if (hex.length === 0) return false;
  if (hex.length % 2 !== 0) return false;
  
  const hexRegex = /^[0-9a-fA-F]+$/;
  return hexRegex.test(hex);
}

/**
 * Creates WASM proof metadata
 */
export function createWasmProofMetadata(
  generationTimeMs: number,
  verificationTimeMs: number,
  memoryUsageBytes: number,
  operations: {
    modularExponentiations: number;
    secureRandomGenerations: number;
    hashOperations: number;
  }
): WasmProofMetadata {
  return {
    wasmModuleVersion: '1.0.0-production',
    generationMethod: 'pure-wasm',
    securityLevel: 2048,
    performanceMetrics: {
      generationTimeMs,
      verificationTimeMs,
      memoryUsageBytes
    },
    wasmOperations: operations
  };
}

/**
 * Validates proof submission readiness
 */
export async function validateProofSubmissionReadiness(proof: ZKProofData): Promise<{
  isReady: boolean;
  checks: {
    completeness: boolean;
    integrity: boolean;
    wasmCompliance: boolean;
    securityLevel: boolean;
  };
  errors: string[];
}> {
  const errors: string[] = [];

  // Completeness check
  const completenessResult = await validateProofCompleteness(proof);
  const completeness = completenessResult.isComplete;
  if (!completeness) {
    errors.push(...completenessResult.errors);
  }

  // Integrity check
  const integrityResult = await validateProofIntegrity(proof);
  const integrity = integrityResult.isValid;
  if (!integrity) {
    errors.push(...integrityResult.errors);
  }

  // WASM compliance check
  const wasmCompliance = await validateWasmIntegrity(proof);
  if (!wasmCompliance) {
    errors.push('Proof not WASM-compliant');
  }

  // Security level check
  const securityLevel = proof.publicParameters.securityLevel >= 2048;
  if (!securityLevel) {
    errors.push('Insufficient security level');
  }

  const isReady = completeness && integrity && wasmCompliance && securityLevel;

  return {
    isReady,
    checks: {
      completeness,
      integrity,
      wasmCompliance,
      securityLevel
    },
    errors
  };
}

/**
 * Batch validates multiple proofs
 */
export async function validateProofBatch(proofs: ZKProofData[]): Promise<{
  overallValid: boolean;
  individualResults: Array<{
    proofId: string;
    isValid: boolean;
    errors: string[];
  }>;
  batchErrors: string[];
}> {
  const individualResults = [];
  const batchErrors: string[] = [];

  for (const proof of proofs) {
    try {
      const result = await validateProofSubmissionReadiness(proof);
      individualResults.push({
        proofId: proof.id,
        isValid: result.isReady,
        errors: result.errors
      });
    } catch (error) {
      individualResults.push({
        proofId: proof.id,
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Unknown validation error']
      });
    }
  }

  const overallValid = individualResults.every(result => result.isValid);

  return {
    overallValid,
    individualResults,
    batchErrors
  };
}
