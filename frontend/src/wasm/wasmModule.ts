// WebAssembly module wrapper for encryption and cryptographic voting functions

interface EncryptionModule {
  _malloc(size: number): number;
  _free(ptr: number): void;
  _generate_secret_key(nPtr: number, nLength: number): number;
  _compute_aggregator_public_key(
    hPtr: number,
    hLength: number,
    skAPtr: number,
    skALength: number,
    nPtr: number,
    nLength: number
  ): number;
  _compute_auxiliary_key(nPtr: number, nLength: number): number;
  _pack_and_encrypt_votes(
    votePtr: number,
    voteLength: number,
    nPtr: number,
    nLength: number,
    hPtr: number,
    hLength: number,
    resultPtr: number,
    resultLength: number
  ): number;
  _get_secret_key(resultPtr: number, resultLength: number): number;
  _get_aggregator_public_key(resultPtr: number, resultLength: number): number;
  _get_auxiliary_key(resultPtr: number, resultLength: number): number;
  _clear_crypto_params(): number;
  _initialize_crypto_params(
    nPtr: number,
    nLength: number,
    hPtr: number,
    hLength: number
  ): number;
  HEAPU8: Uint8Array;
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

  isLoading = true;
  // Declare the global window interface to include createEncryptionModule
  declare global {
    interface Window {
      createEncryptionModule: () => Promise<EncryptionModule>;
    }
  }

