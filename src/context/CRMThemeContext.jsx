import React, { createContext, useContext, useEffect, useState } from 'react';

export const CRMThemeContext = createContext({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
});

export function CRMThemeProvider({ children }) {
  // CRM is intentionally light-only to guarantee consistent contrast.
  const theme = 'light';
  const resolvedTheme = 'light';

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-crm-theme', 'light');
      localStorage.setItem('crm-theme', 'light');
    } catch {}
  }, []);

  const setTheme = () => {};

  return (
    <CRMThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </CRMThemeContext.Provider>
  );
}

export function useCRMTheme() {
  return useContext(CRMThemeContext);
}