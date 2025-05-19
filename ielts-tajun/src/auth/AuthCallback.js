import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { startStatusPing } from '../utils/statusManager';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const token = params.get('token');
        const username = params.get('username');
        const email = params.get('email');
        const role = params.get('role');
        const user_id = params.get('user_id');
        const errorMsg = params.get('error');

        if (errorMsg) {
          setError(`Authentication failed: ${errorMsg}`);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (!token) {
          setError('No authentication token received');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        // Store user data in localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);
        localStorage.setItem('email', email);
        localStorage.setItem('role', role);
        localStorage.setItem('user_id', user_id);

        // Start status ping
        startStatusPing();

        // Redirect to home page
        navigate('/');
      } catch (err) {
        console.error('Error processing authentication callback:', err);
        setError('Failed to process authentication');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-teal-50/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        {error ? (
          <div className="text-center">
            <div className="text-red-500 text-xl font-semibold mb-4">Authentication Error</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <p className="text-gray-500">Redirecting to login page...</p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-lime-500 text-xl font-semibold mb-4">Authentication Successful</div>
            <p className="text-gray-600 mb-4">You have successfully logged in.</p>
            <p className="text-gray-500">Redirecting to dashboard...</p>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;