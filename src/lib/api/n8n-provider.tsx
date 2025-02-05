"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createN8nClient } from "./n8n";

interface N8nContextType {
  client: ReturnType<typeof createN8nClient> | null;
  isConfigured: boolean;
  configure: (apiKey: string, baseUrl: string, anthropicKey: string) => void;
  clear: () => void;
  anthropicKey: string | null;
}

const N8nContext = createContext<N8nContextType>({
  client: null,
  isConfigured: false,
  configure: () => {},
  clear: () => {},
  anthropicKey: null,
});

const STORAGE_KEY = "n8n_config";

interface N8nProviderProps {
  children: React.ReactNode;
}

export function N8nProvider({ children }: N8nProviderProps) {
  const [client, setClient] = useState<ReturnType<typeof createN8nClient> | null>(null);
  const [anthropicKey, setAnthropicKey] = useState<string | null>(null);

  useEffect(() => {
    // Try to load config from localStorage on mount
    const storedConfig = localStorage.getItem(STORAGE_KEY);
    if (storedConfig) {
      try {
        const { apiKey, baseUrl, anthropicKey } = JSON.parse(storedConfig);
        if (apiKey && baseUrl) {
          setClient(createN8nClient({ apiKey, baseUrl }));
          setAnthropicKey(anthropicKey);
        }
      } catch (error) {
        console.error("Failed to load n8n config:", error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const configure = (apiKey: string, baseUrl: string, anthropicKey: string) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ apiKey, baseUrl, anthropicKey })
    );
    setClient(createN8nClient({ apiKey, baseUrl }));
    setAnthropicKey(anthropicKey);
  };

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setClient(null);
    setAnthropicKey(null);
  };

  return (
    <N8nContext.Provider
      value={{
        client,
        isConfigured: client !== null,
        configure,
        clear,
        anthropicKey,
      }}
    >
      {children}
    </N8nContext.Provider>
  );
}

export function useN8n() {
  const context = useContext(N8nContext);
  if (context === undefined) {
    throw new Error("useN8n must be used within a N8nProvider");
  }
  return context;
} 