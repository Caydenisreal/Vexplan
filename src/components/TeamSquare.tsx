"use client";

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { useTheme } from "@/contexts/ThemeContext";
import { TeamSquareProps } from "./types/gameTypes";

const TeamSquare: React.FC<TeamSquareProps> = ({
  id,
  type,
  x,
  y,
  size,
  teamNumber,
  scale,
  onClick,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
  });

  const { isDarkMode } = useTheme();

  const sizeInPixels = size * scale;

  // Convert from game coordinates to screen coordinates
  // Note: For TeamSquare, the coordinates are already in screen space (top-left origin)
  // so we don't need to invert Y or adjust for field center
  const posX = transform ? x * scale + transform.x : x * scale;
  const posY = transform ? y * scale + transform.y : y * scale;

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "absolute",
        left: `${posX}px`,
        top: `${posY}px`,
        width: `${sizeInPixels}px`,
        height: `${sizeInPixels}px`,
        backgroundColor:
          type === "red" ? "rgba(255, 0, 0, 0.5)" : "rgba(0, 0, 255, 0.5)",
        border: `2px solid ${
          type === "red" ? "rgb(255, 0, 0)" : "rgb(0, 0, 255)"
        }`,
        borderRadius: "5px",
        color: isDarkMode ? "white" : "black",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "5px",
        cursor: "move",
        userSelect: "none",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
        zIndex: 2,
      }}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      {teamNumber && (
        <div className="text-center">
          <div className="font-bold">{type === "red" ? "RED" : "BLUE"}</div>
          <div className="text-2xl font-bold">{teamNumber}</div>
        </div>
      )}
    </div>
  );
};

export default TeamSquare;
