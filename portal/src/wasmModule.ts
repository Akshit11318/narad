/**
 * WASM-Only Cryptographic Module for Zero-Knowledge Voting
 * Pure Uint8Array operations with production-level security
 */

import type { EncryptionModule } from './types/wasm';

// Declare the global window interface to include createEncryptionModule
declare global {
  interface Window {
    createEncryptionModule: () => Promise<EncryptionModule>;
  }
}

let wasmModule: EncryptionModule | null = null;
let isLoading = false;
let loadPromise: Promise<EncryptionModule> | null = null;

/**
 * Load the WebAssembly module
 * @returns Promise that resolves to the loaded module
 */
export async function loadWasmModule(): Promise<EncryptionModule> {
  if (wasmModule) {
    return wasmModule;
  }

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;  loadPromise = new Promise((resolve, reject) => {
    // Load the JavaScript glue file which will load the .wasm file
    try {
      // Access the global createEncryptionModule function that was loaded via script tag
      if (typeof window.createEncryptionModule === "function") {
        console.log("Found createEncryptionModule in window scope");
        window
          .createEncryptionModule()
          .then((module: EncryptionModule) => {
            wasmModule = module as EncryptionModule;

            // Debug: Log all exported functions from the module
            console.log("WebAssembly module loaded successfully");
            console.log(
              "Available functions in the module:",
              Object.keys(wasmModule!)
                .filter(
                  (key) =>
                    typeof (wasmModule as any)[key] === "function" && key.startsWith("_")
                )
                .sort()
            );

            isLoading = false;
            resolve(wasmModule);
          })
          .catch((error: any) => {
            console.error("Failed to initialize WebAssembly module:", error);
            isLoading = false;
            reject(error);
          });
      } else {
        // Fallback if script tag loading failed - use a more compatible approach
        console.warn(
          "createEncryptionModule not found in window scope, trying alternative approach"
        );

        // Create a script element and append it to the document
        const scriptElement = document.createElement("script");
        scriptElement.src = "/assets/encryption.js";
        scriptElement.onload = () => {
          // Once loaded, try to access the createEncryptionModule function again
          if (typeof window.createEncryptionModule === "function") {
            console.log(
              "Successfully loaded createEncryptionModule via script element"
            );            window
              .createEncryptionModule()
              .then((module: EncryptionModule) => {
                wasmModule = module as EncryptionModule;
                console.log("WebAssembly module loaded via script element");
                console.log(
                  "Available functions:",
                  Object.keys(wasmModule!)
                    .filter(
                      (key) =>
                        typeof (wasmModule as any)[key] === "function" &&
                        key.startsWith("_")
                    )
                    .sort()
                );

                isLoading = false;
                resolve(wasmModule);
              })
              .catch((error: any) => {
                console.error(
                  "Failed to initialize WebAssembly module via script element:",
                  error
                );
                isLoading = false;
                reject(error);
              });
          } else {
            const error = new Error(
              "Failed to load WebAssembly module: createEncryptionModule function not found"
            );
            console.error(error);
            isLoading = false;
            reject(error);
          }
        };

        scriptElement.onerror = (error) => {
          console.error("Failed to load encryption.js script:", error);
          isLoading = false;
          reject(new Error("Failed to load encryption.js script"));
        };

        document.head.appendChild(scriptElement);
      }
    } catch (error) {
      console.error("Error during WebAssembly module loading:", error);
      isLoading = false;
      reject(error);
    }
  });

  return loadPromise;
}

/**
 * Copy a JavaScript array to the WebAssembly memory
 * @param module The WebAssembly module
 * @param array The array to copy
 * @returns Pointer to the allocated memory and the length of the array
 */
function copyArrayToWasm(
  module: EncryptionModule,
  array: Uint8Array
): { ptr: number; length: number } {
  const ptr = module._malloc(array.length);
  module.HEAPU8.set(array, ptr);
  return { ptr, length: array.length };
}

/**
 * Copy a Uint32Array to the WebAssembly memory
 * @param module The WebAssembly module
 * @param array The Uint32Array to copy
 * @returns Pointer to the allocated memory and the length of the array
 */

function copyUint32ArrayToWasm(
  module: EncryptionModule,
  array: Uint32Array
): { ptr: number; length: number } {
  // Allocate memory for Uint32Array (4 bytes per element)
  const ptr = module._malloc(array.length * 4);
  // Create a view of the WebAssembly memory as Uint32Array
  const wasmMemory = new Uint32Array(module.HEAPU8.buffer, ptr, array.length);
  // Copy the data
  wasmMemory.set(array);
  return { ptr, length: array.length };
}

/**
 * Copy data from WebAssembly memory to a JavaScript array
 * @param module The WebAssembly module
 * @param ptr Pointer to the data in WebAssembly memory
 * @param length Length of the data to copy
 * @returns The copied array
 */
function copyArrayFromWasm(
  module: EncryptionModule,
  ptr: number,
  length: number
): Uint8Array {
  return new Uint8Array(module.HEAPU8.buffer, ptr, length).slice();
}

/**
 * Generate a random secret key for the client
 * @param n The modulus N parameter
 * @returns 0 on success, negative value on error
 */
