"use client";

import * as React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  DndContext,
  useDraggable,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import DrawingSidebar, { LineStyle, LineEndStyle } from "./Sidebar";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { X } from "lucide-react";

// Constants for the coordinate system
const FIELD_SIZE_INCHES = 144; // 144 inches
const HANG_LADDER_SIZE_INCHES = 48; // 48 inches
const MOBILE_GOAL_SIZE_INCHES = 10; // 10 inches
const STAKE_SIZE_INCHES = 10; // Size for stakes

// Define fixed stake positions (in inches from center)
const STAKES = [
  { id: "wallStake1", type: "wall", x: -0.5, y: 69.5 },
  { id: "wallStake2", type: "wall", x: -0.5, y: -69 },
  { id: "redStake", type: "red", x: -70, y: 0 },
  { id: "blueStake", type: "blue", x: 69, y: 0 },
];

// Define initial square positions (18x18 inch squares)
const INITIAL_SQUARES: Array<{
  id: string;
  type: "red" | "blue";
  x: number;
  y: number;
  size: number;
  teamNumber: string;
}> = [
  { id: "redSquare1", type: "red", x: 10, y: 20, size: 18, teamNumber: "" },
  { id: "redSquare2", type: "red", x: 10, y: 105, size: 18, teamNumber: "" },
  { id: "blueSquare1", type: "blue", x: 115, y: 20, size: 18, teamNumber: "" },
  { id: "blueSquare2", type: "blue", x: 115, y: 105, size: 18, teamNumber: "" },
];

// Define initial mobile goal positions
const INITIAL_MOBILE_GOALS = [
  { id: "mobileGoal-1", x: -24, y: 24, rings: [] },
  { id: "mobileGoal-2", x: 24, y: 24, rings: [] },
  { id: "mobileGoal-3", x: 24, y: -24, rings: [] },
  { id: "mobileGoal-4", x: -24, y: -24, rings: [] },
  { id: "mobileGoal-5", x: -0.5, y: -48, rings: [] },
];

// Define initial wall stakes with rings
const INITIAL_WALL_STAKES = [
  { id: "wallStake1", rings: [] },
  { id: "wallStake2", rings: [] },
];

// Define initial team stakes with rings
const INITIAL_TEAM_STAKES = [
  { id: "redStake", rings: [] },
  { id: "blueStake", rings: [] },
];

// Constants for arrow direction smoothing
const DIRECTION_SMOOTHING_FACTOR = 0.3; // Lower = smoother (0-1)
const MIN_DIRECTION_CHANGE_THRESHOLD = 5; // Minimum pixels to move before direction changes
const MIN_DIRECTION_POINTS = 3; // Minimum number of points needed to calculate a direction
const END_POINTS_TO_IGNORE = 2; // Number of points to ignore at the end when calculating direction

// Define types for lines
type Point = { x: number; y: number };
type Line = {
  points: Point[];
  color: string;
  size: number;
  style: LineStyle;
  endStyle: LineEndStyle;
  direction?: Point;
};

interface TeamSquareProps {
  id: string;
  type: "red" | "blue";
  x: number;
  y: number;
  size: number;
  teamNumber: string;
  scale: number;
  onClick: () => void;
}

function TeamSquare({
  id,
  type,
  x,
  y,
  size,
  teamNumber,
  scale,
  onClick,
}: TeamSquareProps) {
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
        border: `2px solid ${type === "red" ? "red" : "blue"}`,
        borderRadius: "4px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        cursor: "move",
        userSelect: "none",
        zIndex: 10,
        touchAction: "none", // Prevent browser touch actions to improve dragging on mobile
      }}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {teamNumber && (
        <span
          style={{
            color: isDarkMode ? "white" : "black",
            fontWeight: "bold",
            fontSize: `${Math.max(12, sizeInPixels / 4)}px`,
            textShadow: isDarkMode ? "0 0 2px black" : "0 0 2px white",
          }}
        >
          {teamNumber}
        </span>
      )}
    </div>
  );
}

interface DraggableGoalProps {
  id: string;
  initialPosition: { x: number; y: number };
  isDrawMode: boolean;
  scale: number;
  onGoalClick: (id: string) => void;
}

const DraggableGoal: React.FC<DraggableGoalProps> = ({
  id,
  initialPosition,
  isDrawMode,
  scale,
  onGoalClick,
}) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
    disabled: isDrawMode,
  });

  // Convert from game coordinates (inches) to screen coordinates (pixels)
  // Note: Y is inverted in screen coordinates, so we negate delta.y
  const fieldSize = FIELD_SIZE_INCHES * scale;
  const mobileGoalSize = MOBILE_GOAL_SIZE_INCHES * scale;

  // Calculate the center position of the goal
  const centerX = initialPosition.x * scale + fieldSize / 2;
  const centerY = -initialPosition.y * scale + fieldSize / 2;

  // Apply transform if available (during drag)
  const x = transform ? centerX + transform.x : centerX;
  const y = transform ? centerY + transform.y : centerY;

  return (
    <div
      ref={setNodeRef}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: `${mobileGoalSize}px`,
        height: `${mobileGoalSize}px`,
        transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
      }}
      className={`touch-none ${!isDrawMode ? "cursor-move" : ""}`}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        if (!isDrawMode) {
          e.stopPropagation();
          onGoalClick(id);
        }
      }}
    >
      <Image
        src="/assets/svg/MobileGoal.svg"
        alt="Mobile Goal"
        width={mobileGoalSize}
        height={mobileGoalSize}
        priority
      />
    </div>
  );
};

// Define action types for history
type HistoryAction =
  | {
      type: "MOVE_GOAL";
      id: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
      timestamp: number;
    }
  | {
      type: "MOVE_TEAM_SQUARE";
      id: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
      timestamp: number;
    }
  | { type: "ADD_LINE"; line: Line; timestamp: number }
  | { type: "REMOVE_LINE"; line: Line; timestamp: number }
  | { type: "CLEAR_LINES"; lines: Line[]; timestamp: number }
  | {
      type: "UPDATE_SCORE";
      team: "red" | "blue";
      from: number;
      to: number;
      timestamp: number;
    }
  | {
      type: "ADD_RING";
      goalId: string;
      ringColor: "red" | "blue";
      timestamp: number;
    }
  | {
      type: "REMOVE_RING";
      goalId: string;
      ringColor: "red" | "blue";
      ringIndex: number;
      timestamp: number;
    };

// Define the types for the addToHistory function argument
type HistoryActionWithoutTimestamp =
  | {
      type: "MOVE_GOAL";
      id: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
    }
  | {
      type: "MOVE_TEAM_SQUARE";
      id: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
    }
  | { type: "ADD_LINE"; line: Line }
  | { type: "REMOVE_LINE"; line: Line }
  | { type: "CLEAR_LINES"; lines: Line[] }
  | { type: "UPDATE_SCORE"; team: "red" | "blue"; from: number; to: number }
  | { type: "ADD_RING"; goalId: string; ringColor: "red" | "blue" }
  | {
      type: "REMOVE_RING";
      goalId: string;
      ringColor: "red" | "blue";
      ringIndex: number;
    };

interface MobileGoal {
  id: string;
  x: number;
  y: number;
  rings: Array<"red" | "blue">;
}

interface WallStake {
  id: string;
  rings: ("red" | "blue")[];
}

interface TeamStake {
  id: string;
  rings: ("red" | "blue")[];
}

