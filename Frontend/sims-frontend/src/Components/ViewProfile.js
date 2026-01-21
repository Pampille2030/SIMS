import React, { useEffect, useState } from 'react';
import api from '../Utils/api';

const ProfileModal = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const fetchProfile = async () => {
        try {
          const response = await api.get('/auth/me/');
          setProfile(response.data);
        } catch (error) {
          console.error('Failed to fetch profile:', error);
        }
      };
      fetchProfile();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white w-full max-w-lg p-6 rounded-xl shadow-lg relative">
        <button
          className="absolute top-3 right-3 text-gray-600 hover:text-red-500"
          onClick={onClose}
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-[#4B553A] mb-4">My Profile</h2>

        {profile ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Full Name:</span>
              <span>{profile.username}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Email:</span>
              <span>{profile.email}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Role:</span>
              <span className="capitalize">{profile.role}</span>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">Loading profile...</p>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
