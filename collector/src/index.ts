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
  // Validate input
  if (!Array.isArray(auxiliaryValues) || auxiliaryValues.length === 0) {
    throw new Error('Invalid or empty auxiliary values array');
  }

  // Reset the auxiliary product
  console.log(`[*] Resetting auxiliary product...`);
  const resetResult = addon.resetAuxiliaryProduct();
  if (resetResult !== 0) {
    throw new Error(`Failed to reset auxiliary product: ${resetResult}`);
  }

  // Process each auxiliary value
  console.log(`[*] Processing auxiliary values one by one...`);
  let processedCount = 0;
  const totalValues = auxiliaryValues.length;

  try {
    for (const auxHex of auxiliaryValues) {
      if (!auxHex || typeof auxHex !== 'string') {
        throw new Error(`Invalid auxiliary value at index ${processedCount}`);
      }

      console.log(`[*] Processing auxiliary value ${processedCount + 1}/${totalValues}: ${auxHex.substring(0, 10)}...`);
      
      try {
        // Set a timeout to detect potential infinite loops or hangs
        const timeoutMs = 30000; // 30 seconds timeout
        let timedOut = false;
        
        const timeoutId = setTimeout(() => {
          timedOut = true;
          console.error(`[!] Processing auxiliary value timed out after ${timeoutMs}ms`);
        }, timeoutMs);
        
        const aux = addon.createBigIntFromHex(auxHex);
        console.log(`[*] Created BigInt from hex, now processing...`);
        
        const result = addon.processAuxiliaryValue(aux);
        
        // Clear the timeout since processing completed
        clearTimeout(timeoutId);
        
        if (timedOut) {
          throw new Error(`Processing auxiliary value timed out after ${timeoutMs}ms`);
        }

        if (result !== 0) {
          throw new Error(`Failed to process auxiliary value at index ${processedCount}: ${result}`);
        }
      } catch (auxError) {
        console.error(`[!] Error processing auxiliary value ${processedCount + 1}/${totalValues}:`, auxError);
        throw auxError;
      }
      
      processedCount++;
      if (processedCount % 10 === 0 || processedCount === totalValues) {
        console.log(`[*] Processed ${processedCount}/${totalValues} auxiliary values`);
      }
    }

    // Get the current auxiliary product
    console.log(`[*] Retrieving final auxiliary product...`);
    const product = addon.getCurrentAuxiliaryProduct();

    if (typeof product === "number") {
      throw new Error(`Failed to get auxiliary product: ${product}`);
    }

    return product;
  } catch (error) {
    console.error(`[!] Error during auxiliary value processing at count ${processedCount}/${totalValues}:`, error);
    throw error;
  }
}

/**
 * Main function to run the collector process
 */
async function runCollector() {
  try {
    console.log("[*] Starting collector process...");

    // Fetch N and H from the backend
    console.log(`[*] Fetching election parameters...`);
    const { N, H } = await fetchNAndH();
    console.log("[*] Successfully fetched N and H parameters");

    // Initialize the collector
    console.log(`[*] Initializing collector...`);
    const initResult = initializeCollector(N, H);
    console.log(`[*] Collector initialized successfully with result: ${initResult}`);

    // Fetch auxiliary values from the backend
    console.log(`[*] Fetching auxiliary values...`);
    const auxiliaryValues = await fetchAuxiliaryValues();
    
    if (!auxiliaryValues || auxiliaryValues.length === 0) {
      throw new Error('No auxiliary values received from the backend');
    }
    
    console.log(`[*] Successfully fetched ${auxiliaryValues.length} auxiliary values`);
    
    // Process auxiliary values and get their product
    console.log(`[*] Processing ${auxiliaryValues.length} auxiliary values...`);
    const product = await processAuxiliaryValues(auxiliaryValues);
    console.log("[*] Successfully calculated product of auxiliary values");

    // Convert BigInt to hex string for submission
    const productHex = Buffer.from(product.data).toString("hex");
    console.log(`[*] Product (hex): ${productHex.substring(0, 20)}...${productHex.substring(productHex.length - 20)}`);

    // Submit the product to the backend
    console.log(`[*] Submitting auxiliary product to backend...`);
    const submitResult = await submitAuxiliaryProduct(productHex);
    console.log("[*] Successfully submitted auxiliary product");

    // Clean up
    console.log(`[*] Cleaning up collector resources...`);
    addon.collectorCleanup();
    console.log("[*] Collector cleaned up successfully");

    console.log(`[*] Collector process completed successfully`);
    return { success: true, product: productHex };
  } catch (error) {
    console.error("[!] Error in collector process:", error);
    // Clean up in case of error
    try {
      console.log(`[*] Attempting to clean up resources after error...`);
      addon.collectorCleanup();
      console.log(`[*] Cleanup after error completed`);
    } catch (cleanupError) {
      console.error("[!] Error during cleanup:", cleanupError);
    }
    throw error;
  }
}

// Export the functions
export { initializeCollector, processAuxiliaryValues, runCollector };

// If this file is run directly, execute the collector process
if (require.main === module) {
  dotenv.config();
  console.log(`[*] ====== Collector Starting ======`);
  console.log(`[*] Node.js version: ${process.version}`);
  console.log(`[*] Current working directory: ${process.cwd()}`);
  console.log(`[*] Connecting to API: ${process.env.API_URL || "http://localhost:3000"}`);
  
  runCollector()
    .then((result) => {
      console.log("[*] ====== Collector Process Completed Successfully ======");
      process.exit(0);
    })
    .catch((error) => {
      console.error("[*] ====== Collector Process Failed ======");
      process.exit(1);
    });
}
