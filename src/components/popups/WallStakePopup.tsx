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
import { WallStake } from "../types/gameTypes";

// Wall Stake specific ring display constants
const RING_HEIGHT = 84; // 84px height
const RING_WIDTH = 600; // 600px width
const RING_TOP_POSITION = 23; // 45px from top of stake
const RING_SPACING = 32; // 38px spacing between rings
const WALL_STAKE_SCALE = 1.5; // 1.5x stake scale

interface WallStakePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStakeId: string | null;
  wallStakes: WallStake[];
  onAddRing: (stakeId: string, color: "red" | "blue") => void;
  onRemoveRing: (stakeId: string) => void;
}

const WallStakePopup: React.FC<WallStakePopupProps> = ({
  open,
  onOpenChange,
  selectedStakeId,
  wallStakes,
  onAddRing,
  onRemoveRing,
}) => {
  const { isDarkMode } = useTheme();
  const selectedStake = selectedStakeId ? wallStakes.find((s) => s.id === selectedStakeId) : null;
  const rings = selectedStake?.rings || [];

  // Calculate scores based on the rules:
  // Each ring is worth 1 point for its team
  // The highest ring is worth an additional 2 points for its team
  const calculateScores = () => {
    let redScore = 0;
    let blueScore = 0;

    // Count regular points (1 per ring)
    rings.forEach((ring) => {
      if (ring === "red") redScore += 1;
      else if (ring === "blue") blueScore += 1;
    });

    // Add bonus points for the highest ring (2 additional points)
    if (rings.length > 0) {
      const topRing = rings[rings.length - 1];
      if (topRing === "red") redScore += 2;
      else if (topRing === "blue") blueScore += 2;
    }

    return { redScore, blueScore };
  };

  const { redScore, blueScore } = calculateScores();

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
                Rings on Stake: {rings.length || 0}/6
              </p>

              {/* Wall Stake and Ring Visualization */}
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
                    // Using wall stake specific settings with 50px offset
                    const topPosition = RING_TOP_POSITION + 50 - index * RING_SPACING;
                    
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
                          top: `${topPosition}px`,
                          left: "50%",
                          transform: "translateX(-50%) scale(1.2)",
                          zIndex: 1 + index, // Using 1-based index per user preference
                          objectFit: "contain",
                        }}
                      />
                    );
                  })}
                </div>

                {/* Wall Stake Image */}
                <Image
                  src="/assets/svg/WallStakeSideView.svg"
                  alt="Wall Stake Side View"
                  width={350}
                  height={350}
                  style={{
                    position: "absolute",
                    top: "0px", // Move the stake down by adding top padding
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    transform: `scale(${WALL_STAKE_SCALE})`, // Using user's preferred scale
                    zIndex: 5,
                  }}
                />
              </div>

              {/* Mini Scoreboard for the Wall Stake */}
              <div className="flex justify-around items-center w-full mt-2 mb-2 px-2 sm:px-8">
                <div
                  className="flex flex-col items-center bg-red-100 p-2 rounded-lg shadow-md"
                  style={{ minWidth: "70px" }}
                >
                  <div className="text-red-600 font-bold text-2xl sm:text-3xl">
                    {redScore}
                  </div>
                  <div className="text-red-600 font-semibold text-sm sm:text-base">
                    Red
                  </div>
                </div>
                <div className="text-gray-700 font-bold text-sm sm:text-base mx-1 sm:mx-4">
                  Stake Points
                </div>
                <div
                  className="flex flex-col items-center bg-blue-100 p-2 rounded-lg shadow-md"
                  style={{ minWidth: "70px" }}
                >
                  <div className="text-blue-600 font-bold text-2xl sm:text-3xl">
                    {blueScore}
                  </div>
                  <div className="text-blue-600 font-semibold text-sm sm:text-base">
                    Blue
                  </div>
                </div>
              </div>

              {/* Ring Control Buttons */}
              <div className="flex justify-around w-full mt-4 mb-2">
                <div className="space-x-2">
                  <Button
                    className={`px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 ${
                      rings.length >= 6 ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={() => selectedStakeId && onAddRing(selectedStakeId, "red")}
                    disabled={rings.length >= 6}
                  >
                    Add Red Ring
                  </Button>
                  <Button
                    className={`px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 ${
                      rings.length >= 6 ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    onClick={() => selectedStakeId && onAddRing(selectedStakeId, "blue")}
                    disabled={rings.length >= 6}
                  >
                    Add Blue Ring
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

export default WallStakePopup;
