import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface RamadanContextType {
  isRamadan: boolean;
  setIsRamadan: (value: boolean) => void;
}

const RamadanContext = createContext<RamadanContextType | undefined>(undefined);

export const RamadanProvider = ({ children }: { children: ReactNode }) => {
  const [isRamadan, setIsRamadan] = useState<boolean>(false);

  // Load Ramadan state from localStorage on mount
  useEffect(() => {
    const savedIsRamadan = localStorage.getItem('isRamadan');
    if (savedIsRamadan !== null) {
      setIsRamadan(savedIsRamadan === 'true');
    }
  }, []);

  // Save to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('isRamadan', String(isRamadan));
  }, [isRamadan]);

  return (
    <RamadanContext.Provider value={{ isRamadan, setIsRamadan }}>
      {children}
    </RamadanContext.Provider>
  );
};

export const useRamadanContext = () => {
  const context = useContext(RamadanContext);
  if (context === undefined) {
    throw new Error('useRamadanContext must be used within a RamadanProvider');
  }
  return context;
};
