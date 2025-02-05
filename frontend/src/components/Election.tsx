import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Update the stage type
type ElectionStage = {
  application?: { application: {} };
  voting?: { voting: {} };
  closed?: { closed: {} };
};

type ElectionData = {
  stage: ElectionStage;
  candidateWhitelist: string[];
};

// Helper function to get current stage
const getCurrentStage = (stage: ElectionStage): string => {
  if (stage.application) return "application";
  if (stage.voting) return "voting";
  if (stage.closed) return "closed";
  return "unknown";
};

export default function Election() {
  const [electionData, setElectionData] = useState<ElectionData | null>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
      return;
    }

    const fetchElectionData = async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:3000/election/${
            import.meta.env.VITE_ELECTION_PUB_KEY
          }/candidates`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setElectionData({
          candidateWhitelist: data.candidates,
          stage: data.stage,
        });
        console.log(data);

        // Fetch data for each candidate
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to fetch election data");
        console.log(err);
      }
    };

    fetchElectionData();
  }, []);

  const handleVote = async (candidateName: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://localhost:3000/vote",
        { candidateName, electionId: import.meta.env.VITE_ELECTION_PUB_KEY },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(res.data);
      // Refresh candidate data after voting
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to cast vote");
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-500 text-center">{error}</div>
      </div>
    );
  }

  if (!electionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Voting System
          </h1>
          <p className="text-gray-600">
            Vote for your favorite candidate in this election.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {electionData.candidateWhitelist.map((candidate) => (
            <div
              key={candidate}
              className="bg-white rounded-lg shadow-lg overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {candidate}
                </h3>

                {getCurrentStage(electionData.stage) === "voting" && (
                  <button
                    onClick={() => handleVote(candidate)}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Vote
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
