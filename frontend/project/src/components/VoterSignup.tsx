import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import toast from 'react-hot-toast';

const VoterSignup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const response = await api.post('/auth/voter/signup', {
        email,
        password
      });
      
      const { token } = response.data;
      localStorage.setItem('token', token);
      toast.success('Registration successful!');
      navigate('/voter');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to register';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-white">Voter Registration</h2>
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-white">Whitelisted Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>
          <div>
            <label className="text-white">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>
          <div>
            <label className="text-white">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            Register
          </button>
        </form>
      </div>
    </div>
  );
};

export default VoterSignup;