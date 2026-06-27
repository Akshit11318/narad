import * as dotenv from "dotenv";
import {
  fetchElectionParams,
  fetchCiphertextsAndAux,
  submitAggregatedResult,
} from "./api";
import bindings from "bindings";
import path from "path";

// Define interface for the native addon functions
interface AggregatorAddon {
  createBigIntFromHex(hexString: string): BigIntType;
  aggregatorInit(n: BigIntType, h: BigIntType, skA: BigIntType): number;
  resetRunningProduct(): number;
  addCiphertextToProduct(ciphertext: BigIntType): number;
  aggregateVotesFromRunningProduct(aux: BigIntType): BigIntType | number;
  unpackVotes(bigInt: BigIntType, maxVotes: number): number[] | number;
  bigIntToString(bigInt: BigIntType): string;
  aggregatorCleanup(): number;
}

// Load the native addon directly with proper typing
let addonPath = path.resolve(
  __dirname,
  "..",
  "build",
  "build",
  "Release",
  "aggregator.node"
);
let addon: AggregatorAddon;
try {
  addon = require(addonPath) as AggregatorAddon;
  console.log("Successfully loaded the aggregator native addon");
} catch (error) {
  console.error("Failed to load aggregator native addon:", error);
  process.exit(1);
}

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
  try {
    console.log(
      "Creating BigInt from N hex:",
      nHex ? nHex.substring(0, 10) + "..." : "undefined"
    );
    if (!nHex) {
      throw new Error("N parameter is undefined or empty");
    }
    const N = addon.createBigIntFromHex(nHex);
    console.log("Successfully created N BigInt");

    console.log(
      "Creating BigInt from H hex:",
      hHex ? hHex.substring(0, 10) + "..." : "undefined"
    );
    if (!hHex) {
      throw new Error("H parameter is undefined or empty");
    }
    const H = addon.createBigIntFromHex(hHex);
    console.log("Successfully created H BigInt");

    console.log(
      "Creating BigInt from skA hex:",
      skAHex ? skAHex.substring(0, 10) + "..." : "undefined"
    );
    if (!skAHex) {
      throw new Error("Secret key (skA) parameter is undefined or empty");
    }
    const skA = addon.createBigIntFromHex(skAHex);
    console.log("Successfully created skA BigInt");

    console.log("Initializing aggregator with parameters...");
    // Initialize the aggregator directly using the addon
    const result = addon.aggregatorInit(N, H, skA);

    if (result !== 0) {
      throw new Error(`Failed to initialize aggregator: ${result}`);
    }

    console.log("Aggregator initialization successful");
    return {}; // Return an empty object as params are now managed by the native addon
  } catch (error) {
    console.error("Error in initializeAggregator:", error);
    throw error;
  }
}

/**
 * Process ciphertexts and aggregate votes with timeout
 * @param params Initialized AggregatorParams
 * @param ciphertexts Array of ciphertext hex strings
 * @param auxiliaryValue Auxiliary value hex string
 * @returns BigInt structure containing the sum of votes
 */
async function processAndAggregate(
  params: any,
  ciphertexts: string[],
  auxiliaryValue: string,
  timeoutMs: number = 60000 // Default timeout of 60 seconds
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      // Reset the running product
      console.log("Resetting running product...");
      const resetResult = addon.resetRunningProduct();
      if (resetResult !== 0) {
        clearTimeout(timeoutId);
        throw new Error(`Failed to reset running product: ${resetResult}`);
      }

      // Process each ciphertext
      console.log(`Processing ${ciphertexts.length} ciphertexts...`);
      let processed = 0;
      for (const ciphertextHex of ciphertexts) {
        try {
          const ciphertext = addon.createBigIntFromHex(ciphertextHex);
          const result = addon.addCiphertextToProduct(ciphertext);

          if (result !== 0) {
            clearTimeout(timeoutId);
            throw new Error(`Failed to add ciphertext to product: ${result}`);
          }

          processed++;
          if (processed % 100 === 0 || processed === ciphertexts.length) {
            console.log(
              `Processed ${processed}/${ciphertexts.length} ciphertexts`
            );
          }
        } catch (error) {
          clearTimeout(timeoutId);
          console.error(
            `Error processing ciphertext at index ${processed}:`,
            error
          );
          throw error;
        }
      }

      // Create auxiliary value BigInt
      console.log("Creating auxiliary value BigInt...");
      const aux = addon.createBigIntFromHex(auxiliaryValue);

      // Aggregate votes directly using the addon
      console.log("Aggregating votes from running product...");
      console.time("aggregation");
      const aggregated = addon.aggregateVotesFromRunningProduct(aux);
      console.timeEnd("aggregation");

      if (typeof aggregated === "number") {
        clearTimeout(timeoutId);
        throw new Error(`Failed to aggregate votes: ${aggregated}`);
      }

      console.log("Vote aggregation successful");
      clearTimeout(timeoutId);
      resolve(aggregated);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Error in processAndAggregate:", error);
      reject(error);
    }
  });
}

