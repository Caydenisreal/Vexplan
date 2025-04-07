"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  DndContext,
  useDraggable,
  useSensor,
  useSensors,
  PointerSensor,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import DrawingSidebar, { LineStyle, LineEndStyle } from './Sidebar';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

// Constants for the coordinate system
const FIELD_SIZE_INCHES = 144; // 144 inches
const HANG_LADDER_SIZE_INCHES = 48; // 48 inches
const MOBILE_GOAL_SIZE_INCHES = 10; // 10 inches
const STAKE_SIZE_INCHES = 10; // Size for stakes

// Define fixed stake positions (in inches from center)
const STAKES = [
  { id: 'wallStake1', type: 'wall', x: -0.5, y: 69.5 },
  { id: 'wallStake2', type: 'wall', x: -0.5, y: -69 },
  { id: 'redStake', type: 'red', x: -70, y: 0 },
  { id: 'blueStake', type: 'blue', x: 69, y: 0 },
];

// Define initial square positions (18x18 inch squares)
const INITIAL_SQUARES: Array<{ id: string; type: 'red' | 'blue'; x: number; y: number; size: number; teamNumber: string }> = [
  { id: 'redSquare1', type: 'red', x: 10, y: 20, size: 18, teamNumber: '' },
  { id: 'redSquare2', type: 'red', x: 10, y: 105, size: 18, teamNumber: '' },
  { id: 'blueSquare1', type: 'blue', x: 115, y: 20, size: 18, teamNumber: '' },
  { id: 'blueSquare2', type: 'blue', x: 115, y: 105, size: 18, teamNumber: '' },
];

// Define initial mobile goal positions
const INITIAL_MOBILE_GOALS = [
  { id: 'mobileGoal-1', x: -24, y: 24 },
  { id: 'mobileGoal-2', x: 24, y: 24 },
  { id: 'mobileGoal-3', x: 24, y: -24 },
  { id: 'mobileGoal-4', x: -24, y: -24 },
  { id: 'mobileGoal-5', x: -0.5, y: -48 }
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

interface DraggableGoalProps {
  id: string;
  initialPosition: { x: number; y: number };
  isDrawMode: boolean;
  scale: number;
}

const DraggableGoal: React.FC<DraggableGoalProps> = ({ id, initialPosition, isDrawMode, scale }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: id,
    disabled: isDrawMode,
  });

  // Convert from game coordinates (inches) to screen coordinates (pixels)
  // Note: In screen coordinates, Y is inverted (positive goes down)
  const fieldSize = FIELD_SIZE_INCHES * scale;
  const mobileGoalSize = MOBILE_GOAL_SIZE_INCHES * scale;
  
  // Calculate the center position of the goal
  const centerX = (initialPosition.x * scale) + (fieldSize / 2);
  const centerY = (-initialPosition.y * scale) + (fieldSize / 2);

  // Apply transform if available (during drag)
  const x = transform ? centerX + transform.x : centerX;
  const y = transform ? centerY + transform.y : centerY;

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: `${mobileGoalSize}px`,
        height: `${mobileGoalSize}px`,
        transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
      }}
      className={`touch-none ${!isDrawMode ? 'cursor-move' : ''}`}
      {...listeners}
      {...attributes}
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

interface TeamSquareProps {
  id: string;
  type: 'red' | 'blue';
  x: number;
  y: number;
  size: number;
  teamNumber: string;
  scale: number;
  onClick: () => void;
}

function TeamSquare({ id, type, x, y, size, teamNumber, scale, onClick }: TeamSquareProps) {
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
        position: 'absolute',
        left: `${posX}px`,
        top: `${posY}px`,
        width: `${sizeInPixels}px`,
        height: `${sizeInPixels}px`,
        backgroundColor: type === 'red' ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 0, 255, 0.5)',
        border: `2px solid ${type === 'red' ? 'red' : 'blue'}`,
        borderRadius: '4px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'move',
        userSelect: 'none',
        zIndex: 10,
        touchAction: 'none', // Prevent browser touch actions to improve dragging on mobile
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
            color: isDarkMode ? 'white' : 'black',
            fontWeight: 'bold',
            fontSize: `${Math.max(12, sizeInPixels / 4)}px`,
            textShadow: isDarkMode ? '0 0 2px black' : '0 0 2px white',
          }}
        >
          {teamNumber}
        </span>
      )}
    </div>
  );
}

