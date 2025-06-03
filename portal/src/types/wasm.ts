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
