import * as dotenv from "dotenv";
import {
  fetchCiphertexts,
  fetchAuxiliaryValue,
  submitAggregatedResult,
} from "./api";
import {
  aggregatorLib,
  AggregatorParamsType,
  BigIntType,
  createBigIntFromHex,
  bigIntToNumber,
  bigIntToString,
} from "./ffi";

/**
 * Initialize the aggregator with the necessary parameters
 * @param nHex N parameter in hex
 * @param hHex H parameter in hex
 * @param skAHex Secret key in hex
 * @returns Initialized AggregatorParams
 */
function initializeAggregator(nHex: string, hHex: string, skAHex: string): any {
  const N = createBigIntFromHex(nHex);
  const H = createBigIntFromHex(hHex);
  const skA = createBigIntFromHex(skAHex);

  const params = new AggregatorParamsType();
  const result = aggregatorLib.aggregator_init(
    params.ref(),
    N.ref(),
    H.ref(),
    skA.ref()
  );

  if (result !== 0) {
    throw new Error(`Failed to initialize aggregator: ${result}`);
  }

  return params;
}

/**
 * Process ciphertexts and aggregate votes
 * @param params Initialized AggregatorParams
 * @param ciphertexts Array of ciphertext hex strings
 * @param auxiliaryValue Auxiliary value hex string
 * @returns BigInt structure containing the sum of votes
 */
async function processAndAggregate(
  params: any,
  ciphertexts: string[],
  auxiliaryValue: string
): Promise<any> {
  // Reset the running product
  aggregatorLib.reset_running_product(params.ref());

  // Process each ciphertext
  for (const ciphertextHex of ciphertexts) {
    const ciphertext = createBigIntFromHex(ciphertextHex);
    const result = aggregatorLib.add_ciphertext_to_product(
      ciphertext.ref(),
      params.ref()
    );

    if (result !== 0) {
      throw new Error(`Failed to add ciphertext to product: ${result}`);
    }
  }

  // Create auxiliary value BigInt
  const aux = createBigIntFromHex(auxiliaryValue);

  // Allocate result BigInt
  const sum = new BigIntType();

  // Aggregate votes
  const result = aggregatorLib.aggregate_votes_from_running_product(
    aux.ref(),
    params.ref(),
    sum.ref()
  );

  if (result !== 0) {
    throw new Error(`Failed to aggregate votes: ${result}`);
  }

  // Return the BigInt object directly instead of converting to number
  return sum;
}

/**
 * Unpack votes from a BigInt result
 * @param bigInt BigInt structure containing packed votes
 * @param maxVotes Maximum number of votes to unpack
 * @returns Array of unpacked vote counts
 */
export function unpackVotes(bigInt: any, maxVotes: number = 20): number[] {
  // Allocate memory for the result array
  const voteBuffer = Buffer.alloc(maxVotes * 4); // uint32_t is 4 bytes
  const votePtr = ref.address(voteBuffer);

  // Call the C function to unpack votes
  const votesUnpacked = aggregatorLib.unpack_votes(
    bigInt.ref(),
    votePtr,
    maxVotes
  );

  if (votesUnpacked <= 0) {
    throw new Error(`Failed to unpack votes: ${votesUnpacked}`);
  }

  // Convert the buffer to an array of numbers
  const result: number[] = [];
  for (let i = 0; i < votesUnpacked; i++) {
    result.push(voteBuffer.readUInt32LE(i * 4));
  }

  return result;
}

/**
 * Main function to run the aggregator
 */
async function main() {
  try {
    // Load environment variables
    dotenv.config();

    // These would typically be loaded from a secure configuration
    const nHex = process.env.N_HEX || "0x1234567890abcdef"; // Example value
    const hHex = process.env.H_HEX || "0xabcdef1234567890"; // Example value
    const skAHex = process.env.SK_A_HEX || "0x0123456789abcdef"; // Example value

    // Initialize the aggregator
    const params = initializeAggregator(nHex, hHex, skAHex);

    // Fetch ciphertexts and auxiliary value
    const ciphertexts = await fetchCiphertexts();
    const auxiliaryValue = await fetchAuxiliaryValue();

    console.log(`Fetched ${ciphertexts.length} ciphertexts`);

    // Process and aggregate
    const sum = await processAndAggregate(params, ciphertexts, auxiliaryValue);

    console.log(
      `Aggregated vote sum: BigInt (not displayed as it's too large)`
    );

    // Unpack the votes from the sum
    const unpackedVotes = unpackVotes(sum);
    console.log(`Unpacked votes: [${unpackedVotes.join(", ")}]`);

    // For API submission, we need to convert the BigInt to a string representation
    // or modify the API to accept BigInt objects directly
    // For now, we'll use a string representation of the BigInt
    const sumString = bigIntToString(sum);
    await submitAggregatedResult(sumString);
    console.log("Aggregated result submitted successfully");

    // Clean up
    aggregatorLib.aggregator_cleanup(params.ref());

    return sum;
  } catch (error) {
    console.error("Error in aggregator:", error);
    throw error;
  }
}

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

// Export functions for use in other modules
export { main, initializeAggregator, processAndAggregate };
