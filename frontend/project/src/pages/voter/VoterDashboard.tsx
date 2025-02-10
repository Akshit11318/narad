import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import toast from 'react-hot-toast';

interface Candidate {
  name: string;
  votes: number;
}

const VoterDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [electionId, setElectionId] = useState<string | null>(null);
  const [electionStage, setElectionStage] = useState<string>('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Instead of reading electionId from local storage, fetch it (with stage) from backend.
  useEffect(() => {
    const fetchCurrentElection = async () => {
      try {
        // This endpoint should return { electionId, stage } for the current election.
        const res = await api.get('/election/current');
        const { electionId: fetchedElectionId, stage } = res.data;
        setElectionId(fetchedElectionId);
        setElectionStage(stage);

        // Fetch candidates using the election's public key.
        const candidateRes = await api.get(`/election/${fetchedElectionId}/candidates`);
        // Assuming candidateRes.data.candidates is an array of candidate objects or names.
        setCandidates(candidateRes.data.candidates);
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Failed to fetch election data');
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentElection();
  }, [navigate]);

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!electionId || !selectedCandidate) {
      toast.error('Please select a candidate.');
      return;
    }

    try {
      await api.post('/vote', {
        electionId,
        candidateName: selectedCandidate,
      });
      toast.success('Vote cast successfully!');
      setHasVoted(true);
      // Log out the voter after voting.
      setTimeout(() => {
        localStorage.removeItem('token'); // Clear any stored JWT, if applicable.
        navigate('/login', { replace: true });
      }, 3000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Vote failed');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading election details...
      </div>
    );
  }

  // If the election stage is not voting, show a message.
  if (electionStage !== 'voting') {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <h2>Voting is not active currently.</h2>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <h2 className="mb-4">Thank you for voting!</h2>
        <p>You will be logged out shortly.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl mb-4">Cast Your Vote</h2>
      <form onSubmit={handleVote}>
        <div className="mb-4">
          {candidates.map((candidate: Candidate | string) => {
            // Handle candidate as either an object or a simple string.
            const candidateName = typeof candidate === 'string' ? candidate : candidate.name;
            return (
              <div key={candidateName} className="mb-2">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="candidate"
                    value={candidateName}
                    checked={selectedCandidate === candidateName}
                    onChange={(e) => setSelectedCandidate(e.target.value)}
                    className="mr-2"
                  />
                  {candidateName}
                </label>
              </div>
            );
          })}
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
        >
          Vote
        </button>
      </form>
    </div>
  );
};

export default VoterDashboard;