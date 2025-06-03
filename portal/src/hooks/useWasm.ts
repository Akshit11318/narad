import { useState, useEffect, useCallback } from 'react';
import { loadWasmModule } from '../wasmModule';
import { initializeWasm, initializeElection } from '../utils/crypto';
import type { EncryptionModule, ElectionParams, WasmState } from '../types';

export function useWasm() {
  const [wasmState, setWasmState] = useState<WasmState>({
    module: null,
    isLoaded: false,
    isLoading: false,
    error: null,
  });

  const [electionParams, setElectionParams] = useState<ElectionParams | null>(null);

  const loadWasm = useCallback(async (): Promise<EncryptionModule> => {
    if (wasmState.module) {
      return wasmState.module;
    }

    if (wasmState.isLoading) {
      // Wait for current loading to complete
      return new Promise((resolve, reject) => {
        const checkLoading = () => {
          if (wasmState.module) {
            resolve(wasmState.module);
          } else if (!wasmState.isLoading) {
            if (wasmState.error) {
              reject(new Error(wasmState.error));
            } else {
              reject(new Error('WASM loading failed'));
            }
          } else {
            setTimeout(checkLoading, 100);
          }
        };
        checkLoading();
      });
    }

    setWasmState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const module = await initializeWasm();
      
      setWasmState({
        module,
        isLoaded: true,
        isLoading: false,
        error: null,
      });

      console.log('WASM module loaded successfully');
      return module;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load WASM module';
      
      setWasmState({
        module: null,
        isLoaded: false,
        isLoading: false,
        error: errorMessage,
      });

      throw error;
    }
  }, [wasmState.module, wasmState.isLoading, wasmState.error]);

  const setupElection = useCallback(async (): Promise<ElectionParams> => {
    if (electionParams) {
      return electionParams;
    }

    try {
      // Ensure WASM is loaded first
      await loadWasm();
      
      const params = await initializeElection();
      setElectionParams(params);
      
      console.log('Election parameters setup successfully');
      return params;
    } catch (error) {
      console.error('Failed to setup election:', error);
      throw error;
    }
  }, [electionParams, loadWasm]);

  // Auto-load WASM on mount
  useEffect(() => {
    if (!wasmState.isLoaded && !wasmState.isLoading) {
      loadWasm().catch((error) => {
        console.error('Auto-load WASM failed:', error);
      });
    }
  }, [loadWasm, wasmState.isLoaded, wasmState.isLoading]);

  const clearWasm = useCallback(() => {
    setWasmState({
      module: null,
      isLoaded: false,
      isLoading: false,
      error: null,
    });
    setElectionParams(null);
  }, []);
  return {
    // State
    wasmState,
    electionParams,
    
    // Actions
    loadWasm,
    setupElection,
    clearWasm,
    
    // Computed
    isLoaded: wasmState.isLoaded,
    isReady: wasmState.isLoaded && !wasmState.error,
  };
}
