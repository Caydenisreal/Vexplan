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
const INITIAL_SQUARES = [
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

interface Line {
  points: { x: number; y: number }[];
  color: string;
  size: number;
  style: LineStyle;
  endStyle: LineEndStyle;
  direction?: { x: number; y: number }; // Direction vector for arrow
}

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
  
  const screenX = (initialPosition.x * scale) + (fieldSize / 2);
  const screenY = (-initialPosition.y * scale) + (fieldSize / 2);

  const style = transform ? {
    transform: `translate3d(${transform.x + screenX}px, ${transform.y + screenY}px, 0)`,
    width: `${mobileGoalSize}px`,
    height: `${mobileGoalSize}px`,
  } : {
    transform: `translate3d(${screenX}px, ${screenY}px, 0)`,
    width: `${mobileGoalSize}px`,
    height: `${mobileGoalSize}px`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`absolute touch-none -translate-x-1/2 -translate-y-1/2 ${!isDrawMode ? 'cursor-move' : ''}`}
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
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const sizeInPixels = size * scale;
  
  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        position: 'absolute',
        left: `${x * scale}px`,
        top: `${y * scale}px`,
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

const GameCanvas: React.FC = () => {
  const [mobileGoals, setMobileGoals] = useState<Array<{ id: string; x: number; y: number }>>(INITIAL_MOBILE_GOALS);
  const [lines, setLines] = useState<Line[]>([]);
  const [drawingSettings, setDrawingSettings] = useState({
    isDrawMode: false,
    brushSize: 2,
    brushColor: '#ffffff',
    isEraser: false,
    lineStyle: 'solid' as LineStyle,
    lineEndStyle: 'none' as LineEndStyle,
  });
  
  // Get theme information
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
      if (line.endStyle === 'arrow' && line.direction && line.points.length >= 2) {
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
    if (!canvasRef.current || !drawingSettings.isDrawMode) return;
    
    // Get canvas position relative to the viewport
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Calculate point coordinates relative to the canvas
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Store the point
    const point = { x, y };
    lastPointRef.current = point;
    directionSamplePointsRef.current = [point];
    
    if (drawingSettings.isEraser) {
      // Handle eraser mode
      isDrawingRef.current = true;
      eraseAtPoint(point);
    } else {
      // Handle drawing mode
      isDrawingRef.current = true;
      
      // Start a new line
      const newLine: Line = {
        points: [point],
        color: drawingSettings.brushColor,
        size: drawingSettings.brushSize,
        style: drawingSettings.lineStyle,
        endStyle: drawingSettings.lineEndStyle,
      };
      
      setLines(prevLines => [...prevLines, newLine]);
    }
    
    // Prevent scrolling while drawing
    e.preventDefault();
  }, [drawingSettings, eraseAtPoint]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current || !canvasRef.current || !canvasCtxRef.current) return;
    
    // Get canvas position relative to the viewport
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Calculate point coordinates relative to the canvas
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newPoint = { x, y };
    
    // Add to direction sample points
    directionSamplePointsRef.current.push(newPoint);
    
    if (drawingSettings.isEraser) {
      // Handle eraser mode
      eraseAtPoint(newPoint);
    } else if (lastPointRef.current) {
      // Handle drawing mode
      // Add point to the current line
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
      
      lastPointRef.current = newPoint;
    }
    
    // Prevent scrolling while drawing
    e.preventDefault();
  }, [calculateDistance, calculateSmoothedDirection, drawingSettings, eraseAtPoint, smoothDirection]);

  const handlePointerUp = useCallback(() => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
    lastDirectionUpdatePointRef.current = null;
    directionSamplePointsRef.current = [];

    // Force a complete redraw to ensure all lines are visible
    setTimeout(() => redrawCanvas(), 0);
  }, [redrawCanvas]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    const id = active.id as string;
    
    if (id.includes('mobileGoal')) {
      setMobileGoals((prevGoals) => {
        return prevGoals.map((goal) => {
          if (goal.id === id) {
            return {
              ...goal,
              x: goal.x + delta.x / scale,
              y: goal.y + delta.y / scale,
            };
          }
          return goal;
        });
      });
    } else if (id.includes('Square')) {
      setSquares((prevSquares) => {
        return prevSquares.map((square) => {
          if (square.id === id) {
            return {
              ...square,
              x: square.x + delta.x / scale,
              y: square.y + delta.y / scale,
            };
          }
          return square;
        });
      });
    }
  }, [scale]);

  // Function to clear all drawings from the canvas
  const handleClearCanvas = useCallback(() => {
    setLines([]);
    // Update the lines reference immediately
    linesRef.current = [];
    // Force immediate canvas redraw
    setTimeout(() => {
      if (canvasRef.current && canvasCtxRef.current) {
        const ctx = canvasCtxRef.current;
        const canvas = canvasRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redrawCanvas();
      }
    }, 0);
  }, [redrawCanvas]);

  const [squares, setSquares] = useState(INITIAL_SQUARES);
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

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd} id="main-dnd-context">
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
          marginTop: isMobile ? '64px' : '128px',
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
            ref={canvasRef}
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
            onTouchStart={(e) => {
              // Prevent default touch behavior to avoid scrolling
              e.preventDefault();
            }}
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
              type={square.type as 'red' | 'blue'}
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
