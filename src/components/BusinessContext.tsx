"use client";

import { createContext, useContext } from "react";

export interface BusinessOption {
  id: string;
  name: string;
}

export interface BusinessContextValue {
  businesses: BusinessOption[];
  activeBusinessId: string | null;
  isBusinessLoading: boolean;
  businessError: string | null;
  selectBusiness: (id: string) => void;
  refreshBusinesses: (preferredId?: string) => Promise<void>;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessContextProvider({
  value,
  children,
}: {
  value: BusinessContextValue;
  children: React.ReactNode;
}) {
  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusinessContext(): BusinessContextValue {
  const context = useContext(BusinessContext);
  if (!context) throw new Error("useBusinessContext, AppShell içinde kullanılmalıdır.");
  return context;
}
