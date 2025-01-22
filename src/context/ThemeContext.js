// In your ThemeContext.js
import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'system';
  });

  useEffect(() => {
    const handleSystemThemeChange = (e) => {
      if (theme === 'system') {
        document.documentElement.setAttribute(
          'data-theme',
          e.matches ? 'dark' : 'light'
        );
      }
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    if (theme === 'system') {
      // Set initial theme based on system preference
      document.documentElement.setAttribute(
        'data-theme',
        mediaQuery.matches ? 'dark' : 'light'
      );
    } else {
      // Set theme based on user preference
      document.documentElement.setAttribute('data-theme', theme);
    }

    // Listen for system theme changes
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};