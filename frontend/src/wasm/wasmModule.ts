// WebAssembly module wrapper for encryption and cryptographic voting functions

interface EncryptionModule {
  _malloc(size: number): number;
  _free(ptr: number): void;
  _encrypt_vote(
    votePtr: number,
    voteLength: number,
    nPtr: number,
    nLength: number,
    hPtr: number,
    hLength: number,
    skaPtr: number,
    skaLength: number,
    resultPtr: number,
    resultLength: number
  ): number;
  _generate_secret_key_wrapper(nPtr: number, nLength: number): number;
  _compute_aggregator_public_key_wrapper(
    hPtr: number, hLength: number,
    skAPtr: number, skALength: number,
    nPtr: number, nLength: number
  ): number;
  _compute_auxiliary_key_wrapper(nPtr: number, nLength: number): number;
  _encrypt_vote_paillier_wrapper(
    votePtr: number, voteLength: number,
    hPtr: number, hLength: number,
    nPtr: number, nLength: number,
    resultPtr: number, resultLength: number
  ): number;
  _get_secret_key_wrapper(resultPtr: number, resultLength: number): number;
  _get_aggregator_public_key_wrapper(resultPtr: number, resultLength: number): number;
  _get_auxiliary_key_wrapper(resultPtr: number, resultLength: number): number;
  _clear_crypto_params_wrapper(): number;
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
      if (typeof window.createEncryptionModule === 'function') {
        console.log('Found createEncryptionModule in window scope');
        window.createEncryptionModule()
          .then((module) => {
            wasmModule = module as EncryptionModule;
            
            // Debug: Log all exported functions from the module
            console.log('WebAssembly module loaded successfully');
            console.log('Available functions in the module:', Object.keys(wasmModule)
              .filter(key => typeof wasmModule[key] === 'function' && key.startsWith('_'))
              .sort());
            
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
        console.warn('createEncryptionModule not found in window scope, trying alternative approach');
        
        // Create a script element and append it to the document
        const scriptElement = document.createElement('script');
        scriptElement.src = '/assets/encryption.js';
        scriptElement.onload = () => {
          // Once loaded, try to access the createEncryptionModule function again
          if (typeof window.createEncryptionModule === 'function') {
            console.log('Successfully loaded createEncryptionModule via script element');
            window.createEncryptionModule()
              .then((module) => {
                wasmModule = module as EncryptionModule;
                console.log('WebAssembly module loaded via script element');
                console.log('Available functions:', Object.keys(wasmModule)
                  .filter(key => typeof wasmModule[key] === 'function' && key.startsWith('_'))
                  .sort());
                
                isLoading = false;
                resolve(wasmModule);
              })
              .catch((error) => {
                console.error("Failed to initialize WebAssembly module via script element:", error);
                isLoading = false;
                reject(error);
              });
          } else {
            const error = new Error('Failed to load WebAssembly module: createEncryptionModule function not found');
            console.error(error);
            isLoading = false;
            reject(error);
          }
        };
        
        scriptElement.onerror = (error) => {
          console.error("Failed to load encryption.js script:", error);
          isLoading = false;
          reject(new Error('Failed to load encryption.js script'));
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
 * Encrypt a vote using the provided parameters
 * @param voteArray Array of 0s and 1s representing the vote
 * @param n The modulus N parameter
 * @param h The hash function output parameter
 * @param ska The secret key parameter
 * @returns The encrypted vote
 */
export async function encryptVote(
  voteArray: number[],
  n: Uint8Array | number[],
  h: Uint8Array | number[],
  ska: Uint8Array | number[]
): Promise<Uint8Array> {
  const module = await loadWasmModule();

  // Convert vote array to Uint8Array
  const voteUint8 = new Uint8Array(voteArray);

  // Convert parameters to Uint8Array if they're not already
  const nUint8 = n instanceof Uint8Array ? n : new Uint8Array(n);
  const hUint8 = h instanceof Uint8Array ? h : new Uint8Array(h);
  const skaUint8 = ska instanceof Uint8Array ? ska : new Uint8Array(ska);

  // Copy arrays to WebAssembly memory
  const voteWasm = copyArrayToWasm(module, voteUint8);
  const nWasm = copyArrayToWasm(module, nUint8);
  const hWasm = copyArrayToWasm(module, hUint8);
  const skaWasm = copyArrayToWasm(module, skaUint8);

  // Allocate memory for the result (assuming result size is same as n)
  const resultLength = nUint8.length * 2; // Result might be larger than n
  const resultPtr = module._malloc(resultLength);

  try {
    // Call the WebAssembly function
    const result = module._encrypt_vote(
      voteWasm.ptr,
      voteWasm.length,
      nWasm.ptr,
      nWasm.length,
      hWasm.ptr,
      hWasm.length,
      skaWasm.ptr,
      skaWasm.length,
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
    module._free(nWasm.ptr);
    module._free(hWasm.ptr);
    module._free(skaWasm.ptr);
    module._free(resultPtr);
  }
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
  console.log(module)
  // Convert parameters to Uint8Array if they're not already
  const nUint8 = n instanceof Uint8Array ? n : new Uint8Array(n);

  // Copy arrays to WebAssembly memory
  const nWasm = copyArrayToWasm(module, nUint8);

  try {
    // Call the WebAssembly function
    return module._generate_secret_key_wrapper(
      nWasm.ptr,
      nWasm.length
    );
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
    return module._compute_aggregator_public_key_wrapper(
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
    return module._compute_auxiliary_key_wrapper(
      nWasm.ptr,
      nWasm.length
    );
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
  vote: Uint8Array | number[],
  h: Uint8Array | number[],
  n: Uint8Array | number[]
): Promise<Uint8Array> {
  const module = await loadWasmModule();

  // Convert parameters to Uint8Array if they're not already
  const voteUint8 = vote instanceof Uint8Array ? vote : new Uint8Array(vote);
  const hUint8 = h instanceof Uint8Array ? h : new Uint8Array(h);
  const nUint8 = n instanceof Uint8Array ? n : new Uint8Array(n);

  // Copy arrays to WebAssembly memory
  const voteWasm = copyArrayToWasm(module, voteUint8);
  const hWasm = copyArrayToWasm(module, hUint8);
  const nWasm = copyArrayToWasm(module, nUint8);

  // Allocate memory for the result (assuming result size is same as n squared)
  const resultLength = nUint8.length * 2; // Result might be larger than n
  const resultPtr = module._malloc(resultLength);

  try {
    // Call the WebAssembly function
    const result = module._encrypt_vote_paillier_wrapper(
      voteWasm.ptr,
      voteWasm.length,
      hWasm.ptr,
      hWasm.length,
      nWasm.ptr,
      nWasm.length,
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
    const keySize = module._get_secret_key_wrapper(resultPtr, resultLength);

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
    const keySize = module._get_aggregator_public_key_wrapper(resultPtr, resultLength);

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
    const keySize = module._get_auxiliary_key_wrapper(resultPtr, resultLength);

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
  return module._clear_crypto_params_wrapper();
}
