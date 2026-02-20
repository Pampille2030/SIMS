import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser =
      localStorage.getItem('user') ||
      sessionStorage.getItem('user');

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    setLoading(false); // VERY IMPORTANT
  }, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
    localStorage.clear();
    sessionStorage.clear();
  };

  return (
    <UserContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </UserContext.Provider>
  );
};


// To use anywhere in your app
export const useUser = () => useContext(UserContext);
