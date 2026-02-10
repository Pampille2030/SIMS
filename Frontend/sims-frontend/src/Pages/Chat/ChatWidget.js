import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import api from '../../Utils/api';
import { getCurrentUser } from '../../Utils/auth';

const parseTimestamp = (timestamp) => {
  if (!timestamp) return new Date();

  // If already a Date
  if (timestamp instanceof Date) return timestamp;

  // If number (unix seconds or ms)
  if (typeof timestamp === 'number') {
    return timestamp < 1e12
      ? new Date(timestamp * 1000)
      : new Date(timestamp);
  }

  // If string (ISO or Django datetime)
  if (typeof timestamp === 'string') {
    const date = new Date(timestamp); // ⬅️ NO "Z"
    if (!isNaN(date.getTime())) return date;
  }

  console.warn('Invalid timestamp:', timestamp);
  return new Date();
};




const formatMessageTime = (timestamp) => {
  try {
    const date = parseTimestamp(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting time:', error, timestamp);
    return 'Just now';
  }
};

const ChatWidget = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [recipient, setRecipient] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [socket, setSocket] = useState(null);
  const scrollRef = useRef(null);

  const roleDisplayNames = {
    StoreManager: 'Store Manager',
    ManagingDirector: 'Managing Director',
    AccountsManager: 'Accounts Manager',
  };

  // Initialize WebSocket and current user
  useEffect(() => {
    const initializeChat = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
      
      if (user) {
        const token = localStorage.getItem('access_token');
        const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
        const wsUrl = `${wsProtocol}${window.location.host}/ws/chat/${user.id}/?token=${token}`;
        
        const newSocket = new WebSocket(wsUrl);
        
        newSocket.onopen = () => {
          console.log('WebSocket connected');
          setSocket(newSocket);
        };

        newSocket.onmessage = (e) => {
          const data = JSON.parse(e.data);
          if (data.type === 'chat_message') {
            setMessages(prev => [...prev, {
              id: data.message_id,
              text: data.message,
              sender: {
                id: data.sender_id,
                username: data.sender_username
              },
              timestamp: data.sent_at || new Date().toISOString()
            }]);
          }
        };

        newSocket.onclose = () => {
          console.log('WebSocket disconnected');
          setTimeout(initializeChat, 5000);
        };

        newSocket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        setSocket(newSocket);
      }
    };

    initializeChat();

    return () => {
      if (socket) socket.close();
    };
  }, []);

  // Load eligible recipients
  useEffect(() => {
    if (!currentUser) return;

    const loadRecipients = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/chat/managers/');
        // Only filter out current user (backend handles role filtering)
        const eligibleUsers = response.data.filter(user => user.id !== currentUser.id);
        
        setRecipients(eligibleUsers);
        setRecipient(eligibleUsers[0] || null);
      } catch (err) {
        console.error('Failed to load recipients:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecipients();
  }, [currentUser]);

  // Load conversation when recipient changes
  useEffect(() => {
    if (!isOpen || !recipient) return;

    const fetchConversation = async () => {
      try {
        const response = await api.post('/chat/start_or_get_conversation/', {
          user_id: recipient.id,
        });
        setConversationId(response.data.id);
        fetchMessages(response.data.id);
      } catch (err) {
        console.error('Error fetching conversation:', err);
      }
    };

    const fetchMessages = async (convId) => {
      try {
        const response = await api.get(`/chat/conversations/${convId}/messages/`);
        const normalizedMessages = response.data.map(msg => ({
          ...msg,
          sender: {
            id: msg.sender?.id || msg.sender_id,
            username: msg.sender?.username || msg.sender_username
          },
          timestamp: msg.sent_at || msg.timestamp || new Date().toISOString()
        }));
        setMessages(normalizedMessages);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };

    fetchConversation();
  }, [recipient, isOpen]);

  // Auto-scroll to newest message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!chatInput.trim() || !conversationId || !socket || isSending) return;
    
    setIsSending(true);
    const tempMessageId = Date.now();

    try {
      // Optimistic update
      setMessages(prev => [...prev, {
        id: tempMessageId,
        text: chatInput,
        sender: {
          id: currentUser.id,
          username: currentUser.username
        },
        timestamp: new Date().toISOString()
      }]);

      setChatInput('');

      // Send via WebSocket
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'chat_message',
          conversation_id: conversationId,
          message: chatInput,
          sender_id: currentUser.id,
          sender_username: currentUser.username,
          recipient_id: recipient.id,
          temp_id: tempMessageId
        }));
      }

      // Persist via API
      await api.post(`/chat/conversations/${conversationId}/messages/`, {
        text: chatInput,
      });

    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
    } finally {
      setIsSending(false);
    }
  };

  const getSenderDisplay = (sender) => {
    if (!sender) return 'Unknown';
    return sender.id === currentUser?.id ? 'Me' : sender.username || 'Unknown';
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#4B553A] p-4 rounded-full shadow-lg hover:bg-[#3a432e] transition-colors"
        >
          <MessageCircle className="text-white" />
        </button>
      ) : (
        <div className="w-80 h-96 bg-white rounded-lg shadow-xl flex flex-col overflow-hidden">
          <div className="bg-[#4B553A] text-white px-4 py-2 flex justify-between items-center">
            <span className="font-semibold">
              Chat with {recipient?.username || '...'}
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-2 text-sm bg-gray-50">
            {messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-2 rounded max-w-[75%] ${
                    msg.sender?.id === currentUser?.id
                      ? 'bg-green-100 text-right ml-auto'
                      : 'bg-gray-100 text-left mr-auto'
                  }`}
                >
                  <div>{msg.text}</div>
                  <div className="text-xs text-gray-500">
                    {getSenderDisplay(msg.sender)} • {formatMessageTime(msg.timestamp)}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                No messages yet
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          <div className="px-2 pt-2 border-t border-gray-200">
            <label className="block text-sm font-medium mb-1 text-gray-700">Send to:</label>
            {isLoading ? (
              <div className="w-full px-2 py-2 border rounded text-sm text-gray-500 bg-gray-100">
                Loading recipients...
              </div>
            ) : recipients.length > 0 ? (
              <select
                value={recipient?.id || ''}
                onChange={(e) => {
                  const selected = recipients.find(r => r.id.toString() === e.target.value);
                  if (selected) setRecipient(selected);
                }}
                className="w-full px-2 py-2 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#4B553A]"
              >
                {recipients.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username} ({roleDisplayNames[user.role] || user.role})
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full px-2 py-2 border rounded text-sm text-gray-500 bg-gray-100">
                {currentUser ? 'No other managers available' : 'Not logged in'}
              </div>
            )}
          </div>

          <div className="p-2 border-t border-gray-200 flex space-x-2 bg-gray-50">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              type="text"
              className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-1 focus:ring-[#4B553A]"
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === 'Enter' && !isSending && handleSend()}
              disabled={isSending}
            />
            <button
              onClick={handleSend}
              className={`bg-[#4B553A] text-white px-4 py-2 rounded hover:bg-[#3a432e] transition-colors ${
                isSending ? 'opacity-70 cursor-not-allowed' : ''
              }`}
              disabled={!chatInput.trim() || isSending}
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;