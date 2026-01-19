import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';
import ChatWidget from '../Pages/Chat/ChatWidget';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <Header onToggleSidebar={toggleSidebar} />

      <div className="flex relative">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} />

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black opacity-30 z-30 md:hidden"
          />
        )}

        {/* Main content: completely independent, no sidebar width influence */}
        <main className="flex-1 pt-40 md:ml-80  overflow-auto">
          <Outlet />
        </main>

        {/* Chat Widget */}
        <ChatWidget />
      </div>
    </div>
  );
};

export default Layout;
