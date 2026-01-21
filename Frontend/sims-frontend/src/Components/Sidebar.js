import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useUser } from './Context/UserContext';

const Sidebar = ({ isOpen }) => {
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const { user } = useUser();

  const normalizedRole = user?.role?.toLowerCase();

  const isStoreManager = normalizedRole === 'storemanager';
  const isManagingDirector = normalizedRole === 'managingdirector';
  const isAccountsManager = normalizedRole === 'accountsmanager';

  return (
    <aside
      className={`
        ${isOpen ? 'block absolute z-40 w-80' : 'hidden'}
        md:block md:w-80
        bg-gray-700 text-white shadow-md
        fixed top-40 left-0
        h-[calc(100vh-10rem)] /* full height below header */
        overflow-y-auto
        transition-all duration-300
      `}
    >
      <nav className="flex flex-col p-6 space-y-6 text-lg font-bold">
        {/* Store Manager Menu */}
        {isStoreManager && (
          <div>
            <button
              onClick={() => setInventoryOpen(!inventoryOpen)}
              className="flex items-center w-full text-left px-2 py-1 rounded hover:text-yellow-300 hover:bg-black/10 transition-colors"
            >
              <span className="mr-2">📦</span> Inventory Management
            </button>
            {inventoryOpen && (
              <div className="ml-4 mt-2 space-y-2 text-base">
                <NavLink to="/inventory/issue-out" className={navStyle}>Issue Out</NavLink>
                <NavLink to="/inventory/newitem" className={navStyle}>New Item</NavLink>
               <NavLink to="purchaserequest" className={navStyle}>Purchase Request</NavLink>
                <NavLink to="/inventory/purchase-order" className={navStyle}>Purchase Order</NavLink>
                <NavLink to="/inventory/stock-in" className={navStyle}>Stock In</NavLink>
                <NavLink to="/inventory/return-item" className={navStyle}>Return Item</NavLink>

              </div>
            )}
          </div>
        )}

{/* Managing Director */}
{isManagingDirector && (
  <div className="space-y-2">

    <NavLink to="/PORequest" className={navStyle}>
      <span className="mr-2">✅</span> Purchase Order Request
    </NavLink>
    <NavLink to="/orderapproval" className={navStyle}>
      <span className="mr-2">✅</span>Purchase Order Approval
    </NavLink>

        
    <NavLink to="/issueoutApproval" className={navStyle}>
      <span className="mr-2">📤</span> Issue Out Approval
    </NavLink>
    <NavLink to="/VehicleFuelApproval" className={navStyle}>
      <span className="mr-2">📤</span> Vehicle Fuel Approval
    </NavLink>
        
    
    <NavLink to="/EmployeeApproval" className={navStyle}>
      <span className="mr-2">👥</span>New Employee Approval
    </NavLink>

  </div>
)}


        {/* Accounts Manager */}
        {isAccountsManager && (
          <NavLink to="/payment" className={navStyle}>
            <span className="mr-2">💳</span> Payment Approval
          </NavLink>
        )}
        
        {/* HR Menu */}
{normalizedRole === 'humanresourcemanager' && (
  <div className="space-y-2">
    <NavLink to="/hr/employees/add" className={navStyle}>
      <span className="mr-2">👤</span> Add Employee
    </NavLink>
    <NavLink to="/hr/attendance" className={navStyle}>
      <span className="mr-2">🗓️</span> Mark Attendance
    </NavLink>
  </div>
)}


        {/* Report Management */}
        <div>
          <button
            onClick={() => setReportsOpen(!reportsOpen)}
            className="flex items-center w-full text-left px-2 py-1 rounded hover:text-yellow-300 hover:bg-black/10 transition-colors"
          >
            <span className="mr-2">📊</span> Report Management
          </button>
          {reportsOpen && (
            <div className="ml-4 mt-2 space-y-2 text-base">
              <NavLink to="/General/reports" className={navStyle}>
                <span className="mr-2">📋</span> Inventory Reports
              </NavLink>
                  <NavLink to="/inventory/stock" className={navStyle}>
      <span className="mr-2"> 📋 </span> Stock Quantity
    </NavLink>
          <NavLink to="/reports/write" className={navStyle}>
            <span className="mr-2">📝</span> Write Reports
          </NavLink>

            </div>
          )}
        </div>

        {/* Notifications */}
        <NavLink to="/Notifications" className={navStyle}>
          <span className="mr-2">🔔</span> Notifications
        </NavLink>
      </nav>
    </aside>
  );
};

const navStyle = ({ isActive }) =>
  `flex items-center px-2 py-1 rounded transition-colors ${
    isActive ? 'text-yellow-300 bg-black/10' : 'hover:text-yellow-300 hover:bg-black/10'
  }`;

export default Sidebar;
