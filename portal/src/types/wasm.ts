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
  
  // ZKP BigInt Math Functions
  _wasmmodexp(basePtr: number, baseLen: number, expPtr: number, expLen: number, 
              modPtr: number, modLen: number, resultPtr: number, resultLen: number): number;
  _wasmmodmul(aPtr: number, aLen: number, bPtr: number, bLen: number,
              modPtr: number, modLen: number, resultPtr: number, resultLen: number): number;
  _wasmmodadd(aPtr: number, aLen: number, bPtr: number, bLen: number,
              modPtr: number, modLen: number, resultPtr: number, resultLen: number): number;
  _wasmmodsub(aPtr: number, aLen: number, bPtr: number, bLen: number,
              modPtr: number, modLen: number, resultPtr: number, resultLen: number): number;
  _wasmmodinv(aPtr: number, aLen: number, modPtr: number, modLen: number,
              resultPtr: number, resultLen: number): number;
  _wasmcmp(aPtr: number, aLen: number, bPtr: number, bLen: number): number;
  _wasmequal(aPtr: number, aLen: number, bPtr: number, bLen: number): number;
  _wasmiszero(aPtr: number, aLen: number): number;
  _wasmadd(aPtr: number, aLen: number, bPtr: number, bLen: number,
           resultPtr: number, resultLen: number): number;
  _wasmsub(aPtr: number, aLen: number, bPtr: number, bLen: number,
           resultPtr: number, resultLen: number): number;
  _wasmmul(aPtr: number, aLen: number, bPtr: number, bLen: number,
           resultPtr: number, resultLen: number): number;
  _wasmmod(aPtr: number, aLen: number, modPtr: number, modLen: number,
           resultPtr: number, resultLen: number): number;
  _wasmrand(resultPtr: number, resultLen: number, modPtr: number, modLen: number): number;
  _wasmgcd(aPtr: number, aLen: number, bPtr: number, bLen: number,
           resultPtr: number, resultLen: number): number;
  _wasmfromhex(hexPtr: number, resultPtr: number, resultLen: number): number;
  _wasmtohex(bigintPtr: number, bigintLen: number, hexPtr: number, strSize: number): number;
  _wasmlen(bigintPtr: number, bigintLen: number): number;
  _wasmcopy(srcPtr: number, srcLen: number, destPtr: number, destLen: number): number;
  
  HEAPU8: Uint8Array;
}

export interface WasmState {
  module: EncryptionModule | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface CryptoParams {
  n: Uint8Array;
  h: Uint8Array;
  ska?: Uint8Array;
}

export interface WasmContextType {
  wasmState: WasmState;
  loadWasm: () => Promise<EncryptionModule>;
  setupElection: () => Promise<CryptoParams>;
  encryptVote: (
    candidateId: number,
    numCandidates: number,
    params: CryptoParams
  ) => Promise<{ encryptedVote: Uint8Array; auxiliaryKey: Uint8Array }>;
}

export interface ElectionSetupResult {
  n: Uint8Array;
  h: Uint8Array;
  ska?: Uint8Array | number[];
}
