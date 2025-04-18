import { useState, useEffect } from "react";
import "./App.css";
import {
  loadWasmModule,
  generateSecretKey,
  getSecretKey,
  initCryptoParams,
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
  useParams,
  useNavigate,
} from "react-router-dom";

interface ElectionData {
  id: string;
  n: Uint8Array | number[];
  h: Uint8Array | number[];
  ska: Uint8Array | number[];
}

// ClientVoteView component to replace the ClientVote.js component
interface ClientVoteViewProps {
  electionData: ElectionData;
}

const ClientVoteView = ({ electionData }: ClientVoteViewProps) => {
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(
    null
  );
  const [submitting, setSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();

  // Function to handle candidate selection
  const handleCandidateSelect = (candidateId: number) => {
    setSelectedCandidate(candidateId);
  };

  const handleSubmitVote = async () => {
    if (selectedCandidate === null) {
      toast.error("Please select a candidate");
      return;
    }

    try {
      setSubmitting(true);
      console.log(electionData);
      await submitVote(selectedCandidate, "voter", {
        n: electionData.n,
        h: electionData.h,
        ska: electionData.ska,
      });

      toast.success("Vote submitted successfully!");
      navigate("/voter");
    } catch (error) {
      console.error("Error submitting vote:", error);
      toast.error("Failed to submit vote. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-container">
      {/* Top Banner with Election Parameters */}
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
          <span className="param-value">
            {formatByteArray(electionData.ska)}
          </span>
        </div>
        <div className="election-status">
          <span className="status-indicator">Testing Deployment</span>
        </div>
      </div>

      <div className="main-content">
        <h1>Select Your Candidate</h1>
        <p className="instruction">Choose one candidate and submit your vote</p>

        <div className="candidates-grid">
          {[1, 2, 3, 4].map((candidateId) => (
            <div
              key={candidateId}
              className={`candidate-card ${
                selectedCandidate === candidateId ? "selected" : ""
              }`}
              onClick={() => handleCandidateSelect(candidateId)}
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
          disabled={selectedCandidate === null || submitting}
        >
          {submitting ? "Submitting..." : "Submit Vote"}
        </button>
      </div>

      <footer className="app-footer">
        <p>Secure Voting System - WASM Powered Encryption</p>
      </footer>
    </div>
  );
};

function App() {
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(
    null
  );
  const [electionData, setElectionData] = useState<ElectionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [wasmLoaded, setWasmLoaded] = useState<boolean>(false);
  const [secretKey, setSecretKey] = useState<Uint8Array | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Load WebAssembly module and initialize crypto parameters on component mount
  useEffect(() => {
    // Track initialization state to prevent duplicate logging
    let isInitialized = false;

    const setup = async () => {
      if (isInitialized) return;

      try {
        console.log("Starting application setup...");

        // Load WASM module first
        await loadWasmModule();
        setWasmLoaded(true);

        // Fetch election parameters from backend
        const params = await setupElection();

        // Initialize crypto parameters with fetched values - setupElection already does this
        // so we don't need to call initCryptoParams again

        // Generate secret key
        // const result = await generateSecretKey(params.n);
        // if (result === 0) {
        //   const key = await getSecretKey();
        //   setSecretKey(key);
        // } else {
        //   console.error("Failed to generate secret key");
        // }

        // Create election data with fetched parameters
        const electionData: ElectionData = {
          id: "mock-election-id",
          n: params.n,
          h: params.h,
          ska:
            params.ska ||
            new Uint8Array([111, 222, 111, 222, 111, 222, 111, 222]), // Use fetched SKA or fallback
        };

        setElectionData(electionData);
        setLoading(false);
        isInitialized = true;
        console.log("Application setup completed successfully");
      } catch (err) {
        console.error("Setup failed:", err);
        setError("Failed to initialize the application");
        setLoading(false);
      }
    };

    setup();
  }, []);

  // Helper function to display byte arrays in a readable format
  const formatByteArray = (array: Uint8Array | number[] | null): string => {
    if (!array) return "Not available";

    // Convert to hex string and limit display length
    const hex = Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return hex.length > 20 ? `${hex.substring(0, 20)}...` : hex;
  };

  const handleCandidateSelect = (candidateId: number) => {
    setSelectedCandidate(candidateId);
  };

  const handleSubmitVote = async () => {
    if (selectedCandidate === null) {
      toast.error("Please select a candidate");
      return;
    }

    if (!electionData || !wasmLoaded) {
      toast.error("System not ready. Please try again later.");
      return;
    }

    try {
      setSubmitting(true);

      // Submit the vote using the wasmModule function
      await submitVote(selectedCandidate, "voter", {
        n: electionData.n,
        h: electionData.h,
      });

      toast.success("Vote submitted successfully!");
      // Reset selection after successful submission
      setSelectedCandidate(null);
    } catch (error) {
      console.error("Error submitting vote:", error);
      toast.error("Failed to submit vote. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
        <ToastContainer position="top-right" theme="dark" />
        <Routes>
          <Route path="/" element={<Navigate to="/voter" />} />
          <Route
            path="/voter"
            element={<ClientVoteView electionData={electionData!} />}
          />
          <Route
            path="/results"
            element={
              <div className="results-container">
                <div className="results-container">
                  <div className="election-banner">
                    <div className="election-param">
                      <span className="param-label">N:</span>
                      <span className="param-value">
                        {formatByteArray(electionData?.n)}
                      </span>
                    </div>
                    <div className="election-param">
                      <span className="param-label">H:</span>
                      <span className="param-value">
                        {formatByteArray(electionData?.h)}
                      </span>
                    </div>
                    <div className="election-param">
                      <span className="param-label">SKA:</span>
                      <span className="param-value">
                        {formatByteArray(electionData?.ska)}
                      </span>
                    </div>
                    <div className="election-status">
                      <span className="status-indicator">
                        Testing Deployment
                      </span>
                    </div>
                  </div>
                  <div className="main-content">
                    <h1>Election Results</h1>
                    <p className="instruction">
                      Results will be displayed here after voting is complete
                    </p>
                    <div className="results-display">
                      <div className="result-card">
                        <h2>Vote Count</h2>
                        <p>Waiting for votes to be tallied...</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
