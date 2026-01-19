import React, { useState, useRef, useEffect } from 'react';
import { Menu, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ProfileModal from './ViewProfile';
import ChangePasswordModal from '../Pages/General/ChangePasswordModal';


function Header({ onToggleSidebar }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false); 
  const profileRef = useRef(null);
  const navigate = useNavigate();

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#4B553A] shadow flex justify-between items-center px-8 py-4 h-40">
      {/* Left: Logos */}
      <div className="flex items-center space-x-4">
        <Link to="/">
          <img src="/logo.png" alt="Main Logo" className="h-40" />
        </Link>
      
      </div>

      {/* Right: Sidebar toggle + Profile */}
      <div className="flex items-center space-x-4">
        {onToggleSidebar && (
          <button className="block md:hidden" onClick={onToggleSidebar}>
            <Menu color="white" />
          </button>
        )}

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="bg-white p-2 rounded-full shadow"
          >
            <User className="text-[#4B553A]" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg overflow-hidden z-50">
              {/* View Profile opens modal */}
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  setIsProfileOpen(true);
                }}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-black"
              >
                View Profile
              </button>

              {/* Change Password opens modal */}
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  setIsChangePasswordOpen(true);
                }}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-black"
              >
                Change Password
              </button>

              <button
                className="w-full text-left px-4 py-2 hover:bg-red-100 text-sm text-red-600"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </header>
  );
}

export default Header;
