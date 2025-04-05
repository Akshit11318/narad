// WebAssembly module wrapper for encryption functions

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
  declare function createModule(): Promise<EncryptionModule>;

  loadPromise = new Promise((resolve, reject) => {
    // Load the JavaScript glue file which will load the .wasm file
    import("./encryption.js")
      .then((EmscriptenModule) => {
        return EmscriptenModule.default();
      })
      .then((module) => {
        wasmModule = module as EncryptionModule;
        isLoading = false;
        resolve(wasmModule);
      })
      .catch((error) => {
        console.error("Failed to load WebAssembly module:", error);
        isLoading = false;
        reject(error);
      });
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
