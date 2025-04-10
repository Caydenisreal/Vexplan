"use client";

import React from "react";
import Image from "next/image";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { TeamStake } from "../types/gameTypes";

// Team Stake specific ring display constants
const RING_HEIGHT = 70; // 84px height
const RING_WIDTH = 350; // 600px width
const RING_TOP_POSITION = -55; // 45px from top of stake
const RING_SPACING = 32; // 38px spacing between rings
const TEAM_STAKE_SCALE = 1.5; // 1.5x stake scale

interface TeamStakePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStakeId: string | null;
  teamStakes: TeamStake[];
  onAddRing: (stakeId: string, color: "red" | "blue") => void;
  onRemoveRing: (stakeId: string) => void;
}

const TeamStakePopup: React.FC<TeamStakePopupProps> = ({
  open,
  onOpenChange,
  selectedStakeId,
  teamStakes,
  onAddRing,
  onRemoveRing,
}) => {
  const { isDarkMode } = useTheme();
  const isRedStake = selectedStakeId === "redStake";
  const selectedStake = selectedStakeId ? teamStakes.find((s) => s.id === selectedStakeId) : null;
  const rings = selectedStake?.rings || [];

  // Calculate score based on the rules:
  // Each ring is worth 1 point for its team
  // The highest ring is worth an additional 2 points for its team
  const calculateScore = () => {
    // Count regular points (1 per ring)
    let score = rings.length;
    
    // Add bonus points for the highest ring (2 additional points)
    if (rings.length > 0) {
      score += 2; // Add 2 bonus points for the highest ring
    }
    
    return score;
  };

  const score = calculateScore();

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
        style={{ maxWidth: "95%", width: "auto", maxHeight: "90%" }}
      >
        <Button 
          className="absolute right-3 top-3 rounded-full p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all z-50" 
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
        
        <DialogHeader className="pt-4">
          <DialogTitle></DialogTitle>
        </DialogHeader>

        {selectedStakeId && (
          <div>
            {/* Ring Display */}
            <div className="mt-4 flex flex-col items-center">
              <p
                className={`${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                } mb-2`}
              >
                Rings on Stake: {rings.length || 0}/2
              </p>

              {/* Team Stake and Ring Visualization */}
              <div
                className="relative mx-auto"
                style={{ 
                  height: "280px", 
                  width: "350px", 
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                {/* Rings container */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 100,
                  }}
                >
                  {rings.map((ringColor, index) => {
                    // No longer need to calculate topPosition since we're using a direct formula
                    return (
                      <Image
                        key={index}
                        src={`/assets/svg/${
                          ringColor === "red"
                            ? "RedRingSideView"
                            : "BlueRingSideView"
                        }.svg`}
                        alt={`${
                          ringColor.charAt(0).toUpperCase() +
                          ringColor.slice(1)
                        } Ring`}
                        width={RING_WIDTH}
                        height={RING_HEIGHT}
                        style={{
                          position: "absolute",
                          top: `${RING_TOP_POSITION + 50 - index * RING_SPACING}px`, // Offset by the same 50px as the stake
                          left: "50%",
                          transform: "translateX(-50%) scale(1.2)",
                          zIndex: 1 + index, // Using 1-based index per user preference
                          objectFit: "contain",
                        }}
                      />
                    );
                  })}
                </div>

                {/* Team Stake Image */}
                <Image
                  src={`/assets/svg/${isRedStake ? "RedStakeSideView" : "BlueStakeSideView"}.svg`}
                  alt={`${isRedStake ? "Red" : "Blue"} Stake Side View`}
                  width={350}
                  height={350}
                  style={{
                    position: "absolute",
                    top: "50px", // Move the stake down by adding top padding
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    transform: `scale(${TEAM_STAKE_SCALE})`, // Using user's preferred scale
                    zIndex: 5,
                  }}
                />
              </div>

              {/* Team Color Box */}
              <div className="flex justify-center items-center w-full mt-2 mb-2 px-2 sm:px-8">
                {isRedStake ? (
                  <div
                    className="flex flex-col items-center bg-red-100 p-2 rounded-lg shadow-md"
                    style={{ minWidth: "70px" }}
                  >
                    <div className="text-red-600 font-bold text-2xl sm:text-3xl">
                      {score}
                    </div>
                    <div className="text-red-600 font-semibold text-sm sm:text-base">
                      Red Team
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center bg-blue-100 p-2 rounded-lg shadow-md"
                    style={{ minWidth: "70px" }}
                  >
                    <div className="text-blue-600 font-bold text-2xl sm:text-3xl">
                      {score}
                    </div>
                    <div className="text-blue-600 font-semibold text-sm sm:text-base">
                      Blue Team
                    </div>
                  </div>
                )}
              </div>

              {/* Ring Control Buttons */}
              <div className="flex justify-around w-full mt-4 mb-2">
                <div>
                  <Button
                    className={`px-4 py-2 rounded-md ${
                      isRedStake ? "bg-red-500 text-white hover:bg-red-600" : "bg-blue-500 text-white hover:bg-blue-600"
                    } ${
                      rings.length >= 2 || (isRedStake && !isRedStake) || (!isRedStake && isRedStake)
                        ? "opacity-50 cursor-not-allowed"
                        : ""
                    }`}
                    onClick={() => 
                      selectedStakeId && onAddRing(selectedStakeId, isRedStake ? "red" : "blue")
                    }
                    disabled={rings.length >= 2}
                  >
                    Add {isRedStake ? "Red" : "Blue"} Ring
                  </Button>
                </div>
              </div>

              <div>
                <Button
                  onClick={() => selectedStakeId && onRemoveRing(selectedStakeId)}
                  disabled={rings.length === 0}
                  className={`px-4 py-2 rounded-md ${
                    rings.length === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:opacity-80"
                  } bg-gray-500 text-white hover:bg-gray-600`}
                >
                  Remove Ring
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TeamStakePopup;
