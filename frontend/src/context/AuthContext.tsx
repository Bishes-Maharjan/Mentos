import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface UserData {
  _id: string;
  businessName: string;
  ownerName: string;
  pan: string;
  address: string;
  municipality: string;
  district: string;
  province: number | null;
  phone: string;
  email: string;
  vatRegistered: boolean;
  isNewBusiness: boolean;
  fiscalYearStart: string;
}

interface AuthContextType {
  user: UserData | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserData) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('kaji_token');
    const savedUser = localStorage.getItem('kaji_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('kaji_token');
        localStorage.removeItem('kaji_user');
      }
    }
    setIsLoading(false);
  }, []);

  function login(newToken: string, newUser: UserData) {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('kaji_token', newToken);
    localStorage.setItem('kaji_user', JSON.stringify(newUser));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('kaji_token');
    localStorage.removeItem('kaji_user');
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
