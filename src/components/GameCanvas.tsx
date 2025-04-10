"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  DragStartEvent,
  DragMoveEvent,
  Modifier,
  MeasuringStrategy
} from "@dnd-kit/core";
import DrawingSidebar from "./Sidebar";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "./ui/button";

// Import components that were extracted
import TeamSquare from "./TeamSquare";
import DraggableGoal from "./DraggableGoal";
import MobileGoalPopup from "./popups/MobileGoalPopup";
import WallStakePopup from "./popups/WallStakePopup";
import TeamStakePopup from "./popups/TeamStakePopup";
import TeamNumberDialog from "./popups/TeamNumberDialog";
import HighStakePopup from "./popups/HighStakePopup"; // Import the new HighStakePopup component
import HangPopup from "./popups/HangPopup"; // Import the new HangPopup component

// Import types and constants from new files
import {
  Point,
  Line,
  LineStyle,
  MobileGoal,
  WallStake,
  TeamStake,
  HangScore,
  HistoryAction,
} from "./types/gameTypes";

import {
  FIELD_SIZE_INCHES,
  HANG_LADDER_SIZE_INCHES,
  STAKE_SIZE_INCHES,
  STAKES,
  INITIAL_SQUARES,
  INITIAL_MOBILE_GOALS,
  INITIAL_WALL_STAKES,
  INITIAL_TEAM_STAKES,
  DIRECTION_SMOOTHING_FACTOR,
  MIN_DIRECTION_CHANGE_THRESHOLD,
  MIN_DIRECTION_POINTS,
  END_POINTS_TO_IGNORE,
  MOBILE_GOAL_SIZE_INCHES,
  FIELD_ZONES,
} from "./constants/gameConstants";

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
    lineEndStyle: "none" as "none" | "arrow",
  });

  // History state for undo/redo
  const [objectHistory, setObjectHistory] = useState<HistoryAction[]>([]);
  const [objectHistoryIndex, setObjectHistoryIndex] = useState(-1);
  // Separate history for drawing actions
  const [drawingHistory, setDrawingHistory] = useState<HistoryAction[]>([]);
  const [drawingHistoryIndex, setDrawingHistoryIndex] = useState(-1);
  const [dragStartPositions, setDragStartPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [redAutoWin, setRedAutoWin] = useState(false);
  const [blueAutoWin, setBlueAutoWin] = useState(false);
  const [redScore, setRedScore] = useState(0);
  const [blueScore, setBlueScore] = useState(0);

  // Add refs for the score elements
  const redScoreRef = useRef<HTMLDivElement>(null);
  const blueScoreRef = useRef<HTMLDivElement>(null);

  // Function to add a timestamp to drawing actions
  const addToHistory = useCallback(
    (action: HistoryAction) => {
      // Determine which history to update based on action type
      const isDrawingAction = action.type === "ADD_LINE" || action.type === "REMOVE_LINE" || action.type === "CLEAR_LINES";
      
      if (isDrawingAction) {
        // Add to drawing history
        if (drawingHistoryIndex < drawingHistory.length - 1) {
          setDrawingHistory((prev) => [
            ...prev.slice(0, drawingHistoryIndex + 1),
            action,
          ]);
        } else {
          setDrawingHistory((prev) => [...prev, action]);
        }
        setDrawingHistoryIndex((prev) => prev + 1);
      } else {
        // Add to object history
        if (objectHistoryIndex < objectHistory.length - 1) {
          setObjectHistory((prev) => [
            ...prev.slice(0, objectHistoryIndex + 1),
            action,
          ]);
        } else {
          setObjectHistory((prev) => [...prev, action]);
        }
        setObjectHistoryIndex((prev) => prev + 1);
      }
    },
    [drawingHistory, drawingHistoryIndex, objectHistory, objectHistoryIndex]
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

  const [teamStakes, setTeamStakes] = useState<TeamStake[]>(INITIAL_TEAM_STAKES);
  const [showTeamStakePopup, setShowTeamStakePopup] = useState(false);

  const handleTeamStakeClick = (stakeId: string) => {
    setSelectedStakeId(stakeId);
    setShowTeamStakePopup(true);
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

  // Hang ladder state
  const [hangScores, setHangScores] = useState<HangScore[]>([
    { teamId: "teamSquare1", teamNumber: "", teamColor: "red", level: 0 },
    { teamId: "teamSquare2", teamNumber: "", teamColor: "red", level: 0 },
    { teamId: "teamSquare3", teamNumber: "", teamColor: "blue", level: 0 },
    { teamId: "teamSquare4", teamNumber: "", teamColor: "blue", level: 0 },
  ]);
  const [hangPopupOpen, setHangPopupOpen] = useState(false);

  // Handle hang score level change
  const handleHangScoreChange = (teamId: string, newLevel: 0 | 1 | 2 | 3) => {
    setHangScores(prev => 
      prev.map(score => 
        score.teamId === teamId ? { ...score, level: newLevel } : score
      )
    );
  };

  // Calculate scores for both teams
  const calculateScore = useCallback((goals = mobileGoals) => {
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
    goals.forEach((goal) => {
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

      // Check if the goal is in a scoring zone
      let zoneEffect = null;
      
      // Check each zone to see if the goal is inside it
      Object.values(FIELD_ZONES).forEach(zone => {
        // For triangular zones, we need to check if the point is inside the triangle
        if (zone.shape === "triangle") {
          const zoneX = zone.x;
          const zoneY = zone.y;
          const zoneWidth = zone.width;
          const zoneHeight = zone.height;
          
          // Convert goal coordinates to relative position in the zone's rectangle
          const goalX = goal.x;
          const goalY = goal.y;
          
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
          // Check if the goal's position is within the zone boundaries (for rectangular zones)
          if (
            goal.x >= zone.x && 
            goal.x <= zone.x + zone.width && 
            goal.y >= zone.y && 
            goal.y <= zone.y + zone.height
          ) {
            zoneEffect = zone.effect;
          }
        }
      });
      
      // Apply zone effects to the scores
      if (zoneEffect === "double") {
        goalRedScore *= 2;
        goalBlueScore *= 2;
      } else if (zoneEffect === "negative") {
        goalRedScore = -goalRedScore;
        goalBlueScore = -goalBlueScore;
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

    // Add scoring for high stake
    if (highStakeRing === "red") {
      redScore += 6;
    } else if (highStakeRing === "blue") {
      blueScore += 6;
    }

    // Add points from hang ladder
    hangScores.forEach((score) => {
      if (score.teamColor === "red") {
        // Base hang points
        let hangPoints = 0;
        if (score.level === 1) hangPoints = 3;      // T1
        else if (score.level === 2) hangPoints = 6; // T2
        else if (score.level === 3) hangPoints = 12; // T3
        
        // Add bonus points if red has the high stake
        if (highStakeRing === "red" && score.level > 0) {
          hangPoints += 2;
        }
        
        redScore += hangPoints;
      } else if (score.teamColor === "blue") {
        // Base hang points
        let hangPoints = 0;
        if (score.level === 1) hangPoints = 3;      // T1
        else if (score.level === 2) hangPoints = 6; // T2
        else if (score.level === 3) hangPoints = 12; // T3
        
        // Add bonus points if blue has the high stake
        if (highStakeRing === "blue" && score.level > 0) {
          hangPoints += 2;
        }
        
        blueScore += hangPoints;
      }
    });

    // Ensure scores don't go below 0 for display
    const displayRedScore = Math.max(0, redScore);
    const displayBlueScore = Math.max(0, blueScore);

    return { 
      red: displayRedScore, 
      blue: displayBlueScore,
      // Keep track of actual scores for internal calculations
      actualRed: redScore,
      actualBlue: blueScore
    };
  }, [redAutoWin, blueAutoWin, wallStakes, teamStakes, highStakeRing, mobileGoals, hangScores]);

  // Initialize scores
  useEffect(() => {
    const initialScores = calculateScore();
    setRedScore(initialScores.red);
    setBlueScore(initialScores.blue);
  }, [calculateScore]);

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

  // Create a modifier to restrict dragging within field boundaries
  const restrictToFieldModifier: Modifier = useCallback(
    ({ transform, active }) => {
      if (!canvasRef.current || !active) {
        return transform;
      }

      const id = active.id as string;
      
      // Handle mobile goals (using game coordinates)
      if (id.includes("mobileGoal")) {
        const goal = mobileGoals.find(g => g.id === id);
        if (!goal) return transform;
        
        // Field boundaries in screen coordinates
        const halfField = FIELD_SIZE_INCHES / 2;
        const halfGoalSize = MOBILE_GOAL_SIZE_INCHES / 2;
        
        // Calculate the field boundaries in screen coordinates
        const centerOffsetX = (FIELD_SIZE_INCHES / 2) * scale;
        const centerOffsetY = (FIELD_SIZE_INCHES / 2) * scale;
        
        // Convert goal position to screen coordinates
        const screenX = goal.x * scale + centerOffsetX;
        const screenY = centerOffsetY - goal.y * scale; // Invert Y for screen coords
        
        // Calculate field boundaries in screen coordinates
        const minX = centerOffsetX - (halfField - halfGoalSize) * scale;
        const maxX = centerOffsetX + (halfField - halfGoalSize) * scale;
        const minY = centerOffsetY - (halfField - halfGoalSize) * scale;
        const maxY = centerOffsetY + (halfField - halfGoalSize) * scale;
        
        // Constrain the transform to keep the goal within boundaries
        return {
          ...transform,
          x: Math.max(minX - screenX, Math.min(maxX - screenX, transform.x)),
          y: Math.max(minY - screenY, Math.min(maxY - screenY, transform.y)),
        };
      }
      
      // Handle team squares (using screen coordinates)
      else if (id.includes("Square")) {
        const square = squares.find(s => s.id === id);
        if (!square) return transform;
        
        // Get field dimensions in screen coordinates
        const fieldWidthPx = FIELD_SIZE_INCHES * scale;
        const fieldHeightPx = FIELD_SIZE_INCHES * scale;
        
        // Calculate field boundaries in screen coordinates
        const canvasWidth = canvasRef.current.width || fieldWidthPx;
        const canvasHeight = canvasRef.current.height || fieldHeightPx;
        
        const fieldLeft = (canvasWidth - fieldWidthPx) / 2;
        const fieldTop = (canvasHeight - fieldHeightPx) / 2;
        const fieldRight = fieldLeft + fieldWidthPx;
        const fieldBottom = fieldTop + fieldHeightPx;
        
        // Current square position in screen coordinates
        const squareX = square.x * scale;
        const squareY = square.y * scale;
        const squareSize = square.size * scale;
        
        // Constrain the transform to keep the square within boundaries
        return {
          ...transform,
          x: Math.max(fieldLeft - squareX, Math.min(fieldRight - squareSize - squareX, transform.x)),
          y: Math.max(fieldTop - squareY, Math.min(fieldBottom - squareSize - squareY, transform.y)),
        };
      }
      
      return transform;
    },
    [mobileGoals, squares, scale]
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

  // This useEffect hook is necessary to ensure our canvas redraws whenever lines change
  useEffect(() => {
    // Update linesRef with the current lines state
    linesRef.current = lines;
    
    // Redraw canvas immediately after lines change
    redrawCanvas();
  }, [lines, redrawCanvas]);

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

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;

    // Record the starting position for history
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
  }, [mobileGoals, squares]);

  // Handle drag move to update score in real-time during dragging
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const { active, delta } = event;
    const id = active.id as string;

    if (id.includes("mobileGoal")) {
      // Find the goal being dragged
      const goalIndex = mobileGoals.findIndex(goal => goal.id === id);
      if (goalIndex === -1) return;

      // Get the original goal position from when the drag started
      const originalPosition = dragStartPositions[id];
      if (!originalPosition) return;
      
      // Calculate the new position using the original position and cumulative delta
      const newX = originalPosition.x + delta.x / scale;
      const newY = originalPosition.y - delta.y / scale; // Negate y for game coordinates
      
      // Create a temporary array with the updated goal position
      const tempGoals = [...mobileGoals];
      tempGoals[goalIndex] = {
        ...tempGoals[goalIndex],
        x: newX,
        y: newY
      };
      
      // Force immediate recalculation of scores
      const newScores = calculateScore(tempGoals);
      
      // Update the score state variables
      setRedScore(newScores.red);
      setBlueScore(newScores.blue);
      
      // Also directly update the DOM for immediate visual feedback
      if (redScoreRef.current) {
        redScoreRef.current.textContent = String(newScores.red);
      }
      
      if (blueScoreRef.current) {
        blueScoreRef.current.textContent = String(newScores.blue);
      }
    }
  }, [mobileGoals, dragStartPositions, scale, calculateScore]);

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
              const newX = goal.x + delta.x / scale;
              const newY = goal.y - delta.y / scale; // Negate delta.y to convert from screen to game coordinates
              
              // Constrain to field boundaries
              // Field is centered at (0,0) with dimensions FIELD_SIZE_INCHES
              const halfField = FIELD_SIZE_INCHES / 2;
              const halfGoalSize = MOBILE_GOAL_SIZE_INCHES / 2;
              
              // Constrain X and Y to keep the goal within the field boundaries
              const constrainedX = Math.max(-halfField + halfGoalSize, Math.min(halfField - halfGoalSize, newX));
              const constrainedY = Math.max(-halfField + halfGoalSize, Math.min(halfField - halfGoalSize, newY));
              
              return {
                ...goal,
                x: constrainedX,
                y: constrainedY,
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
              timestamp: Date.now(),
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
              const newX = square.x + delta.x / scale;
              const newY = square.y + delta.y / scale; // Don't negate for screen coordinates
              
              // Get field dimensions in screen coordinates
              const fieldWidthPx = FIELD_SIZE_INCHES * scale;
              const fieldHeightPx = FIELD_SIZE_INCHES * scale;
              
              // Calculate field boundaries in screen coordinates
              // The field is positioned at the center of the canvas
              const canvasWidth = canvasRef.current?.width || fieldWidthPx;
              const canvasHeight = canvasRef.current?.height || fieldHeightPx;
              
              const fieldLeft = (canvasWidth - fieldWidthPx) / 2;
              const fieldTop = (canvasHeight - fieldHeightPx) / 2;
              const fieldRight = fieldLeft + fieldWidthPx;
              const fieldBottom = fieldTop + fieldHeightPx;
              
              // Constrain square position to keep it within field boundaries
              // Account for the square's size
              const constrainedX = Math.max(fieldLeft, Math.min(fieldRight - square.size * scale, newX));
              const constrainedY = Math.max(fieldTop, Math.min(fieldBottom - square.size * scale, newY));
              
              return {
                ...square,
                x: constrainedX,
                y: constrainedY,
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
              timestamp: Date.now(),
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
        timestamp: Date.now(),
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
      timestamp: Date.now(),
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
    const action: HistoryAction = {
      type: "REMOVE_RING",
      goalId,
      ringColor: removedRingColor,
      ringIndex,
      timestamp: Date.now(),
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
      timestamp: Date.now(),
    });

    if (newBlueScore !== blueScore) {
      addToHistory({
        type: "UPDATE_SCORE",
        team: "blue",
        from: blueScore,
        to: newBlueScore,
        timestamp: Date.now(),
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
      timestamp: Date.now(),
    });

    if (newRedScore !== redScore) {
      addToHistory({
        type: "UPDATE_SCORE",
        team: "red",
        from: redScore,
        to: newRedScore,
        timestamp: Date.now(),
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
    if (drawingSettings.isDrawMode) {
      // Handle drawing undo
      if (drawingHistoryIndex >= 0) {
        const action = drawingHistory[drawingHistoryIndex];
        
        switch (action?.type) {
          case "ADD_LINE":
            setLines((lines) => {
              // Need to compare lines by structure not by reference
              // since the objects might not be the same instance
              const newLines = lines.filter((line) => {
                // Compare key properties to identify the same line
                return !(
                  line.color === action.line.color &&
                  line.size === action.line.size &&
                  line.style === action.line.style &&
                  line.endStyle === action.line.endStyle &&
                  JSON.stringify(line.points) === JSON.stringify(action.line.points)
                );
              });
              return newLines;
            });
            break;
          case "REMOVE_LINE":
            setLines((lines) => [...lines, action.line]);
            break;
          case "CLEAR_LINES":
            setLines(action.lines);
            break;
        }
        
        setDrawingHistoryIndex(drawingHistoryIndex - 1);
        
        // Force immediate canvas redraw after state update
        setTimeout(() => redrawCanvas(), 0);
      }
    } else {
      // Handle object undo
      if (objectHistoryIndex > 0) {
        const action = objectHistory[objectHistoryIndex - 1];
        
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
        
        setObjectHistoryIndex(objectHistoryIndex - 1);
      }
    }
  }, [
    drawingSettings.isDrawMode, 
    drawingHistory, 
    drawingHistoryIndex, 
    objectHistory, 
    objectHistoryIndex,
    redrawCanvas
  ]);

  const handleRedo = useCallback(() => {
    if (drawingSettings.isDrawMode) {
      // Handle drawing redo
      if (drawingHistoryIndex < drawingHistory.length - 1) {
        const action = drawingHistory[drawingHistoryIndex + 1];
        
        switch (action.type) {
          case "ADD_LINE":
            setLines((lines) => [...lines, action.line]);
            break;
          case "REMOVE_LINE":
            setLines((lines) => {
              // Need to compare lines by structure not by reference
              const newLines = lines.filter((line) => {
                // Compare key properties to identify the same line
                return !(
                  line.color === action.line.color &&
                  line.size === action.line.size &&
                  line.style === action.line.style &&
                  line.endStyle === action.line.endStyle &&
                  JSON.stringify(line.points) === JSON.stringify(action.line.points)
                );
              });
              return newLines;
            });
            break;
          case "CLEAR_LINES":
            setLines([]);
            break;
        }
        
        setDrawingHistoryIndex(drawingHistoryIndex + 1);
        
        // Force immediate canvas redraw after state update
        setTimeout(() => redrawCanvas(), 0);
      }
    } else {
      // Handle object redo
      if (objectHistoryIndex < objectHistory.length) {
        const action = objectHistory[objectHistoryIndex];
        
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
        
        setObjectHistoryIndex(objectHistoryIndex + 1);
      }
    }
  }, [
    drawingSettings.isDrawMode, 
    drawingHistory, 
    drawingHistoryIndex, 
    objectHistory, 
    objectHistoryIndex,
    redrawCanvas
  ]);

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
          timestamp: Date.now(),
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

  return (
    <div className="game-canvas-container" ref={containerRef}>
      <DndContext
        sensors={sensors}
        modifiers={[restrictToFieldModifier]}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always
          },
        }}
        id="main-dnd-context"
      >
        <DrawingSidebar
          settings={drawingSettings}
          onSettingsChange={(newSettings) =>
            setDrawingSettings((prev) => {
              // Create a properly typed update to ensure type consistency
              return {
                ...prev,
                ...newSettings,
                // Ensure the lineStyle and lineEndStyle are properly typed
                lineStyle: (newSettings.lineStyle || prev.lineStyle) as LineStyle,
                lineEndStyle: (newSettings.lineEndStyle || prev.lineEndStyle) as "none" | "arrow"
              };
            })
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
                ref={redScoreRef}
              >
                {redScore}
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
                ref={blueScoreRef}
              >
                {blueScore}
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
              <div className="relative">
                <Image
                  src="/assets/svg/HangLadder.svg"
                  alt="Hang Ladder"
                  width={HANG_LADDER_SIZE_INCHES * scale}
                  height={HANG_LADDER_SIZE_INCHES * scale}
                  priority
                />
                
                {/* Clickable area for high stake popup in bottom right corner */}
                <div 
                  className="absolute bottom-0 right-0 w-25 h-25 cursor-pointer" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setHighStakePopupOpen(true);
                    setHangPopupOpen(false);
                  }}
                  style={{ 
                    zIndex: 20,
                    borderTopLeftRadius: "100%"
                  }}
                ></div>
                
                {/* Clickable area for hang ladder popup (excluding the high stake area) */}
                <div 
                  className="absolute inset-0 cursor-pointer" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setHangPopupOpen(true);
                    setHighStakePopupOpen(false);
                  }}
                  style={{ 
                    zIndex: 10
                  }}
                ></div>
              </div>
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
        <TeamNumberDialog
          open={teamNumberDialogOpen}
          onOpenChange={setTeamNumberDialogOpen}
          teamNumber={teamNumberInput}
          onTeamNumberChange={(newTeamNumber) => setTeamNumberInput(newTeamNumber)}
          onSave={saveTeamNumber}
        />

        {/* Goal Popup Dialog */}
        <MobileGoalPopup
          open={showGoalPopup}
          onOpenChange={(open) => {
            setShowGoalPopup(open);
            if (!open) setSelectedGoalId(null);
          }}
          selectedGoalId={selectedGoalId}
          mobileGoals={mobileGoals}
          onAddRing={(goalId, color) => {
            if (selectedGoalId) {
              addRingToGoal(goalId, color);
            }
          }}
          onRemoveRing={(goalId) => {
            if (selectedGoalId) {
              removeRingFromGoal(goalId);
            }
          }}
        />

        {/* Wall Stake Popup Dialog */}
        <WallStakePopup
          open={showStakePopup}
          onOpenChange={setShowStakePopup}
          selectedStakeId={selectedStakeId}
          wallStakes={wallStakes}
          onAddRing={(stakeId, color) => {
            if (selectedStakeId) {
              addRingToStake(stakeId, color);
            }
          }}
          onRemoveRing={(stakeId) => {
            if (selectedStakeId) {
              removeRingFromStake(stakeId);
            }
          }}
        />

        {/* Team Stake Popup Dialog */}
        <TeamStakePopup
          open={showTeamStakePopup}
          onOpenChange={setShowTeamStakePopup}
          selectedStakeId={selectedStakeId}
          teamStakes={teamStakes}
          onAddRing={(stakeId, color) => {
            if (selectedStakeId) {
              addRingToTeamStake(stakeId, color);
            }
          }}
          onRemoveRing={(stakeId) => {
            if (selectedStakeId) {
              removeRingFromTeamStake(stakeId);
            }
          }}
        />

        {/* High Stake Popup */}
        <HighStakePopup
          open={highStakePopupOpen}
          onOpenChange={setHighStakePopupOpen}
          ringColor={highStakeRing}
          onRingColorChange={setHighStakeRing}
        />

        {/* Hang Popup */}
        <HangPopup
          open={hangPopupOpen}
          onOpenChange={setHangPopupOpen}
          hangScores={hangScores}
          onHangScoreChange={handleHangScoreChange}
          highStakeRing={highStakeRing}
        />
      </DndContext>
    </div>
  );
};

export default GameCanvas;
