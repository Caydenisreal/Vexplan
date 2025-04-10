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

// High Stake specific ring display constants
const RING_HEIGHT = 70; // 84px height
const RING_WIDTH = 350; // 600px width
const RING_TOP_POSITION = -45; // 45px from top of stake
const HIGH_STAKE_SCALE = 1.5; // 1.5x stake scale

interface HighStakePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ringColor: "red" | "blue" | null;
  onRingColorChange: (color: "red" | "blue" | null) => void;
}

const HighStakePopup: React.FC<HighStakePopupProps> = ({
  open,
  onOpenChange,
  ringColor,
  onRingColorChange,
}) => {
  const { isDarkMode } = useTheme();

  // For the High Stake, we only have one ring at a time
  // The score is 6 points for the team that has a ring on it
  const calculateScore = () => {
    if (ringColor === "red") {
      return { redScore: 6, blueScore: 0 }; // 6 points for red team
    } else if (ringColor === "blue") {
      return { redScore: 0, blueScore: 6 }; // 6 points for blue team
    } else {
      return { redScore: 0, blueScore: 0 }; // No points if no ring
    }
  };

  const { redScore, blueScore } = calculateScore();

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

        <div>
          {/* Ring Display */}
          <div className="mt-4 flex flex-col items-center">
            <p className={`${isDarkMode ? "text-gray-300" : "text-gray-700"} mb-2`}>
              Rings on High Stake: {ringColor ? "1" : "0"} / 1
            </p>

            {/* High Stake and Ring Visualization */}
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
                {ringColor && (
                  <Image
                    key="ring"
                    src={`/assets/svg/${
                      ringColor === "red"
                        ? "RedRingSideView"
                        : "BlueRingSideView"
                    }.svg`}
                    alt={`${
                      ringColor.charAt(0).toUpperCase() + ringColor.slice(1)
                    } Ring`}
                    width={RING_WIDTH}
                    height={RING_HEIGHT}
                    style={{
                      position: "absolute",
                      top: `${RING_TOP_POSITION + 50}px`, 
                      left: "50%",
                      transform: "translateX(-50%) scale(1.2)",
                      zIndex: 1,
                      objectFit: "contain",
                    }}
                  />
                )}
              </div>

              {/* High Stake Image */}
              <Image
                src="/assets/svg/HighStakeSideView.svg"
                alt="High Stake Side View"
                width={350}
                height={350}
                style={{
                  position: "absolute",
                  top: "20px",
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  transform: `scale(${HIGH_STAKE_SCALE})`,
                  zIndex: 5,
                }}
              />
            </div>

            {/* Mini Scoreboard for the High Stake */}
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
                High Stake Points
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

            <div className="flex justify-center space-x-2 mt-4">
              <Button
                className={`px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 ${
                  ringColor === "red" ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() => onRingColorChange("red")}
                disabled={ringColor === "red"}
              >
                Add Red Ring
              </Button>
              
              <Button
                className={`px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 ${
                  ringColor === "blue" ? "opacity-50 cursor-not-allowed" : ""
                }`}
                onClick={() => onRingColorChange("blue")}
                disabled={ringColor === "blue"}
              >
                Add Blue Ring
              </Button>
            </div>

            <Button
              onClick={() => onRingColorChange(null)}
              disabled={!ringColor}
              className={`px-4 py-2 rounded-md ${
                !ringColor ? "opacity-50 cursor-not-allowed" : ""
              } bg-gray-500 text-white hover:bg-gray-600`}
            >
              Remove Ring
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HighStakePopup;
