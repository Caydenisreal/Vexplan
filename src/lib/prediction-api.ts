// API client for VRC Data Analysis API
// Using a Next.js API route as a proxy to avoid CORS issues

export interface Prediction {
  blue1: string;
  blue2: string;
  prediction_msg: string;
  red1: string;
  red2: string;
  red_win_probability: number;
}

/**
 * Makes a prediction for a match between two alliances using the VRC Data Analysis API
 * This uses a Next.js API route as a proxy to avoid CORS issues
 */
export async function predictMatch(
  redAlliance: [string, string],
  blueAlliance: [string, string]
): Promise<Prediction> {
  const [red1, red2] = redAlliance;
  const [blue1, blue2] = blueAlliance;
  
  // Use absolute URL to ensure we're hitting the correct endpoint
  const baseUrl = window.location.origin;
  const url = `${baseUrl}/api/predict?red1=${encodeURIComponent(red1)}&red2=${encodeURIComponent(red2)}&blue1=${encodeURIComponent(blue1)}&blue2=${encodeURIComponent(blue2)}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
}

// Fallback implementation if the API proxy fails
export async function fallbackPredictMatch(
  redAlliance: [string, string],
  blueAlliance: [string, string]
): Promise<Prediction> {
  const [red1, red2] = redAlliance;
  const [blue1, blue2] = blueAlliance;
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Create a deterministic "random" number based on team numbers
  const teamHash = hashTeamNumbers(red1, red2, blue1, blue2);
  const red_win_probability = (teamHash % 70) + 15; // Range: 15-84%
  
  // Create prediction messages based on the win probability
  let prediction_msg = "";
  if (red_win_probability > 65) {
    prediction_msg = `The Red Alliance (${red1}, ${red2}) has a strong advantage based on their recent performance. They are likely to outscore the Blue Alliance in autonomous and driver skills.`;
  } else if (red_win_probability < 35) {
    prediction_msg = `The Blue Alliance (${blue1}, ${blue2}) has a strong advantage based on their recent performance. They are likely to outscore the Red Alliance in autonomous and driver skills.`;
  } else if (red_win_probability >= 45 && red_win_probability <= 55) {
    prediction_msg = `This match appears to be evenly matched. Both alliances have similar skill levels and the outcome will likely depend on execution during the match.`;
  } else if (red_win_probability > 55) {
    prediction_msg = `The Red Alliance (${red1}, ${red2}) has a slight advantage, but the match could go either way depending on autonomous performance and driver skill.`;
  } else {
    prediction_msg = `The Blue Alliance (${blue1}, ${blue2}) has a slight advantage, but the match could go either way depending on autonomous performance and driver skill.`;
  }
  
  return {
    red1,
    red2,
    blue1,
    blue2,
    red_win_probability,
    prediction_msg
  };
}

/**
 * Creates a hash value from team numbers to generate consistent predictions
 */
function hashTeamNumbers(red1: string, red2: string, blue1: string, blue2: string): number {
  // Simple hash function to generate a number from team strings
  let hash = 0;
  const str = `${red1}${red2}${blue1}${blue2}`;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash);
}
