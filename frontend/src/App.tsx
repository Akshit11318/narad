import { useState, useEffect } from "react";
import "./App.css";
import {
  loadWasmModule,
  setupElection,
  formatByteArray,
  submitVote,
} from "./wasm/wasmModule";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

interface ElectionData {
  id: string;
  n: Uint8Array | number[];
  h: Uint8Array | number[];
  ska: Uint8Array | number[];
}

interface ClientVoteViewProps {
  electionData: ElectionData;
}

const ClientVoteView = ({ electionData }: ClientVoteViewProps) => {
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [voterID, setVoterID] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleVoterIDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVoterID(e.target.value);
  };

  const handleSubmitVote = async () => {
    if (selectedCandidate === null) {
      toast.error("Please select a candidate");
      return;
    }

    if (!voterID || voterID.trim() === "") {
      toast.error("Please enter a valid voter ID");
      return;
    }

    try {
      setSubmitting(true);

      let electionId = "default-election-id";
      const urlParams = new URLSearchParams(window.location.search);
      const electionIdFromUrl = urlParams.get("electionId");
      if (electionIdFromUrl) {
        electionId = electionIdFromUrl;
      } else {
        const storedElectionId = localStorage.getItem("selectedElectionId");
        if (storedElectionId) electionId = storedElectionId;
      }

      await submitVote(selectedCandidate, voterID, {
        n: electionData.n,
        h: electionData.h,
        ska: electionData.ska,
      });

      toast.success(`Vote submitted successfully for ${voterID}!`);
      setSelectedCandidate(null);
    } catch (error) {
      console.error("Error submitting vote:", error);
      toast.error("Failed to submit vote. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      <div className="election-banner">
        <div className="election-param">
          <span className="param-label">N:</span>
          <span className="param-value">{formatByteArray(electionData.n)}</span>
        </div>
        <div className="election-param">
          <span className="param-label">H:</span>
          <span className="param-value">{formatByteArray(electionData.h)}</span>
        </div>
        <div className="election-param">
          <span className="param-label">SKA:</span>
          <span className="param-value">{formatByteArray(electionData.ska)}</span>
        </div>
        <div className="election-status">
          <span className="status-indicator">Testing Deployment</span>
        </div>
      </div>
      <div className="main-content">
        <h1>Select Your Candidate</h1>
        <p className="instruction">Choose one candidate and submit your vote</p>

        <div className="voter-id-container" style={{ marginBottom: '20px' }}>
          <label htmlFor="voterId" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Voter ID:
          </label>
          <input
            type="text"
            id="voterId"
            value={voterID}
            onChange={handleVoterIDChange}
            placeholder="Enter Voter ID"
            style={{
              padding: '10px',
              width: '100%',
              maxWidth: '300px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              fontSize: '16px'
            }}
            required
          />
        </div>

        <div className="candidates-grid">
          {[1, 2, 3, 4].map((candidateId) => (
            <div
              key={candidateId}
              className={`candidate-card ${selectedCandidate === candidateId ? "selected" : ""}`}
              onClick={() => setSelectedCandidate(candidateId)}
            >
              <img
                src={`/assets/candidate${candidateId}.svg`}
                alt={`Candidate ${candidateId}`}
                className="candidate-image"
              />
              <div className="candidate-name">Candidate {candidateId}</div>
              {selectedCandidate === candidateId && (
                <div className="selected-indicator">✓</div>
              )}
            </div>
          ))}
        </div>
        <button
          className="vote-button"
          onClick={handleSubmitVote}
          disabled={selectedCandidate === null || !voterID || submitting}
          style={{
            backgroundColor: "#4CAF50",
            color: "white",
            padding: "12px 20px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold"
          }}
        >
          {submitting ? "Submitting..." : "Cast Vote"}
        </button>

        <p style={{ marginTop: "15px", fontSize: "14px", color: "#666" }}>
          You can cast multiple votes by changing the Voter ID and selecting a candidate again.
        </p>
      </div>

      <footer className="app-footer">
        <p>Secure Voting System - WASM Powered Encryption</p>
      </footer>
    </div>
  );
};

interface ResultItem {
  candidate: string;
  votes: number;
}

function ResultsView() {
  const [electionIdInput, setElectionIdInput] = useState("");
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = async () => {
    if (!electionIdInput.trim()) {
      setError("Please enter an Election ID");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
      const res = await fetch(`${backendUrl}/api/aggregator/results/${electionIdInput.trim()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No results found");
        setResults(null);
      } else {
        setResults(data.data.decodedVotes || []);
        setTotalVotes(data.data.decodedVotes?.reduce((s: number, r: ResultItem) => s + r.votes, 0) || 0);
      }
    } catch (err) {
      setError("Failed to fetch results");
      setResults(null);
    }
    setLoading(false);
  };

  const maxVotes = results ? Math.max(...results.map(r => r.votes), 1) : 1;
  const colors = ["#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#6366f1", "#f97316", "#84cc16"];

  return (
    <div className="results-container">
      <div className="main-content">
        <h1>Election Results</h1>
        <p className="instruction">Enter an Election ID to view live aggregation results</p>

        <div style={{ display: "flex", gap: "8px", marginBottom: "20px", maxWidth: "500px" }}>
          <input
            type="text"
            value={electionIdInput}
            onChange={(e) => setElectionIdInput(e.target.value)}
            placeholder="Enter Election ID (public key)"
            style={{
              flex: 1, padding: "10px", borderRadius: "6px",
              border: "1px solid #444", backgroundColor: "#1a1a2e",
              color: "#fff", fontSize: "14px"
            }}
          />
          <button
            onClick={fetchResults}
            disabled={loading}
            style={{
              padding: "10px 20px", borderRadius: "6px", border: "none",
              backgroundColor: loading ? "#555" : "#4CAF50", color: "#fff",
              cursor: loading ? "wait" : "pointer", fontSize: "14px", fontWeight: "bold"
            }}
          >
            {loading ? "Loading..." : "Get Results"}
          </button>
        </div>

        {error && (
          <div style={{ padding: "12px", backgroundColor: "#2a1a1a", border: "1px solid #ef4444", borderRadius: "6px", color: "#ef4444", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        {results && results.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <h2 style={{ color: "#ccc" }}>Total Votes: <span style={{ color: "#4CAF50" }}>{totalVotes}</span></h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "24px" }}>
              {results.map((item, idx) => {
                const pct = Math.round((item.votes / maxVotes) * 100);
                const color = colors[idx % colors.length];
                return (
                  <div key={idx}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ color: "#ddd", fontSize: "15px", fontWeight: "500" }}>{item.candidate}</span>
                      <span style={{ color: "#fff", fontSize: "15px", fontWeight: "bold" }}>{item.votes} votes</span>
                    </div>
                    <div style={{
                      width: "100%", height: "28px",
                      backgroundColor: "#1a1a2e", borderRadius: "14px",
                      overflow: "hidden", border: "1px solid #333"
                    }}>
                      <div style={{
                        height: "100%",
                        width: pct + "%",
                        backgroundColor: color,
                        borderRadius: "14px",
                        transition: "width 0.8s ease-out",
                        boxShadow: `0 0 10px ${color}40`,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {results && results.length === 0 && !error && (
          <div style={{ padding: "20px", backgroundColor: "#1a1a2e", borderRadius: "8px", color: "#888" }}>
            No results available. Run aggregation in the Admin Panel first.
          </div>
        )}
      </div>
    </div>
  );
}


function App() {
  const [electionData, setElectionData] = useState<ElectionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isInitialized = false;

    const setup = async () => {
      if (isInitialized) return;

      try {
        await loadWasmModule();
        const params = await setupElection();

        const data: ElectionData = {
          id: "mock-election-id",
          n: params.n,
          h: params.h,
          ska: params.ska || new Uint8Array([111, 222, 111, 222, 111, 222, 111, 222]),
        };

        setElectionData(data);
        setLoading(false);
        isInitialized = true;
      } catch (err) {
        console.error("Setup failed:", err);
        setError("Failed to initialize the application");
        setLoading(false);
      }
    };

    setup();
  }, []);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading application...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        <ToastContainer position="top-right" theme="dark" aria-label="Notifications" />
        <Routes>
          <Route path="/" element={<ClientVoteView electionData={electionData!} />} />
          <Route
            path="/voter"
            element={<ClientVoteView electionData={electionData!} />}
          />
          <Route
            path="/results"
            element={<ResultsView />}
          />
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