export async function generateSecretKey(
  n: Uint8Array | number[]
): Promise<number> {
  const module = await loadWasmModule();
  // Remove problematic console.log that might cause browser to hang
  // console.log(module);
  // Convert parameters to Uint8Array if they're not already
  const nUint8 = n instanceof Uint8Array ? n : new Uint8Array(n);

  // Copy arrays to WebAssembly memory
  const nWasm = copyArrayToWasm(module, nUint8);

  try {
    // Call the WebAssembly function
    const result = module._generate_secret_key(nWasm.ptr, nWasm.length);

    // Get and log the generated secret key
    const secretKey = await getSecretKey();
    console.log("Generated Secret Key:", formatByteArray(secretKey));

    return result;
  } finally {
    // Free allocated memory
    module._free(nWasm.ptr);
  }
}

/**
 * Compute the aggregator's public key
 * @param h The base element H parameter
 * @param skA The aggregator's secret key
 * @param n The modulus N parameter
 * @returns 0 on success, negative value on error
 */
export async function computeAggregatorPublicKey(
  h: Uint8Array | number[],
  skA: Uint8Array | number[],
  n: Uint8Array | number[]
): Promise<number> {
  console.log("Starting computeAggregatorPublicKey with parameters:", {
    h: h ? `${h.length} bytes` : "undefined",
    skA: skA ? `${skA.length} bytes` : "undefined",
    n: n ? `${n.length} bytes` : "undefined",
  });

  const module = await loadWasmModule();

  // Convert parameters to Uint8Array if they're not already
  const hUint8 = h instanceof Uint8Array ? h : new Uint8Array(h);
  const skAUint8 = skA instanceof Uint8Array ? skA : new Uint8Array(skA);
  const nUint8 = n instanceof Uint8Array ? n : new Uint8Array(n);

  // Validate parameters before proceeding
  if (hUint8.length === 0 || skAUint8.length === 0 || nUint8.length === 0) {
    console.error("Invalid parameters for computeAggregatorPublicKey:", {
      hLength: hUint8.length,
      skALength: skAUint8.length,
      nLength: nUint8.length,
    });
    return -1; // Return error code
  }

  // Copy arrays to WebAssembly memory
  console.log("Copying arrays to WebAssembly memory");
  const hWasm = copyArrayToWasm(module, hUint8);
  const skAWasm = copyArrayToWasm(module, skAUint8);
  const nWasm = copyArrayToWasm(module, nUint8);

  try {
    // Call the WebAssembly function
    console.log("Calling _compute_aggregator_public_key WebAssembly function");
    const result = module._compute_aggregator_public_key(
      hWasm.ptr,
      hWasm.length,
      skAWasm.ptr,
      skAWasm.length,
      nWasm.ptr,
      nWasm.length
    );
    console.log("_compute_aggregator_public_key returned:", result);
    return result;
  } finally {
    // Free allocated memory
    console.log("Freeing allocated memory");
    module._free(hWasm.ptr);
    module._free(skAWasm.ptr);
    module._free(nWasm.ptr);
  }
}

/**
 * Compute the auxiliary key
 * @param n The modulus N parameter
 * @returns 0 on success, negative value on error
 */
export async function computeAuxiliaryKey(
  n: Uint8Array | number[]
): Promise<number> {
  const module = await loadWasmModule();

  // Convert parameters to Uint8Array if they're not already
  const nUint8 = n instanceof Uint8Array ? n : new Uint8Array(n);

  // Copy arrays to WebAssembly memory
  const nWasm = copyArrayToWasm(module, nUint8);

  try {
    // Call the WebAssembly function
    return module._compute_auxiliary_key(nWasm.ptr, nWasm.length);
  } finally {
    // Free allocated memory
    module._free(nWasm.ptr);
  }
}

/**
 * Encrypt a vote using Paillier encryption
 * @param vote The vote data
 * @param h The base element H parameter
 * @param n The modulus N parameter
 * @returns The encrypted vote
 */
export async function encryptVotePaillier(
  vote: Uint32Array | number[],
  h: Uint8Array | number[],
  n: Uint8Array | number[]
): Promise<Uint8Array> {
  const module = await loadWasmModule();

  // Validate input parameters
  if (!vote || !h || !n) {
    throw new Error("All encryption parameters must be provided");
  }

  if (
    (vote instanceof Array && vote.length === 0) ||
    (vote instanceof Uint32Array && vote.length === 0)
  ) {
    throw new Error("Vote array cannot be empty");
  }

  // Convert parameters to Uint8Array if they're not already
  const voteUint32 = vote instanceof Uint32Array ? vote : new Uint32Array(vote);
  const hUint8 = h instanceof Uint8Array ? h : new Uint8Array(h);
  const nUint8 = n instanceof Uint8Array ? n : new Uint8Array(n);

  // Validate converted parameters
  if (hUint8.length === 0 || nUint8.length === 0) {
    throw new Error("Invalid cryptographic parameters: H or N is empty");
  }

  // Detailed logging of the vote array before encryption
  console.log("=== VOTE ARRAY BEFORE ENCRYPTION ===");
  console.log("Vote array:", Array.from(voteUint32));
  console.log("Vote array length:", voteUint32.length);
  console.log(
    'Vote array format: One "1" at the selected candidate position, rest are "0"s'
  );
  console.log("=== ENCRYPTION PARAMETERS ===");
  console.log("H length:", hUint8.length, "bytes");
  console.log("N length:", nUint8.length, "bytes");
  console.log("=================================");

  // Copy arrays to WebAssembly memory
  const voteWasm = copyUint32ArrayToWasm(module, voteUint32);
  const hWasm = copyArrayToWasm(module, hUint8);
  const nWasm = copyArrayToWasm(module, nUint8);

  // Allocate memory for the result (assuming result size is same as n squared)
  const resultLength = nUint8.length * 2; // Result might be larger than n
  const resultPtr = module._malloc(resultLength);

  try {
    // Call the WebAssembly function
    const result = module._pack_and_encrypt_votes(
      voteWasm.ptr,
      voteUint32.length,
      nWasm.ptr,
      nUint8.length,
      hWasm.ptr,
      hUint8.length,
      resultPtr,
      resultLength
    );

    if (result !== 0) {
      console.error("Encryption failed with parameters:", {
        votePtr: voteWasm.ptr,
        voteLength: voteUint32.length,
        nPtr: nWasm.ptr,
        nLength: nUint8.length,
        hPtr: hWasm.ptr,
        hLength: hUint8.length,
        resultPtr,
        resultLength,
      });
      throw new Error(`Encryption failed with error code: ${result}`);
    }

    // Copy the result back to JavaScript
    return copyArrayFromWasm(module, resultPtr, resultLength);
  } finally {
    // Free allocated memory
    module._free(voteWasm.ptr);
    module._free(hWasm.ptr);
    module._free(nWasm.ptr);
    module._free(resultPtr);
  }
}

