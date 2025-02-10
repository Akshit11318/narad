import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Award, Activity } from 'lucide-react';
import { fetchElection, fetchCandidates } from '../../store/slices/electionSlice';
import { RootState, AppDispatch } from '../../store';
// import axios from 'axios';
import { api } from '../../api/axios';
import toast from 'react-hot-toast';

/// Manager Dashboard component.
///
/// This component displays the manager dashboard and provides functionality
/// to create elections, add voters, register candidates, and manage election stages.
const ManagerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentElection, isLoading } = useSelector((state: RootState) => state.election);
  
  const [totalVotes, setTotalVotes] = useState('');
  const [totalCandidates, setTotalCandidates] = useState('');
  const [voterId, setVoterId] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  const [electionDetails, setElectionDetails] = useState(null);

  /// Handles the logout functionality.
  ///
  /// Removes the manager token from local storage and navigates to the login page.
  const handleLogout = () => {
    localStorage.removeItem('managerToken');
    navigate('/manager/login');
  };

  useEffect(() => {
    if (currentElection?.id) {
      dispatch(fetchElection(currentElection.id));
      dispatch(fetchCandidates(currentElection.id));
    }
  }, [dispatch, currentElection?.id]);

  useEffect(() => {
    const fetchCurrentElection = async () => {
      if (currentElection?.id) {
        try {
          await api.get(`/election/${currentElection.id}`);
          dispatch(fetchElection(currentElection.id));
        } catch (error) {
          console.error('Failed to fetch election details:', error);
        }
      }
    };

    fetchCurrentElection();
    const interval = setInterval(fetchCurrentElection, 5000); // Poll every 5 seconds
    
    return () => clearInterval(interval);
  }, [currentElection?.id, dispatch]);
  
  const handleCreateElection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentElection) {
      toast.error('An election is already in progress');
      return;
    }
    
    try {
      const response = await api.post('/create-election', {
        totalVotes: parseInt(totalVotes),
        totalCandidates: parseInt(totalCandidates),
      });
      toast.success('Election created successfully!');
      dispatch(fetchElection(response.data.electionId));
    } catch (error) {
      console.log(error);
      toast.error('Failed to create election');
    }
  };

  const handleAddVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentElection) return;
    
    try {
      await api.post('/add-voter', {
        electionKey: currentElection.id,
        voterId,
      });
      toast.success('Voter added successfully!');
      setVoterId('');
    } catch (error) {
      toast.error('Failed to add voter');
    }
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentElection) return;

    try {
      await api.post('/add-candidate', {
        electionId: currentElection.id,
        candidateName: candidateName,
      });
      toast.success('Candidate added successfully!');
      setCandidateName('');
      dispatch(fetchCandidates(currentElection.id));
    } catch (error) {
      toast.error('Failed to add candidate');
    }
  };

  const handleChangeStage = async (stage: 'application' | 'voting' | 'closed') => {
    if (!currentElection) return;
    
    try {
      await api.post('/change-stage', {
        electionId: currentElection.id,
        stage,
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('managerToken')}`
        }
      });
      
      // Immediately fetch updated election data
      await api.get(`/election/${currentElection.id}`);
      dispatch(fetchElection(currentElection.id));
      toast.success(`Election stage changed to ${stage}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change election stage');
    }
  };

  const handleShowStatus = async () => {
    if (!currentElection?.id) return;
    
    try {
      const response = await api.get(`/election/${currentElection.id}`);
      setElectionDetails(response.data);
      setShowStatus(true);
    } catch (error) {
      toast.error('Failed to fetch election details');
    }
  };

  const ElectionStatus: React.FC<{ election: any }> = ({ election }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <h3 className="text-xl font-bold mb-4">Election Status Details</h3>
          <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
            <code className="text-sm text-green-400">
              {JSON.stringify(election, null, 2)}
            </code>
          </pre>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between">
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg"
        >
          Logout
        </button>
        
        <button
          onClick={handleShowStatus}
          disabled={!currentElection}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg"
        >
          View Election Details
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Rest of the JSX remains the same */}
        {/* Create Election Form */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Plus className="mr-2" /> Create New Election
          </h2>
          <form onSubmit={handleCreateElection} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Total Votes</label>
              <input
                type="number"
                value={totalVotes}
                onChange={(e) => setTotalVotes(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Total Candidates</label>
              <input
                type="number"
                value={totalCandidates}
                onChange={(e) => setTotalCandidates(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
            >
              Create Election
            </button>
          </form>
        </div>

        {/* Add Voter Form */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Users className="mr-2" /> Add Voter
          </h2>
          <form onSubmit={handleAddVoter} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Voter ID/Email</label>
              <input
                type="email"
                value={voterId}
                onChange={(e) => setVoterId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg"
              disabled={!currentElection}
            >
              Add Voter
            </button>
          </form>
        </div>

        {/* Add Candidate Form */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Award className="mr-2" /> Register Candidate
          </h2>
          <form onSubmit={handleAddCandidate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Candidate Name</label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg"
              disabled={!currentElection}
            >
              Register Candidate
            </button>
          </form>
        </div>

        {/* Election Status */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <Activity className="mr-2" /> Election Status
          </h2>
          {currentElection ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-400">Election ID</p>
                <p className="font-mono text-sm">{currentElection.id}</p>
              </div>
              <div className="p-4 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-400">Current Stage</p>
                <p className="capitalize font-semibold">{currentElection.stage}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleChangeStage('application')}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm"
                >
                  Application
                </button>
                <button
                  onClick={() => handleChangeStage('voting')}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
                >
                  Voting
                </button>
                <button
                  onClick={() => handleChangeStage('closed')}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
                >
                  Closed
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">No active election</p>
          )}
        </div>
      </div>
      
      {showStatus && electionDetails && (
        <div onClick={() => setShowStatus(false)} className="cursor-pointer">
          <ElectionStatus election={electionDetails} />
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
