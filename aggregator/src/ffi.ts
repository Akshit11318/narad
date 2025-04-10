import * as path from "path";
import * as dotenv from "dotenv";
import * as bindings from "bindings";

// Load environment variables
dotenv.config();

// Load the native addon
const aggregatorAddon = bindings("aggregator").AggregatorAddon;
const addon = new aggregatorAddon();

// Define the BigInt structure to match the C structure
export interface BigIntType {
  data: Buffer;
  length: number;
}

// Define the AggregatorParams structure to match the C structure
export interface AggregatorParamsType {
  N: BigIntType;
  N_squared: BigIntType;
  H: BigIntType;
  sk_A: BigIntType;
  sk_A_mod_N: BigIntType;
  sk_A_inv: BigIntType;
  running_product: BigIntType;
  initialized: boolean;
}

// Export the aggregator library interface
export const aggregatorLib = {
  // Function signatures from aggregator.h
  aggregator_init: (params: any, N: any, H: any, skA: any): number => {
    return addon.aggregatorInit(N, H, skA);
  },

  add_ciphertext_to_product: (ciphertext: any, params: any): number => {
    return addon.addCiphertextToProduct(ciphertext);
  },

  reset_running_product: (params: any): number => {
    return addon.resetRunningProduct();
  },

  get_running_product: (params: any, result: any): number => {
    const runningProduct = addon.getRunningProduct();
    if (typeof runningProduct === "number") {
      return runningProduct; // Error code
    }

    // Copy properties from runningProduct to result
    Object.assign(result, runningProduct);
    return 0;
  },

  raise_to_sk_A: (product: any, params: any, result: any): number => {
    const raised = addon.raiseToSkA(product);
    if (typeof raised === "number") {
      return raised; // Error code
    }

    // Copy properties from raised to result
    Object.assign(result, raised);
    return 0;
  },

  divide_out_mask: (P: any, aux: any, params: any, result: any): number => {
    const divided = addon.divideOutMask(P, aux);
    if (typeof divided === "number") {
      return divided; // Error code
    }

    // Copy properties from divided to result
    Object.assign(result, divided);
    return 0;
  },

  recover_sum: (P_prime: any, params: any, result: any): number => {
    const sum = addon.recoverSum(P_prime);
    if (typeof sum === "number") {
      return sum; // Error code
    }

    // Copy properties from sum to result
    Object.assign(result, sum);
    return 0;
  },

  aggregate_votes_from_running_product: (
    aux: any,
    params: any,
    sum: any
  ): number => {
    const aggregated = addon.aggregateVotesFromRunningProduct(aux);
    if (typeof aggregated === "number") {
      return aggregated; // Error code
    }

    // Copy properties from aggregated to sum
    Object.assign(sum, aggregated);
    return 0;
  },

  unpack_votes: (
    packed_votes: any,
    votes_ptr: any,
    max_votes: number
  ): number => {
    const unpackedVotes = addon.unpackVotes(packed_votes, max_votes);
    if (typeof unpackedVotes === "number") {
      return unpackedVotes; // Error code
    }

    // Copy the unpacked votes to the buffer
    const buffer = Buffer.from(votes_ptr.buffer);
    for (let i = 0; i < unpackedVotes.length; i++) {
      buffer.writeUInt32LE(unpackedVotes[i], i * 4);
    }

    return unpackedVotes.length;
  },

  aggregator_cleanup: (params: any): number => {
    return addon.aggregatorCleanup();
  },

  // BigInt utility functions
  create_bigint: (data_ptr: any, length: number): BigIntType => {
    // Extract the buffer from the pointer
    const buffer = Buffer.from(data_ptr.buffer);
    const hexString = buffer.toString("hex");

    return addon.createBigIntFromHex("0x" + hexString);
  },

  free_bigint: (bigint_ptr: any): void => {
    addon.freeBigInt(bigint_ptr);
  },
};

/**
 * Convert a hex string to a Uint8Array
 * @param hex Hex string to convert
 * @returns Uint8Array representation
 */
export function hexToUint8Array(hex: string): Uint8Array {
  if (hex.startsWith("0x")) {
    hex = hex.substring(2);
  }

  // Ensure even length
  if (hex.length % 2 !== 0) {
    hex = "0" + hex;
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }

  return bytes;
}

/**
 * Create a BigInt structure from a hex string
 * @param hexString Hex string representation of the big integer
 * @returns BigInt structure
 */
export function createBigIntFromHex(hexString: string): any {
  return addon.createBigIntFromHex(hexString);
}

/**
 * Convert a BigInt structure to a number
 * @param bigInt BigInt structure
 * @returns JavaScript number
 */
export function bigIntToNumber(bigInt: any): number {
  // This is a simplification. In a real implementation, you would need to
  // properly convert the BigInt to a JavaScript number or BigInt
  const sumData = bigInt.data;
  let sumValue = 0;

  // Simple conversion for small numbers
  for (let i = 0; i < Math.min(sumData.length, 4); i++) {
    sumValue += sumData[i] << (8 * i);
  }

  return sumValue;
}

/**
 * Convert a BigInt structure to a string representation
 * @param bigInt BigInt structure
 * @returns String representation of the BigInt
 */
export function bigIntToString(bigInt: any): string {
  return addon.bigIntToString(bigInt);
}
