import { useState, useEffect } from "react";
import axios from "axios";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import {
  loadWasmModule,
  generateSecretKey,
  computeAggregatorPublicKey,
  computeAuxiliaryKey,
  getSecretKey,
  getAggregatorPublicKey,
  getAuxiliaryKey,
  clearCryptoParams,
} from "./wasm/wasmModule";

interface ElectionData {
  id: string;
  stage: string; // This would be ElectionStage enum type
  initiator: string; // This would be Pubkey type
  total_votes: number;
  total_candidates: number;
  candidate_whitelist: string[];
  n: Uint8Array | number[];
  h: Uint8Array | number[];
  ska: Uint8Array | number[];
  collector_pkc: Uint8Array | number[];
  auxt: Uint8Array | number[];
}

function App() {
  const [count, setCount] = useState(0);
  const [electionData, setElectionData] = useState<ElectionData | null>(null);
  const [loading, setLoading] = useState<boolean>(false); // Changed to false since we're not fetching
  const [error, setError] = useState<string | null>(null);
  const [encryptedVote, setEncryptedVote] = useState<Uint8Array | null>(null);
  const [encryptionStatus, setEncryptionStatus] = useState<string>("");
  const [wasmLoaded, setWasmLoaded] = useState<boolean>(false);
  const [secretKey, setSecretKey] = useState<Uint8Array | null>(null);
  const [aggregatorPublicKey, setAggregatorPublicKey] =
    useState<Uint8Array | null>(null);
  const [auxiliaryKey, setAuxiliaryKey] = useState<Uint8Array | null>(null);

  // Vote array state (0s and 1s)
  const [voteArray, setVoteArray] = useState<number[]>([
    1, 0, 1, 0, 1, 0, 1, 0,
  ]);
  const [voteArrayLength, setVoteArrayLength] = useState<number>(8);

  // Mock election data for testing WebAssembly functions
  useEffect(() => {
    // Create mock election data with necessary parameters
    const mockElectionData: ElectionData = {
      id: "mock-election-id",
      stage: "voting",
      initiator: "mock-initiator",
      total_votes: 0,
      total_candidates: 3,
      candidate_whitelist: ["Candidate 1", "Candidate 2", "Candidate 3"],
      // Mock cryptographic parameters (using simple arrays for testing)
      n: new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255]), // Mock modulus N
      h: new Uint8Array([123, 123, 123, 123, 123, 123, 123, 123]), // Mock hash H
      ska: new Uint8Array([111, 222, 111, 222, 111, 222, 111, 222]), // Mock secret key
      collector_pkc: new Uint8Array([99, 88, 77, 66, 55, 44, 33, 22]), // Mock collector public key
      auxt: new Uint8Array([11, 22, 33, 44, 55, 66, 77, 88]), // Mock auxiliary key
    };

    setElectionData(mockElectionData);
    setLoading(false);
  }, []);

  // Load WebAssembly module on component mount
  useEffect(() => {
    const loadWasm = async () => {
      try {
        await loadWasmModule();
        setWasmLoaded(true);
        console.log("WebAssembly module loaded successfully");
      } catch (err) {
        console.error("Failed to load WebAssembly module:", err);
        setError("Failed to load WebAssembly module");
      }
    };

    loadWasm();
  }, []);

  // Original election data fetching code (commented out)
  /*
  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        // Get the election ID from environment variables
        const electionId = import.meta.env.VITE_ELECTION_ID;
        const baseURL = import.meta.env.VITE_API_BASE_URL || "";

        if (!electionId) {
          console.error("VITE_ELECTION_ID environment variable is not defined");
          setError(
            "Election ID is not configured. Please set the VITE_ELECTION_ID in your .env file."
          );
          setLoading(false);
          return;
        }

        // Fetch election data from the API using axios
        const response = await axios.get(`${baseURL}/election/${electionId}`);
        setElectionData(response.data.electionAccount);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching election data:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        setLoading(false);
      }
    };

    fetchElectionData();
  }, []); // Empty dependency array means this effect runs once on mount
  */

  // Function to generate a secret key
  const handleGenerateSecretKey = async () => {
    if (!electionData || !wasmLoaded) {
      setEncryptionStatus(
        "Election data not available or WebAssembly not loaded"
      );
      return;
    }

    try {
      setEncryptionStatus("Generating secret key...");
      const result = await generateSecretKey(electionData.n);

      if (result === 0) {
        // Get the generated secret key
        const key = await getSecretKey();
        setSecretKey(key);
        setEncryptionStatus("Secret key generated successfully!");
      } else {
        setEncryptionStatus(`Failed to generate secret key: ${result}`);
      }
    } catch (err) {
      console.error("Error generating secret key:", err);
      setEncryptionStatus(
        `Error generating secret key: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  // Function to compute aggregator public key
  const handleComputeAggregatorPublicKey = async () => {
    if (!electionData || !wasmLoaded) {
      setEncryptionStatus(
        "Election data not available or WebAssembly not loaded"
      );
      return;
    }

    try {
      setEncryptionStatus("Computing aggregator public key...");
      // For testing, we'll use the same key as ska for skA
      const result = await computeAggregatorPublicKey(
        electionData.h,
        electionData.ska,
        electionData.n
      );

      if (result === 0) {
        // Get the computed public key
        const key = await getAggregatorPublicKey();
        setAggregatorPublicKey(key);
        setEncryptionStatus("Aggregator public key computed successfully!");
      } else {
        setEncryptionStatus(
          `Failed to compute aggregator public key: ${result}`
        );
      }
    } catch (err) {
      console.error("Error computing aggregator public key:", err);
      setEncryptionStatus(
        `Error computing aggregator public key: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  // Function to compute auxiliary key
  const handleComputeAuxiliaryKey = async () => {
    if (!electionData || !wasmLoaded) {
      setEncryptionStatus(
        "Election data not available or WebAssembly not loaded"
      );
      return;
    }

    try {
      setEncryptionStatus("Computing auxiliary key...");
      const result = await computeAuxiliaryKey(electionData.n);

      if (result === 0) {
        // Get the computed auxiliary key
        const key = await getAuxiliaryKey();
        setAuxiliaryKey(key);
        setEncryptionStatus("Auxiliary key computed successfully!");
      } else {
        setEncryptionStatus(`Failed to compute auxiliary key: ${result}`);
      }
    } catch (err) {
      console.error("Error computing auxiliary key:", err);
      setEncryptionStatus(
        `Error computing auxiliary key: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  // Function to encrypt the vote using WebAssembly
  const handleEncryptVote = async () => {
    if (!electionData || !wasmLoaded) {
      setEncryptionStatus(
        "Election data not available or WebAssembly not loaded"
      );
      return;
    }

    try {
      setEncryptionStatus("Encrypting vote...");
      const encrypted = await encryptVote(
        voteArray,
        electionData.n,
        electionData.h,
        electionData.ska
      );
      setEncryptedVote(encrypted);
      setEncryptionStatus("Vote encrypted successfully!");
    } catch (err) {
      console.error("Error encrypting vote:", err);
      setEncryptionStatus(
        `Error encrypting vote: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  // Function to clear all cryptographic parameters
  const handleClearCryptoParams = async () => {
    try {
      setEncryptionStatus("Clearing cryptographic parameters...");
      const result = await clearCryptoParams();

      if (result === 0) {
        setSecretKey(null);
        setAggregatorPublicKey(null);
        setAuxiliaryKey(null);
        setEncryptedVote(null);
        setEncryptionStatus("Cryptographic parameters cleared successfully!");
      } else {
        setEncryptionStatus(
          `Failed to clear cryptographic parameters: ${result}`
        );
      }
    } catch (err) {
      console.error("Error clearing cryptographic parameters:", err);
      setEncryptionStatus(
        `Error clearing cryptographic parameters: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  // Helper function to display byte arrays in a readable format
  const formatByteArray = (array: Uint8Array | null): string => {
    if (!array) return "Not available";

    // Convert to hex string and limit display length
    const hex = Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return hex.length > 40 ? `${hex.substring(0, 40)}...` : hex;
  };

  // Function to toggle a vote at a specific index
  const toggleVote = (index: number) => {
    const newVoteArray = [...voteArray];
    newVoteArray[index] = newVoteArray[index] === 1 ? 0 : 1;
    setVoteArray(newVoteArray);
  };

  // Function to resize the vote array
  const handleResizeVoteArray = (newSize: number) => {
    if (newSize < 1) return;

    const newArray = [...voteArray];

    // If increasing size, add zeros to the end
    if (newSize > voteArray.length) {
      for (let i = voteArray.length; i < newSize; i++) {
        newArray.push(0);
      }
    }
    // If decreasing size, truncate the array
    else if (newSize < voteArray.length) {
      newArray.length = newSize;
    }

    setVoteArray(newArray);
    setVoteArrayLength(newSize);
  };

  // Function to reset the vote array to all zeros
  const resetVoteArray = () => {
    setVoteArray(Array(voteArrayLength).fill(0));
  };

  // Function to randomize the vote array
  const randomizeVoteArray = () => {
    const newArray = Array(voteArrayLength)
      .fill(0)
      .map(() => Math.round(Math.random()));
    setVoteArray(newArray);
  };

  return (
    <div className="container">
      <div className="header">
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
        <h1>WebAssembly Cryptographic Voting System</h1>
        <p className="testing-mode">Testing Mode - Using Mock Election Data</p>
      </div>

      <div className="card">
        <div className="status-section">
          <h2>System Status</h2>
          <p>
            WebAssembly Module: {wasmLoaded ? "✅ Loaded" : "❌ Not Loaded"}
          </p>
          <p>
            Mock Election Data:{" "}
            {electionData ? "✅ Available" : "❌ Not Available"}
          </p>
          {error && <p className="error">Error: {error}</p>}
        </div>

        <div className="crypto-section">
          <h2>Cryptographic Operations</h2>

          <div className="vote-array-section">
            <h3>Vote Array Input</h3>
            <div className="vote-array-controls">
              <div className="vote-array-size">
                <label htmlFor="vote-array-size">Array Size:</label>
                <input
                  type="number"
                  id="vote-array-size"
                  min="1"
                  max="32"
                  value={voteArrayLength}
                  onChange={(e) =>
                    handleResizeVoteArray(parseInt(e.target.value) || 1)
                  }
                />
              </div>
              <div className="vote-array-actions">
                <button onClick={resetVoteArray} className="vote-array-button">
                  Reset
                </button>
                <button
                  onClick={randomizeVoteArray}
                  className="vote-array-button"
                >
                  Randomize
                </button>
              </div>
            </div>

            <div className="vote-array-display">
              {voteArray.map((vote, index) => (
                <button
                  key={index}
                  className={`vote-bit ${
                    vote === 1 ? "vote-bit-one" : "vote-bit-zero"
                  }`}
                  onClick={() => toggleVote(index)}
                >
                  {vote}
                </button>
              ))}
            </div>
            <div className="vote-array-text">
              Current Vote Array: [{voteArray.join(", ")}]
            </div>
          </div>

          <div className="button-group">
            <button
              onClick={handleGenerateSecretKey}
              disabled={!wasmLoaded || !electionData}
            >
              1. Generate Secret Key
            </button>
            <button
              onClick={handleComputeAggregatorPublicKey}
              disabled={!wasmLoaded || !electionData}
            >
              2. Compute Aggregator Public Key
            </button>
            <button
              onClick={handleComputeAuxiliaryKey}
              disabled={!wasmLoaded || !electionData || !secretKey}
            >
              3. Compute Auxiliary Key
            </button>
            <button
              onClick={handleEncryptVote}
              disabled={!wasmLoaded || !electionData}
            >
              4. Encrypt Vote
            </button>
            <button onClick={handleClearCryptoParams} disabled={!wasmLoaded}>
              Clear All Parameters
            </button>
          </div>

          <div className="status-message">
            <p>{encryptionStatus}</p>
          </div>
        </div>

        <div className="results-section">
          <h2>Results</h2>
          <div className="result-item">
            <h3>Secret Key:</h3>
            <p className="byte-display">{formatByteArray(secretKey)}</p>
          </div>
          <div className="result-item">
            <h3>Aggregator Public Key:</h3>
            <p className="byte-display">
              {formatByteArray(aggregatorPublicKey)}
            </p>
          </div>
          <div className="result-item">
            <h3>Auxiliary Key:</h3>
            <p className="byte-display">{formatByteArray(auxiliaryKey)}</p>
          </div>
          <div className="result-item">
            <h3>Encrypted Vote:</h3>
            <p className="byte-display">{formatByteArray(encryptedVote)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
