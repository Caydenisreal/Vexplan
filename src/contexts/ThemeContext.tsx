"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// Tokyo Night theme colors
export const tokyoNightTheme = {
  bg: "#1a1b26",
  bg_dark: "#16161e",
  bg_dark1: "#0C0E14",
  bg_highlight: "#292e42",
  blue: "#7aa2f7",
  blue0: "#3d59a1",
  blue1: "#2ac3de",
  blue2: "#0db9d7",
  blue5: "#89ddff",
  blue6: "#b4f9f8",
  blue7: "#394b70",
  comment: "#565f89",
  cyan: "#7dcfff",
  dark3: "#545c7e",
  dark5: "#737aa2",
  fg: "#c0caf5",
  fg_dark: "#a9b1d6",
  fg_gutter: "#3b4261",
  green: "#9ece6a",
  green1: "#73daca",
  green2: "#41a6b5",
  magenta: "#bb9af7",
  magenta2: "#ff007c",
  orange: "#ff9e64",
  purple: "#9d7cd8",
  red: "#f7768e",
  red1: "#db4b4b",
  teal: "#1abc9c",
  terminal_black: "#414868",
  yellow: "#e0af68",
};

// Light theme colors
export const lightTheme = {
  bg: "#ffffff",
  bg_dark: "#f5f5f5",
  bg_dark1: "#eeeeee",
  bg_highlight: "#e0e0e0",
  fg: "#333333",
  fg_dark: "#555555",
  fg_gutter: "#cccccc",
};

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: typeof tokyoNightTheme | typeof lightTheme;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if localStorage is available (client-side only)
  const isClient = typeof window !== "undefined";
  
  // Initialize with light mode as default
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Load the theme preference from localStorage on mount
  useEffect(() => {
    if (isClient) {
      const savedTheme = localStorage.getItem("theme");
      // Only use saved theme if it exists, otherwise default to light mode
      if (savedTheme) {
        setIsDarkMode(savedTheme === "dark");
        document.documentElement.classList.toggle("dark", savedTheme === "dark");
      } else {
        // Set default to light mode if no preference is saved
        localStorage.setItem("theme", "light");
        document.documentElement.classList.remove("dark");
      }
    }
  }, [isClient]);
  
  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newValue = !prev;
      
      // Save the preference to localStorage
      if (isClient) {
        localStorage.setItem("theme", newValue ? "dark" : "light");
        document.documentElement.classList.toggle("dark", newValue);
      }
      
      return newValue;
    });
  };
  
  const theme = isDarkMode ? tokyoNightTheme : lightTheme;
  
  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
