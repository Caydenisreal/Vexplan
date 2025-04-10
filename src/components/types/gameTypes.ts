// Define types for the VexPlan game components

// Define types for lines
export type Point = { x: number; y: number };
export type Line = {
  points: Point[];
  color: string;
  size: number;
  style: LineStyle;
  endStyle: LineEndStyle;
  direction?: Point;
};

// Line styling types
export enum LineStyle {
  SOLID = "solid",
  DASHED = "dashed",
  DOTTED = "dotted",
}

// Using type instead of enum for LineEndStyle
export type LineEndStyle = "none" | "arrow";

// Game element types
export interface MobileGoal {
  id: string;
  x: number;
  y: number;
  rings: Array<"red" | "blue">;
}

export interface WallStake {
  id: string;
  rings: Array<"red" | "blue">;
}

export interface TeamStake {
  id: string;
  rings: Array<"red" | "blue">;
}

export interface TeamSquareProps {
  id: string;
  type: "red" | "blue";
  x: number;
  y: number;
  size: number;
  teamNumber: string;
  scale: number;
  onClick: () => void;
}

export interface DraggableGoalProps {
  id: string;
  initialPosition: { x: number; y: number };
  isDrawMode: boolean;
  scale: number;
  onGoalClick: (id: string) => void;
}

// Define action types for history
export type HistoryAction = 
  | { type: "MOVE_GOAL"; id: string; from: { x: number; y: number }; to: { x: number; y: number }; timestamp: number }
  | { type: "MOVE_TEAM_SQUARE"; id: string; from: { x: number; y: number }; to: { x: number; y: number }; timestamp: number }
  | { type: "ADD_LINE"; line: Line; timestamp: number }
  | { type: "DELETE_LINE"; lineIndex: number; line: Line; timestamp: number }
  | { type: "REMOVE_LINE"; line: Line; timestamp: number }
  | { type: "CLEAR_LINES"; lines: Line[]; timestamp: number }
  | { type: "UPDATE_SCORE"; team: "red" | "blue"; from: number; to: number; timestamp: number }
  | { type: "ADD_RING"; goalId: string; ringColor: "red" | "blue"; timestamp: number }
  | { type: "REMOVE_RING"; goalId: string; ringColor: "red" | "blue"; ringIndex: number; timestamp: number };

// Define the types for the addToHistory function argument
export type HistoryActionWithoutTimestamp = 
  | { type: "MOVE_GOAL"; id: string; from: { x: number; y: number }; to: { x: number; y: number } }
  | { type: "MOVE_TEAM_SQUARE"; id: string; from: { x: number; y: number }; to: { x: number; y: number } }
  | { type: "ADD_LINE"; line: Line }
  | { type: "DELETE_LINE"; lineIndex: number; line: Line }
  | { type: "REMOVE_LINE"; line: Line }
  | { type: "CLEAR_LINES"; lines: Line[] }
  | { type: "UPDATE_SCORE"; team: "red" | "blue"; from: number; to: number }
  | { type: "ADD_RING"; goalId: string; ringColor: "red" | "blue" }
  | { type: "REMOVE_RING"; goalId: string; ringColor: "red" | "blue"; ringIndex: number };

// Define the props for popup components
export interface MobileGoalPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedGoalId: string | null;
  mobileGoals: MobileGoal[];
  onAddRing: (goalId: string, color: "red" | "blue") => void;
  onRemoveRing: (goalId: string) => void;
}

export interface WallStakePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStakeId: string | null;
  wallStakes: WallStake[];
  onAddRing: (stakeId: string, color: "red" | "blue") => void;
  onRemoveRing: (stakeId: string) => void;
}

export interface TeamStakePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStakeId: string | null;
  teamStakes: TeamStake[];
  onAddRing: (stakeId: string, color: "red" | "blue") => void;
  onRemoveRing: (stakeId: string) => void;
}

export interface TeamNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamNumber: string;
  onTeamNumberChange: (newTeamNumber: string) => void;
  onSave: () => void;
}

export interface HangScore {
  teamId: string;
  teamNumber: string;
  teamColor: "red" | "blue";
  level: 0 | 1 | 2 | 3; // 0 = no hang, 1-3 = hang levels
}

export interface HangPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hangScores: HangScore[];
  onHangScoreChange: (teamId: string, newLevel: 0 | 1 | 2 | 3) => void;
  highStakeRing: "red" | "blue" | null;
}
