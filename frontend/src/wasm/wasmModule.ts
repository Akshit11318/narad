// WebAssembly module wrapper for encryption and cryptographic voting functions

export interface EncryptionModule {
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
  [key: string]: any;
}


let wasmModule: EncryptionModule | null = null;
let isLoading = false;
let loadPromise: Promise<EncryptionModule> | null = null;

export async function loadWasmModule(): Promise<EncryptionModule> {
  if (wasmModule) {
    return wasmModule;
  }

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;

  loadPromise = new Promise((resolve, reject) => {
    try {
      if (typeof (window as any).createEncryptionModule === "function") {
        window
          .createEncryptionModule()
          .then((module: any) => {
            wasmModule = module as EncryptionModule;
            isLoading = false;
            resolve(wasmModule);
          })
          .catch((error: any) => {
            isLoading = false;
            reject(error);
          });
      } else {
        const scriptElement = document.createElement("script");
        scriptElement.src = "/assets/encryption.js";
        scriptElement.onload = () => {
          if (typeof (window as any).createEncryptionModule === "function") {
            window
              .createEncryptionModule()
              .then((module: any) => {
                wasmModule = module as EncryptionModule;
                isLoading = false;
                resolve(wasmModule);
              })
              .catch((error: any) => {
                isLoading = false;
                reject(error);
              });
          } else {
            isLoading = false;
            reject(new Error("createEncryptionModule function not found"));
          }
        };

        scriptElement.onerror = () => {
          isLoading = false;
          reject(new Error("Failed to load encryption.js script"));
        };

        document.head.appendChild(scriptElement);
      }
    } catch (error) {
      isLoading = false;
      reject(error);
    }
  });

  return loadPromise;
}

function copyArrayToWasm(
  module: EncryptionModule,
  array: Uint8Array
): { ptr: number; length: number } {
  const ptr = module._malloc(array.length);
  module.HEAPU8.set(array, ptr);
  return { ptr, length: array.length };
}

function copyUint32ArrayToWasm(
  module: EncryptionModule,
  array: Uint32Array
): { ptr: number; length: number } {
  const ptr = module._malloc(array.length * 4);
  const wasmMemory = new Uint32Array(module.HEAPU8.buffer, ptr, array.length);
  wasmMemory.set(array);
  return { ptr, length: array.length };
}

function copyArrayFromWasm(
  module: EncryptionModule,
  ptr: number,
  length: number
): Uint8Array {
  return new Uint8Array(module.HEAPU8.buffer, ptr, length).slice();
}

export async function generateSecretKey(
  n: Uint8Array | number[]
): Promise<number> {
  const module = await loadWasmModule();
  const nUint8 = n instanceof Uint8Array ? n : new Uint8Array(n);
  const nWasm = copyArrayToWasm(module, nUint8);
  try {
    return module._generate_secret_key(nWasm.ptr, nWasm.length);
  } finally {
    module._free(nWasm.ptr);
  }
}

export async function computeAggregatorPublicKey(
  h: Uint8Array | number[],
  skA: Uint8Array | number[],
  n: Uint8Array | number[]
): Promise<number> {
  const module = await loadWasmModule();
  const hUint8 = h instanceof Uint8Array ? h : new Uint8Array(h);
  const skAUint8 = skA instanceof Uint8Array ? skA : new Uint8Array(skA);
  const nUint8 = n instanceof Uint8Array ? n : new Uint8Array(n);

  const hWasm = copyArrayToWasm(module, hUint8);
  const skAWasm = copyArrayToWasm(module, skAUint8);
  const nWasm = copyArrayToWasm(module, nUint8);
  try {
    return module._compute_aggregator_public_key(
      hWasm.ptr, hWasm.length,
      skAWasm.ptr, skAWasm.length,
      nWasm.ptr, nWasm.length
    );
  } finally {
    module._free(hWasm.ptr);
    module._free(skAWasm.ptr);
    module._free(nWasm.ptr);
  }
}

export async function computeAuxiliaryKey(
  n: Uint8Array | number[]
): Promise<number> {
  const module = await loadWasmModule();
  const nUint8 = n instanceof Uint8Array ? n : new Uint8Array(n);
  const nWasm = copyArrayToWasm(module, nUint8);
  try {
    return module._compute_auxiliary_key(nWasm.ptr, nWasm.length);
  } finally {
    module._free(nWasm.ptr);
  }
}

export async function encryptVotePaillier(
  vote: Uint32Array | number[],
  h: Uint8Array | number[],
  n: Uint8Array | number[]
): Promise<Uint8Array> {
  const module = await loadWasmModule();
  const voteUint32 = vote instanceof Uint32Array ? vote : new Uint32Array(vote);
  const hUint8 = h instanceof Uint8Array ? h : new Uint8Array(h);
  const nUint8 = n instanceof Uint8Array ? n : new Uint8Array(n);

  const voteWasm = copyUint32ArrayToWasm(module, voteUint32);
  const hWasm = copyArrayToWasm(module, hUint8);
  const nWasm = copyArrayToWasm(module, nUint8);
  const resultLength = nUint8.length * 2;
  const resultPtr = module._malloc(resultLength);

  try {
    const result = module._pack_and_encrypt_votes(
      voteWasm.ptr, voteUint32.length,
      nWasm.ptr, nUint8.length,
      hWasm.ptr, hUint8.length,
      resultPtr, resultLength
    );
    if (result !== 0) {
      throw new Error(`Encryption failed with error code: ${result}`);
    }
    return copyArrayFromWasm(module, resultPtr, resultLength);
  } finally {
    module._free(voteWasm.ptr);
    module._free(hWasm.ptr);
    module._free(nWasm.ptr);
    module._free(resultPtr);
  }
}

