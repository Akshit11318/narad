import { useState, useEffect } from "react";
import axios from "axios";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import { encryptVote } from "./wasm/wasmModule";

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
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [encryptedVote, setEncryptedVote] = useState<Uint8Array | null>(null);
  const [encryptionStatus, setEncryptionStatus] = useState<string>("");

  // Default vote array (0s and 1s)
  const defaultVoteArray = [1, 0, 1, 0, 1, 0, 1, 0];

  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        // Get the election ID from environment variables
        const electionId = import.meta.env.VITE_ELECTION_ID;
        const baseURL = import.meta.env.VITE_API_BASE_URL || "";

        if (!electionId) {
          throw new Error(
            "Election ID is not defined in environment variables"
          );
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

  // Function to encrypt the vote using WebAssembly
  const handleEncryptVote = async () => {
    if (!electionData) {
      setEncryptionStatus("Election data not available");
      return;
    }

    try {
      setEncryptionStatus("Encrypting vote...");
      const encrypted = await encryptVote(
        defaultVoteArray,
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

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>

      {/* Display election data */}

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
