import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

type Candidate = {
  name: string;
  votes: number;
};

type ElectionData = {
  stage: "application" | "voting" | "closed";
  candidateWhitelist: string[];
  totalVotes: number;
};

export default function Election() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
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
          "http://localhost:3000/election/current",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setElectionData(data);

        // Fetch data for each candidate
        const candidatesData = await Promise.all(
          data.candidateWhitelist.map(async (name: string) => {
            const response = await axios.get(
              `http://localhost:3000/candidate/${data.id}/${name}`
            );
            return { name, votes: response.data.votes };
          })
        );
        setCandidates(candidatesData);
      } catch (err: any) {
        setError(err.response?.data?.error || "Failed to fetch election data");
      }
    };

    fetchElectionData();
  }, [navigate]);

  const handleVote = async (candidateName: string) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        "http://localhost:3000/vote",
        { candidateName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Refresh candidate data after voting
      const response = await axios.get(
        `http://localhost:3000/candidate/${electionData?.id}/${candidateName}`
      );
      setCandidates((prev) =>
        prev.map((c) =>
          c.name === candidateName ? { ...c, votes: response.data.votes } : c
        )
      );
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
          <p className="text-lg text-gray-600">
            Current Stage:{" "}
            {electionData.stage.charAt(0).toUpperCase() +
              electionData.stage.slice(1)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {candidates.map((candidate) => (
            <div
              key={candidate.name}
              className="bg-white rounded-lg shadow-lg overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {candidate.name}
                </h3>
                <p className="text-gray-600 mb-4">Votes: {candidate.votes}</p>
                {electionData.stage === "voting" && (
                  <button
                    onClick={() => handleVote(candidate.name)}
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
