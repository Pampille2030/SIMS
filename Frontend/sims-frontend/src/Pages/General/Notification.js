import React, { useState, useEffect } from 'react';
import api from '../../Utils/api'; // Your existing axios instance

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch notifications from Django notifications_app API
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('notifications/');
      setNotifications(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle clicking a notification (mark as read visually)
  const handleNotificationClick = async (id) => {
    try {
      // Optionally mark as read in backend if you have that endpoint
      await api.post(`notifications/${id}/read/`, {});
      setNotifications(prev => prev.map(notif =>
        notif.id === id ? { ...notif, is_read: true } : notif
      ));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  if (loading) {
    return (
      <div className="p-6 mt-20">
        <h1 className="text-3xl font-bold mb-6 text-[#4B553A]">System Notifications</h1>
        <div className="flex justify-center items-center h-40">
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 mt-20">
        <h1 className="text-3xl font-bold mb-6 text-[#4B553A]">System Notifications</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <button 
            onClick={fetchNotifications}
            className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 mt-20">
      <h1 className="text-3xl font-bold text-[#4B553A] mb-6">System Notifications</h1>

      {notifications.length === 0 ? (
        <p className="text-gray-600">No notifications available.</p>
      ) : (
        <div className="space-y-4">
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              className={`bg-white border rounded shadow p-4 flex flex-col cursor-pointer ${
                !notif.is_read ? 'border-l-4 border-l-[#4B553A] bg-blue-50' : ''
              }`}
              onClick={() => handleNotificationClick(notif.id)}
            >
              <p className="text-sm text-gray-500 mb-1">
                {new Date(notif.created_at).toLocaleDateString()} • 
                {notif.time_ago && ` ${notif.time_ago}`}
              </p>
              <p className={`text-gray-800 ${!notif.is_read ? 'font-bold' : 'font-normal'}`}>
                {notif.message}
              </p>
              {notif.link && (
                <a 
                  href={notif.link} 
                  className="text-[#4B553A] hover:text-[#3a4230] text-sm mt-2 inline-block"
                >
                  View Details →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
