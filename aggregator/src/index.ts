import * as dotenv from "dotenv";
import {
  fetchElectionParams,
  fetchCiphertextsAndAux,
  submitAggregatedResult,
} from "./api";
import bindings from "bindings";

// Load the native addon directly
const addon = bindings("aggregator");

// Define the BigInt structure to match the C structure
interface BigIntType {
  data: Buffer;
  length: number;
}

// Define the AggregatorParams structure to match the C structure
interface AggregatorParamsType {
  N: BigIntType;
  N_squared: BigIntType;
  H: BigIntType;
  sk_A: BigIntType;
  sk_A_mod_N: BigIntType;
  sk_A_inv: BigIntType;
  running_product: BigIntType;
  initialized: boolean;
}

/**
 * Initialize the aggregator with the necessary parameters
 * @param nHex N parameter in hex
 * @param hHex H parameter in hex
 * @param skAHex Secret key in hex
 * @returns Initialized AggregatorParams
 */
function initializeAggregator(nHex: string, hHex: string, skAHex: string): any {
  const N = addon.createBigIntFromHex(nHex);
  const H = addon.createBigIntFromHex(hHex);
  const skA = addon.createBigIntFromHex(skAHex);

  // Initialize the aggregator directly using the addon
  const result = addon.aggregatorInit(N, H, skA);

  if (result !== 0) {
    throw new Error(`Failed to initialize aggregator: ${result}`);
  }

  return {}; // Return an empty object as params are now managed by the native addon
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
  const resetResult = addon.resetRunningProduct();
  if (resetResult !== 0) {
    throw new Error(`Failed to reset running product: ${resetResult}`);
  }

  // Process each ciphertext
  for (const ciphertextHex of ciphertexts) {
    const ciphertext = addon.createBigIntFromHex(ciphertextHex);
    const result = addon.addCiphertextToProduct(ciphertext);

    if (result !== 0) {
      throw new Error(`Failed to add ciphertext to product: ${result}`);
    }
  }

  // Create auxiliary value BigInt
  const aux = addon.createBigIntFromHex(auxiliaryValue);

  // Aggregate votes directly using the addon
  const aggregated = addon.aggregateVotesFromRunningProduct(aux);

  if (typeof aggregated === "number") {
    throw new Error(`Failed to aggregate votes: ${aggregated}`);
  }

  // Return the BigInt object directly
  return aggregated;
}

/**
 * Unpack votes from a BigInt result
 * @param bigInt BigInt structure containing packed votes
 * @param maxVotes Maximum number of votes to unpack
 * @returns Array of unpacked vote counts
 */
export function unpackVotes(bigInt: any, maxVotes: number = 20): number[] {
  // Call the addon function directly to unpack votes
  const unpackedVotes = addon.unpackVotes(bigInt, maxVotes);

  if (typeof unpackedVotes === "number" && unpackedVotes <= 0) {
    throw new Error(`Failed to unpack votes: ${unpackedVotes}`);
  }

  // The addon returns an array directly, so we can just return it
  return Array.from(unpackedVotes);
}

/**
 * Main function to run the aggregator
 */
async function main() {
  try {
    // Load environment variables
    dotenv.config();

    // Fetch election parameters from the backend
    const { N: nHex, H: hHex, Ska: skAHex } = await fetchElectionParams();
    console.log("Fetched election parameters from backend");

    // Initialize the aggregator
    const params = initializeAggregator(nHex, hHex, skAHex);

    // Fetch ciphertexts and auxiliary value in a single request
    const { ciphertexts: ciphertextData, aux: auxiliaryValue } = await fetchCiphertextsAndAux();
    
    // Extract just the ciphertext values from the data
    const ciphertexts = ciphertextData.map(data => data.ci);

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
    const sumString = addon.bigIntToString(sum);
    await submitAggregatedResult(sumString);
    console.log("Aggregated result submitted successfully");

    // Clean up
    addon.aggregatorCleanup();

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
