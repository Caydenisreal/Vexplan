"use client";

import React from "react";
import Image from "next/image";
import { useDraggable } from "@dnd-kit/core";
import { DraggableGoalProps } from "./types/gameTypes";
import { FIELD_SIZE_INCHES, MOBILE_GOAL_SIZE_INCHES } from "./constants/gameConstants";

// Mobile goal specific scale
const MOBILE_GOAL_SCALE = 1.5; // 1.5x goal scale

const DraggableGoal: React.FC<DraggableGoalProps> = ({
  id,
  initialPosition,
  isDrawMode,
  scale,
  onGoalClick,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    disabled: isDrawMode,
  });

  // Calculate the position in screen space
  // Convert from field coordinates (center origin) to screen coordinates (top-left origin)
  const centerOffsetX = (FIELD_SIZE_INCHES / 2) * scale;
  const centerOffsetY = (FIELD_SIZE_INCHES / 2) * scale;

  const screenX = initialPosition.x * scale + centerOffsetX;
  const screenY = centerOffsetY - initialPosition.y * scale; // Invert Y because screen Y increases downward

  // Apply transform if dragging
  const posX = transform ? screenX + transform.x : screenX;
  const posY = transform ? screenY + transform.y : screenY;

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "absolute",
        left: `${posX - (MOBILE_GOAL_SIZE_INCHES * scale) / 2}px`, // Center based on actual size
        top: `${posY - (MOBILE_GOAL_SIZE_INCHES * scale) / 2}px`,
        width: `${MOBILE_GOAL_SIZE_INCHES * scale}px`, // Use actual size in inches
        height: `${MOBILE_GOAL_SIZE_INCHES * scale}px`,
        cursor: isDrawMode ? "default" : "move",
        userSelect: "none",
        zIndex: 2,
      }}
      {...attributes}
      {...listeners}
      onClick={() => onGoalClick(id)}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transform: `scale(${MOBILE_GOAL_SCALE})`, // Use the constant for goal scale
          transformOrigin: "center",
        }}
      >
        <Image
          src="/assets/svg/MobileGoal.svg"
          alt="Mobile Goal"
          width={40}
          height={40}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            zIndex: 3,
          }}
        />
      </div>
    </div>
  );
};

export default DraggableGoal;
