import { NextResponse } from 'next/server';

const API_BASE = "https://vrc-data-analysis.com/v1";

export async function GET(request: Request) {
  try {
    // Get team numbers from the URL search params
    const { searchParams } = new URL(request.url);
    const red1 = searchParams.get('red1');
    const red2 = searchParams.get('red2');
    const blue1 = searchParams.get('blue1');
    const blue2 = searchParams.get('blue2');
    
    // Validate parameters
    if (!red1 || !red2 || !blue1 || !blue2) {
      return NextResponse.json(
        { error: "Missing team numbers. All parameters (red1, red2, blue1, blue2) are required." },
        { status: 400 }
      );
    }
    
    // Construct the API URL
    const endpoint = `/predict/${red1}/${red2}/${blue1}/${blue2}`;
    const url = `${API_BASE}${endpoint}`;
    
    // Make the request to the VRC Data Analysis API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        "accept-language": "en",
        "User-Agent": "VexPlan"
      },
      cache: 'no-store' // Don't cache the response
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    // Get the data and return it
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Prediction API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch prediction data" },
      { status: 500 }
    );
  }
}