  loadPromise = new Promise((resolve, reject) => {
    // Load the JavaScript glue file which will load the .wasm file
    try {
      // Access the global createEncryptionModule function that was loaded via script tag
      if (typeof window.createEncryptionModule === "function") {
        console.log("Found createEncryptionModule in window scope");
        window
          .createEncryptionModule()
          .then((module) => {
            wasmModule = module as EncryptionModule;

            // Debug: Log all exported functions from the module
            console.log("WebAssembly module loaded successfully");
            console.log(
              "Available functions in the module:",
              Object.keys(wasmModule)
                .filter(
                  (key) =>
                    typeof wasmModule[key] === "function" && key.startsWith("_")
                )
                .sort()
            );

            isLoading = false;
            resolve(wasmModule);
          })
          .catch((error) => {
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
            );
            window
              .createEncryptionModule()
              .then((module) => {
                wasmModule = module as EncryptionModule;
                console.log("WebAssembly module loaded via script element");
                console.log(
                  "Available functions:",
                  Object.keys(wasmModule)
                    .filter(
                      (key) =>
                        typeof wasmModule[key] === "function" &&
                        key.startsWith("_")
                    )
                    .sort()
                );

                isLoading = false;
                resolve(wasmModule);
              })
              .catch((error) => {
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
  console.log(module);
  // Convert parameters to Uint8Array if they're not already
  const nUint8 = n instanceof Uint8Array ? n : new Uint8Array(n);

  // Copy arrays to WebAssembly memory
  const nWasm = copyArrayToWasm(module, nUint8);

  try {
    // Call the WebAssembly function
    return module._generate_secret_key(nWasm.ptr, nWasm.length);
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
  const module = await loadWasmModule();

  // Convert parameters to Uint8Array if they're not already
  const hUint8 = h instanceof Uint8Array ? h : new Uint8Array(h);
  const skAUint8 = skA instanceof Uint8Array ? skA : new Uint8Array(skA);
  const nUint8 = n instanceof Uint8Array ? n : new Uint8Array(n);

  // Copy arrays to WebAssembly memory
  const hWasm = copyArrayToWasm(module, hUint8);
  const skAWasm = copyArrayToWasm(module, skAUint8);
  const nWasm = copyArrayToWasm(module, nUint8);

  try {
    // Call the WebAssembly function
    return module._compute_aggregator_public_key(
      hWasm.ptr,
      hWasm.length,
      skAWasm.ptr,
      skAWasm.length,
      nWasm.ptr,
      nWasm.length
    );
  } finally {
    // Free allocated memory
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
    throw new Error('All encryption parameters must be provided');
  }

  if (vote instanceof Array && vote.length === 0 || vote instanceof Uint32Array && vote.length === 0) {
    throw new Error('Vote array cannot be empty');
  }

  // Convert parameters to Uint8Array if they're not already
  const voteUint32 = vote instanceof Uint32Array ? vote : new Uint32Array(vote);
  const hUint8 = h instanceof Uint8Array ? h : new Uint8Array(h);
  const nUint8 = n instanceof Uint8Array ? n : new Uint8Array(n);

  // Validate converted parameters
  if (hUint8.length === 0 || nUint8.length === 0) {
    throw new Error('Invalid cryptographic parameters: H or N is empty');
  }

  // Detailed logging of the vote array before encryption
  console.log('=== VOTE ARRAY BEFORE ENCRYPTION ===');
  console.log('Vote array:', Array.from(voteUint32));
  console.log('Vote array length:', voteUint32.length);
  console.log('Vote array format: One "1" at the selected candidate position, rest are "0"s');
  console.log('=== ENCRYPTION PARAMETERS ===');
  console.log('H length:', hUint8.length, 'bytes');
  console.log('N length:', nUint8.length, 'bytes');
  console.log('=================================');

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
      console.error('Encryption failed with parameters:', {
        votePtr: voteWasm.ptr,
        voteLength: voteUint32.length,
        nPtr: nWasm.ptr,
        nLength: nUint8.length,
        hPtr: hWasm.ptr,
        hLength: hUint8.length,
        resultPtr,
        resultLength
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

  // Allocate memory for the result (assuming a reasonable size)
  const resultLength = 256; // Adjust based on expected key size
  const resultPtr = module._malloc(resultLength);

  try {
    // Call the WebAssembly function
    const keySize = module._get_secret_key(resultPtr, resultLength);

    if (keySize <= 0) {
      throw new Error(`Failed to get secret key: ${keySize}`);
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
    throw new Error('Cryptographic parameters (N and H) must be provided - no default values allowed');
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
 * Helper function to convert hex string to Uint8Array
 */
function hexToUint8Array(hexString: string): Uint8Array {
  // Remove '0x' prefix if present
  hexString = hexString.replace('0x', '');
  // Ensure even length
  if (hexString.length % 2 !== 0) {
    hexString = '0' + hexString;
  }
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i/2] = parseInt(hexString.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Fetch election parameters from the backend
 * @returns Object containing the fetched parameters (n, h, ska)
 */
export async function fetchElectionParams(): Promise<{ n: Uint8Array; h: Uint8Array; ska?: Uint8Array | number[] }> {
  try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    const response = await fetch(`${backendUrl}/api/user/params`);
    console.log(response);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch election parameters: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Convert hex string parameters to Uint8Array
    const n = hexToUint8Array(data.N);
    const h = hexToUint8Array(data.H);
    
    // SKA might be optional
    let ska: Uint8Array | undefined;
    if (data.skA) {
      ska = hexToUint8Array(data.skA);
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
export async function setupElection(): Promise<{ n: Uint8Array; h: Uint8Array; ska?: Uint8Array | number[] }> {
  try {
    // Fetch parameters from backend - no fallback to defaults
    const params = await fetchElectionParams();
    console.log("Using election parameters from backend");
    
    // Initialize crypto with fetched parameters
    await initCryptoParams(params.n, params.h);
    
    return params;
  } catch (error) {
    console.error("Failed to fetch or initialize election parameters:", error);
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
 * @param electionId The ID of the election
 * @param voterAddress The address of the voter
 * @param electionParams The election parameters (n, h)
 * @returns The response from the server
 */
export async function submitVote(
  candidateId: number,
  voterAddress: string,
  electionParams: { n: Uint8Array | number[]; h: Uint8Array | number[]; ska?: Uint8Array | number[] }
): Promise<any> {
  if (candidateId === null) {
    throw new Error("Please select a candidate");
  }

  const { n, h, ska } = electionParams;
  if (!n || !h) {
    throw new Error("Cryptographic parameters not initialized");
  }

  // First, we need the aggregator's secret key (skA) from the election parameters
  if (!ska) {
    throw new Error("Aggregator's secret key (skA) is required but not provided");
  }
  
  // Step 1: Generate client's secret key if not already done
  const secretKeyResult = await generateSecretKey(n);
  if (secretKeyResult !== 0) {
    throw new Error(`Failed to generate client secret key: ${secretKeyResult}`);
  }
  
  // Step 2: Compute the aggregator's public key (pk_A = H^sk_A)
  const pkAResult = await computeAggregatorPublicKey(h, ska, n);
  if (pkAResult !== 0) {
    throw new Error(`Failed to compute aggregator public key: ${pkAResult}`);
  }
  
  // Step 3: Now compute the auxiliary key (aux_i = pk_A^sk_i)
  const auxResult = await computeAuxiliaryKey(n);
  if (auxResult !== 0) {
    throw new Error(`Failed to compute auxiliary key: ${auxResult}`);
  }

  // Create a vote array initialized with zeros and set the selected candidate's position to 1
  const numCandidates = 4; // Match the number of candidates in the UI
  const voteArray = new Uint32Array(numCandidates).fill(0);
  voteArray[candidateId - 1] = 1; // Adjust index since candidateId is 1-based
  
  // Debug: Log the raw vote array before encryption
  console.log("Raw vote array before encryption:", Array.from(voteArray));
  
  const encryptedVote = await encryptVotePaillier(voteArray, h, n);
  
  // Get auxiliary key after it's been computed
  const auxiliaryKey = await getAuxiliaryKey();
  
  // Get the backend URL from environment or use default
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  
  // Convert encrypted vote and auxiliary key to hex format
  const encryptedVoteHex = Array.from(encryptedVote)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const auxiliaryKeyHex = Array.from(auxiliaryKey)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Submit the vote to the backend
  const response = await fetch(`${backendUrl}/api/user/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

  return await response.json();
}
