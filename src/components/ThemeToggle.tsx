"use client";

import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { SunIcon, MoonIcon } from "lucide-react";

const ThemeToggle: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      className={`fixed bottom-4 right-4 z-50 rounded-full shadow-md ${
        isDarkMode 
          ? "bg-opacity-50 bg-gray-800 hover:bg-gray-700 border-gray-700" 
          : "bg-white hover:bg-gray-100"
      }`}
      onClick={toggleTheme}
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDarkMode ? (
        <SunIcon className="h-5 w-5 text-yellow-300" />
      ) : (
        <MoonIcon className="h-5 w-5 text-blue-600" />
      )}
    </Button>
  );
};

export default ThemeToggle;
