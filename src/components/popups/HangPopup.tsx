"use client";

import React from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { HangScore, HangPopupProps } from "../types/gameTypes";

const HangPopup: React.FC<HangPopupProps> = ({
  open,
  onOpenChange,
  hangScores,
  onHangScoreChange,
  highStakeRing,
}) => {
  const { isDarkMode } = useTheme();

  // Calculate points based on hang level
  // Level 0 = 0 points, T1 = 3 points, T2 = 6 points, T3 = 12 points
  const calculateScore = (score: HangScore) => {
    // Base points by tier
    let basePoints = 0;
    if (score.level === 1) basePoints = 3;      // T1
    else if (score.level === 2) basePoints = 6; // T2
    else if (score.level === 3) basePoints = 12; // T3
    
    // Add bonus points if team has the high stake
    if (score.level > 0 && highStakeRing === score.teamColor) {
      basePoints += 2;
    }
    
    return basePoints;
  };

  // Calculate total points for each team
  const calculateTeamScores = () => {
    const redScores = hangScores.filter(score => score.teamColor === "red");
    const blueScores = hangScores.filter(score => score.teamColor === "blue");
    
    const redTotal = redScores.reduce((total, score) => total + calculateScore(score), 0);
    const blueTotal = blueScores.reduce((total, score) => total + calculateScore(score), 0);
    
    return { redTotal, blueTotal };
  };

  // Cycle through hang levels: None -> T1 -> T2 -> T3 -> None
  const cycleHangLevel = (teamId: string, currentLevel: 0 | 1 | 2 | 3) => {
    const nextLevel = (currentLevel + 1) % 4 as 0 | 1 | 2 | 3;
    onHangScoreChange(teamId, nextLevel);
  };

  // Get label and style for current hang level
  const getLevelStyle = (level: number, teamColor: "red" | "blue") => {
    if (level === 0) {
      return {
        label: "None",
        className: teamColor === "red" 
          ? "bg-red-600 text-white hover:bg-red-700" 
          : "bg-blue-600 text-white hover:bg-blue-700"
      };
    }
    
    return {
      label: `T${level}`,
      className: teamColor === "red"
        ? "bg-red-100 text-red-800 border border-red-300 hover:bg-red-200"
        : "bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
    };
  };

  const { redTotal, blueTotal } = calculateTeamScores();

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className={`${
          isDarkMode
            ? "bg-[#1a1b26] text-white border-[#292e42]"
            : "bg-white"
        }`}
        style={{ 
          maxWidth: "95%", 
          width: "min(450px, 95%)", 
          maxHeight: "90%",
          padding: "24px 16px 16px" 
        }}
      >
        <Button 
          className="absolute right-3 top-3 rounded-full p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all z-50" 
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <DialogHeader className="pt-8">
          <DialogTitle className="text-xl font-bold text-center"></DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          {/* Instructions */}
          <p className={`${isDarkMode ? "text-gray-300" : "text-gray-700"} text-center mb-3`}>
            Tap to cycle through hang levels
          </p>

          {/* High stake bonus indicator */}
          {highStakeRing && (
            <div className={`text-center p-2 mb-3 rounded-md ${
              highStakeRing === "red" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
            }`}>
              <span className="font-medium">
                {highStakeRing === "red" ? "Red" : "Blue"} team gets +2 bonus points
              </span>
            </div>
          )}

          {/* Mini Scoreboard for Hang Ladder */}
          <div className="flex justify-around items-center w-full mb-3 px-2">
            <div
              className="flex flex-col items-center bg-red-100 p-2 rounded-lg shadow-md"
              style={{ minWidth: "50px" }}
            >
              <div className="text-red-600 font-bold text-2xl">
                {redTotal}
              </div>
              <div className="text-red-600 font-semibold text-xs">
                Red
              </div>
            </div>
            <div className="text-gray-700 font-bold text-xs mx-1">
              Points
            </div>
            <div
              className="flex flex-col items-center bg-blue-100 p-2 rounded-lg shadow-md"
              style={{ minWidth: "50px" }}
            >
              <div className="text-blue-600 font-bold text-2xl">
                {blueTotal}
              </div>
              <div className="text-blue-600 font-semibold text-xs">
                Blue
              </div>
            </div>
          </div>

          {/* Team Controls - Mobile Friendly */}
          <div className="grid grid-cols-1 gap-3">
            {/* Red Alliance */}
            <div className="border border-red-200 rounded-lg p-3">
              <h3 className="text-red-600 font-bold text-base mb-2">Red Alliance</h3>
              <div className="space-y-2">
                {hangScores
                  .filter(score => score.teamColor === "red")
                  .map(score => {
                    const levelStyle = getLevelStyle(score.level, "red");
                    return (
                      <div key={score.teamId} className="flex items-center justify-between">
                        <div className="flex-shrink-0 w-24">
                          <span className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Robot {score.teamNumber || score.teamId.replace('teamSquare', '')}
                          </span>
                        </div>
                        <Button
                          className={`flex-grow-0 min-w-24 px-3 py-2 h-auto text-sm ${levelStyle.className}`}
                          onClick={() => cycleHangLevel(score.teamId, score.level)}
                        >
                          {levelStyle.label}
                        </Button>
                        <div className="flex-shrink-0 w-20 text-right">
                          <span className="text-red-600 font-bold text-sm">
                            {calculateScore(score)} pts
                            {score.level > 0 && highStakeRing === "red" && (
                              <span className="text-xs block">+2</span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Blue Alliance */}
            <div className="border border-blue-200 rounded-lg p-3">
              <h3 className="text-blue-600 font-bold text-base mb-2">Blue Alliance</h3>
              <div className="space-y-2">
                {hangScores
                  .filter(score => score.teamColor === "blue")
                  .map(score => {
                    const levelStyle = getLevelStyle(score.level, "blue");
                    return (
                      <div key={score.teamId} className="flex items-center justify-between">
                        <div className="flex-shrink-0 w-24">
                          <span className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Robot {score.teamNumber || score.teamId.replace('teamSquare', '')}
                          </span>
                        </div>
                        <Button
                          className={`flex-grow-0 min-w-24 px-3 py-2 h-auto text-sm ${levelStyle.className}`}
                          onClick={() => cycleHangLevel(score.teamId, score.level)}
                        >
                          {levelStyle.label}
                        </Button>
                        <div className="flex-shrink-0 w-20 text-right">
                          <span className="text-blue-600 font-bold text-sm">
                            {calculateScore(score)} pts
                            {score.level > 0 && highStakeRing === "blue" && (
                              <span className="text-xs block">+2</span>
                            )}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HangPopup;