export async function getSecretKey(): Promise<Uint8Array> {
  const module = await loadWasmModule();
  const resultLength = 128;
  const resultPtr = module._malloc(resultLength);
  try {
    const keySize = module._get_secret_key(resultPtr, resultLength);
    if (keySize < 0) throw new Error(`Failed to get secret key: ${keySize}`);
    return copyArrayFromWasm(module, resultPtr, keySize);
  } finally {
    module._free(resultPtr);
  }
}

export async function getAggregatorPublicKey(): Promise<Uint8Array> {
  const module = await loadWasmModule();
  const resultLength = 256;
  const resultPtr = module._malloc(resultLength);
  try {
    const keySize = module._get_aggregator_public_key(resultPtr, resultLength);
    if (keySize <= 0) throw new Error(`Failed to get aggregator public key: ${keySize}`);
    return copyArrayFromWasm(module, resultPtr, keySize);
  } finally {
    module._free(resultPtr);
  }
}

export async function getAuxiliaryKey(): Promise<Uint8Array> {
  const module = await loadWasmModule();
  const resultLength = 256;
  const resultPtr = module._malloc(resultLength);
  try {
    const keySize = module._get_auxiliary_key(resultPtr, resultLength);
    if (keySize <= 0) throw new Error(`Failed to get auxiliary key: ${keySize}`);
    return copyArrayFromWasm(module, resultPtr, keySize);
  } finally {
    module._free(resultPtr);
  }
}

export async function clearCryptoParams(): Promise<number> {
  const module = await loadWasmModule();
  return module._clear_crypto_params();
}

export async function initCryptoParams(
  n?: Uint8Array | number[],
  h?: Uint8Array | number[]
): Promise<{ n: Uint8Array; h: Uint8Array }> {
  if (!n || !h) throw new Error("Cryptographic parameters (N and H) must be provided");
  const nParam = n instanceof Uint8Array ? n : new Uint8Array(n);
  const hParam = h instanceof Uint8Array ? h : new Uint8Array(h);
  const module = await loadWasmModule();
  const nWasm = copyArrayToWasm(module, nParam);
  const hWasm = copyArrayToWasm(module, hParam);
  try {
    const result = module._initialize_crypto_params(nWasm.ptr, nWasm.length, hWasm.ptr, hWasm.length);
    if (result < 0) throw new Error(`Failed to initialize crypto parameters: ${result}`);
    return { n: nParam, h: hParam };
  } finally {
    module._free(nWasm.ptr);
    module._free(hWasm.ptr);
  }
}

function hexToUint8Array(hexString: string): Uint8Array {
  hexString = hexString.replace("0x", "");
  if (hexString.length % 2 !== 0) hexString = "0" + hexString;
  const bytes = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
  }
  return bytes;
}

export async function fetchElectionParams(): Promise<{
  n: Uint8Array;
  h: Uint8Array;
  ska?: Uint8Array | number[];
}> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
  const response = await fetch(`${backendUrl}/api/aggregator/params`);
  if (!response.ok) throw new Error(`Failed to fetch election parameters: ${response.statusText}`);
  const data = await response.json();
  const n = hexToUint8Array(data.N);
  const h = hexToUint8Array(data.H);
  let ska: Uint8Array | undefined;
  if (data.skA) ska = hexToUint8Array(data.skA);
  return { n, h, ska };
}

export async function setupElection(): Promise<{
  n: Uint8Array;
  h: Uint8Array;
  ska?: Uint8Array | number[];
}> {
  const params = await fetchElectionParams();
  await initCryptoParams(params.n, params.h);
  return { n: params.n, h: params.h, ska: params.ska };
}

export function formatByteArray(array: Uint8Array | number[] | null): string {
  if (!array) return "Not available";
  const hex = Array.from(array).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex.length > 20 ? `${hex.substring(0, 20)}...` : hex;
}

export async function submitVote(
  candidateId: number,
  voterAddress: string,
  electionParams: {
    n: Uint8Array | number[];
    h: Uint8Array | number[];
    ska?: Uint8Array | number[];
  }
): Promise<any> {
  const { n, h, ska } = electionParams;
  if (!n || !h) throw new Error("Cryptographic parameters not initialized");
  if (!ska) throw new Error("Aggregator's secret key (skA) is required");

  const secretKeyResult = await generateSecretKey(n);
  if (secretKeyResult !== 0) throw new Error(`Failed to generate client secret key: ${secretKeyResult}`);

  const aggregatorpubKeyResult = await computeAggregatorPublicKey(h, ska, n);
  if (aggregatorpubKeyResult !== 0) throw new Error(`Failed to compute aggregator public key: ${aggregatorpubKeyResult}`);

  const auxResult = await computeAuxiliaryKey(n);
  if (auxResult !== 0) throw new Error(`Failed to compute auxiliary key: ${auxResult}`);

  const numCandidates = 4;
  const voteArray = new Uint32Array(numCandidates).fill(0);
  voteArray[candidateId - 1] = 1;

  const encryptedVote = await encryptVotePaillier(voteArray, h, n);
  const auxiliaryKey = await getAuxiliaryKey();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

  const encryptedVoteHex = Array.from(encryptedVote).map((b) => b.toString(16).padStart(2, "0")).join("");
  const auxiliaryKeyHex = Array.from(auxiliaryKey).map((b) => b.toString(16).padStart(2, "0")).join("");

  const response = await fetch(`${backendUrl}/api/user/vote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ voterId: voterAddress, ci: encryptedVoteHex, auxi: auxiliaryKeyHex }),
  });

  if (!response.ok) throw new Error(`Failed to submit vote: ${response.statusText}`);
  return null;
}
