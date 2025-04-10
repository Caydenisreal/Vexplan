// Constants for the VexPlan game

// Constants for the coordinate system
export const FIELD_SIZE_INCHES = 144; // 144 inches
export const HANG_LADDER_SIZE_INCHES = 48; // 48 inches
export const MOBILE_GOAL_SIZE_INCHES = 8; // 10 inches
export const STAKE_SIZE_INCHES = 10; // Size for stakes

// Define fixed stake positions (in inches from center)
export const STAKES = [
  { id: "wallStake1", type: "wall", x: -0.5, y: 69.5 },
  { id: "wallStake2", type: "wall", x: -0.5, y: -69 },
  { id: "redStake", type: "red", x: -70, y: 0 },
  { id: "blueStake", type: "blue", x: 69, y: 0 },
];

// Define initial square positions (18x18 inch squares)
export const INITIAL_SQUARES: {
  id: string;
  type: "red" | "blue";
  x: number;
  y: number;
  size: number;
  teamNumber: string;
}[] = [
  { id: "redSquare1", type: "red", x: 10, y: 20, size: 18, teamNumber: "" },
  { id: "redSquare2", type: "red", x: 10, y: 105, size: 18, teamNumber: "" },
  { id: "blueSquare1", type: "blue", x: 115, y: 20, size: 18, teamNumber: "" },
  { id: "blueSquare2", type: "blue", x: 115, y: 105, size: 18, teamNumber: "" },
];

// Define initial mobile goal positions
export const INITIAL_MOBILE_GOALS = [
  { id: "mobileGoal-1", x: -24, y: 24, rings: [] },
  { id: "mobileGoal-2", x: 24, y: 24, rings: [] },
  { id: "mobileGoal-3", x: 24, y: -24, rings: [] },
  { id: "mobileGoal-4", x: -24, y: -24, rings: [] },
  { id: "mobileGoal-5", x: -0.5, y: -48, rings: [] },
];

// Define initial wall stakes with rings
export const INITIAL_WALL_STAKES = [
  { id: "wallStake1", rings: [] },
  { id: "wallStake2", rings: [] },
];

// Define initial team stakes with rings
export const INITIAL_TEAM_STAKES = [
  { id: "redStake", rings: [] },
  { id: "blueStake", rings: [] },
];

// Define scoring zones in the corners of the field
export const FIELD_ZONES = {
  // Bottom corners - double points (triangular zones)
  BOTTOM_LEFT: {
    x: -FIELD_SIZE_INCHES / 2,
    y: -FIELD_SIZE_INCHES / 2,
    width: FIELD_SIZE_INCHES / 6,
    height: FIELD_SIZE_INCHES / 6,
    effect: "double" as const,
    shape: "triangle" as const,
    corner: "bottomLeft" as const,
  },
  BOTTOM_RIGHT: {
    x: FIELD_SIZE_INCHES / 3,
    y: -FIELD_SIZE_INCHES / 2,
    width: FIELD_SIZE_INCHES / 6,
    height: FIELD_SIZE_INCHES / 6,
    effect: "double" as const,
    shape: "triangle" as const,
    corner: "bottomRight" as const,
  },
  // Top corners - negative points (triangular zones)
  TOP_LEFT: {
    x: -FIELD_SIZE_INCHES / 2,
    y: FIELD_SIZE_INCHES / 3,
    width: FIELD_SIZE_INCHES / 6,
    height: FIELD_SIZE_INCHES / 6,
    effect: "negative" as const,
    shape: "triangle" as const,
    corner: "topLeft" as const,
  },
  TOP_RIGHT: {
    x: FIELD_SIZE_INCHES / 3,
    y: FIELD_SIZE_INCHES / 3,
    width: FIELD_SIZE_INCHES / 6,
    height: FIELD_SIZE_INCHES / 6,
    effect: "negative" as const,
    shape: "triangle" as const,
    corner: "topRight" as const,
  },
};

// Constants for arrow direction smoothing
export const DIRECTION_SMOOTHING_FACTOR = 0.3; // Lower = smoother (0-1)
export const MIN_DIRECTION_CHANGE_THRESHOLD = 5; // Minimum pixels to move before direction changes
export const MIN_DIRECTION_POINTS = 3; // Minimum number of points needed to calculate a direction
export const END_POINTS_TO_IGNORE = 2; // Number of points to ignore at the end when calculating direction
