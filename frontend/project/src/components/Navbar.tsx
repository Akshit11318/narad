import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Vote, LogOut } from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import { RootState } from '../store';

const Navbar: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <nav className="bg-gray-800 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Vote className="h-8 w-8 text-blue-500" />
            <span className="text-xl font-bold">Narad</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-gray-300">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-gray-300 hover:text-white"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-gray-300 hover:text-white"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;