// Define action types for history
type HistoryAction = 
  | { type: 'MOVE_GOAL'; id: string; from: { x: number, y: number }; to: { x: number, y: number }; timestamp: number }
  | { type: 'MOVE_SQUARE'; id: string; from: { x: number, y: number }; to: { x: number, y: number }; timestamp: number }
  | { type: 'ADD_LINE'; line: Line; timestamp: number }
  | { type: 'CLEAR_CANVAS'; timestamp: number };

// Define the types for the addToHistory function argument
type HistoryActionWithoutTimestamp = 
  | { type: 'MOVE_GOAL'; id: string; from: { x: number, y: number }; to: { x: number, y: number } }
  | { type: 'MOVE_SQUARE'; id: string; from: { x: number, y: number }; to: { x: number, y: number } }
  | { type: 'ADD_LINE'; line: Line }
  | { type: 'CLEAR_CANVAS' };

const GameCanvas: React.FC = () => {
  const [mobileGoals, setMobileGoals] = useState<Array<{ id: string; x: number; y: number }>>(INITIAL_MOBILE_GOALS);
  const [squares, setSquares] = useState<Array<{ id: string; type: 'red' | 'blue'; x: number; y: number; size: number; teamNumber: string }>>(INITIAL_SQUARES);
  const [lines, setLines] = useState<Line[]>([]);
  const [drawingSettings, setDrawingSettings] = useState({
    isDrawMode: false,
    brushSize: 2,
    brushColor: '#ffffff',
    isEraser: false,
    lineStyle: 'solid' as LineStyle,
    lineEndStyle: 'none' as LineEndStyle,
  });
  
  // History state for undo/redo
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [dragStartPositions, setDragStartPositions] = useState<Record<string, { x: number, y: number }>>({});

  // Function to add a timestamp to drawing actions
  const addToHistory = useCallback((action: HistoryActionWithoutTimestamp) => {
    const actionWithTimestamp: HistoryAction = { ...action, timestamp: Date.now() };
    const newHistory = history.slice(0, historyIndex + 1).concat(actionWithTimestamp);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [teamNumberDialogOpen, setTeamNumberDialogOpen] = useState(false);
  const [teamNumberInput, setTeamNumberInput] = useState('');

  const handleSquareClick = (id: string) => {
    setSelectedSquare(id);
    const square = squares.find(s => s.id === id);
    if (square) {
      setTeamNumberInput(square.teamNumber);
      setTeamNumberDialogOpen(true);
    }
  };

  const saveTeamNumber = () => {
    if (selectedSquare) {
      setSquares(prev => prev.map(square => 
        square.id === selectedSquare 
          ? { ...square, teamNumber: teamNumberInput } 
          : square
      ));
      setTeamNumberDialogOpen(false);
    }
  };

  const { isDarkMode } = useTheme();
  
  // Set default brush color to white since the field background is always dark
  useEffect(() => {
    setDrawingSettings(prev => ({
      ...prev,
      brushColor: '#ffffff'
    }));
  }, []); // Only run once on component mount
  
  // Responsive scaling
  const [scale, setScale] = useState(4); // Default scale factor
  const [isMobile, setIsMobile] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentDirectionRef = useRef<{ x: number; y: number } | null>(null);
  const lastDirectionUpdatePointRef = useRef<{ x: number; y: number } | null>(null);
  const directionSamplePointsRef = useRef<{ x: number; y: number }[]>([]);
  const isDrawingRef = useRef(false);
  const linesRef = useRef<Line[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentLineRef = useRef<Line | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: isMobile ? 5 : 8, // Reduced activation distance for mobile
    },
  }));

  // Function to draw an arrow at the end of a line
  const drawArrow = useCallback((
    ctx: CanvasRenderingContext2D, 
    endX: number, 
    endY: number, 
    direction: { x: number; y: number },
    size: number,
    color: string
  ) => {
    // Normalize the direction vector
    const length = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    if (length === 0) return;
    
    const normalizedDirection = {
      x: direction.x / length,
      y: direction.y / length
    };
    
    // Calculate arrow head points
    const arrowSize = size * 4;
    const arrowAngle = Math.PI / 6; // 30 degrees
    
    // Calculate the two points for the arrow head
    const point1X = endX - arrowSize * (normalizedDirection.x * Math.cos(arrowAngle) - normalizedDirection.y * Math.sin(arrowAngle));
    const point1Y = endY - arrowSize * (normalizedDirection.x * Math.sin(arrowAngle) + normalizedDirection.y * Math.cos(arrowAngle));
    
    const point2X = endX - arrowSize * (normalizedDirection.x * Math.cos(arrowAngle) + normalizedDirection.y * Math.sin(arrowAngle));
    const point2Y = endY - arrowSize * (normalizedDirection.y * Math.cos(arrowAngle) - normalizedDirection.x * Math.sin(arrowAngle));
    
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
  }, []);

  // Function to redraw the entire canvas
  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current || !canvasCtxRef.current) return;
    
    const ctx = canvasCtxRef.current;
    const canvas = canvasRef.current;
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw all lines
    linesRef.current.forEach(line => {
      if (line.points.length < 2) return;
      
      ctx.save();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.size;
      
      // Apply line style
      if (line.style === 'dotted') {
        ctx.setLineDash([line.size, line.size * 2]);
      } else if (line.style === 'dashed') {
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
      if (line.endStyle === 'arrow' && line.direction) {
        const lastPoint = line.points[line.points.length - 1];
        drawArrow(ctx, lastPoint.x, lastPoint.y, line.direction, line.size, line.color);
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
      const newScale = Math.max(2, Math.min(4, containerWidth / FIELD_SIZE_INCHES));
      setScale(newScale);
      
      if (canvasRef.current) {
        const fieldSize = FIELD_SIZE_INCHES * newScale;
        canvasRef.current.width = fieldSize;
        canvasRef.current.height = fieldSize;
        
        // Get the drawing context
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          canvasCtxRef.current = ctx;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Redraw all lines with the new scale
          redrawCanvas();
        }
      }
    };

    // Set up the canvas initially
    handleResize();
    
    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    
    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [redrawCanvas]);

  // Update linesRef when lines state changes
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  // Function to find lines that intersect with the eraser
  const findIntersectingLines = useCallback((point: { x: number; y: number }, eraserSize: number) => {
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
  }, []);

  // Function to erase parts of lines
  const eraseAtPoint = useCallback((point: { x: number; y: number }) => {
    const eraserSize = drawingSettings.brushSize * 5; // Eraser is 5x the brush size
    const intersectingLines = findIntersectingLines(point, eraserSize);
    
    if (intersectingLines.length > 0) {
      setLines(prevLines => 
        prevLines.filter((_, index) => !intersectingLines.includes(index))
      );
    }
  }, [drawingSettings.brushSize, findIntersectingLines]);

  // Calculate direction vector between two points
  const calculateDirection = useCallback((from: { x: number; y: number }, to: { x: number; y: number }) => {
    return {
      x: to.x - from.x,
      y: to.y - from.y
    };
  }, []);

  // Calculate distance between two points
  const calculateDistance = useCallback((p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }, []);

  // Smooth the direction vector using previous direction
  const smoothDirection = useCallback(
    (
      newDirection: { x: number; y: number }, 
      prevDirection: { x: number; y: number } | null
    ) => {
      if (!prevDirection) return newDirection;
      
      // Normalize both vectors
      const newLength = Math.sqrt(newDirection.x * newDirection.x + newDirection.y * newDirection.y);
      const prevLength = Math.sqrt(prevDirection.x * prevDirection.x + prevDirection.y * prevDirection.y);
      
      if (newLength === 0 || prevLength === 0) return newDirection;
      
      const newNormalized = {
        x: newDirection.x / newLength,
        y: newDirection.y / newLength
      };
      
      const prevNormalized = {
        x: prevDirection.x / prevLength,
        y: prevDirection.y / prevLength
      };
      
      // Interpolate between the two normalized directions
      return {
        x: prevNormalized.x * (1 - DIRECTION_SMOOTHING_FACTOR) + newNormalized.x * DIRECTION_SMOOTHING_FACTOR,
        y: prevNormalized.y * (1 - DIRECTION_SMOOTHING_FACTOR) + newNormalized.y * DIRECTION_SMOOTHING_FACTOR
      };
    },
    []
  );

  // Calculate a smoothed direction based on multiple sample points
  const calculateSmoothedDirection = useCallback((points: { x: number; y: number }[]) => {
    if (points.length < MIN_DIRECTION_POINTS) return null;
    
    // Use the last few points to calculate direction, but ignore the very last points
    // which might be less stable due to lifting the finger/pen
    const startIndex = Math.max(0, points.length - MIN_DIRECTION_POINTS - END_POINTS_TO_IGNORE);
    const endIndex = Math.max(0, points.length - END_POINTS_TO_IGNORE - 1);
    
    if (endIndex <= startIndex) return null;
    
    const startPoint = points[startIndex];
    const endPoint = points[endIndex];
    
    return calculateDirection(startPoint, endPoint);
  }, [calculateDirection]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
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
      
      setLines(prevLines => [...prevLines, newLine]);
    }
    
    // Prevent scrolling while drawing
    e.preventDefault();
  }, [drawingSettings, eraseAtPoint]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current || !canvasRef.current || !lastPointRef.current) return;
    
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
      setLines(prevLines => {
        const updatedLines = [...prevLines];
        const currentLine = updatedLines[updatedLines.length - 1];
        
        if (currentLine) {
          // Only add the point if it's far enough from the last point
          // This prevents too many points which can cause performance issues
          const lastPoint = currentLine.points[currentLine.points.length - 1];
          const distance = calculateDistance(lastPoint, newPoint);
          
          if (distance >= 1) { // Minimum distance of 1 pixel
            currentLine.points.push(newPoint);
            
            // Update direction for arrow if needed
            if (currentLine.endStyle === 'arrow') {
              // Only update direction if we've moved enough
              if (!lastDirectionUpdatePointRef.current || 
                  calculateDistance(lastDirectionUpdatePointRef.current, newPoint) > MIN_DIRECTION_CHANGE_THRESHOLD) {
                
                const newDirection = calculateSmoothedDirection(directionSamplePointsRef.current);
                
                if (newDirection) {
                  currentLine.direction = smoothDirection(newDirection, currentDirectionRef.current);
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
        if (drawingSettings.lineStyle === 'dotted') {
          ctx.setLineDash([drawingSettings.brushSize, drawingSettings.brushSize * 2]);
        } else if (drawingSettings.lineStyle === 'dashed') {
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
  }, [calculateDistance, calculateSmoothedDirection, drawingSettings, eraseAtPoint, smoothDirection]);

  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    
    // Only add the line if it has more than one point and we're not in eraser mode
    if (!drawingSettings.isEraser && lines.length > 0) {
      const currentLine = lines[lines.length - 1];
      
      if (currentLine && currentLine.points.length > 1) {
        // Calculate direction for arrow if needed
        let direction: Point | undefined = undefined;
        if (currentLine.endStyle === 'arrow') {
          const calculatedDirection = calculateSmoothedDirection(directionSamplePointsRef.current);
          if (calculatedDirection) {
            direction = calculatedDirection;
          }
        }
        
        // Create a final version of the line with the direction
        const finalLine: Line = { 
          ...currentLine,
          direction
        };
        
        // Update the line in the lines array
        setLines(prevLines => {
          const updatedLines = [...prevLines];
          updatedLines[updatedLines.length - 1] = finalLine;
          return updatedLines;
        });
        
        // Add to history
        addToHistory({
          type: 'ADD_LINE',
          line: finalLine
        });
      }
    }
    
    isDrawingRef.current = false;
    lastPointRef.current = null;
    lastDirectionUpdatePointRef.current = null;
    directionSamplePointsRef.current = [];

    // Force immediate canvas redraw
    setTimeout(() => redrawCanvas(), 0);
  }, [calculateSmoothedDirection, addToHistory, lines, drawingSettings.isEraser, redrawCanvas]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const id = active.id as string;
    
    // Store the starting position for history
    if (id.includes('mobileGoal')) {
      const goal = mobileGoals.find(g => g.id === id);
      if (goal) {
        setDragStartPositions(prev => ({ ...prev, [id]: { x: goal.x, y: goal.y } }));
      }
    } else if (id.includes('Square')) {
      const square = squares.find(s => s.id === id);
      if (square) {
        setDragStartPositions(prev => ({ ...prev, [id]: { x: square.x, y: square.y } }));
      }
    }
  }, [mobileGoals, squares]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    const id = active.id as string;
    
    if (id.includes('mobileGoal')) {
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
        const endPos = updatedGoals.find(g => g.id === id);
        
        if (startPos && endPos && (Math.abs(startPos.x - endPos.x) > 0.1 || Math.abs(startPos.y - endPos.y) > 0.1)) {
          // Only record if there was actual movement (with a small threshold to avoid tiny movements)
          addToHistory({
            type: 'MOVE_GOAL',
            id,
            from: { ...startPos }, // Create a copy to avoid reference issues
            to: { x: endPos.x, y: endPos.y }
          });
        }
        
        return updatedGoals;
      });
    } else if (id.includes('Square')) {
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
        const endPos = updatedSquares.find(s => s.id === id);
        
        if (startPos && endPos && (Math.abs(startPos.x - endPos.x) > 0.1 || Math.abs(startPos.y - endPos.y) > 0.1)) {
          // Only record if there was actual movement (with a small threshold to avoid tiny movements)
          addToHistory({
            type: 'MOVE_SQUARE',
            id,
            from: { ...startPos }, // Create a copy to avoid reference issues
            to: { x: endPos.x, y: endPos.y }
          });
        }
        
        return updatedSquares;
      });
    }
  }, [scale, dragStartPositions, addToHistory]);

  // Function to clear all drawings from the canvas
  const handleClearCanvas = useCallback(() => {
    // Add current lines to history before clearing
    if (lines.length > 0) {
      addToHistory({
        type: 'CLEAR_CANVAS'
      });
    }
    
    setLines([]);
    
    if (canvasRef.current && canvasCtxRef.current) {
      canvasCtxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, [lines, addToHistory]);

  const handleUndoInDrawMode = useCallback(() => {
    if (historyIndex >= 0) {
      // Find the most recent drawing-related action
      let currentIndex = historyIndex;
      let foundDrawingAction = false;
      
      while (currentIndex >= 0 && !foundDrawingAction) {
        const action = history[currentIndex];
        if (action.type === 'ADD_LINE' || action.type === 'CLEAR_CANVAS') {
          foundDrawingAction = true;
          
          // Handle the drawing action
          if (action.type === 'ADD_LINE') {
            // Remove the line from the lines array
            setLines(prevLines => {
              const lineToRemove = action.line;
              return prevLines.filter(line => {
                // Compare by reference or by checking all properties
                return line !== lineToRemove && 
                       !(line.points.length === lineToRemove.points.length && 
                         line.color === lineToRemove.color &&
                         line.size === lineToRemove.size &&
                         line.style === lineToRemove.style);
              });
            });
          } else if (action.type === 'CLEAR_CANVAS') {
            // This is a special case - we need to restore the lines from before the clear
            if (currentIndex > 0) {
              // Find all lines that were added before this clear action
              const linesBeforeClear = history
                .slice(0, currentIndex)
                .filter(h => h.type === 'ADD_LINE')
                .map(h => (h as { type: 'ADD_LINE', line: Line, timestamp: number }).line);
              
              setLines(linesBeforeClear);
            }
          }
          
          // Mark this action as "skipped" for undo by setting a temporary index
          setHistoryIndex(currentIndex - 1);
          
          // Force a redraw of the canvas
          setTimeout(() => redrawCanvas(), 0);
          return;
        }
        
        currentIndex--;
      }
    }
  }, [history, historyIndex, redrawCanvas]);

  const handleRedoInDrawMode = useCallback(() => {
    if (historyIndex < history.length - 1) {
      // Find the next drawing-related action
      let currentIndex = historyIndex + 1;
      let foundDrawingAction = false;
      
      while (currentIndex < history.length && !foundDrawingAction) {
        const action = history[currentIndex];
        if (action.type === 'ADD_LINE' || action.type === 'CLEAR_CANVAS') {
          foundDrawingAction = true;
          
          // Handle the drawing action
          if (action.type === 'ADD_LINE') {
            // Add the line back to the lines array
            setLines(prevLines => [...prevLines, action.line]);
          } else if (action.type === 'CLEAR_CANVAS') {
            // Clear all lines
            setLines([]);
          }
          
          // Mark this action as "done" for redo
          setHistoryIndex(currentIndex);
          
          // Force a redraw of the canvas
          setTimeout(() => redrawCanvas(), 0);
          return;
        }
        
        currentIndex++;
      }
    }
  }, [history, historyIndex, redrawCanvas]);

  const handleUndoInObjectMode = useCallback(() => {
    if (historyIndex >= 0) {
      // Find the most recent object-related action
      let currentIndex = historyIndex;
      let foundObjectAction = false;
      
      while (currentIndex >= 0 && !foundObjectAction) {
        const action = history[currentIndex];
        if (action.type === 'MOVE_GOAL' || action.type === 'MOVE_SQUARE') {
          foundObjectAction = true;
          
          // Handle the object action
          if (action.type === 'MOVE_GOAL') {
            setMobileGoals(prevGoals => prevGoals.map(goal => 
              goal.id === action.id ? { ...goal, x: action.from.x, y: action.from.y } : goal
            ));
          } else if (action.type === 'MOVE_SQUARE') {
            setSquares(prevSquares => prevSquares.map(square => 
              square.id === action.id ? { ...square, x: action.from.x, y: action.from.y } : square
            ));
          }
          
          // Mark this action as "skipped" for undo
          setHistoryIndex(currentIndex - 1);
        }
        
        currentIndex--;
      }
    }
  }, [history, historyIndex]);

  const handleRedoInObjectMode = useCallback(() => {
    if (historyIndex < history.length - 1) {
      // Find the next object-related action
      let currentIndex = historyIndex + 1;
      let foundObjectAction = false;
      
      while (currentIndex < history.length && !foundObjectAction) {
        const action = history[currentIndex];
        if (action.type === 'MOVE_GOAL' || action.type === 'MOVE_SQUARE') {
          foundObjectAction = true;
          
          // Handle the object action
          if (action.type === 'MOVE_GOAL') {
            setMobileGoals(prevGoals => prevGoals.map(goal => 
              goal.id === action.id ? { ...goal, x: action.to.x, y: action.to.y } : goal
            ));
          } else if (action.type === 'MOVE_SQUARE') {
            setSquares(prevSquares => prevSquares.map(square => 
              square.id === action.id ? { ...square, x: action.to.x, y: action.to.y } : square
            ));
          }
          
          // Mark this action as "done" for redo
          setHistoryIndex(currentIndex);
        }
        
        currentIndex++;
      }
    }
  }, [history, historyIndex]);

  const handleUndo = useCallback(() => {
    if (drawingSettings.isDrawMode) {
      handleUndoInDrawMode();
    } else {
      handleUndoInObjectMode();
    }
  }, [drawingSettings.isDrawMode, handleUndoInDrawMode, handleUndoInObjectMode]);

  const handleRedo = useCallback(() => {
    if (drawingSettings.isDrawMode) {
      handleRedoInDrawMode();
    } else {
      handleRedoInObjectMode();
    }
  }, [drawingSettings.isDrawMode, handleRedoInDrawMode, handleRedoInObjectMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if it's a Mac (Command key) or Windows/Linux (Control key)
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      
      if ((isMac && e.metaKey) || (!isMac && e.ctrlKey)) {
        // Undo: Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        }
        // Redo: Cmd+Shift+Z (Mac) or Ctrl+Y (Windows/Linux)
        else if ((isMac && e.key === 'z' && e.shiftKey) || (!isMac && e.key === 'y')) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  return (
    <DndContext 
      sensors={sensors} 
      onDragEnd={handleDragEnd} 
      onDragStart={handleDragStart}
      id="main-dnd-context"
    >
      <DrawingSidebar 
        settings={drawingSettings}
        onSettingsChange={(newSettings) => 
          setDrawingSettings(prev => ({ ...prev, ...newSettings }))
        }
        onClearCanvas={handleClearCanvas}
        isMobile={isMobile}
        squares={squares}
      />
      
      <ThemeToggle />
      
      <div 
        ref={containerRef}
        className={`absolute top-0 left-0 right-0 w-full flex justify-center items-center ${isDarkMode ? 'dark' : ''}`} 
        style={{
          marginTop: isMobile ? '128px' : '64px',
          paddingTop: 0,
          paddingBottom: '32px',
          overflowX: 'hidden',
          minHeight: `${FIELD_SIZE_INCHES * scale + 64}px`
        }}
      >
        <div 
          className={`relative border-2 rounded-lg ${isDarkMode ? 'bg-[#16161e] border-[#292e42]' : 'bg-gray-100 border-gray-300'}`}
          style={{
            width: `${FIELD_SIZE_INCHES * scale}px`,
            height: `${FIELD_SIZE_INCHES * scale}px`,
            maxWidth: '100%',
            maxHeight: '100vw',
            marginTop: 0,
            backgroundImage: 'url("/assets/svg/Field.svg")',
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Drawing canvas */}
          <canvas
            ref={(el) => {
              // Set the canvas ref
              canvasRef.current = el;
              
              if (el) {
                // Add non-passive touch event listener to allow preventDefault
                el.addEventListener('touchstart', (e) => {
                  e.preventDefault();
                }, { passive: false });
              }
            }}
            className="absolute top-0 left-0 z-10 touch-none"
            style={{
              cursor: drawingSettings.isDrawMode 
                ? drawingSettings.isEraser 
                  ? 'url("/assets/svg/eraser-cursor.svg") 8 8, auto'
                  : 'crosshair' 
                : 'default',
              pointerEvents: drawingSettings.isDrawMode ? 'auto' : 'none',
              width: '100%',
              height: '100%'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />

          {/* Center HangLadder - non-draggable */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <Image
              src="/assets/svg/HangLadder.svg"
              alt="Hang Ladder"
              width={HANG_LADDER_SIZE_INCHES * scale}
              height={HANG_LADDER_SIZE_INCHES * scale}
              priority
            />
          </div>

          {/* Draggable Mobile Goals - render each one separately */}
          {mobileGoals.map((goal) => (
            <DraggableGoal
              key={goal.id}
              id={goal.id}
              initialPosition={{ x: goal.x, y: goal.y }}
              isDrawMode={drawingSettings.isDrawMode}
              scale={scale}
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
          {STAKES.map(stake => {
            const stakeSize = STAKE_SIZE_INCHES * scale;
            return (
              <div
                key={stake.id}
                className="absolute"
                style={{
                  left: `${(stake.x + FIELD_SIZE_INCHES / 2) * scale - stakeSize / 2}px`,
                  top: `${(-stake.y + FIELD_SIZE_INCHES / 2) * scale - stakeSize / 2}px`,
                  width: `${stakeSize}px`,
                  height: `${stakeSize}px`,
                }}
              >
                <Image
                  src={`/assets/svg/${stake.type}Stake.svg`}
                  alt={stake.type.charAt(0).toUpperCase() + stake.type.slice(1) + ' Stake'}
                  width={stakeSize}
                  height={stakeSize}
                  priority
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Team Number Dialog */}
      <Dialog open={teamNumberDialogOpen} onOpenChange={setTeamNumberDialogOpen}>
        <DialogContent className={`${isDarkMode ? 'bg-[#1a1b26] text-white border-[#292e42]' : 'bg-white'}`}>
          <div className="h-6"></div>
          <DialogHeader className="pt-4">
            <DialogTitle>Enter Team Number</DialogTitle>
            <DialogDescription className={isDarkMode ? 'text-gray-300' : ''}>
              Enter the team number for this square
            </DialogDescription>
          </DialogHeader>
          <Input
            value={teamNumberInput}
            onChange={(e) => setTeamNumberInput(e.target.value)}
            placeholder="Team Number"
            className={`${isDarkMode ? 'bg-[#24283b] text-white border-[#292e42]' : ''}`}
          />
          <DialogFooter className="mt-4">
            <DialogClose asChild>
              <Button variant="outline" className={isDarkMode ? 'bg-[#24283b] text-white border-[#292e42] hover:bg-[#292e42]' : ''}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={saveTeamNumber} className={isDarkMode ? 'bg-[#7aa2f7] text-white hover:bg-[#5d7dcb]' : ''}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
};

export default GameCanvas;
