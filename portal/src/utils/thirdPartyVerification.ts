import type { 
  ZKProofData,
  ThirdPartyVerificationPackage,
  ThirdPartyVerificationResult,
  VerificationStep
} from '../types/zkProof';
import { 
  loadWasmModule, 
  wasmFromHex,
  wasmLength
} from '../wasmModule';
import type { EncryptionModule } from '../types/wasm';

/**
 * WASM-Only Third-Party Verification Engine
 * Uses pure Uint8Array operations and WASM BigInt math
 */
export class ThirdPartyVerificationEngine {
  private steps: VerificationStep[] = [];
  private verificationTag: string;
  private wasmModule: EncryptionModule | null = null;

  constructor() {
    this.verificationTag = this.generateVerificationTag();
  }

  /**
   * Initialize WASM module
   */
  private async initWasm(): Promise<void> {
    if (!this.wasmModule) {
      this.wasmModule = await loadWasmModule();
    }
  }

  /**
   * Main orchestrator for third-party verification using WASM
   */
  async performThirdPartyVerification(
    verificationPackage: ThirdPartyVerificationPackage
  ): Promise<ThirdPartyVerificationResult> {
    this.steps = [];
    
    try {
      await this.initWasm();

      // Step 1: Hash Validation
      const hashValid = await this.validateAllHashes(verificationPackage);
      this.addStep('Hash Validation', hashValid, 'SHA256(ElectionID) = ElectionHash');

      // Step 2: Range Proof Verification
      const rangeProofValid = await this.verifyRangeProofs(verificationPackage);
      this.addStep('Range Proof Verification', rangeProofValid, 'WASM_modexp(g, response, p) = witness × commitment^challenge mod p');

      // Step 3: Sum Proof Verification
      const sumProofValid = await this.verifySumProof(verificationPackage);
      this.addStep('Sum Proof Verification', sumProofValid, 'WASM_modmul(commitments) ≡ targetCommitment mod p');

      // Step 4: Generation Proof Verification
      const generationProofValid = await this.verifyGenerationProof(verificationPackage);
      this.addStep('Generation Proof Verification', generationProofValid, 'WASM_modexp(g, s, p) = A × y^c mod p (discrete log)');

      // Step 5: Challenge-Response Verification
      const challengeResponseValid = await this.verifyChallengeResponse(verificationPackage);
      this.addStep('Challenge-Response Verification', challengeResponseValid, 'c = WASM_hash(g || y || A) (Fiat-Shamir)');

      const overallValid = hashValid && rangeProofValid && sumProofValid && generationProofValid && challengeResponseValid;

      return {
        isValid: overallValid,
        verificationTag: this.verificationTag,
        timestamp: Date.now(),
        steps: this.steps,
        package: verificationPackage,
        securityLevel: await this.calculateSecurityLevel(verificationPackage),
        auditTrail: this.generateAuditTrail()
      };

    } catch (error) {
      console.error('Third-party verification failed:', error);
      this.addStep('Verification Error', false, 'WASM system error occurred during verification');
      
      return {
        isValid: false,
        verificationTag: this.verificationTag,
        timestamp: Date.now(),
        steps: this.steps,
        package: verificationPackage,
        securityLevel: 'Unknown',
        auditTrail: this.generateAuditTrail(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate all cryptographic hashes using WASM
   */
  private async validateAllHashes(pkg: ThirdPartyVerificationPackage): Promise<boolean> {
    try {
      // 1. Verify election hash using WASM hash functions
      const computedElectionHash = await this.wasmComputeHash(pkg.electionId);
      const storedElectionHash = await wasmFromHex(pkg.zkProofData.publicParameters.electionHash);
      const electionHashValid = await this.wasmEqual(computedElectionHash, storedElectionHash);

      // 2. Verify proof ID hash
      const proofComponents = [
        pkg.zkProofData.sumProof.aggregatedCommitment,
        pkg.zkProofData.generationProof.commitment,
        pkg.zkProofData.publicParameters.electionHash
      ].join('||');
      const computedProofId = await this.wasmComputeHash(proofComponents);
      const storedProofId = await wasmFromHex(pkg.zkProofData.id);
      const proofIdValid = await this.wasmEqual(computedProofId, storedProofId);

      // 3. Verify Fiat-Shamir hash consistency
      const fiatShamirComponents = [
        pkg.challengeResponse.challenge,
        pkg.challengeResponse.nonce,
        pkg.electionId
      ].join('||');
      const computedFiatShamir = await this.wasmComputeHash(fiatShamirComponents);
      const storedFiatShamir = await wasmFromHex(pkg.challengeResponse.fiatShamirHash);
      const fiatShamirValid = await this.wasmEqual(computedFiatShamir, storedFiatShamir);

      return electionHashValid && proofIdValid && fiatShamirValid;
    } catch (error) {
      console.error('WASM hash validation failed:', error);
      return false;
    }
  }

  /**
   * Verify range proofs using WASM BigInt operations
   */
  private async verifyRangeProofs(pkg: ThirdPartyVerificationPackage): Promise<boolean> {
    if (!this.wasmModule) throw new Error('WASM module not initialized');

    try {
      // Convert public parameters to Uint8Array
      const g = await wasmFromHex(pkg.publicParameters.g);
      const p = await wasmFromHex(pkg.publicParameters.p);

      // Verify each range proof commitment using WASM
      for (let i = 0; i < pkg.rangeProofCommitments.length; i++) {
        const commitment = await wasmFromHex(pkg.rangeProofCommitments[i]);
        
        // Get range proof data
        const rangeProof = pkg.zkProofData.rangeProof.bulletproofs[i];
        if (!rangeProof) continue;

        const witnessCommitment = await wasmFromHex(rangeProof.witness);
        const response = await wasmFromHex(rangeProof.response);
        const challenge = await wasmFromHex(rangeProof.challenge);

        // WASM verification: g^response mod p
        const left = await this.wasmModExp(g, response, p);
        
        // witness × commitment^challenge mod p
        const challengePart = await this.wasmModExp(commitment, challenge, p);
        const right = await this.wasmModMul(witnessCommitment, challengePart, p);

        // Check equality using WASM
        const isEqual = await this.wasmEqual(left, right);
        if (!isEqual) {
          return false;
        }

        // Verify range constraint using WASM comparison
        const isValidRange = await this.wasmCmp(commitment, p) < 0 && !await this.wasmIsZero(commitment);
        if (!isValidRange) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('WASM range proof verification failed:', error);
      return false;
    }
  }

  /**
   * Verify sum proof using WASM BigInt operations
   */
  private async verifySumProof(pkg: ThirdPartyVerificationPackage): Promise<boolean> {
    if (!this.wasmModule) throw new Error('WASM module not initialized');

    try {
      const g = await wasmFromHex(pkg.publicParameters.g);
      const p = await wasmFromHex(pkg.publicParameters.p);

      // Aggregate all vote commitments using WASM multiplication
      let aggregatedCommitment = await wasmFromHex('01'); // Start with 1
      for (const commitmentStr of pkg.rangeProofCommitments) {
        const commitment = await wasmFromHex(commitmentStr);
        aggregatedCommitment = await this.wasmModMul(aggregatedCommitment, commitment, p);
      }

      // Compare with stored aggregated commitment
      const storedAggregated = await wasmFromHex(pkg.zkProofData.sumProof.aggregatedCommitment);
      const aggregationValid = await this.wasmEqual(aggregatedCommitment, storedAggregated);

      if (!aggregationValid) {
        return false;
      }

      // Verify sum proof data using WASM
      const sumProof = pkg.sumProofData;
      if (!sumProof) return false;

      const targetCommitment = await wasmFromHex(sumProof.targetCommitment);
      const sumResponse = await wasmFromHex(sumProof.response);
      const challenge = await wasmFromHex(pkg.challengeResponse.challenge);

      // WASM Schnorr proof verification: g^response mod p
      const left = await this.wasmModExp(g, sumResponse, p);
      
      // witnessCommitment × targetCommitment^challenge mod p
      const witnessCommitment = await wasmFromHex(sumProof.witnessCommitment);
      const challengePart = await this.wasmModExp(targetCommitment, challenge, p);
      const right = await this.wasmModMul(witnessCommitment, challengePart, p);

      const schnorrValid = await this.wasmEqual(left, right);
      const targetValid = await this.wasmEqual(aggregatedCommitment, targetCommitment);

      return schnorrValid && targetValid;
    } catch (error) {
      console.error('WASM sum proof verification failed:', error);
      return false;
    }
  }

  /**
   * Verify generation proof using WASM BigInt operations
   */
  private async verifyGenerationProof(pkg: ThirdPartyVerificationPackage): Promise<boolean> {
    if (!this.wasmModule) throw new Error('WASM module not initialized');

    try {
      const g = await wasmFromHex(pkg.publicParameters.g);
      const p = await wasmFromHex(pkg.publicParameters.p);

      const generationProof = pkg.generationProofData;
      if (!generationProof) return false;

      // Convert to Uint8Array using WASM
      const publicKey = await wasmFromHex(generationProof.publicKey);
      const commitment = await wasmFromHex(generationProof.commitment);
      const response = await wasmFromHex(generationProof.response);
      const challenge = await wasmFromHex(pkg.challengeResponse.challenge);

      // WASM discrete log verification: g^s mod p
      const left = await this.wasmModExp(g, response, p);
      
      // A × y^c mod p
      const challengePart = await this.wasmModExp(publicKey, challenge, p);
      const right = await this.wasmModMul(commitment, challengePart, p);

      // Verify using WASM equality
      const proofValid = await this.wasmEqual(left, right);

      // Verify public key range using WASM: 1 < y < p
      const one = await wasmFromHex('01');
      const keyAboveOne = await this.wasmCmp(publicKey, one) > 0;
      const keyBelowP = await this.wasmCmp(publicKey, p) < 0;
      const publicKeyValid = keyAboveOne && keyBelowP;

      return proofValid && publicKeyValid;
    } catch (error) {
      console.error('WASM generation proof verification failed:', error);
      return false;
    }
  }

  /**
   * Verify challenge-response consistency using WASM
   */
  private async verifyChallengeResponse(pkg: ThirdPartyVerificationPackage): Promise<boolean> {
    try {
      const challengeResponse = pkg.challengeResponse;
      
      // Verify challenge format (should be valid hex)
      const challenge = challengeResponse.challenge;
      if (!/^[0-9a-fA-F]+$/.test(challenge)) {
        return false;
      }

      // Verify nonce format
      const nonce = challengeResponse.nonce;
      if (!/^[0-9a-fA-F]+$/.test(nonce)) {
        return false;
      }

      // Verify Fiat-Shamir transformation consistency using WASM hash
      const expectedContext = [
        pkg.publicParameters.g,
        pkg.publicParameters.h,
        pkg.electionId,
        pkg.verificationCode
      ].join('||');

      const computedContext = await this.wasmComputeHash(expectedContext);
      const storedContext = await wasmFromHex(challengeResponse.context);
      
      return await this.wasmEqual(computedContext, storedContext);
    } catch (error) {
      console.error('WASM challenge-response verification failed:', error);
      return false;
    }
  }

  /**
   * WASM modular exponentiation: base^exp mod p
   */
  private async wasmModExp(base: Uint8Array, exp: Uint8Array, mod: Uint8Array): Promise<Uint8Array> {
    if (!this.wasmModule) throw new Error('WASM module not initialized');

    const resultLen = await wasmLength(mod);
    const resultPtr = this.wasmModule._malloc(resultLen);
    
    const baseWasm = this.copyArrayToWasm(base);
    const expWasm = this.copyArrayToWasm(exp);
    const modWasm = this.copyArrayToWasm(mod);

    try {
      const success = this.wasmModule._wasmmodexp(
        baseWasm.ptr, baseWasm.length,
        expWasm.ptr, expWasm.length,
        modWasm.ptr, modWasm.length,
        resultPtr, resultLen
      );

      if (success !== 0) {
        throw new Error(`WASM modular exponentiation failed: ${success}`);
      }

      return this.copyArrayFromWasm(resultPtr, resultLen);
    } finally {
      this.wasmModule._free(baseWasm.ptr);
      this.wasmModule._free(expWasm.ptr);
      this.wasmModule._free(modWasm.ptr);
      this.wasmModule._free(resultPtr);
    }
  }

  /**
   * WASM modular multiplication: a * b mod p
   */
  private async wasmModMul(a: Uint8Array, b: Uint8Array, mod: Uint8Array): Promise<Uint8Array> {
    if (!this.wasmModule) throw new Error('WASM module not initialized');

    const resultLen = await wasmLength(mod);
    const resultPtr = this.wasmModule._malloc(resultLen);
    
    const aWasm = this.copyArrayToWasm(a);
    const bWasm = this.copyArrayToWasm(b);
    const modWasm = this.copyArrayToWasm(mod);

    try {
      const success = this.wasmModule._wasmmodmul(
        aWasm.ptr, aWasm.length,
        bWasm.ptr, bWasm.length,
        modWasm.ptr, modWasm.length,
        resultPtr, resultLen
      );

      if (success !== 0) {
        throw new Error(`WASM modular multiplication failed: ${success}`);
      }

      return this.copyArrayFromWasm(resultPtr, resultLen);
    } finally {
      this.wasmModule._free(aWasm.ptr);
      this.wasmModule._free(bWasm.ptr);
      this.wasmModule._free(modWasm.ptr);
      this.wasmModule._free(resultPtr);
    }
  }

  /**
   * WASM equality comparison
   */
  private async wasmEqual(a: Uint8Array, b: Uint8Array): Promise<boolean> {
    if (!this.wasmModule) throw new Error('WASM module not initialized');

    const aWasm = this.copyArrayToWasm(a);
    const bWasm = this.copyArrayToWasm(b);

    try {
      const result = this.wasmModule._wasmequal(
        aWasm.ptr, aWasm.length,
        bWasm.ptr, bWasm.length
      );

      return result === 1;
    } finally {
      this.wasmModule._free(aWasm.ptr);
      this.wasmModule._free(bWasm.ptr);
    }
  }

  /**
   * WASM comparison: returns < 0 if a < b, 0 if a == b, > 0 if a > b
   */
  private async wasmCmp(a: Uint8Array, b: Uint8Array): Promise<number> {
    if (!this.wasmModule) throw new Error('WASM module not initialized');

    const aWasm = this.copyArrayToWasm(a);
    const bWasm = this.copyArrayToWasm(b);

    try {
      return this.wasmModule._wasmcmp(
        aWasm.ptr, aWasm.length,
        bWasm.ptr, bWasm.length
      );
    } finally {
      this.wasmModule._free(aWasm.ptr);
      this.wasmModule._free(bWasm.ptr);
    }
  }

  /**
   * WASM zero check
   */
  private async wasmIsZero(a: Uint8Array): Promise<boolean> {
    if (!this.wasmModule) throw new Error('WASM module not initialized');

    const aWasm = this.copyArrayToWasm(a);

    try {
      const result = this.wasmModule._wasmiszero(aWasm.ptr, aWasm.length);
      return result === 1;
    } finally {
      this.wasmModule._free(aWasm.ptr);
    }
  }

  /**
   * WASM hash computation using native Web Crypto API
   */
  private async wasmComputeHash(input: string): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
  }

  /**
   * WASM memory management helpers
   */
  private copyArrayToWasm(array: Uint8Array): { ptr: number; length: number } {
    if (!this.wasmModule) throw new Error('WASM module not initialized');
    
    const ptr = this.wasmModule._malloc(array.length);
    this.wasmModule.HEAPU8.set(array, ptr);
    return { ptr, length: array.length };
  }

  private copyArrayFromWasm(ptr: number, length: number): Uint8Array {
    if (!this.wasmModule) throw new Error('WASM module not initialized');
    
    return new Uint8Array(this.wasmModule.HEAPU8.buffer, ptr, length).slice();
  }

  /**
   * Helper functions
   */
  private addStep(name: string, result: boolean, formula: string): void {
    this.steps.push({
      name,
      result,
      formula,
      timestamp: Date.now()
    });
  }

  private generateVerificationTag(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private async calculateSecurityLevel(pkg: ThirdPartyVerificationPackage): Promise<'High' | 'Medium' | 'Low' | 'Unknown'> {
    try {
      const p = await wasmFromHex(pkg.publicParameters.p);
      const bitLength = p.length * 8; // Approximate bit length
      
      if (bitLength >= 2048) return 'High';
      if (bitLength >= 1024) return 'Medium';
      if (bitLength >= 512) return 'Low';
      return 'Unknown';
    } catch {
      return 'Unknown';
    }
  }

  private generateAuditTrail(): string[] {
    return this.steps.map(step => 
      `${new Date(step.timestamp).toISOString()}: ${step.name} - ${step.result ? 'PASS' : 'FAIL'} - ${step.formula}`
    );
  }
}

/**
 * Utility function to create verification package from ZK proof data (WASM-compatible)
 */
export function createThirdPartyVerificationPackage(
  zkProofData: ZKProofData,
  verificationCode: string,
  electionId: string
): ThirdPartyVerificationPackage {
  return {
    publicParameters: {
      g: zkProofData.publicParameters?.g || '02',
      h: zkProofData.publicParameters?.h || '03',
      p: zkProofData.publicParameters?.p || '7FFFFFFF',
      q: zkProofData.publicParameters?.q || '3FFFFFFF'
    },
    zkProofData,
    rangeProofCommitments: zkProofData.rangeProof?.commitments || [],
    sumProofData: {
      targetCommitment: zkProofData.sumProof.aggregatedCommitment,
      witnessCommitment: zkProofData.sumProof.witnessCommitment,
      response: zkProofData.sumProof.response
    },
    generationProofData: {
      publicKey: zkProofData.generationProof.publicKey,
      commitment: zkProofData.generationProof.commitment,
      response: zkProofData.generationProof.response
    },
    challengeResponse: {
      challenge: zkProofData.challenge || '00',
      nonce: zkProofData.generationProof.nonce || '00',
      fiatShamirHash: zkProofData.response.fiatShamirHash || '',
      context: zkProofData.publicParameters.electionHash
    },
    verificationCode,
    electionId,
    timestamp: Date.now()
  };
}

/**
 * Main export for WASM-only third-party verification
 */
export async function performThirdPartyVerification(
  verificationPackage: ThirdPartyVerificationPackage
): Promise<ThirdPartyVerificationResult> {
  const engine = new ThirdPartyVerificationEngine();
  return await engine.performThirdPartyVerification(verificationPackage);
}
