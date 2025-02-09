import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Check, AlertTriangle } from 'lucide-react';
import { fetchElection, fetchCandidates } from '../../store/slices/electionSlice';
import { RootState, AppDispatch } from '../../store';
// import axios from 'axios';
import toast from 'react-hot-toast';
import { api } from '../../api/axios';

const VoterDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentElection, candidates, isLoading } = useSelector((state: RootState) => state.election);
  // const { user } = useSelector((state: RootState) => state.auth);
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    const fetchCurrentElection = async () => {
      try {
        const response = await api.get('/election/current');
        if (response.data) {
          dispatch(fetchElection(response.data.id));
          dispatch(fetchCandidates(response.data.id));
          // Check if voter has already voted
          const voteStatus = await api.get(`/voter/status/${response.data.id}`);
          setHasVoted(voteStatus.data.hasVoted);
        }
      } catch (error) {
        toast.error('Failed to fetch election details');
      }
    };
    fetchCurrentElection();
  }, [dispatch]);

  const handleVote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentElection || !selectedCandidate) return;

    try {
      await api.post('/vote', {
        electionId: currentElection.id,
        candidateName: selectedCandidate,
      });
      toast.success('Vote cast successfully!');
      setHasVoted(true);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to cast vote';
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!currentElection) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Active Election</h2>
        <p className="text-gray-400">Please wait for an election to be created.</p>
      </div>
    );
  }

  if (hasVoted) {
    return (
      <div className="text-center py-12">
        <Check className="mx-auto h-12 w-12 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Vote Cast Successfully!</h2>
        <p className="text-gray-400">Thank you for participating in the election.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Cast Your Vote</h2>
        
        <div className="mb-6">
          <p className="text-gray-400 mb-2">Election Stage:</p>
          <p className="text-lg font-semibold capitalize">{currentElection.stage}</p>
        </div>

        {currentElection.stage === 'voting' ? (
          <form onSubmit={handleVote} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Select a Candidate</label>
              <div className="space-y-2">
                {candidates.map((candidate) => (
                  <label
                    key={candidate.name}
                    className="flex items-center p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                  >
                    <input
                      type="radio"
                      name="candidate"
                      value={candidate.name}
                      checked={selectedCandidate === candidate.name}
                      onChange={(e) => setSelectedCandidate(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500"
                    />
                    <span className="ml-3">{candidate.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedCandidate}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Cast Vote
            </button>
          </form>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="mx-auto h-8 w-8 text-yellow-500 mb-4" />
            <p className="text-gray-400">
              {currentElection.stage === 'application'
                ? 'Voting has not started yet. Please wait for the voting stage.'
                : 'Voting has ended. Results will be announced soon.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoterDashboard;