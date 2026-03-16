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
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, farmName: string) => Promise<boolean>;
  logout: () => void;
  updateFarm: (farm: Partial<Farm>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_USER_KEY = 'farm_demo_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const storedUserId = localStorage.getItem(DEMO_USER_KEY);
      if (storedUserId) {
        const storedUser = await db.users.get(storedUserId);
        if (storedUser) {
          setUser(storedUser);
          const userFarm = await db.farms.where('userId').equals(storedUserId).first();
          if (userFarm) {
            setFarm(userFarm);
          }
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, _password: string): Promise<boolean> => {
    try {
      const existingUser = await db.users.where('email').equals(email).first();
      
      if (existingUser) {
        setUser(existingUser);
        const userFarm = await db.farms.where('userId').equals(existingUser.id).first();
        if (userFarm) {
          setFarm(userFarm);
        }
        localStorage.setItem(DEMO_USER_KEY, existingUser.id);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (
    name: string,
    email: string,
    _password: string,
    farmName: string
  ): Promise<boolean> => {
    try {
      const existingUser = await db.users.where('email').equals(email).first();
      if (existingUser) {
        return false;
      }

      const now = new Date().toISOString();
      const userId = uuidv4();
      const farmId = uuidv4();

      const newUser: User = {
        id: userId,
        email,
        name,
        farmName,
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

      setUser(newUser);
      setFarm(newFarm);
      localStorage.setItem(DEMO_USER_KEY, userId);

      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setFarm(null);
    localStorage.removeItem(DEMO_USER_KEY);
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