/**
 * Unpack votes from a BigInt result
 * @param bigInt BigInt structure containing packed votes
 * @param maxVotes Maximum number of votes to unpack
 * @returns Array of unpacked vote counts
 */
export function unpackVotes(bigInt: any, maxVotes: number = 20): number[] {
  try {
    console.log("Unpacking votes...");
    // Call the addon function directly to unpack votes
    const unpackedVotes = addon.unpackVotes(bigInt, maxVotes);

    if (typeof unpackedVotes === "number") {
      if (unpackedVotes <= 0) {
        throw new Error(`Failed to unpack votes: ${unpackedVotes}`);
      }
      // This should never happen based on your C++ code, but handle it just in case
      return [unpackedVotes];
    }

    // The addon returns an array directly
    return unpackedVotes;
  } catch (error) {
    console.error("Error in unpackVotes:", error);
    throw error;
  }
}

/**
 * Main function to run the aggregator
 */
async function main() {
  try {
    // Load environment variables
    dotenv.config();

    // Fetch election parameters from the backend
    console.log("Fetching election parameters from backend...");
    const { N: nHex, H: hHex, skA: skAHex } = await fetchElectionParams();
    console.log("Fetched election parameters from backend");

    // Validate election parameters
    if (!nHex || !hHex || !skAHex) {
      console.error("Missing election parameters:", {
        N: nHex ? "present" : "missing",
        H: hHex ? "present" : "missing",
        skA: skAHex ? "present" : "missing",
      });
      throw new Error("Election parameters incomplete");
    }

    // Initialize the aggregator
    console.log("Initializing aggregator...");
    const params = initializeAggregator(nHex, hHex, skAHex);
    console.log("Aggregator initialized successfully");

    // Fetch ciphertexts and auxiliary value in a single request
    console.log("Fetching ciphertexts and auxiliary value...");
    const { ciphertexts: ciphertextData, aux: auxiliaryValue } =
      await fetchCiphertextsAndAux();

    // Extract just the ciphertext values from the data
    const ciphertexts = ciphertextData.map((data) => data.ci);

    console.log(`Fetched ${ciphertexts.length} ciphertexts`);

    // Process and aggregate with a timeout
    console.log("Starting processing and aggregation...");
    const sum = await processAndAggregate(
      params,
      ciphertexts,
      auxiliaryValue,
      120000
    ); // 2-minute timeout

    console.log(
      `Aggregated vote sum: BigInt (not displayed as it's too large)`
    );

    // Unpack the votes from the sum
    const unpackedVotes = unpackVotes(sum, 4);
    console.log(`Unpacked votes: [${unpackedVotes.join(", ")}]`);

    // For API submission, we need to convert the BigInt to a string representation
    // console.log("Converting sum to string for API submission...");
    // const sumString = addon.bigIntToString(sum);
    // console.log("Submitting aggregated result...");
    // await submitAggregatedResult(sumString);
    // console.log("Aggregated result submitted successfully");

    // Clean up
    console.log("Cleaning up resources...");
    addon.aggregatorCleanup();
    console.log("Cleanup complete");

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
