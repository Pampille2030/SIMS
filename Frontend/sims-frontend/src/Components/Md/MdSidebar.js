import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const SidebarMD = ({ isOpen }) => {
  const [approvalsOpen, setApprovalsOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  return (
    <aside
      className={`${isOpen ? 'block absolute z-40 w-80' : 'hidden'} 
                  md:relative md:block bg-gray-700 text-white 
                  h-[calc(100vh-10rem)] shadow-md top-40 transition-all duration-300`}
      aria-hidden={!isOpen}
    >
      <div className="flex flex-col h-full">
        <nav className="flex flex-col pl-8 px-8 py-8 space-y-8 text-lg font-bold">

          {/* Approval Section */}
          <div>
            <button
              onClick={() => setApprovalsOpen(!approvalsOpen)}
              className="w-full text-left px-2 py-1 rounded hover:text-yellow-300 hover:bg-black/10 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-expanded={approvalsOpen}
              aria-controls="approvals-menu"
            >
              Approval Section
            </button>
            {approvalsOpen && (
              <div id="approvals-menu" className="ml-4 mt-2 space-y-2 text-base">
                <NavLink to="/orderapproval" className={({ isActive }) =>
                  `block px-2 py-1 rounded transition-colors ${
                    isActive ? 'text-yellow-300 bg-black/10' : 'hover:text-yellow-300 hover:bg-black/10'
                  }`}>
                  Purchase Order Approval
                </NavLink>
                <NavLink to="/issueoutApproval" className={({ isActive }) =>
                  `block px-2 py-1 rounded transition-colors ${
                    isActive ? 'text-yellow-300 bg-black/10' : 'hover:text-yellow-300 hover:bg-black/10'
                  }`}>
                  Issue Out Approval
                </NavLink>
              </div>
            )}
          </div>

          {/* Reports Section */}
          <div>
            <button
              onClick={() => setReportsOpen(!reportsOpen)}
              className="w-full text-left px-2 py-1 rounded hover:text-yellow-300 hover:bg-black/10 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
              aria-expanded={reportsOpen}
              aria-controls="reports-menu"
            >
              Reports
            </button>
            {reportsOpen && (
              <div id="reports-menu" className="ml-4 mt-2 space-y-2 text-base">
                <NavLink to="/General/reports" className={({ isActive }) =>
                  `block px-2 py-1 rounded transition-colors ${
                    isActive ? 'text-yellow-300 bg-black/10' : 'hover:text-yellow-300 hover:bg-black/10'
                  }`}>
                  General Reports
                </NavLink>
              </div>
            )}
          </div>

        </nav>

        {/* Logout */}
        <div className="mt-auto p-6 border-t border-black/30">
          <button className="w-full text-left px-2 py-1 rounded hover:text-red-500 hover:bg-black/10 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500">
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default SidebarMD;