const GameCanvas: React.FC = () => {
  const [mobileGoals, setMobileGoals] =
    useState<MobileGoal[]>(INITIAL_MOBILE_GOALS);
  const [squares, setSquares] =
    useState<
      Array<{
        id: string;
        type: "red" | "blue";
        x: number;
        y: number;
        size: number;
        teamNumber: string;
      }>
    >(INITIAL_SQUARES);
  const [lines, setLines] = useState<Line[]>([]);
  const [drawingSettings, setDrawingSettings] = useState({
    isDrawMode: false,
    brushSize: 2,
    brushColor: "#ffffff",
    isEraser: false,
    lineStyle: "solid" as LineStyle,
    lineEndStyle: "none" as LineEndStyle,
  });

  // History state for undo/redo
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [dragStartPositions, setDragStartPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  // Function to add a timestamp to drawing actions
  const addToHistory = useCallback(
    (action: HistoryActionWithoutTimestamp) => {
      const actionWithTimestamp = {
        ...action,
        timestamp: Date.now(),
      } as HistoryAction;

      // If we're not at the end of the history array, remove all future actions
      if (historyIndex < history.length - 1) {
        setHistory((prev) => [
          ...prev.slice(0, historyIndex + 1),
          actionWithTimestamp,
        ]);
      } else {
        setHistory((prev) => [...prev, actionWithTimestamp]);
      }

      setHistoryIndex((prev) => prev + 1);
    },
    [history, historyIndex]
  );

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [teamNumberDialogOpen, setTeamNumberDialogOpen] = useState(false);
  const [teamNumberInput, setTeamNumberInput] = useState("");

  const handleSquareClick = (id: string) => {
    setSelectedSquare(id);
    const square = squares.find((s) => s.id === id);
    if (square) {
      setTeamNumberInput(square.teamNumber);
      setTeamNumberDialogOpen(true);
    }
  };

  const saveTeamNumber = () => {
    if (selectedSquare) {
      setSquares((prev) =>
        prev.map((square) =>
          square.id === selectedSquare
            ? { ...square, teamNumber: teamNumberInput }
            : square
        )
      );
      setTeamNumberDialogOpen(false);
    }
  };

  const [showGoalPopup, setShowGoalPopup] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const handleGoalClick = (goalId: string) => {
    setSelectedGoalId(goalId);
    setShowGoalPopup(true);
  };

  const [wallStakes, setWallStakes] = useState<WallStake[]>(INITIAL_WALL_STAKES);
  const [selectedStakeId, setSelectedStakeId] = useState<string | null>(null);
  const [showStakePopup, setShowStakePopup] = useState(false);

  const handleStakeClick = (stakeId: string) => {
    setSelectedStakeId(stakeId);
    setShowStakePopup(true);
  };

  const closeStakePopup = () => {
    setShowStakePopup(false);
    setSelectedStakeId(null);
  };

  const [teamStakes, setTeamStakes] = useState<TeamStake[]>(INITIAL_TEAM_STAKES);
  const [selectedTeamStakeId, setSelectedTeamStakeId] = useState<string | null>(
    null
  );
  const [showTeamStakePopup, setShowTeamStakePopup] = useState(false);

  const handleTeamStakeClick = (stakeId: string) => {
    setSelectedTeamStakeId(stakeId);
    setShowTeamStakePopup(true);
  };

  const closeTeamStakePopup = () => {
    setShowTeamStakePopup(false);
    setSelectedTeamStakeId(null);
  };

  // Function to add a ring to a wall stake
  const addRingToStake = (stakeId: string, color: "red" | "blue") => {
    setWallStakes(
      wallStakes.map((stake) =>
        stake.id === stakeId
          ? {
              ...stake,
              rings:
                stake.rings.length < 6
                  ? [...stake.rings, color]
                  : stake.rings,
            }
          : stake
      )
    );
  };

  const removeRingFromStake = (stakeId: string) => {
    setWallStakes(
      wallStakes.map((stake) =>
        stake.id === stakeId
          ? {
              ...stake,
              rings: stake.rings.slice(0, -1),
            }
          : stake
      )
    );
  };

  // Function to add a ring to a team stake
  const addRingToTeamStake = (stakeId: string, color: "red" | "blue") => {
    setTeamStakes(
      teamStakes.map((stake) => {
        // For red stake, only allow red rings and max 2 rings
        if (stake.id === "redStake" && color !== "red") {
          return stake;
        }
        // For blue stake, only allow blue rings and max 2 rings
        if (stake.id === "blueStake" && color !== "blue") {
          return stake;
        }

        return stake.id === stakeId
          ? {
              ...stake,
              rings:
                stake.rings.length < 2 // Max 2 rings on team stakes
                  ? [...stake.rings, color]
                  : stake.rings,
            }
          : stake;
      })
    );
  };

  const removeRingFromTeamStake = (stakeId: string) => {
    setTeamStakes(
      teamStakes.map((stake) =>
        stake.id === stakeId
          ? {
              ...stake,
              rings: stake.rings.slice(0, -1),
            }
          : stake
      )
    );
  };

  const [highStakePopupOpen, setHighStakePopupOpen] = useState(false);
  const [highStakeRing, setHighStakeRing] = useState<"red" | "blue" | null>(null);

  const { isDarkMode } = useTheme();

  // Set default brush color to white since the field background is always dark
  useEffect(() => {
    setDrawingSettings((prev) => ({
      ...prev,
      brushColor: "#ffffff",
    }));
  }, []); // Only run once on component mount

  // Responsive scaling
  const [scale, setScale] = useState(4); // Default scale factor
  const [isMobile, setIsMobile] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentDirectionRef = useRef<{ x: number; y: number } | null>(null);
  const lastDirectionUpdatePointRef = useRef<{ x: number; y: number } | null>(
    null
  );
  const directionSamplePointsRef = useRef<{ x: number; y: number }[]>([]);
  const isDrawingRef = useRef(false);
  const linesRef = useRef<Line[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentLineRef = useRef<Line | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: isMobile ? 5 : 8, // Reduced activation distance for mobile
      },
    })
  );

  // Function to draw an arrow at the end of a line
  const drawArrow = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      endX: number,
      endY: number,
      direction: { x: number; y: number },
      size: number,
      color: string
    ) => {
      // Normalize the direction vector
      const length = Math.sqrt(
        direction.x * direction.x + direction.y * direction.y
      );
      if (length === 0) return;

      const normalizedDirection = {
        x: direction.x / length,
        y: direction.y / length,
      };

      // Calculate arrow head points
      const arrowSize = size * 4;
      const arrowAngle = Math.PI / 6; // 30 degrees

      // Calculate the two points for the arrow head
      const point1X =
        endX -
        arrowSize *
          (normalizedDirection.x * Math.cos(arrowAngle) -
            normalizedDirection.y * Math.sin(arrowAngle));
      const point1Y =
        endY -
        arrowSize *
          (normalizedDirection.x * Math.sin(arrowAngle) +
            normalizedDirection.y * Math.cos(arrowAngle));

      const point2X =
        endX -
        arrowSize *
          (normalizedDirection.x * Math.cos(arrowAngle) +
            normalizedDirection.y * Math.sin(arrowAngle));
      const point2Y =
        endY -
        arrowSize *
          (normalizedDirection.y * Math.cos(arrowAngle) -
            normalizedDirection.x * Math.sin(arrowAngle));

      // Draw the arrow head
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(point1X, point1Y);
      ctx.lineTo(point2X, point2Y);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
    []
  );

  // Function to redraw the entire canvas
  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current || !canvasCtxRef.current) return;

    const ctx = canvasCtxRef.current;
    const canvas = canvasRef.current;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all lines
    linesRef.current.forEach((line) => {
      if (line.points.length < 2) return;

      ctx.save();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.size;

      // Apply line style
      if (line.style === "dotted") {
        ctx.setLineDash([line.size, line.size * 2]);
      } else if (line.style === "dashed") {
        ctx.setLineDash([line.size * 3, line.size * 2]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(line.points[0].x, line.points[0].y);

      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }

      ctx.stroke();

      // Draw arrow if needed
      if (line.endStyle === "arrow" && line.direction) {
        const lastPoint = line.points[line.points.length - 1];
        drawArrow(
          ctx,
          lastPoint.x,
          lastPoint.y,
          line.direction,
          line.size,
          line.color
        );
      }

      ctx.restore();
    });
  }, [drawArrow]);

  // Set up canvas and handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;

      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);

      // Calculate the appropriate scale based on screen size
      const containerWidth = containerRef.current.clientWidth;
      const newScale = Math.max(
        2,
        Math.min(4, containerWidth / FIELD_SIZE_INCHES)
      );
      setScale(newScale);

      if (canvasRef.current) {
        const fieldSize = FIELD_SIZE_INCHES * newScale;
        canvasRef.current.width = fieldSize;
        canvasRef.current.height = fieldSize;

        // Get the drawing context
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          canvasCtxRef.current = ctx;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          // Redraw all lines with the new scale
          redrawCanvas();
        }
      }
    };

    // Set up the canvas initially
    handleResize();

    // Add event listener for window resize
    window.addEventListener("resize", handleResize);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [redrawCanvas]);

  // Update linesRef when lines state changes
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  // Function to find lines that intersect with the eraser
  const findIntersectingLines = useCallback(
    (point: { x: number; y: number }, eraserSize: number) => {
      const intersectingLines: number[] = [];

      linesRef.current.forEach((line, lineIndex) => {
        for (let i = 0; i < line.points.length; i++) {
          const distance = Math.sqrt(
            Math.pow(line.points[i].x - point.x, 2) +
              Math.pow(line.points[i].y - point.y, 2)
          );

          if (distance <= eraserSize) {
            intersectingLines.push(lineIndex);
            break;
          }
        }
      });

      return intersectingLines;
    },
    []
  );

  // Function to erase parts of lines
  const eraseAtPoint = useCallback(
    (point: { x: number; y: number }) => {
      const eraserSize = drawingSettings.brushSize * 5; // Eraser is 5x the brush size
      const intersectingLines = findIntersectingLines(point, eraserSize);

      if (intersectingLines.length > 0) {
        setLines((prevLines) =>
          prevLines.filter((_, index) => !intersectingLines.includes(index))
        );
      }
    },
    [drawingSettings.brushSize, findIntersectingLines]
  );

  // Calculate direction vector between two points
  const calculateDirection = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      return {
        x: to.x - from.x,
        y: to.y - from.y,
      };
    },
    []
  );

  // Calculate distance between two points
  const calculateDistance = useCallback(
    (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
      return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    },
    []
  );

  // Smooth the direction vector using previous direction
  const smoothDirection = useCallback(
    (
      newDirection: { x: number; y: number },
      prevDirection: { x: number; y: number } | null
    ) => {
      if (!prevDirection) return newDirection;

      // Normalize both vectors
      const newLength = Math.sqrt(
        newDirection.x * newDirection.x + newDirection.y * newDirection.y
      );
      const prevLength = Math.sqrt(
        prevDirection.x * prevDirection.x + prevDirection.y * prevDirection.y
      );

      if (newLength === 0 || prevLength === 0) return newDirection;

      const newNormalized = {
        x: newDirection.x / newLength,
        y: newDirection.y / newLength,
      };

      const prevNormalized = {
        x: prevDirection.x / prevLength,
        y: prevDirection.y / prevLength,
      };

      // Interpolate between the two normalized directions
      return {
        x:
          prevNormalized.x * (1 - DIRECTION_SMOOTHING_FACTOR) +
          newNormalized.x * DIRECTION_SMOOTHING_FACTOR,
        y:
          prevNormalized.y * (1 - DIRECTION_SMOOTHING_FACTOR) +
          newNormalized.y * DIRECTION_SMOOTHING_FACTOR,
      };
    },
    []
  );

  // Calculate a smoothed direction based on multiple sample points
  const calculateSmoothedDirection = useCallback(
    (points: { x: number; y: number }[]) => {
      if (points.length < MIN_DIRECTION_POINTS) return null;

      // Use the last few points to calculate direction, but ignore the very last points
      // which might be less stable due to lifting the finger/pen
      const startIndex = Math.max(
        0,
        points.length - MIN_DIRECTION_POINTS - END_POINTS_TO_IGNORE
      );
      const endIndex = Math.max(0, points.length - END_POINTS_TO_IGNORE - 1);

      if (endIndex <= startIndex) return null;

      const startPoint = points[startIndex];
      const endPoint = points[endIndex];

      return calculateDirection(startPoint, endPoint);
    },
    [calculateDirection]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!drawingSettings.isDrawMode || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      isDrawingRef.current = true;
      const point = { x, y };
      lastPointRef.current = point;
      directionSamplePointsRef.current = [point];

      if (drawingSettings.isEraser) {
        // Handle eraser mode
        eraseAtPoint(point);
      } else {
        // Handle drawing mode
        const newLine: Line = {
          points: [point],
          color: drawingSettings.brushColor,
          size: drawingSettings.brushSize,
          style: drawingSettings.lineStyle,
          endStyle: drawingSettings.lineEndStyle,
        };

        // Store the current line reference for use in handlePointerUp
        currentLineRef.current = newLine;

        setLines((prevLines) => [...prevLines, newLine]);
      }

      // Prevent scrolling while drawing
      e.preventDefault();
    },
    [drawingSettings, eraseAtPoint]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawingRef.current || !canvasRef.current || !lastPointRef.current)
        return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const newPoint = { x, y };

      // Add to direction sample points
      directionSamplePointsRef.current.push(newPoint);

      if (drawingSettings.isEraser) {
        // Handle eraser mode
        eraseAtPoint(newPoint);
      } else {
        // Handle drawing mode
        setLines((prevLines) => {
          const updatedLines = [...prevLines];
          const currentLine = updatedLines[updatedLines.length - 1];

          if (currentLine) {
            // Only add the point if it's far enough from the last point
            // This prevents too many points which can cause performance issues
            const lastPoint = currentLine.points[currentLine.points.length - 1];
            const distance = calculateDistance(lastPoint, newPoint);

            if (distance >= 1) {
              // Minimum distance of 1 pixel
              currentLine.points.push(newPoint);

              // Update direction for arrow if needed
              if (currentLine.endStyle === "arrow") {
                // Only update direction if we've moved enough
                if (
                  !lastDirectionUpdatePointRef.current ||
                  calculateDistance(
                    lastDirectionUpdatePointRef.current,
                    newPoint
                  ) > MIN_DIRECTION_CHANGE_THRESHOLD
                ) {
                  const newDirection = calculateSmoothedDirection(
                    directionSamplePointsRef.current
                  );

                  if (newDirection) {
                    currentLine.direction = smoothDirection(
                      newDirection,
                      currentDirectionRef.current
                    );
                    currentDirectionRef.current = currentLine.direction;
                    lastDirectionUpdatePointRef.current = newPoint;
                  }
                }
              }
            }
          }

          return updatedLines;
        });

        // Draw the line segment on the canvas
        const ctx = canvasCtxRef.current;
        if (ctx) {
          ctx.save();
          ctx.strokeStyle = drawingSettings.brushColor;
          ctx.lineWidth = drawingSettings.brushSize;

          // Apply line style
          if (drawingSettings.lineStyle === "dotted") {
            ctx.setLineDash([drawingSettings.brushSize, drawingSettings.brushSize * 2]);
          } else if (drawingSettings.lineStyle === "dashed") {
            ctx.setLineDash([drawingSettings.brushSize * 3, drawingSettings.brushSize * 2]);
          } else {
            ctx.setLineDash([]);
          }

          ctx.beginPath();
          ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
          ctx.lineTo(newPoint.x, newPoint.y);
          ctx.stroke();

          // Reset line dash
          ctx.setLineDash([]);

          // Restore the context state
          ctx.restore();
        }

        lastPointRef.current = newPoint;
      }

      // Prevent scrolling while drawing
      e.preventDefault();
    },
    [
      calculateDistance,
      calculateSmoothedDirection,
      drawingSettings,
      eraseAtPoint,
      smoothDirection,
    ]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;

    // Only add the line if it has more than one point and we're not in eraser mode
    if (!drawingSettings.isEraser && lines.length > 0) {
      const currentLine = lines[lines.length - 1];

      if (currentLine && currentLine.points.length > 1) {
        // Calculate direction for arrow if needed
        let direction: Point | undefined = undefined;
        if (currentLine.endStyle === "arrow") {
          const calculatedDirection = calculateSmoothedDirection(
            directionSamplePointsRef.current
          );
          if (calculatedDirection) {
            direction = calculatedDirection;
          }
        }

        // Create a final version of the line with the direction
        const finalLine: Line = {
          ...currentLine,
          direction,
        };

        // Update the line in the lines array
        setLines((prevLines) => {
          const updatedLines = [...prevLines];
          updatedLines[updatedLines.length - 1] = finalLine;
          return updatedLines;
        });

        // Add to history
        addToHistory({
          type: "ADD_LINE",
          line: finalLine,
        });
      }
    }

    isDrawingRef.current = false;
    lastPointRef.current = null;
    lastDirectionUpdatePointRef.current = null;
    directionSamplePointsRef.current = [];

    // Force immediate canvas redraw
    setTimeout(() => redrawCanvas(), 0);
  }, [
    calculateSmoothedDirection,
    addToHistory,
    lines,
    drawingSettings.isEraser,
    redrawCanvas,
  ]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const id = active.id as string;

      // Store the starting position for history
      if (id.includes("mobileGoal")) {
        const goal = mobileGoals.find((g) => g.id === id);
        if (goal) {
          setDragStartPositions((prev) => ({
            ...prev,
            [id]: { x: goal.x, y: goal.y },
          }));
        }
      } else if (id.includes("Square")) {
        const square = squares.find((s) => s.id === id);
        if (square) {
          setDragStartPositions((prev) => ({
            ...prev,
            [id]: { x: square.x, y: square.y },
          }));
        }
      }
    },
    [mobileGoals, squares]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const id = active.id as string;

      if (id.includes("mobileGoal")) {
        setMobileGoals((prevGoals) => {
          const updatedGoals = prevGoals.map((goal) => {
            if (goal.id === id) {
              // Convert delta from screen pixels to game coordinates
              // Note: Y is inverted in screen coordinates, so we negate delta.y
              return {
                ...goal,
                x: goal.x + delta.x / scale,
                y: goal.y - delta.y / scale, // Negate delta.y to convert from screen to game coordinates
              };
            }
            return goal;
          });

          // Record the action in history
          const startPos = dragStartPositions[id];
          const endPos = updatedGoals.find((g) => g.id === id);

          if (
            startPos &&
            endPos &&
            (Math.abs(startPos.x - endPos.x) > 0.1 ||
              Math.abs(startPos.y - endPos.y) > 0.1)
          ) {
            // Only record if there was actual movement (with a small threshold to avoid tiny movements)
            addToHistory({
              type: "MOVE_GOAL",
              id,
              from: { ...startPos }, // Create a copy to avoid reference issues
              to: { x: endPos.x, y: endPos.y },
            });
          }

          return updatedGoals;
        });
      } else if (id.includes("Square")) {
        setSquares((prevSquares) => {
          const updatedSquares = prevSquares.map((square) => {
            if (square.id === id) {
              // For squares, we don't need to negate delta.y because they use screen coordinates
              // where Y increases downward, which matches the delta.y direction
              return {
                ...square,
                x: square.x + delta.x / scale,
                y: square.y + delta.y / scale, // Don't negate for screen coordinates
              };
            }
            return square;
          });

          // Record the action in history
          const startPos = dragStartPositions[id];
          const endPos = updatedSquares.find((s) => s.id === id);

          if (
            startPos &&
            endPos &&
            (Math.abs(startPos.x - endPos.x) > 0.1 ||
              Math.abs(startPos.y - endPos.y) > 0.1)
          ) {
            // Only record if there was actual movement (with a small threshold to avoid tiny movements)
            addToHistory({
              type: "MOVE_TEAM_SQUARE",
              id,
              from: { ...startPos }, // Create a copy to avoid reference issues
              to: { x: endPos.x, y: endPos.y },
            });
          }

          return updatedSquares;
        });
      }
    },
    [scale, dragStartPositions, addToHistory]
  );

  // Function to clear all drawings from the canvas
  const handleClearCanvas = useCallback(() => {
    // Add current lines to history before clearing
    if (lines.length > 0) {
      addToHistory({
        type: "CLEAR_LINES",
        lines: lines,
      });
    }

    setLines([]);

    if (canvasRef.current && canvasCtxRef.current) {
      canvasCtxRef.current.clearRect(
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
    }
  }, [lines, addToHistory]);

  // Score state
  const [redScore, setRedScore] = useState(0);
  const [blueScore, setBlueScore] = useState(0);
  const [redAutoWin, setRedAutoWin] = useState(false);
  const [blueAutoWin, setBlueAutoWin] = useState(false);

  // Helper function to calculate base score without autonomous points
  const calculateBaseScore = useCallback(
    (team: "red" | "blue") => {
      const currentScore = team === "red" ? redScore : blueScore;
      const hasAutoWin = team === "red" ? redAutoWin : blueAutoWin;
      const otherTeamHasAutoWin = team === "red" ? blueAutoWin : redAutoWin;

      // Remove autonomous points from current score
      if (hasAutoWin && !otherTeamHasAutoWin) {
        return currentScore - 6; // Remove 6 points for solo auto win
      } else if (hasAutoWin && otherTeamHasAutoWin) {
        return currentScore - 3; // Remove 3 points for shared auto win
      }

      return currentScore; // No auto points to remove
    },
    [redScore, blueScore, redAutoWin, blueAutoWin]
  );

  // Add a ring to a goal
  const addRingToGoal = (goalId: string, color: "red" | "blue") => {
    // Update mobile goals
    const updatedGoals = mobileGoals.map((goal) =>
      goal.id === goalId
        ? {
            ...goal,
            rings:
              goal.rings.length < 6 ? [...goal.rings, color] : goal.rings,
          }
        : goal
    );

    setMobileGoals(updatedGoals);

    // Add to history for undo/redo
    addToHistory({
      type: "ADD_RING",
      goalId,
      ringColor: color,
    });
  };

  // Remove a ring from a goal
  const removeRingFromGoal = (goalId: string) => {
    const goalToUpdate = mobileGoals.find((g) => g.id === goalId);
    if (!goalToUpdate || goalToUpdate.rings.length === 0) return;

    // Get the color of the ring being removed for history
    const removedRingColor = goalToUpdate.rings[goalToUpdate.rings.length - 1];
    const ringIndex = goalToUpdate.rings.length - 1;

    // Add a history action for undo/redo
    const action: HistoryActionWithoutTimestamp = {
      type: "REMOVE_RING",
      goalId,
      ringColor: removedRingColor,
      ringIndex,
    };
    addToHistory(action);

    // Update the goals state
    setMobileGoals((goals) => {
      return goals.map((goal) => {
        if (goal.id === goalId && goal.rings.length > 0) {
          return {
            ...goal,
            rings: goal.rings.slice(0, -1),
          };
        }
        return goal;
      });
    });
  };

  // Fix the autonomous scoring logic with completely reset approach
  const handleRedAutoClick = useCallback(() => {
    const newRedAutoState = !redAutoWin;

    // Calculate base scores without any autonomous points
    const baseRedScore = calculateBaseScore("red");
    const baseBlueScore = calculateBaseScore("blue");

    // Apply autonomous points based on the new state
    let newRedScore = baseRedScore;
    let newBlueScore = baseBlueScore;

    if (newRedAutoState && !blueAutoWin) {
      // Red solo auto win (6 points)
      newRedScore += 6;
    } else if (!newRedAutoState && blueAutoWin) {
      // Blue solo auto win (6 points)
      newBlueScore += 6;
    } else if (newRedAutoState && blueAutoWin) {
      // Both have auto win (3 points each)
      newRedScore += 3;
      newBlueScore += 3;
    }

    // Update states
    setRedAutoWin(newRedAutoState);
    setRedScore(newRedScore);
    setBlueScore(newBlueScore);

    // Add to history
    addToHistory({
      type: "UPDATE_SCORE",
      team: "red",
      from: redScore,
      to: newRedScore,
    });

    if (newBlueScore !== blueScore) {
      addToHistory({
        type: "UPDATE_SCORE",
        team: "blue",
        from: blueScore,
        to: newBlueScore,
      });
    }
  }, [
    redAutoWin,
    blueAutoWin,
    redScore,
    blueScore,
    addToHistory,
    calculateBaseScore,
  ]);

  const handleBlueAutoClick = useCallback(() => {
    const newBlueAutoState = !blueAutoWin;

    // Calculate base scores without any autonomous points
    const baseRedScore = calculateBaseScore("red");
    const baseBlueScore = calculateBaseScore("blue");

    // Apply autonomous points based on the new state
    let newRedScore = baseRedScore;
    let newBlueScore = baseBlueScore;

    if (!redAutoWin && newBlueAutoState) {
      // Blue solo auto win (6 points)
      newBlueScore += 6;
    } else if (redAutoWin && !newBlueAutoState) {
      // Red solo auto win (6 points)
      newRedScore += 6;
    } else if (redAutoWin && newBlueAutoState) {
      // Both have auto win (3 points each)
      newRedScore += 3;
      newBlueScore += 3;
    }

    // Update states
    setBlueAutoWin(newBlueAutoState);
    setRedScore(newRedScore);
    setBlueScore(newBlueScore);

    // Add to history
    addToHistory({
      type: "UPDATE_SCORE",
      team: "blue",
      from: blueScore,
      to: newBlueScore,
    });

    if (newRedScore !== redScore) {
      addToHistory({
        type: "UPDATE_SCORE",
        team: "red",
        from: redScore,
        to: newRedScore,
      });
    }
  }, [
    redAutoWin,
    blueAutoWin,
    redScore,
    blueScore,
    addToHistory,
    calculateBaseScore,
  ]);

  // Update the undo/redo functionality to handle ring operations
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const action = history[historyIndex - 1];

      switch (action.type) {
        case "MOVE_GOAL":
          setMobileGoals((goals) => {
            return goals.map((goal) => {
              if (goal.id === action.id) {
                return {
                  ...goal,
                  x: action.from.x,
                  y: action.from.y,
                };
              }
              return goal;
            });
          });
          break;

        case "MOVE_TEAM_SQUARE":
          setSquares((squares) => {
            return squares.map((square) => {
              if (square.id === action.id) {
                return {
                  ...square,
                  x: action.from.x,
                  y: action.from.y,
                };
              }
              return square;
            });
          });
          break;

        case "ADD_LINE":
          setLines((lines) => lines.filter((line) => line !== action.line));
          break;

        case "REMOVE_LINE":
          setLines((lines) => [...lines, action.line]);
          break;

        case "CLEAR_LINES":
          setLines(action.lines);
          break;

        case "UPDATE_SCORE":
          if (action.team === "red") {
            setRedScore(action.from);
            if (action.from < action.to && action.to - action.from === 6) {
              setRedAutoWin(false);
            } else if (
              action.from < action.to &&
              action.to - action.from === 3
            ) {
              setRedAutoWin(false);
            }
          } else {
            setBlueScore(action.from);
            if (action.from < action.to && action.to - action.from === 6) {
              setBlueAutoWin(false);
            } else if (
              action.from < action.to &&
              action.to - action.from === 3
            ) {
              setBlueAutoWin(false);
            }
          }
          break;

        case "ADD_RING":
          setMobileGoals((goals) => {
            return goals.map((goal) => {
              if (goal.id === action.goalId) {
                return {
                  ...goal,
                  rings: goal.rings.slice(0, -1),
                };
              }
              return goal;
            });
          });
          break;

        case "REMOVE_RING":
          setMobileGoals((goals) => {
            return goals.map((goal) => {
              if (goal.id === action.goalId) {
                const newRings = [...goal.rings];
                newRings.splice(action.ringIndex, 0, action.ringColor);
                return {
                  ...goal,
                  rings: newRings,
                };
              }
              return goal;
            });
          });
          break;
      }

      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length) {
      const action = history[historyIndex];

      switch (action.type) {
        case "MOVE_GOAL":
          setMobileGoals((goals) => {
            return goals.map((goal) => {
              if (goal.id === action.id) {
                return {
                  ...goal,
                  x: action.to.x,
                  y: action.to.y,
                };
              }
              return goal;
            });
          });
          break;

        case "MOVE_TEAM_SQUARE":
          setSquares((squares) => {
            return squares.map((square) => {
              if (square.id === action.id) {
                return {
                  ...square,
                  x: action.to.x,
                  y: action.to.y,
                };
              }
              return square;
            });
          });
          break;

        case "ADD_LINE":
          setLines((lines) => [...lines, action.line]);
          break;

        case "REMOVE_LINE":
          setLines((lines) => lines.filter((line) => line !== action.line));
          break;

        case "CLEAR_LINES":
          setLines([]);
          break;

        case "UPDATE_SCORE":
          if (action.team === "red") {
            setRedScore(action.to);
            if (action.from < action.to && action.to - action.from === 6) {
              setRedAutoWin(true);
            } else if (
              action.from < action.to &&
              action.to - action.from === 3
            ) {
              setRedAutoWin(true);
            }
          } else {
            setBlueScore(action.to);
            if (action.from < action.to && action.to - action.from === 6) {
              setBlueAutoWin(true);
            } else if (
              action.from < action.to &&
              action.to - action.from === 3
            ) {
              setBlueAutoWin(true);
            }
          }
          break;

        case "ADD_RING":
          setMobileGoals((goals) => {
            return goals.map((goal) => {
              if (goal.id === action.goalId) {
                return {
                  ...goal,
                  rings: [...goal.rings, action.ringColor],
                };
              }
              return goal;
            });
          });
          break;

        case "REMOVE_RING":
          setMobileGoals((goals) => {
            return goals.map((goal) => {
              if (goal.id === action.goalId) {
                const newRings = [...goal.rings];
                newRings.splice(action.ringIndex, 1);
                return {
                  ...goal,
                  rings: newRings,
                };
              }
              return goal;
            });
          });
          break;
      }

      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if it's a Mac (Command key) or Windows/Linux (Control key)
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;

      if ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) {
        // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        }
        // Redo: Cmd+Shift+Z (Mac) or Ctrl+Y (Windows/Linux)
        else if (
          (isMac && e.key === "z" && e.shiftKey) ||
          (!isMac && e.key === "y")
        ) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  // Calculate scores for both teams
  const calculateScore = () => {
    let redScore = 0;
    let blueScore = 0;

    // Add points from autonomous
    if (redAutoWin && !blueAutoWin) {
      redScore += 6;
    } else if (blueAutoWin && !redAutoWin) {
      blueScore += 6;
    } else if (redAutoWin && blueAutoWin) {
      redScore += 3;
      blueScore += 3;
    }

    // Add points from mobile goals
    mobileGoals.forEach((goal) => {
      let goalRedScore = 0;
      let goalBlueScore = 0;

      // Count regular points (1 per ring)
      goal.rings.forEach((ring) => {
        if (ring === "red") goalRedScore += 1;
        else if (ring === "blue") goalBlueScore += 1;
      });

      // Add bonus points for the highest ring (2 additional points)
      if (goal.rings.length > 0) {
        const topRing = goal.rings[goal.rings.length - 1];
        if (topRing === "red") goalRedScore += 2;
        else if (topRing === "blue") goalBlueScore += 2;
      }

      // Add goal points to total score
      redScore += goalRedScore;
      blueScore += goalBlueScore;
    });

    // Add points from wall stakes
    wallStakes.forEach((stake) => {
      let stakeRedScore = 0;
      let stakeBlueScore = 0;

      // Count regular points (1 per ring)
      stake.rings.forEach((ring) => {
        if (ring === "red") stakeRedScore += 1;
        else if (ring === "blue") stakeBlueScore += 1;
      });

      // Add bonus points for the highest ring (2 additional points)
      if (stake.rings.length > 0) {
        const topRing = stake.rings[stake.rings.length - 1];
        if (topRing === "red") stakeRedScore += 2;
        else if (topRing === "blue") stakeBlueScore += 2;
      }

      // Add stake points to total score
      redScore += stakeRedScore;
      blueScore += stakeBlueScore;
    });

    // Add points from team stakes
    teamStakes.forEach((stake) => {
      let stakeRedScore = 0;
      let stakeBlueScore = 0;

      // Count regular points (1 per ring)
      stake.rings.forEach((ring) => {
        if (ring === "red") stakeRedScore += 1;
        else if (ring === "blue") stakeBlueScore += 1;
      });

      // Add bonus points for the highest ring (2 additional points)
      if (stake.rings.length > 0) {
        const topRing = stake.rings[stake.rings.length - 1];
        if (topRing === "red") stakeRedScore += 2;
        else if (topRing === "blue") stakeBlueScore += 2;
      }

      // Add stake points to total score
      redScore += stakeRedScore;
      blueScore += stakeBlueScore;
    });

    // Add points from high stake (6 points for the team whose ring is on it)
    if (highStakeRing === "red") {
      redScore += 6;
    } else if (highStakeRing === "blue") {
      blueScore += 6;
    }

    return { red: redScore, blue: blueScore };
  };

  return (
    <div className="game-canvas-container" ref={containerRef}>
      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        id="main-dnd-context"
      >
        <DrawingSidebar
          settings={drawingSettings}
          onSettingsChange={(newSettings) =>
            setDrawingSettings((prev) => ({ ...prev, ...newSettings }))
          }
          onClearCanvas={handleClearCanvas}
          isMobile={isMobile}
          squares={squares}
        />

        <ThemeToggle />

        <div
          className={`absolute top-0 left-0 right-0 w-full flex flex-col justify-center items-center ${
            isDarkMode ? "dark" : ""
          }`}
          style={{
            marginTop: isMobile ? "64px" : "32px",
            paddingTop: 0,
            paddingBottom: "32px",
            overflowX: "hidden",
            minHeight: `${FIELD_SIZE_INCHES * scale + 64}px`,
          }}
        >
          {/* Scoreboard and Auto Buttons - Now above the game canvas but centered */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              marginBottom: "15px",
              width: `${FIELD_SIZE_INCHES * scale}px`,
              maxWidth: "100%",
            }}
          >
            {/* Scoreboard */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: isDarkMode ? "#222" : "#fff",
                borderRadius: "8px",
                padding: "8px 16px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                border: "2px solid #000",
                width: "200px",
                height: "50px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "45%",
                  color: "#e74c3c",
                  fontWeight: "bold",
                  fontSize: "24px",
                }}
              >
                {calculateScore().red}
              </div>
              <div
                style={{
                  width: "10%",
                  textAlign: "center",
                  fontWeight: "bold",
                  fontSize: "24px",
                  color: isDarkMode ? "#fff" : "#000",
                }}
              >
                -
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "45%",
                  color: "#3498db",
                  fontWeight: "bold",
                  fontSize: "24px",
                }}
              >
                {calculateScore().blue}
              </div>
            </div>

            {/* Auto Buttons */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                width: "200px",
              }}
            >
              {/* Red Auto Button */}
              <Button
                onClick={handleRedAutoClick}
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  border: redAutoWin ? "none" : "2px solid #e74c3c",
                  backgroundColor: redAutoWin ? "#e74c3c" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  outline: "none",
                }}
              >
                <span
                  style={{
                    color: redAutoWin
                      ? isDarkMode
                        ? "#222"
                        : "#fff"
                      : "#e74c3c",
                    fontWeight: "bold",
                    fontSize: "20px",
                  }}
                >
                  A
                </span>
              </Button>

              {/* Blue Auto Button */}
              <Button
                onClick={handleBlueAutoClick}
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  border: blueAutoWin ? "none" : "2px solid #3498db",
                  backgroundColor: blueAutoWin ? "#3498db" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  outline: "none",
                }}
              >
                <span
                  style={{
                    color: blueAutoWin
                      ? isDarkMode
                        ? "#222"
                        : "#fff"
                      : "#3498db",
                    fontWeight: "bold",
                    fontSize: "20px",
                  }}
                >
                  A
                </span>
              </Button>
            </div>
          </div>

          <div
            className={`relative border-2 rounded-lg ${
              isDarkMode
                ? "bg-[#16161e] border-[#292e42]"
                : "bg-gray-100 border-gray-300"
            }`}
            style={{
              width: `${FIELD_SIZE_INCHES * scale}px`,
              height: `${FIELD_SIZE_INCHES * scale}px`,
              maxWidth: "100%",
              maxHeight: "100vw",
              marginTop: 0,
              backgroundImage: 'url("/assets/svg/Field.svg")',
              backgroundSize: "100% 100%",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* Center HangLadder - non-draggable */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <Image
                src="/assets/svg/HangLadder.svg"
                alt="Hang Ladder"
                width={HANG_LADDER_SIZE_INCHES * scale}
                height={HANG_LADDER_SIZE_INCHES * scale}
                priority
              />
              {/* Clickable area for high stake popup in bottom corner */}
              <div 
                className="absolute bottom-0 right-0 w-24 h-24 cursor-pointer" 
                onClick={() => setHighStakePopupOpen(true)} 
                style={{ zIndex: 5 }}
              ></div>
            </div>

            {/* Draggable Mobile Goals - render each one separately */}
            {mobileGoals.map((goal) => (
              <DraggableGoal
                key={goal.id}
                id={goal.id}
                initialPosition={{ x: goal.x, y: goal.y }}
                isDrawMode={drawingSettings.isDrawMode}
                scale={scale}
                onGoalClick={handleGoalClick}
              />
            ))}

            {/* Team Squares */}
            {squares.map((square) => (
              <TeamSquare
                key={square.id}
                id={square.id}
                type={square.type}
                x={square.x}
                y={square.y}
                size={square.size}
                teamNumber={square.teamNumber}
                scale={scale}
                onClick={() => handleSquareClick(square.id)}
              />
            ))}

            {/* Fixed Stakes */}
            {STAKES.map((stake) => {
              const stakeSize = STAKE_SIZE_INCHES * scale;
              return (
                <div
                  key={stake.id}
                  className="absolute"
                  style={{
                    left: `${
                      (stake.x + FIELD_SIZE_INCHES / 2) * scale - stakeSize / 2
                    }px`,
                    top: `${
                      (-stake.y + FIELD_SIZE_INCHES / 2) * scale - stakeSize / 2
                    }px`,
                    width: `${stakeSize}px`,
                    height: `${stakeSize}px`,
                  }}
                >
                  <Image
                    src={`/assets/svg/${stake.type}Stake.svg`}
                    alt={`${
                      stake.type.charAt(0).toUpperCase() +
                      stake.type.slice(1)
                    } Stake`}
                    width={stakeSize}
                    height={stakeSize}
                    priority
                  />
                  {stake.type === "wall" && (
                    <div
                      className="absolute top-0 left-0 w-full h-full cursor-pointer"
                      onClick={() => handleStakeClick(stake.id)}
                    />
                  )}
                  {(stake.type === "red" || stake.type === "blue") && (
                    <div
                      className="absolute top-0 left-0 w-full h-full cursor-pointer"
                      onClick={() => handleTeamStakeClick(stake.id)}
                    />
                  )}
                </div>
              );
            })}

            {/* Drawing canvas */}
            <canvas
              ref={(el) => {
                // Set the canvas ref
                canvasRef.current = el;

                if (el) {
                  // Add non-passive touch event listener to allow preventDefault
                  el.addEventListener(
                    "touchstart",
                    (e) => {
                      e.preventDefault();
                    },
                    { passive: false }
                  );
                }
              }}
              className="absolute top-0 left-0 z-10 touch-none"
              style={{
                cursor: drawingSettings.isDrawMode
                  ? drawingSettings.isEraser
                    ? 'url("/assets/svg/eraser-cursor.svg") 8 8, auto'
                    : "crosshair"
                  : "default",
                pointerEvents: drawingSettings.isDrawMode ? "auto" : "none",
                width: "100%",
                height: "100%",
              }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          </div>
        </div>

        {/* Team Number Dialog */}
        <Dialog
          open={teamNumberDialogOpen}
          onOpenChange={setTeamNumberDialogOpen}
        >
          <DialogContent
            className={`${
              isDarkMode
                ? "bg-[#1a1b26] text-white border-[#292e42]"
                : "bg-white"
            }`}
          >
            <Button 
              className="absolute right-3 top-3 rounded-full p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition-all z-50" 
              onClick={() => setTeamNumberDialogOpen(false)}
              style={{ cursor: 'pointer' }}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <div className="h-4"></div>
            <DialogHeader className="pt-4">
              <DialogTitle>Enter Team Number</DialogTitle>
            </DialogHeader>
            <DialogDescription className="pb-4">
              Enter the team number for the selected square.
            </DialogDescription>
            <Input
              value={teamNumberInput}
              onChange={(e) => setTeamNumberInput(e.target.value)}
              placeholder="Team Number"
              className={`${
                isDarkMode ? "bg-[#24283b] text-white border-[#292e42]" : ""
              }`}
            />
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button
                  className={
                    isDarkMode
                      ? "bg-[#24283b] text-white border-[#292e42] hover:bg-[#292e42]"
                      : ""
                  }
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                onClick={saveTeamNumber}
                className={
                  isDarkMode ? "bg-[#7aa2f7] text-white hover:bg-[#5d7dcb]" : ""
                }
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Goal Popup Dialog */}
        <Dialog
          open={showGoalPopup}
          onOpenChange={(open) => {
            setShowGoalPopup(open);
            if (!open) setSelectedGoalId(null);
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
              onClick={() => {
                setShowGoalPopup(false);
                setSelectedGoalId(null);
              }}
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
                    Rings on Goal:{" "}
                    {mobileGoals.find((g) => g.id === selectedGoalId)?.rings
                      .length || 0}
                    /6
                  </p>

                  {/* Goal and Ring Visualization - Container with fixed height and width */}
                  <div
                    className="relative mx-auto"
                    style={{ 
                      height: "350px", 
                      width: "350px", 
                      position: "relative",
                      overflow: "hidden"
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
                      {mobileGoals
                        .find((g) => g.id === selectedGoalId)
                        ?.rings.map((ringColor, index) => {
                          // Fixed pixel positions
                          const basePosition = 120; // Base position from top
                          const spacing = 38; // Spacing between rings
                          const topPosition = basePosition - index * spacing;
                          
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
                              width={350} // Fixed width for the ring
                              height={70}  // Fixed height for the ring
                              style={{
                                position: "absolute",
                                top: `${topPosition}px`, // Use fixed pixels
                                left: "50%",
                                transform: "translateX(-50%) scale(1.5)",
                                zIndex: 10 + index, // Higher z-index to ensure rings are visible
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
                      width={350} // Fixed width
                      height={350} // Fixed height
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        transform: "scale(1.5)", // Make the goal 50% larger
                        zIndex: 5, // Lower z-index than rings but higher than container
                      }}
                    />
                  </div>

                  {/* Mini Scoreboard for the Goal */}
                  <div className="flex justify-around items-center w-full mt-2 mb-2 px-2 sm:px-8">
                    {(() => {
                      const goalRings =
                        mobileGoals.find((g) => g.id === selectedGoalId)
                          ?.rings || [];

                      // Calculate scores based on the rules:
                      // Each ring is worth 1 point for its team
                      // The highest ring is worth an additional 2 points for its team
                      let redScore = 0;
                      let blueScore = 0;

                      // Count regular points (1 per ring)
                      goalRings.forEach((ring) => {
                        if (ring === "red") redScore += 1;
                        else if (ring === "blue") blueScore += 1;
                      });

                      // Add bonus points for the highest ring (2 additional points)
                      if (goalRings.length > 0) {
                        const topRing = goalRings[goalRings.length - 1];
                        if (topRing === "red") redScore += 2;
                        else if (topRing === "blue") blueScore += 2;
                      }

                      return (
                        <>
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
                            Goal Points
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
                        </>
                      );
                    })()}
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
                        console.log("Red ring button clicked");
                        if (selectedGoalId) {
                          addRingToGoal(selectedGoalId, "red");
                        }
                      }}
                      disabled={
                        mobileGoals.find((g) => g.id === selectedGoalId)?.rings
                          .length === 6
                      }
                      className={`px-4 py-2 rounded-md ${
                        mobileGoals.find((g) => g.id === selectedGoalId)?.rings
                          .length === 6
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:opacity-80"
                      } bg-red-500 text-white hover:bg-red-600`}
                    >
                      Add Red Ring
                    </Button>

                    <Button
                      onClick={() => {
                        console.log("Blue ring button clicked");
                        if (selectedGoalId) {
                          addRingToGoal(selectedGoalId, "blue");
                        }
                      }}
                      disabled={
                        mobileGoals.find((g) => g.id === selectedGoalId)?.rings
                          .length === 6
                      }
                      className={`px-4 py-2 rounded-md ${
                        mobileGoals.find((g) => g.id === selectedGoalId)?.rings
                          .length === 6
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:opacity-80"
                      } bg-blue-500 text-white hover:bg-blue-600`}
                    >
                      Add Blue Ring
                    </Button>

                    <Button
                      onClick={() => {
                        console.log("Remove ring button clicked");
                        if (selectedGoalId) {
                          removeRingFromGoal(selectedGoalId);
                        }
                      }}
                      disabled={
                        mobileGoals.find((g) => g.id === selectedGoalId)?.rings
                          .length === 0
                      }
                      className={`px-4 py-2 rounded-md ${
                        mobileGoals.find((g) => g.id === selectedGoalId)?.rings
                          .length === 0
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

        {/* Wall Stake Popup Dialog */}
        <Dialog open={showStakePopup} onOpenChange={setShowStakePopup}>
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
              onClick={closeStakePopup}
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
                    Rings on Stake:{" "}
                    {wallStakes.find((s) => s.id === selectedStakeId)?.rings
                      .length || 0}
                    /6
                  </p>

                  {/* Wall Stake and Ring Visualization - Container with fixed height */}
                  <div
                    className="relative mx-auto"
                    style={{ 
                      height: "350px", 
                      width: "350px", 
                      position: "relative",
                      overflow: "hidden"
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
                      {wallStakes
                        .find((s) => s.id === selectedStakeId)
                        ?.rings.map((ringColor, index) => {
                          // Fixed pixel positions
                          const basePosition = 120; // Base position from top
                          const spacing = 38; // Spacing between rings
                          const topPosition = basePosition - index * spacing;
                          
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
                              width={350} // Fixed width for the ring
                              height={70}  // Fixed height for the ring
                              style={{
                                position: "absolute",
                                top: `${topPosition}px`, // Use fixed pixels
                                left: "50%",
                                transform: "translateX(-50%) scale(1.5)",
                                zIndex: 10 + index, // Higher z-index to ensure rings are visible
                                objectFit: "contain",
                              }}
                            />
                          );
                        })}
                    </div>

                    {/* Wall Stake Side View - fixed size */}
                    <Image
                      src="/assets/svg/WallStakeSideView.svg"
                      alt="Wall Stake Side View"
                      width={350} // Fixed width
                      height={250} // Fixed height
                      style={{
                        position: "absolute",
                        top: "60px", // Positioned lower in the container
                        left: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        transform: "scale(1.5)", // Make the stake 50% larger
                        zIndex: 5, // Lower z-index than rings but higher than container
                      }}
                    />
                  </div>

                  {/* Mini Scoreboard for the Stake */}
                  <div className="flex justify-around items-center w-full mt-2 mb-2 px-2 sm:px-8">
                    {(() => {
                      const stakeRings =
                        wallStakes.find((s) => s.id === selectedStakeId)
                          ?.rings || [];

                      // Calculate scores based on the same rules as mobile goals:
                      // Each ring is worth 1 point for its team
                      // The highest ring is worth an additional 2 points for its team
                      let redScore = 0;
                      let blueScore = 0;

                      // Count regular points (1 per ring)
                      stakeRings.forEach((ring) => {
                        if (ring === "red") redScore += 1;
                        else if (ring === "blue") blueScore += 1;
                      });

                      // Add bonus points for the highest ring (2 additional points)
                      if (stakeRings.length > 0) {
                        const topRing = stakeRings[stakeRings.length - 1];
                        if (topRing === "red") redScore += 2;
                        else if (topRing === "blue") blueScore += 2;
                      }

                      return (
                        <>
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
                        </>
                      );
                    })()}
                  </div>

                  {/* Clear spacer to separate stake from buttons */}
                  <div style={{ height: "20px" }}></div>

                  {/* Ring Control Buttons */}
                  <div className="flex justify-around w-full mb-2">
                    <div className="space-x-2">
                      <Button
                        className={`px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600`}
                        onClick={() => {
                          if (selectedStakeId) {
                            addRingToStake(selectedStakeId, "red");
                          }
                        }}
                        disabled={
                          !selectedStakeId ||
                          (wallStakes.find((s) => s.id === selectedStakeId)?.rings
                            .length || 0) >= 6
                        }
                      >
                        Add Red Ring
                      </Button>
                      <Button
                        className={`px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600`}
                        onClick={() => {
                          if (selectedStakeId) {
                            addRingToStake(selectedStakeId, "blue");
                          }
                        }}
                        disabled={
                          !selectedStakeId ||
                          (wallStakes.find((s) => s.id === selectedStakeId)?.rings
                            .length || 0) >= 6
                        }
                      >
                        Add Blue Ring
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Button
                      onClick={() => {
                        console.log("Remove ring button clicked");
                        if (selectedStakeId) {
                          removeRingFromStake(selectedStakeId);
                        }
                      }}
                      disabled={
                        wallStakes.find((s) => s.id === selectedStakeId)?.rings
                          .length === 0
                      }
                      className={`px-4 py-2 rounded-md ${
                        wallStakes.find((s) => s.id === selectedStakeId)?.rings
                          .length === 0
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

        {/* Team Stake Popup Dialog */}
        <Dialog open={showTeamStakePopup} onOpenChange={setShowTeamStakePopup}>
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
              onClick={closeTeamStakePopup}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <DialogHeader className="pt-4">
              <DialogTitle></DialogTitle>
            </DialogHeader>

            {selectedTeamStakeId && (
              <div>
                {/* Ring Display */}
                <div className="mt-4 flex flex-col items-center">
                  <p
                    className={`${
                      isDarkMode ? "text-gray-300" : "text-gray-700"
                    } mb-2`}
                  >
                    Rings on Stake:{" "}
                    {teamStakes.find((s) => s.id === selectedTeamStakeId)?.rings
                      .length || 0}
                    /2
                  </p>

                  {/* Team Stake and Ring Visualization - Container with fixed height */}
                  <div
                    className="relative mx-auto"
                    style={{ 
                      height: "250px", 
                      width: "350px", 
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    {/* Team Stake Side View - fixed size */}
                    <div style={{ position: "relative", height: "100%", width: "100%" }}>
                      {/* Stake image */}
                      <Image
                        src={`/assets/svg/${selectedTeamStakeId === "redStake" ? "RedStakeSideView" : "BlueStakeSideView"}.svg`}
                        alt={`${selectedTeamStakeId === "redStake" ? "Red" : "Blue"} Stake View`}
                        width={350} // Fixed width
                        height={250} // Fixed height
                        style={{
                          position: "absolute",
                          top: "60px", // Positioned lower in the container
                          left: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          transform: "scale(1.5)", // Make the stake 50% larger
                        }}
                      />
                      
                      {/* Rings - positioned on top of stake */}
                      {teamStakes
                        .find((s) => s.id === selectedTeamStakeId)
                        ?.rings.map((ringColor, index) => {
                          // Fixed pixel positions
                          const basePosition = 20; // Base position from top
                          const spacing = 30; // Spacing between rings
                          const topPosition = basePosition - index * spacing;
                          
                          return (
                            <div 
                              key={index}
                              style={{
                                position: "absolute",
                                top: `${topPosition}px`,
                                left: 0,
                                width: "100%",
                                zIndex: 10 + index, // Ensure rings are above stake
                                display: "flex",
                                justifyContent: "center",
                              }}
                            >
                              <Image
                                src={`/assets/svg/${
                                  ringColor === "red"
                                    ? "RedRingSideView"
                                    : "BlueRingSideView"
                                }.svg`}
                                alt={`${
                                  ringColor.charAt(0).toUpperCase() +
                                  ringColor.slice(1)
                                } Ring`}
                                width={300} // Fixed width for the ring
                                height={60} // Fixed height for the ring
                                style={{
                                  transform: "scale(1.5)",
                                  objectFit: "contain",
                                }}
                              />
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Mini Scoreboard for the Team Stake */}
                  {selectedTeamStakeId === "redStake" ? (
                    // Only red score for red stake
                    <div className="flex justify-around items-center w-full mt-2 mb-2 px-2 sm:px-8">
                      {(() => {
                        const stakeRings =
                          teamStakes.find((s) => s.id === selectedTeamStakeId)
                            ?.rings || [];

                        // Calculate scores based on the same rules
                        let redScore = 0;

                        // Count regular points (1 per ring)
                        stakeRings.forEach((ring) => {
                          if (ring === "red") redScore += 1;
                        });

                        // Add bonus points for the highest ring (2 additional points)
                        if (stakeRings.length > 0) {
                          const topRing = stakeRings[stakeRings.length - 1];
                          if (topRing === "red") redScore += 2;
                        }

                        return (
                          <div
                            className="flex flex-col items-center bg-red-100 p-2 rounded-lg shadow-md"
                            style={{ minWidth: "70px" }}
                          >
                            <div className="text-red-600 font-bold text-2xl sm:text-3xl">
                              {redScore}
                            </div>
                            <div className="text-red-600 font-semibold text-sm sm:text-base">
                              Red Stake Points
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    // Only blue score for blue stake
                    <div className="flex justify-around items-center w-full mt-2 mb-2 px-2 sm:px-8">
                      {(() => {
                        const stakeRings =
                          teamStakes.find((s) => s.id === selectedTeamStakeId)
                            ?.rings || [];

                        // Calculate scores based on the same rules
                        let blueScore = 0;

                        // Count regular points (1 per ring)
                        stakeRings.forEach((ring) => {
                          if (ring === "blue") blueScore += 1;
                        });

                        // Add bonus points for the highest ring (2 additional points)
                        if (stakeRings.length > 0) {
                          const topRing = stakeRings[stakeRings.length - 1];
                          if (topRing === "blue") blueScore += 2;
                        }

                        return (
                          <div
                            className="flex flex-col items-center bg-blue-100 p-2 rounded-lg shadow-md"
                            style={{ minWidth: "70px" }}
                          >
                            <div className="text-blue-600 font-bold text-2xl sm:text-3xl">
                              {blueScore}
                            </div>
                            <div className="text-blue-600 font-semibold text-sm sm:text-base">
                              Blue Stake Points
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Clear spacer to separate stake from buttons */}
                  <div style={{ height: "20px" }}></div>

                  {/* Ring Control Buttons - Only show appropriate color button for each stake */}
                  <div className="flex justify-around w-full mb-2">
                    <div className="space-x-2">
                      {selectedTeamStakeId === "redStake" ? (
                        <Button
                          className={`px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600 ${
                            teamStakes.find((s) => s.id === selectedTeamStakeId)?.rings
                              .length === 2
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:opacity-80"
                          }`}
                          onClick={() => {
                            if (selectedTeamStakeId) {
                              addRingToTeamStake(selectedTeamStakeId, "red");
                            }
                          }}
                          disabled={
                            !selectedTeamStakeId ||
                            (teamStakes.find((s) => s.id === selectedTeamStakeId)?.rings
                              .length || 0) >= 2
                          }
                        >
                          Add Red Ring
                        </Button>
                      ) : (
                        <Button
                          className={`px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 ${
                            teamStakes.find((s) => s.id === selectedTeamStakeId)?.rings
                              .length === 2
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:opacity-80"
                          }`}
                          onClick={() => {
                            if (selectedTeamStakeId) {
                              addRingToTeamStake(selectedTeamStakeId, "blue");
                            }
                          }}
                          disabled={
                            !selectedTeamStakeId ||
                            (teamStakes.find((s) => s.id === selectedTeamStakeId)?.rings
                              .length || 0) >= 2
                          }
                        >
                          Add Blue Ring
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Button
                      onClick={() => {
                        if (selectedTeamStakeId) {
                          removeRingFromTeamStake(selectedTeamStakeId);
                        }
                      }}
                      disabled={
                        teamStakes.find((s) => s.id === selectedTeamStakeId)?.rings
                          .length === 0
                      }
                      className={`px-4 py-2 rounded-md ${
                        teamStakes.find((s) => s.id === selectedTeamStakeId)?.rings
                          .length === 0
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

        {/* High Stake Popup */}
        <Dialog open={highStakePopupOpen} onOpenChange={setHighStakePopupOpen}>
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
              onClick={() => {
                setHighStakePopupOpen(false);
                setHighStakeRing(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
            
            <DialogHeader className="pt-4">
              <DialogTitle></DialogTitle>
            </DialogHeader>

            <div className="mt-4 flex flex-col items-center">
              <p
                className={`${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                } mb-2`}
              >
                Rings on High Stake: {highStakeRing ? "1" : "0"}/1
              </p>

              {/* High Stake and Ring Visualization - Container with fixed height */}
              <div
                className="relative mx-auto"
                style={{ 
                  height: "250px", 
                  width: "350px", 
                  position: "relative",
                  overflow: "hidden"
                }}
              >
                {/* High Stake Side View - fixed size */}
                <Image
                  src="/assets/svg/HighStakeSideView.svg"
                  alt="High Stake Side View"
                  width={350} // Fixed width
                  height={250} // Fixed height
                  style={{
                    position: "absolute",
                    top: "60px", // Positioned lower in the container
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    transform: "scale(1.5)", // Make the stake 50% larger
                    zIndex: 5, // Lower z-index than rings but higher than container
                  }}
                />
                
                {/* Rings - positioned on top of stake */}
                {highStakeRing && (
                  <div 
                    style={{
                      position: "absolute",
                      top: "25px",
                      left: 0,
                      width: "100%",
                      zIndex: 20, // Ensure rings are above stake
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Image
                      src={`/assets/svg/${
                        highStakeRing === "red" ? "RedRingSideView" : "BlueRingSideView"
                      }.svg`}
                      alt={`${highStakeRing === "red" ? "Red" : "Blue"} Ring`}
                      width={300} // Fixed width for the ring
                      height={60} // Fixed height for the ring
                      style={{
                        transform: "scale(1.5)",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Mini Scoreboard for the High Stake */}
              <div className="flex justify-around items-center w-full mt-2 mb-2 px-2 sm:px-8">
                {(() => {
                  // Calculate scores based on high stake rules:
                  // 6 points for the team whose ring is on it
                  const redScore = highStakeRing === "red" ? 6 : 0;
                  const blueScore = highStakeRing === "blue" ? 6 : 0;

                  return (
                    <>
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
                    </>
                  );
                })()}
              </div>

              {/* Clear spacer to separate stake from buttons */}
              <div style={{ height: "20px" }}></div>

              {/* Ring Control Buttons */}
              <div className="flex justify-around w-full mb-2">
                <div className="space-x-2">
                  <Button
                    className={`px-4 py-2 rounded-md bg-red-500 text-white hover:bg-red-600`}
                    onClick={() => setHighStakeRing("red")}
                    disabled={highStakeRing !== null}
                  >
                    Add Red Ring
                  </Button>
                  <Button
                    className={`px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600`}
                    onClick={() => setHighStakeRing("blue")}
                    disabled={highStakeRing !== null}
                  >
                    Add Blue Ring
                  </Button>
                </div>
              </div>

              <div>
                <Button
                  onClick={() => setHighStakeRing(null)}
                  disabled={highStakeRing === null}
                  className={`px-4 py-2 rounded-md ${
                    highStakeRing === null
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:opacity-80"
                  } bg-gray-500 text-white hover:bg-gray-600`}
                >
                  Remove Ring
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DndContext>
    </div>
  );
};

export default GameCanvas;
