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

  // Convert parameters to Uint8Array if they're not already
  const voteUint32 = vote instanceof Uint32Array ? vote : new Uint32Array(vote);
  const hUint8 = h instanceof Uint8Array ? h : new Uint8Array(h);
  const nUint8 = n instanceof Uint8Array ? n : new Uint8Array(n);

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
      voteWasm.length,
      nWasm.ptr,
      nWasm.length,
      hWasm.ptr,
      hWasm.length,
      resultPtr,
      resultLength
    );

    if (result !== 0) {
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
  // Default values - these should be cryptographically secure parameters
  // Note: These are sample values for testing, not for production use
  const defaultN = new Uint8Array([
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xc9, 0x0f, 0xda, 0xa2,
    0x21, 0x68, 0xc2, 0x34, 0xc4, 0xc6, 0x62, 0x8b, 0x80, 0xdc, 0x1c, 0xd1,
    0x29, 0x02, 0x4e, 0x08, 0x8a, 0x67, 0xcc, 0x74, 0x02, 0x0b, 0xbe, 0xa6,
    0x3b, 0x13, 0x9b, 0x22, 0x51, 0x4a, 0x08, 0x79, 0x8e, 0x34, 0x04, 0xdd,
    0xef, 0x95, 0x19, 0xb3, 0xcd, 0x3a, 0x43, 0x1b, 0x30, 0x2b, 0x0a, 0x6d,
    0xf2, 0x5f, 0x14, 0x37,
  ]);

  const defaultH = new Uint8Array([
    0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x02, 0x13, 0x24, 0x35,
    0x46, 0x57, 0x68, 0x79, 0x8a, 0x9b, 0xac, 0xbd, 0xce, 0xdf, 0xe0, 0xf1,
  ]);

  // Use provided parameters or defaults
  const nParam = n
    ? n instanceof Uint8Array
      ? n
      : new Uint8Array(n)
    : defaultN;
  const hParam = h
    ? h instanceof Uint8Array
      ? h
      : new Uint8Array(h)
    : defaultH;

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
