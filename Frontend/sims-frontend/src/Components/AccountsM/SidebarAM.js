// src/Components/Accounts/SidebarAM.js
import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaMoneyCheckAlt, FaChartLine, FaBell, FaSignOutAlt } from 'react-icons/fa';

const SidebarAM = ({ isOpen }) => {
  return (
    <aside
      className={`bg-white border-r shadow-md z-40 h-screen w-64 fixed top-16 left-0 transform transition-transform duration-300 ease-in-out 
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
    >
      <div className="flex flex-col h-full p-4">
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-4">Accounts Manager</h2>
          <nav className="flex flex-col space-y-2">
            <NavLink
              to="/payment"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded hover:bg-blue-100 ${
                  isActive ? 'bg-blue-200 font-semibold' : ''
                }`
              }
            >
              <FaMoneyCheckAlt /> Payment Approval
            </NavLink>

            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded hover:bg-blue-100 ${
                  isActive ? 'bg-blue-200 font-semibold' : ''
                }`
              }
            >
              <FaChartLine /> Financial Reports
            </NavLink>

            <NavLink
              to="/notifications"
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded hover:bg-blue-100 ${
                  isActive ? 'bg-blue-200 font-semibold' : ''
                }`
              }
            >
              <FaBell /> Notifications
            </NavLink>
          </nav>
        </div>

        <div>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
            className="flex items-center gap-2 px-4 py-2 rounded text-red-600 hover:bg-red-100 w-full mt-6"
          >
            <FaSignOutAlt /> Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default SidebarAM;
