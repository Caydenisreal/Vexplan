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
import { MobileGoal } from "../types/gameTypes";
import { FIELD_ZONES } from "../constants/gameConstants";

// Mobile Goal specific ring display constants
const RING_HEIGHT = 70; // 84px height
const RING_WIDTH = 350; // 600px width
const RING_TOP_POSITION = 30; // 45px from top of goal
const RING_SPACING = 30; // 38px spacing between rings
const MOBILE_GOAL_SCALE = 1.5; // 1.5x goal scale

interface MobileGoalPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedGoalId: string | null;
  mobileGoals: MobileGoal[];
  onAddRing: (goalId: string, color: "red" | "blue") => void;
  onRemoveRing: (goalId: string) => void;
}

const MobileGoalPopup: React.FC<MobileGoalPopupProps> = ({
  open,
  onOpenChange,
  selectedGoalId,
  mobileGoals,
  onAddRing,
  onRemoveRing,
}) => {
  const { isDarkMode } = useTheme();
  const selectedGoal = selectedGoalId ? mobileGoals.find((g) => g.id === selectedGoalId) : null;
  const rings = selectedGoal?.rings || [];

  // Calculate scores based on the rules:
  // Each ring is worth 1 point for its team
  // The highest ring is worth an additional 2 points for its team
  // Goals in bottom corner zones double the points
  // Goals in top corner zones make the points negative
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

    // Check if the goal is in a scoring zone
    let zoneEffect = null;
    if (selectedGoal) {
      // Check each zone to see if the goal is inside it
      Object.values(FIELD_ZONES).forEach((zone) => {
        // For triangular zones, we need to check if the point is inside the triangle
        if (zone.shape === "triangle") {
          const zoneX = zone.x;
          const zoneY = zone.y;
          const zoneWidth = zone.width;
          const zoneHeight = zone.height;

          // Convert goal coordinates to relative position in the zone's rectangle
          const goalX = selectedGoal.x;
          const goalY = selectedGoal.y;

          // Check if point is inside triangle based on the corner type
          let isInTriangle = false;

          switch (zone.corner) {
            case "bottomLeft":
              // Triangle points: (0,0), (width,0), (0,height)
              isInTriangle =
                goalX >= zoneX &&
                goalX <= zoneX + zoneWidth &&
                goalY >= zoneY &&
                goalY <= zoneY + zoneHeight &&
                (goalX - zoneX) + (goalY - zoneY) <= zoneWidth;
              break;

            case "bottomRight":
              // Triangle points: (0,0), (width,0), (width,height)
              isInTriangle =
                goalX >= zoneX &&
                goalX <= zoneX + zoneWidth &&
                goalY >= zoneY &&
                goalY <= zoneY + zoneHeight &&
                (zoneX + zoneWidth - goalX) + (goalY - zoneY) <= zoneHeight;
              break;

            case "topLeft":
              // Triangle points: (0,0), (width,height), (0,height)
              isInTriangle =
                goalX >= zoneX &&
                goalX <= zoneX + zoneWidth &&
                goalY >= zoneY &&
                goalY <= zoneY + zoneHeight &&
                (goalX - zoneX) + (zoneY + zoneHeight - goalY) <= zoneWidth;
              break;

            case "topRight":
              // Triangle points: (width,0), (width,height), (0,height)
              isInTriangle =
                goalX >= zoneX &&
                goalX <= zoneX + zoneWidth &&
                goalY >= zoneY &&
                goalY <= zoneY + zoneHeight &&
                (zoneX + zoneWidth - goalX) + (zoneY + zoneHeight - goalY) <= zoneHeight;
              break;
          }

          if (isInTriangle) {
            zoneEffect = zone.effect;
          }
        } else {
          // Check if the goal's position is within the zone boundaries
          if (
            selectedGoal.x >= zone.x &&
            selectedGoal.x <= zone.x + zone.width &&
            selectedGoal.y >= zone.y &&
            selectedGoal.y <= zone.y + zone.height
          ) {
            zoneEffect = zone.effect;
          }
        }
      });

      // Apply zone effects to the scores
      if (zoneEffect === "double") {
        redScore *= 2;
        blueScore *= 2;
      } else if (zoneEffect === "negative") {
        redScore = -redScore;
        blueScore = -blueScore;
      }
    }

    return { redScore, blueScore, zoneEffect };
  };

  const { redScore, blueScore, zoneEffect } = calculateScores();

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        onOpenChange(open);
      }}
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

        {selectedGoalId && (
          <div>
            {/* Ring Display */}
            <div className="mt-4 flex flex-col items-center">
              <p
                className={`${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                } mb-2`}
              >
                Rings on Goal: {rings.length || 0}/6
              </p>

              {/* Goal and Ring Visualization - Container with fixed height and width */}
              <div
                className="relative mx-auto"
                style={{
                  height: "280px",
                  width: "350px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Rings container - fixed positioning */}
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
                    // Apply user's preferred ring settings with the new offset
                    // Using a 30px offset to match the goal position
                    const topPosition = RING_TOP_POSITION + 30 - index * RING_SPACING;

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
                          zIndex: 1 + index, // Use 1-based index as per user preference
                          objectFit: "contain",
                        }}
                      />
                    );
                  })}
                </div>

                {/* Mobile Goal Side View - fixed size */}
                <Image
                  src="/assets/svg/MobileGoalSideView.svg"
                  alt="Mobile Goal Side View"
                  width={350}
                  height={350}
                  style={{
                    position: "absolute",
                    top: "0px",
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    transform: `scale(${MOBILE_GOAL_SCALE})`, // Apply user's preferred scale
                    zIndex: 5,
                  }}
                />
              </div>

              {/* Mini Scoreboard for the Goal */}
              <div className="flex justify-around items-center w-full mt-2 mb-2 px-2 sm:px-8">
                <div
                  className="flex flex-col items-center bg-red-100 p-2 rounded-lg shadow-md"
                  style={{ minWidth: "70px" }}
                >
                  <div className="text-red-600 font-bold text-2xl sm:text-3xl">
                    {redScore < 0 ? 0 : redScore}
                  </div>
                  <div className="text-red-600 font-semibold text-sm sm:text-base">
                    Red
                  </div>
                </div>
                <div className="text-gray-700 font-bold text-sm sm:text-base mx-1 sm:mx-4 flex flex-col items-center">
                  <div>Goal Points</div>
                  {zoneEffect && (
                    <div
                      className={`text-xs mt-1 font-medium ${
                        zoneEffect === "double" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {zoneEffect === "double" ? "2x Points" : "Negative Points"}
                    </div>
                  )}
                </div>
                <div
                  className="flex flex-col items-center bg-blue-100 p-2 rounded-lg shadow-md"
                  style={{ minWidth: "70px" }}
                >
                  <div className="text-blue-600 font-bold text-2xl sm:text-3xl">
                    {blueScore < 0 ? 0 : blueScore}
                  </div>
                  <div className="text-blue-600 font-semibold text-sm sm:text-base">
                    Blue
                  </div>
                </div>
              </div>

              {/* Clear spacer to separate goal from buttons */}
              <div style={{ height: "20px" }}></div>

              {/* Ring Control Buttons */}
              <div
                className="flex flex-wrap justify-center gap-2 sm:space-x-4 sm:flex-nowrap"
                style={{ position: "relative", zIndex: 10 }}
              >
                <Button
                  onClick={() => {
                    if (selectedGoalId) {
                      onAddRing(selectedGoalId, "red");
                    }
                  }}
                  disabled={rings.length === 6}
                  className={`px-4 py-2 rounded-md ${
                    rings.length === 6
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:opacity-80"
                  } bg-red-500 text-white hover:bg-red-600`}
                >
                  Add Red Ring
                </Button>

                <Button
                  onClick={() => {
                    if (selectedGoalId) {
                      onAddRing(selectedGoalId, "blue");
                    }
                  }}
                  disabled={rings.length === 6}
                  className={`px-4 py-2 rounded-md ${
                    rings.length === 6
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:opacity-80"
                  } bg-blue-500 text-white hover:bg-blue-600`}
                >
                  Add Blue Ring
                </Button>

                <Button
                  onClick={() => {
                    if (selectedGoalId) {
                      onRemoveRing(selectedGoalId);
                    }
                  }}
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

export default MobileGoalPopup;