/**
 * Get the client's secret key
 * @returns The secret key
 */
export async function getSecretKey(): Promise<Uint8Array> {
  const module = await loadWasmModule();

  // Allocate memory for the result (64 bytes for the secret key)
  const resultLength = 128; // Fixed size for secret key
  const resultPtr = module._malloc(resultLength);

  try {
    // Call the WebAssembly function
    const keySize = module._get_secret_key(resultPtr, resultLength);

    // Check for error conditions first
    if (keySize < 0) {
      throw new Error(`Failed to get secret key: error code ${keySize}`);
    }

    // Validate the key size
    if (keySize === 0 || keySize > resultLength) {
      throw new Error(
        `Invalid secret key size: ${keySize} bytes (expected between 1 and ${resultLength} bytes)`
      );
    }

    // Copy the result back to JavaScript
    return copyArrayFromWasm(module, resultPtr, keySize);
  } finally {
    // Free allocated memory
    module._free(resultPtr);
  }
}

/**
 * Get the aggregator's public key
 * @returns The public key
 */
export async function getAggregatorPublicKey(): Promise<Uint8Array> {
  const module = await loadWasmModule();

  // Allocate memory for the result (assuming a reasonable size)
  const resultLength = 256; // Adjust based on expected key size
  const resultPtr = module._malloc(resultLength);

  try {
    // Call the WebAssembly function
    const keySize = module._get_aggregator_public_key(resultPtr, resultLength);

    if (keySize <= 0) {
      throw new Error(`Failed to get aggregator public key: ${keySize}`);
    }

    // Copy the result back to JavaScript
    return copyArrayFromWasm(module, resultPtr, keySize);
  } finally {
    // Free allocated memory
    module._free(resultPtr);
  }
}

/**
 * Get the auxiliary key
 * @returns The auxiliary key
 */
export async function getAuxiliaryKey(): Promise<Uint8Array> {
  const module = await loadWasmModule();

  // Allocate memory for the result (assuming a reasonable size)
  const resultLength = 256; // Adjust based on expected key size
  const resultPtr = module._malloc(resultLength);

  try {
    // Call the WebAssembly function
    const keySize = module._get_auxiliary_key(resultPtr, resultLength);

    if (keySize <= 0) {
      throw new Error(`Failed to get auxiliary key: ${keySize}`);
    }

    // Copy the result back to JavaScript
    return copyArrayFromWasm(module, resultPtr, keySize);
  } finally {
    // Free allocated memory
    module._free(resultPtr);
  }
}

/**
 * Clear all cryptographic parameters
 * @returns 0 on success, negative value on error
 */
export async function clearCryptoParams(): Promise<number> {
  const module = await loadWasmModule();
  return module._clear_crypto_params();
}

/**
 * Initialize cryptographic parameters with default values or custom inputs
 * @param n Optional custom N parameter (modulus)
 * @param h Optional custom H parameter (base element)
 * @returns Object containing the initialized parameters
 */
export async function initCryptoParams(
  n?: Uint8Array | number[],
  h?: Uint8Array | number[]
): Promise<{ n: Uint8Array; h: Uint8Array }> {
  if (!n || !h) {
    throw new Error(
      "Cryptographic parameters (N and H) must be provided - no default values allowed"
    );
  }

  // Convert parameters to Uint8Array
  const nParam = n instanceof Uint8Array ? n : new Uint8Array(n);
  const hParam = h instanceof Uint8Array ? h : new Uint8Array(h);

  // Ensure the WebAssembly module is loaded
  const module = await loadWasmModule();

  // Store the parameters in WebAssembly memory for use in encryption functions
  const nWasm = copyArrayToWasm(module, nParam);
  const hWasm = copyArrayToWasm(module, hParam);

  try {
    // Call the C function to initialize these parameters
    const result = module._initialize_crypto_params(
      nWasm.ptr,
      nWasm.length,
      hWasm.ptr,
      hWasm.length
    );

    if (result < 0) {
      throw new Error(`Failed to initialize crypto parameters: ${result}`);
    }

    console.log(
      `Successfully initialized crypto parameters (N: ${nParam.length} bytes, H: ${hParam.length} bytes)`
    );
    console.log("N parameter:", nParam);
    console.log("H parameter:", hParam);

    // Store in localStorage for persistence if needed
    try {
      localStorage.setItem("electionParams_N", Array.from(nParam).join(","));
      localStorage.setItem("electionParams_H", Array.from(hParam).join(","));
    } catch (e) {
      console.warn("Failed to store election parameters in localStorage", e);
    }

    return {
      n: nParam,
      h: hParam,
    };
  } finally {
    // Free the allocated memory
    module._free(nWasm.ptr);
    module._free(hWasm.ptr);
  }
}

