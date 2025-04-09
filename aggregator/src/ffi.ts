import * as ffi from "ffi-napi";
import * as ref from "ref-napi";
import * as StructType from "ref-struct-napi";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Define the BigInt structure to match the C structure
export const BigIntType = StructType({
  data: ref.refType("uint8"),
  length: "size_t",
});

export const BigIntPtr = ref.refType(BigIntType);
export const BigIntPtrPtr = ref.refType(BigIntPtr);

// Define the AggregatorParams structure to match the C structure
export const AggregatorParamsType = StructType({
  N: BigIntType,
  N_squared: BigIntType,
  H: BigIntType,
  sk_A: BigIntType,
  sk_A_mod_N: BigIntType,
  sk_A_inv: BigIntType,
  running_product: BigIntType,
});

export const AggregatorParamsPtr = ref.refType(AggregatorParamsType);

// Load the aggregator library
const libPath =
  process.env.LIB_PATH || path.join(__dirname, "..", "libaggregator.so");

export const aggregatorLib = ffi.Library(libPath, {
  // Function signatures from aggregator.h
  aggregator_init: [
    "int",
    [AggregatorParamsPtr, BigIntPtr, BigIntPtr, BigIntPtr],
  ],
  add_ciphertext_to_product: ["int", [BigIntPtr, AggregatorParamsPtr]],
  reset_running_product: ["int", [AggregatorParamsPtr]],
  get_running_product: ["int", [AggregatorParamsPtr, BigIntPtr]],
  raise_to_sk_A: ["int", [BigIntPtr, AggregatorParamsPtr, BigIntPtr]],
  divide_out_mask: [
    "int",
    [BigIntPtr, BigIntPtr, AggregatorParamsPtr, BigIntPtr],
  ],
  recover_sum: ["int", [BigIntPtr, AggregatorParamsPtr, BigIntPtr]],
  aggregate_votes_from_running_product: [
    "int",
    [BigIntPtr, AggregatorParamsPtr, BigIntPtr],
  ],
  unpack_votes: ["int", [BigIntPtr, "pointer", "size_t"]],
  aggregator_cleanup: ["int", [AggregatorParamsPtr]],

  // BigInt utility functions from bigint.h
  create_bigint: [BigIntType, ["pointer", "size_t"]],
  free_bigint: ["void", [BigIntPtr]],
});

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
  const bytes = hexToUint8Array(hexString);
  const dataBuffer = Buffer.from(bytes);
  const dataPtr = ref.alloc("pointer");
  dataPtr.writePointer(dataBuffer);

  return aggregatorLib.create_bigint(dataPtr, bytes.length);
}

/**
 * Convert a BigInt structure to a number
 * @param bigInt BigInt structure
 * @returns JavaScript number
 */
export function bigIntToNumber(bigInt: any): number {
  // This is a simplification. In a real implementation, you would need to
  // properly convert the BigInt to a JavaScript number or BigInt
  const sumData = bigInt.data.readPointer(0, bigInt.length);
  const sumBuffer = Buffer.from(sumData);
  let sumValue = 0;

  // Simple conversion for small numbers
  for (let i = 0; i < Math.min(sumBuffer.length, 4); i++) {
    sumValue += sumBuffer[i] << (8 * i);
  }

  return sumValue;
}

/**
 * Convert a BigInt structure to a string representation
 * @param bigInt BigInt structure
 * @returns String representation of the BigInt
 */
export function bigIntToString(bigInt: any): string {
  const sumData = bigInt.data.readPointer(0, bigInt.length);
  const sumBuffer = Buffer.from(sumData);

  // Convert to hex string
  let hexString = "0x";
  for (let i = sumBuffer.length - 1; i >= 0; i--) {
    hexString += sumBuffer[i].toString(16).padStart(2, "0");
  }

  return hexString;
}
