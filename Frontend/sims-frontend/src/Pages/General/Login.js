import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../../Utils/api';
import { useUser } from '../../Components/Context/UserContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
  const response = await api.post('/auth/login/', { email, password });

  const { access, refresh } = response.data;
  if (!access || !refresh) throw new Error('Missing tokens');

  const decoded = jwtDecode(access);
  const role = decoded?.role;
  if (!role) throw new Error('Missing role');

  // Defines userData BEFORE storing it
  const userData = {
    email,
    role: role.toLowerCase(),
  };

  // Store tokens based on "Remember Me"
  if (rememberMe) {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    localStorage.setItem('user', JSON.stringify(userData));
  } else {
    sessionStorage.setItem('accessToken', access);
    sessionStorage.setItem('refreshToken', refresh);
    sessionStorage.setItem('user', JSON.stringify(userData));
  }

  // Update context
  login(userData);

  // Navigate based on role
  switch (userData.role) {
    case 'storemanager':
      navigate('/inventory/issue-out');
      break;
    case 'managingdirector':
      navigate('/orderapproval');
      break;
    case 'accountsmanager':
      navigate('/payment');
      break;
    case 'humanresourcemanager':
      navigate('/hr/employees/add');
      break;
    default:
      navigate('/');
  }
} catch (err) {
  console.error('Login error:', err);
  setError('Invalid email or password');
}

  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#4B553A]">
      <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold mb-6 text-center text-[#4B553A]">Login</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-[#4B553A] focus:border-[#4B553A]"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-[#4B553A] focus:border-[#4B553A]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-[#4B553A]"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2 text-gray-700">
              <input
                type="checkbox"
                className="form-checkbox text-[#4B553A]"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <Link to="/forgotpassword" className="text-[#4B553A] hover:underline">
              Forgot Password?
            </Link>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-[#4B553A] text-white py-2 rounded-md hover:bg-[#3a442e] transition duration-200"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
