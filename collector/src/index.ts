import * as dotenv from "dotenv";
import {
  fetchNAndH,
  fetchAuxiliaryValues,
  submitAuxiliaryProduct,
} from "./api";
import bindings from "bindings";

// Load the native addon directly
const addon = bindings("collector");

// Define the BigInt structure to match the C structure
interface BigIntType {
  data: Buffer;
  length: number;
}

// Define the ElectionParams structure to match the C structure
interface ElectionParamsType {
  N: BigIntType;
  N_squared: BigIntType;
  H: BigIntType;
  initialized: boolean;
}

/**
 * Initialize the collector with the necessary parameters
 * @param nHex N parameter in hex
 * @param hHex H parameter in hex
 * @returns Status code (0 for success)
 */
function initializeCollector(nHex: string, hHex: string): number {
  const N = addon.createBigIntFromHex(nHex);
  const H = addon.createBigIntFromHex(hHex);

  // Initialize the collector directly using the addon
  const result = addon.collectorInit(N, H);

  if (result !== 0) {
    throw new Error(`Failed to initialize collector: ${result}`);
  }

  return result;
}

/**
 * Process auxiliary values and calculate their product
 * @param auxiliaryValues Array of auxiliary value hex strings
 * @returns BigInt structure containing the product of auxiliary values
 */
async function processAuxiliaryValues(
  auxiliaryValues: string[]
): Promise<BigIntType> {
  // Reset the auxiliary product
  const resetResult = addon.resetAuxiliaryProduct();
  if (resetResult !== 0) {
    throw new Error(`Failed to reset auxiliary product: ${resetResult}`);
  }

  // Process each auxiliary value
  for (const auxHex of auxiliaryValues) {
    const aux = addon.createBigIntFromHex(auxHex);
    const result = addon.processAuxiliaryValue(aux);

    if (result !== 0) {
      throw new Error(`Failed to process auxiliary value: ${result}`);
    }
  }

  // Get the current auxiliary product
  const product = addon.getCurrentAuxiliaryProduct();

  if (typeof product === "number") {
    throw new Error(`Failed to get auxiliary product: ${product}`);
  }

  // Return the BigInt object directly
  return product;
}

/**
 * Main function to run the collector process
 */
async function runCollector() {
  try {
    console.log("Starting collector process...");

    // Fetch N and H from the backend
    const { N, H } = await fetchNAndH();
    console.log("Fetched N and H from backend");

    // Initialize the collector
    const initResult = initializeCollector(N, H);
    console.log(`Collector initialized with result: ${initResult}`);

    // Fetch auxiliary values from the backend
    const auxiliaryValues = await fetchAuxiliaryValues();
    console.log(
      `Fetched ${auxiliaryValues.length} auxiliary values from backend`
    );

    // Process auxiliary values and get their product
    const product = await processAuxiliaryValues(auxiliaryValues);
    console.log("Calculated product of auxiliary values");

    // Convert BigInt to hex string for submission
    const productHex = Buffer.from(product.data).toString("hex");
    console.log(`Product (hex): ${productHex}`);

    // Submit the product to the backend
    const submitResult = await submitAuxiliaryProduct(productHex);
    console.log("Submitted auxiliary product to backend", submitResult);

    // Clean up
    addon.collectorCleanup();
    console.log("Collector cleaned up");

    return { success: true, product: productHex };
  } catch (error) {
    console.error("Error in collector process:", error);
    // Clean up in case of error
    try {
      addon.collectorCleanup();
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }
    throw error;
  }
}

// Export the functions
export { initializeCollector, processAuxiliaryValues, runCollector };

// If this file is run directly, execute the collector process
if (require.main === module) {
  dotenv.config();
  runCollector()
    .then((result) => {
      console.log("Collector process completed successfully", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Collector process failed:", error);
      process.exit(1);
    });
}