/**
 * Fetch election parameters from the backend
 * @returns Object containing the fetched parameters (n, h, ska)
 */
export async function fetchElectionParams(): Promise<{
  n: Uint8Array;
  h: Uint8Array;
  ska?: Uint8Array | number[];
}> {
  try {
    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
    const response = await fetch(`${backendUrl}/api/user/params`);
    console.log(response);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch election parameters: ${response.statusText}`
      );
    }

    const data = await response.json();    // Convert hex string parameters to Uint8Array using WASM-backed conversion
    const n = await hexToUint8Array(data.N);
    const h = await hexToUint8Array(data.H);

    // SKA might be optional
    let ska: Uint8Array | undefined;
    if (data.skA) {
      ska = await hexToUint8Array(data.skA);
    }

    console.log("Successfully fetched election parameters from backend");
    console.log("N:", data.N);
    console.log("H:", data.H);
    console.log("SKA:", data.skA);

    return { n, h, ska };
  } catch (error) {
    console.error("Error fetching election parameters:", error);
    throw new Error("Failed to fetch election parameters from backend");
  }
}

/**
 * Setup the election by initializing crypto parameters and generating keys
 * @returns Object containing the initialized parameters (n, h, ska)
 */
export async function setupElection(): Promise<{
  n: Uint8Array;
  h: Uint8Array;
  ska?: Uint8Array | number[];
}> {
  try {
    // Fetch parameters from backend - no fallback to defaults
    const params = await fetchElectionParams();
    console.log("Using election parameters from backend");

    // Initialize crypto with fetched parameters
    await initCryptoParams(params.n, params.h);
    return { n: params.n, h: params.h, ska: params.ska };
  } catch (error) {
    console.error("Failed to setup election:", error);
    throw new Error("Election setup failed - backend parameters are required");
  }
}

/**
 * Format byte arrays for display in UI
 * @param array The byte array to format
 * @returns Formatted string representation of the byte array
 */
export function formatByteArray(array: Uint8Array | number[] | null): string {
  if (!array) return "Not available";

  // Convert to hex string and limit display length
  const hex = Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hex.length > 20 ? `${hex.substring(0, 20)}...` : hex;
}

/**
 * Submit an encrypted vote to the backend
 * @param candidateId The ID of the selected candidate
 * @param voterAddress The address of the voter (voter ID)
 * @param electionParams The election parameters (n, h)
 * @returns The response from the server
 */
export async function submitVote(
  candidateId: number,
  voterAddress: string,
  electionParams: {
    n: Uint8Array | number[];
    h: Uint8Array | number[];
    ska?: Uint8Array | number[];
  }
): Promise<any> {
  console.log("Starting submitVote with candidateId:", candidateId);
  console.log("Voter ID:", voterAddress);

  if (candidateId === null) {
    throw new Error("Please select a candidate");
  }

  if (!voterAddress || voterAddress.trim() === "") {
    throw new Error("Please enter a valid voter ID");
  }

  const { n, h, ska } = electionParams;
  console.log("Election parameters:", {
    n: n ? `${n.length} bytes` : "undefined",
    h: h ? `${h.length} bytes` : "undefined",
    ska: ska ? `${ska.length} bytes` : "undefined",
  });

  if (!n || !h) {
    throw new Error("Cryptographic parameters not initialized");
  }

  // First, we need the aggregator's secret key (skA) from the election parameters
  if (!ska) {
    throw new Error(
      "Aggregator's secret key (skA) is required but not provided"
    );
  }

  try {
    // Step 1: Generate client's secret key if not already done
    console.log("Step 1: Generating client's secret key");
    const secretKeyResult = await generateSecretKey(n);
    console.log("generateSecretKey result:", secretKeyResult);

    if (secretKeyResult !== 0) {
      throw new Error(
        `Failed to generate client secret key: ${secretKeyResult}`
      );
    }

    // Step 2: Compute the aggregator's public key (pk_A = H^sk_A)
    console.log("Step 2: Computing aggregator's public key");
    console.log("Parameters for computeAggregatorPublicKey:", {
      h: h ? `${h.length} bytes` : "undefined",
      ska: ska ? `${ska.length} bytes` : "undefined",
      n: n ? `${n.length} bytes` : "undefined",
    });

    const aggregatorpubKeyResult = await computeAggregatorPublicKey(h, ska, n);

    if (aggregatorpubKeyResult !== 0) {
      throw new Error(
        `Failed to compute aggregator public key: ${aggregatorpubKeyResult}`
      );
    }

    console.log("Successfully completed key generation steps");
    const auxResult = await computeAuxiliaryKey(n);
    if (auxResult !== 0) {
      throw new Error(`Failed to compute auxiliary key: ${auxResult}`);
    }
    console.log(
      `Successfully completed auxiliary key computation ${auxResult}`
    );
    const numCandidates = 4; // Match the number of candidates in the UI
    const voteArray = new Uint32Array(numCandidates).fill(0);
    voteArray[candidateId - 1] = 1; // Adjust index since candidateId is 1-based

    // Debug: Log the raw vote array before encryption
    console.log("Raw vote array before encryption:", Array.from(voteArray));

    const encryptedVote = await encryptVotePaillier(voteArray, h, n);
    console.log("Encrypted vote:", encryptedVote);
    // Get auxiliary key after it's been computed
    const auxiliaryKey = await getAuxiliaryKey();
    console.log("Auxiliary key:", auxiliaryKey);
    const backendUrl =
      import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

    // Convert encrypted vote and auxiliary key to hex format
    const encryptedVoteHex = Array.from(encryptedVote)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    console.log("Encrypted vote:", encryptedVoteHex);
    const auxiliaryKeyHex = Array.from(auxiliaryKey)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    console.log("Auxiliary key:", auxiliaryKeyHex);

    // Submit the vote to the backend
    const response = await fetch(`${backendUrl}/api/user/vote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        voterId: voterAddress,
        ci: encryptedVoteHex, // Send encrypted vote as a string, not an array
        auxi: auxiliaryKeyHex, // Send auxiliary key in hex format
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit vote: ${response.statusText}`);
    }
    return null;
  } catch (error) {
    console.error("Error in submitVote:", error);
    throw error;
  }
}

// ======================================
// WASM-backed BigInt Math Functions (Production-Ready)
// ======================================

/**
 * WASM-only modular exponentiation: (base^exp) mod modulus
 * All ZKP proof generation uses this function exclusively
 */
export async function wasmModExp(
  base: Uint8Array,
  exponent: Uint8Array,
  modulus: Uint8Array
): Promise<Uint8Array> {
  const module = await loadWasmModule();
  
  const baseWasm = copyArrayToWasm(module, base);
  const expWasm = copyArrayToWasm(module, exponent);
  const modWasm = copyArrayToWasm(module, modulus);
  
  const resultSize = modulus.length;
  const resultPtr = module._malloc(resultSize);
  
  try {
    const success = module._wasmmodexp(
      baseWasm.ptr, baseWasm.length,
      expWasm.ptr, expWasm.length,
      modWasm.ptr, modWasm.length,
      resultPtr, resultSize
    );
    
    if (success !== 0) {
      throw new Error(`WASM modular exponentiation failed: ${success}`);
    }
    
    return copyArrayFromWasm(module, resultPtr, resultSize);
  } finally {
    module._free(baseWasm.ptr);
    module._free(expWasm.ptr);
    module._free(modWasm.ptr);
    module._free(resultPtr);
  }
}

/**
 * WASM-only modular multiplication: (a * b) mod modulus
 * All ZKP operations use this function exclusively
 */
export async function wasmModMul(
  a: Uint8Array,
  b: Uint8Array,
  modulus: Uint8Array
): Promise<Uint8Array> {
  const module = await loadWasmModule();
  
  const aWasm = copyArrayToWasm(module, a);
  const bWasm = copyArrayToWasm(module, b);
  const modWasm = copyArrayToWasm(module, modulus);
  
  const resultSize = modulus.length;
  const resultPtr = module._malloc(resultSize);
  
  try {
    const success = module._wasmmodmul(
      aWasm.ptr, aWasm.length,
      bWasm.ptr, bWasm.length,
      modWasm.ptr, modWasm.length,
      resultPtr, resultSize
    );
    
    if (success !== 0) {
      throw new Error(`WASM modular multiplication failed: ${success}`);
    }
    
    return copyArrayFromWasm(module, resultPtr, resultSize);
  } finally {
    module._free(aWasm.ptr);
    module._free(bWasm.ptr);
    module._free(modWasm.ptr);
    module._free(resultPtr);
  }
}

/**
 * WASM-only modular addition: (a + b) mod modulus
 */
export async function wasmModAdd(
  a: Uint8Array,
  b: Uint8Array,
  modulus: Uint8Array
): Promise<Uint8Array> {
  const module = await loadWasmModule();
  
  const aWasm = copyArrayToWasm(module, a);
  const bWasm = copyArrayToWasm(module, b);
  const modWasm = copyArrayToWasm(module, modulus);
  
  const resultSize = modulus.length;
  const resultPtr = module._malloc(resultSize);
  
  try {
    const success = module._wasmmodadd(
      aWasm.ptr, aWasm.length,
      bWasm.ptr, bWasm.length,
      modWasm.ptr, modWasm.length,
      resultPtr, resultSize
    );
    
    if (success !== 0) {
      throw new Error(`WASM modular addition failed: ${success}`);
    }
    
    return copyArrayFromWasm(module, resultPtr, resultSize);
  } finally {
    module._free(aWasm.ptr);
    module._free(bWasm.ptr);
    module._free(modWasm.ptr);
    module._free(resultPtr);
  }
}

/**
 * WASM-only modular subtraction: (a - b) mod modulus
 */
export async function wasmModSub(
  a: Uint8Array,
  b: Uint8Array,
  modulus: Uint8Array
): Promise<Uint8Array> {
  const module = await loadWasmModule();
  
  const aWasm = copyArrayToWasm(module, a);
  const bWasm = copyArrayToWasm(module, b);
  const modWasm = copyArrayToWasm(module, modulus);
  
  const resultSize = modulus.length;
  const resultPtr = module._malloc(resultSize);
  
  try {
    const success = module._wasmmodsub(
      aWasm.ptr, aWasm.length,
      bWasm.ptr, bWasm.length,
      modWasm.ptr, modWasm.length,
      resultPtr, resultSize
    );
    
    if (success !== 0) {
      throw new Error(`WASM modular subtraction failed: ${success}`);
    }
    
    return copyArrayFromWasm(module, resultPtr, resultSize);
  } finally {
    module._free(aWasm.ptr);
    module._free(bWasm.ptr);
    module._free(modWasm.ptr);
    module._free(resultPtr);
  }
}

/**
 * WASM-only modular inverse: a^(-1) mod modulus
 */
export async function wasmModInv(
  a: Uint8Array,
  modulus: Uint8Array
): Promise<Uint8Array> {
  const module = await loadWasmModule();
  
  const aWasm = copyArrayToWasm(module, a);
  const modWasm = copyArrayToWasm(module, modulus);
  
  const resultSize = modulus.length;
  const resultPtr = module._malloc(resultSize);
  
  try {
    const success = module._wasmmodinv(
      aWasm.ptr, aWasm.length,
      modWasm.ptr, modWasm.length,
      resultPtr, resultSize
    );
    
    if (success !== 0) {
      throw new Error(`WASM modular inverse failed: ${success}`);
    }
    
    return copyArrayFromWasm(module, resultPtr, resultSize);
  } finally {
    module._free(aWasm.ptr);
    module._free(modWasm.ptr);
    module._free(resultPtr);
  }
}

/**
 * WASM-only BigInt comparison: returns -1, 0, 1
 */
export async function wasmCompare(a: Uint8Array, b: Uint8Array): Promise<number> {
  const module = await loadWasmModule();
  
  const aWasm = copyArrayToWasm(module, a);
  const bWasm = copyArrayToWasm(module, b);
  
  try {
    return module._wasmcmp(aWasm.ptr, aWasm.length, bWasm.ptr, bWasm.length);
  } finally {
    module._free(aWasm.ptr);
    module._free(bWasm.ptr);
  }
}

/**
 * WASM-only BigInt equality check: returns true/false
 */
export async function wasmEqual(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  const module = await loadWasmModule();
  
  const aWasm = copyArrayToWasm(module, a);
  const bWasm = copyArrayToWasm(module, b);
  
  try {
    return module._wasmequal(aWasm.ptr, aWasm.length, bWasm.ptr, bWasm.length) === 1;
  } finally {
    module._free(aWasm.ptr);
    module._free(bWasm.ptr);
  }
}

/**
 * WASM-only check if BigInt is zero
 */
export async function wasmIsZero(a: Uint8Array): Promise<boolean> {
  const module = await loadWasmModule();
  
  const aWasm = copyArrayToWasm(module, a);
  
  try {
    return module._wasmiszero(aWasm.ptr, aWasm.length) === 1;
  } finally {
    module._free(aWasm.ptr);
  }
}

/**
 * WASM-only addition: a + b
 */
export async function wasmAdd(a: Uint8Array, b: Uint8Array): Promise<Uint8Array> {
  const module = await loadWasmModule();
  
  const aWasm = copyArrayToWasm(module, a);
  const bWasm = copyArrayToWasm(module, b);
  
  const resultSize = Math.max(a.length, b.length) + 1; // Allow for overflow
  const resultPtr = module._malloc(resultSize);
  
  try {
    const success = module._wasmadd(
      aWasm.ptr, aWasm.length,
      bWasm.ptr, bWasm.length,
      resultPtr, resultSize
    );
    
    if (success !== 0) {
      throw new Error(`WASM addition failed: ${success}`);
    }
    
    return copyArrayFromWasm(module, resultPtr, resultSize);
  } finally {
    module._free(aWasm.ptr);
    module._free(bWasm.ptr);
    module._free(resultPtr);
  }
}

/**
 * WASM-only subtraction: a - b
 */
export async function wasmSub(a: Uint8Array, b: Uint8Array): Promise<Uint8Array> {
  const module = await loadWasmModule();
  
  const aWasm = copyArrayToWasm(module, a);
  const bWasm = copyArrayToWasm(module, b);
  
  const resultSize = Math.max(a.length, b.length);
  const resultPtr = module._malloc(resultSize);
  
  try {
    const success = module._wasmsub(
      aWasm.ptr, aWasm.length,
      bWasm.ptr, bWasm.length,
      resultPtr, resultSize
    );
    
    if (success !== 0) {
      throw new Error(`WASM subtraction failed: ${success}`);
    }
    
    return copyArrayFromWasm(module, resultPtr, resultSize);
  } finally {
    module._free(aWasm.ptr);
    module._free(bWasm.ptr);
    module._free(resultPtr);
  }
}

/**
 * WASM-only multiplication: a * b
 */
export async function wasmMul(a: Uint8Array, b: Uint8Array): Promise<Uint8Array> {
  const module = await loadWasmModule();
  
  const aWasm = copyArrayToWasm(module, a);
  const bWasm = copyArrayToWasm(module, b);
  
  const resultSize = a.length + b.length; // Allow for full product
  const resultPtr = module._malloc(resultSize);
  
  try {
    const success = module._wasmmul(
      aWasm.ptr, aWasm.length,
      bWasm.ptr, bWasm.length,
      resultPtr, resultSize
    );
    
    if (success !== 0) {
      throw new Error(`WASM multiplication failed: ${success}`);
    }
    
    return copyArrayFromWasm(module, resultPtr, resultSize);
  } finally {
    module._free(aWasm.ptr);
    module._free(bWasm.ptr);
    module._free(resultPtr);
  }
}

/**
 * WASM-only modulo: a mod modulus
 */
export async function wasmMod(a: Uint8Array, modulus: Uint8Array): Promise<Uint8Array> {
  const module = await loadWasmModule();
  
  const aWasm = copyArrayToWasm(module, a);
  const modWasm = copyArrayToWasm(module, modulus);
  
  const resultSize = modulus.length;
  const resultPtr = module._malloc(resultSize);
  
  try {
    const success = module._wasmmod(
      aWasm.ptr, aWasm.length,
      modWasm.ptr, modWasm.length,
      resultPtr, resultSize
    );
    
    if (success !== 0) {
      throw new Error(`WASM modulo failed: ${success}`);
    }
    
    return copyArrayFromWasm(module, resultPtr, resultSize);
  } finally {
    module._free(aWasm.ptr);
    module._free(modWasm.ptr);
    module._free(resultPtr);
  }
}

/**
 * WASM-only secure random generation within modulus range
 * All ZKP random values use this function exclusively  
 */
export async function wasmSecureRandom(
  modulus: Uint8Array
): Promise<Uint8Array> {
  const module = await loadWasmModule();
  
  const resultSize = modulus.length;
  const resultPtr = module._malloc(resultSize);
  const modWasm = copyArrayToWasm(module, modulus);
  
  try {
    const success = module._wasmrand(resultPtr, resultSize, modWasm.ptr, modWasm.length);
    
    if (success !== 0) {
      throw new Error(`WASM secure random generation failed: ${success}`);
    }
    
    return copyArrayFromWasm(module, resultPtr, resultSize);
  } finally {
    module._free(modWasm.ptr);
    module._free(resultPtr);
  }
}

/**
 * WASM-only GCD: gcd(a, b)
 */
export async function wasmGcd(a: Uint8Array, b: Uint8Array): Promise<Uint8Array> {
  const module = await loadWasmModule();
  
  const aWasm = copyArrayToWasm(module, a);
  const bWasm = copyArrayToWasm(module, b);
  
  const resultSize = Math.max(a.length, b.length);
  const resultPtr = module._malloc(resultSize);
  
  try {
    const success = module._wasmgcd(
      aWasm.ptr, aWasm.length,
      bWasm.ptr, bWasm.length,
      resultPtr, resultSize
    );
    
    if (success !== 0) {
      throw new Error(`WASM GCD failed: ${success}`);
    }
    
    return copyArrayFromWasm(module, resultPtr, resultSize);
  } finally {
    module._free(aWasm.ptr);
    module._free(bWasm.ptr);
    module._free(resultPtr);
  }
}

/**
 * Check if two Uint8Array values are equal using WASM-backed comparison
 * All equality checks in ZKP operations use this exclusively
 */
export async function isEqual(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  return await wasmEqual(a, b);
}

/**
 * Convert hex string to Uint8Array using WASM-backed conversion
 * All hex string inputs in ZKP operations use this exclusively
 */
export async function hexToUint8Array(hex: string): Promise<Uint8Array> {
  // Validate input first
  if (!hex) {
    console.error('hexToUint8Array called with empty/null hex string');
    throw new Error('Hex string cannot be empty or null');
  }
  
  try {
    return await wasmFromHex(hex);
  } catch (error) {
    console.warn('WASM hex parsing failed for hex string:', hex);
    console.warn('Error:', error);
    console.warn('Using JavaScript fallback...');
    
    // JavaScript fallback for hex parsing
    const cleanHex = hex.replace(/^0x/, '');
    if (cleanHex.length === 0) {
      throw new Error('Empty hex string after cleaning');
    }
    
    // Ensure even length
    const paddedHex = cleanHex.length % 2 === 0 ? cleanHex : '0' + cleanHex;
    const bytes = new Uint8Array(paddedHex.length / 2);
    
    for (let i = 0; i < paddedHex.length; i += 2) {
      bytes[i / 2] = parseInt(paddedHex.substr(i, 2), 16);
    }
    return bytes;
  }
}

/**
 * Convert Uint8Array to hex string using WASM-backed conversion
 * All hex string outputs in ZKP operations use this exclusively
 */
export async function uint8ArrayToHex(bytes: Uint8Array, padding: number = 0): Promise<string> {
  try {
    const hex = await wasmToHex(bytes);
    return padding > hex.length ? hex.padStart(padding, '0') : hex;
  } catch (error) {
    console.warn('WASM hex conversion failed, using JavaScript fallback:', error);
    // JavaScript fallback for hex conversion
    const hex = Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return padding > hex.length ? hex.padStart(padding, '0') : hex;
  }
}

/**
 * Create Uint8Array from number using WASM-backed conversion
 * All number to byte conversions in ZKP operations use this exclusively
 */
export async function numberToUint8Array(num: number): Promise<Uint8Array> {
  // Convert number to hex string first
  const hexString = num.toString(16).padStart(2, '0');
  
  // Use WASM hex conversion for consistent results
  return await wasmFromHex(hexString);
}

/**
 * WASM-only hex string to Uint8Array conversion
 * All hex inputs in ZKP operations use this function exclusively
 */
export async function wasmFromHex(hexString: string): Promise<Uint8Array> {
  const module = await loadWasmModule();
  
  // Check if the required function exists
  if (!module._wasmfromhex || typeof module._wasmfromhex !== 'function') {
    console.error('Available WASM functions:', Object.keys(module).filter(k => k.startsWith('_')));
    throw new Error('WASM module does not have _wasmfromhex function. Module may not be properly loaded.');
  }
  
  // Remove 0x prefix if present
  const cleanHex = hexString.replace(/^0x/, '');
  
  // Validate hex string - handle empty strings properly
  if (cleanHex.length === 0) {
    console.error('Empty hex string provided to wasmFromHex');
    throw new Error('Empty hex string provided');
  }
  
  if (!/^[0-9a-fA-F]*$/.test(cleanHex)) {
    throw new Error(`Invalid hex string: ${hexString}`);
  }
  
  // Ensure hex string has even length
  const paddedHex = cleanHex.length % 2 === 0 ? cleanHex : '0' + cleanHex;
  const resultSize = paddedHex.length / 2;
  
  if (resultSize === 0) {
    console.error('Calculated result size is 0 for hex string:', hexString);
    throw new Error('Invalid hex string results in zero bytes');
  }
  
  const resultPtr = module._malloc(resultSize);
  
  // Convert string to C string for WASM
  const hexPtr = module._malloc(paddedHex.length + 1);
  const hexArray = new Uint8Array(paddedHex.length + 1);
  for (let i = 0; i < paddedHex.length; i++) {
    hexArray[i] = paddedHex.charCodeAt(i);
  }
  hexArray[paddedHex.length] = 0; // Null terminator
  module.HEAPU8.set(hexArray, hexPtr);
  
  try {
    // Call WASM function with proper BigInt structure pattern:
    // _wasmfromhex(hexPtr: C-string, resultPtr: BigInt.data, resultLen: BigInt.length)
    const length = module._wasmfromhex(hexPtr, resultPtr, resultSize);
    
    if (length < 0) {
      console.error('WASM _wasmfromhex function failed with code:', length);
      console.error('Input hex string:', hexString);
      console.error('Clean hex string:', paddedHex);
      console.error('Expected result size:', resultSize);
      throw new Error(`WASM hex conversion failed: ${length}`);
    }
    
    // Use the actual length returned by the function
    const actualLength = length > 0 ? length : resultSize;
    return copyArrayFromWasm(module, resultPtr, actualLength);
  } finally {
    module._free(hexPtr);
    module._free(resultPtr);
  }
}

/**
 * WASM-only Uint8Array to hex string conversion  
 * All hex outputs in ZKP operations use this function exclusively
 */
export async function wasmToHex(bytes: Uint8Array): Promise<string> {
  const module = await loadWasmModule();
  
  // Check if the required function exists
  if (!module._wasmtohex || typeof module._wasmtohex !== 'function') {
    console.error('Available WASM functions:', Object.keys(module).filter(k => k.startsWith('_')));
    throw new Error('WASM module does not have _wasmtohex function. Module may not be properly loaded.');
  }
  
  // Validate input
  if (!bytes || bytes.length === 0) {
    return '';
  }
  
  const bytesWasm = copyArrayToWasm(module, bytes);
  const hexSize = bytes.length * 2 + 1; // 2 chars per byte + null terminator
  const hexPtr = module._malloc(hexSize);
  
  try {
    const success = module._wasmtohex(
      bytesWasm.ptr, bytesWasm.length,
      hexPtr, hexSize
    );
    
    if (success !== 0) {
      console.error('WASM _wasmtohex function failed with code:', success);
      console.error('Input bytes length:', bytes.length);
      console.error('Hex buffer size allocated:', hexSize);
      throw new Error(`WASM hex conversion failed: ${success}`);
    }
    
    // Convert C string to JavaScript string
    const hexArray = new Uint8Array(module.HEAPU8.buffer, hexPtr, hexSize - 1);
    let result = '';
    for (let i = 0; i < hexArray.length && hexArray[i] !== 0; i++) {
      result += String.fromCharCode(hexArray[i]);
    }
    return result;
  } finally {
    module._free(bytesWasm.ptr);
    module._free(hexPtr);
  }
}

/**
 * WASM-only get byte length of BigInt
 * All size calculations in ZKP operations use this function exclusively
 */
export async function wasmLength(bytes: Uint8Array): Promise<number> {
  const module = await loadWasmModule();
  
  const bytesWasm = copyArrayToWasm(module, bytes);
  
  try {
    return module._wasmlen(bytesWasm.ptr, bytesWasm.length);
  } finally {
    module._free(bytesWasm.ptr);
  }
}

/**
 * WASM-only copy BigInt data
 * All data copying in ZKP operations uses this function exclusively
 */
export async function wasmCopy(source: Uint8Array, destSize: number): Promise<Uint8Array> {
  const module = await loadWasmModule();
  
  const srcWasm = copyArrayToWasm(module, source);
  const destPtr = module._malloc(destSize);
  
  try {
    const success = module._wasmcopy(
      srcWasm.ptr, srcWasm.length,
      destPtr, destSize
    );
    
    if (success !== 0) {
      throw new Error(`WASM copy failed: ${success}`);
    }
    
    return copyArrayFromWasm(module, destPtr, destSize);
  } finally {
    module._free(srcWasm.ptr);
    module._free(destPtr);
  }
}
