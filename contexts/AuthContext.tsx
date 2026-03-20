'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db } from '@/lib/db/database';
import { User, Farm } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface AuthContextType {
  user: User | null;
  farm: Farm | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, farmName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateFarm: (farm: Partial<Farm>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_TOKEN_KEY = 'farm_auth_token';
const USER_ID_KEY = 'farm_user_id';

// Simple password hashing using Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const newHash = await hashPassword(password);
  return newHash === hash;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const storedUserId = localStorage.getItem(USER_ID_KEY);
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
      
      if (storedUserId && storedToken) {
        const storedUser = await db.users.get(storedUserId);
        if (storedUser) {
          setUser(storedUser);
          const userFarm = await db.farms.where('userId').equals(storedUserId).first();
          if (userFarm) {
            setFarm(userFarm);
          }
        } else {
          // Token invalid, clear it
          localStorage.removeItem(USER_ID_KEY);
          localStorage.removeItem(AUTH_TOKEN_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!email || !password) {
        return { success: false, error: 'Email and password are required' };
      }

      const existingUser = await db.users.where('email').equals(email).first();
      
      if (!existingUser) {
        return { success: false, error: 'Invalid email or password' };
      }

      // Find password hash (if user was created with password)
      const passwordHash = existingUser.passwordHash || '';
      
      // For demo mode on first login, accept any password
      if (!passwordHash) {
        const newHash = await hashPassword(password);
        await db.users.update(existingUser.id, { passwordHash: newHash });
      } else {
        const isValid = await verifyPassword(password, passwordHash);
        if (!isValid) {
          return { success: false, error: 'Invalid email or password' };
        }
      }

      // Generate simple token
      const token = `token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      setUser(existingUser);
      const userFarm = await db.farms.where('userId').equals(existingUser.id).first();
      if (userFarm) {
        setFarm(userFarm);
      }
      
      localStorage.setItem(USER_ID_KEY, existingUser.id);
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An error occurred during login' };
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    farmName: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!name || !email || !password || !farmName) {
        return { success: false, error: 'All fields are required' };
      }

      if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters' };
      }

      const existingUser = await db.users.where('email').equals(email).first();
      if (existingUser) {
        return { success: false, error: 'Email already registered' };
      }

      const now = new Date().toISOString();
      const userId = uuidv4();
      const farmId = uuidv4();
      const passwordHash = await hashPassword(password);

      const newUser: User = {
        id: userId,
        email,
        name,
        farmName,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      };

      const newFarm: Farm = {
        id: farmId,
        userId,
        name: farmName,
        createdAt: now,
        updatedAt: now,
      };

      await db.users.add(newUser);
      await db.farms.add(newFarm);

      // Sync user and farm to Supabase
      try {
        await fetch('/api/sync/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newUser),
        });

        await fetch('/api/sync/farms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newFarm),
        });

        // Update sync status
        await db.users.update(userId, { updatedAt: new Date().toISOString() });
        await db.farms.update(farmId, { updatedAt: new Date().toISOString() });
      } catch (syncError) {
        console.warn('Failed to sync to Supabase, will retry later:', syncError);
      }

      // Generate token
      const token = `token_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      setUser(newUser);
      setFarm(newFarm);
      localStorage.setItem(USER_ID_KEY, userId);
      localStorage.setItem(AUTH_TOKEN_KEY, token);

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'An error occurred during registration' };
    }
  };

  const logout = () => {
    setUser(null);
    setFarm(null);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  };

  const updateFarm = async (updates: Partial<Farm>) => {
    if (!farm) return;
    
    const updatedFarm = {
      ...farm,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await db.farms.update(farm.id, updatedFarm);
    setFarm(updatedFarm);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        farm,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateFarm,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useFarmId() {
  const { farm } = useAuth();
  if (!farm) {
    throw new Error('No farm available');
  }
  return farm.id;
}