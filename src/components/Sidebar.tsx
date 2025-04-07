"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { 
  PencilIcon, 
  EraserIcon, 
  MinusIcon, 
  MoreHorizontalIcon, 
  ArrowRightIcon, 
  ChevronLeftIcon,
  BrainCircuitIcon,
  RefreshCwIcon,
  TrashIcon,
  XCircleIcon
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { predictMatch, fallbackPredictMatch, Prediction } from "@/lib/prediction-api";

const COLORS = [
  "#ffffff",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FFA500",
  "#800080",
  "#008000",
  "#000080",
  "#800000",
  "#808000",
  "#008080",
  "#808080",
  "#C0C0C0"
];

export type LineStyle = "solid" | "dotted" | "dashed";
export type LineEndStyle = "none" | "arrow";

interface DrawingSettings {
  isDrawMode: boolean;
  brushSize: number;
  brushColor: string;
  isEraser: boolean;
  lineStyle: LineStyle;
  lineEndStyle: LineEndStyle;
}

interface SidebarProps {
  settings: DrawingSettings;
  onSettingsChange: (newSettings: Partial<DrawingSettings>) => void;
  onClearCanvas: () => void;
  isMobile?: boolean;
  squares?: {
    id: string;
    type: string;
    teamNumber: string;
  }[];
}

export default function DrawingSidebar({ settings, onSettingsChange, onClearCanvas, isMobile = false, squares = [] }: SidebarProps) {
  const { isDarkMode } = useTheme();
  const [activeSidebar, setActiveSidebar] = React.useState<'none' | 'drawing' | 'prediction'>('none');
  const { toast } = useToast();
  
  // State for prediction
  const [prediction, setPrediction] = React.useState<Prediction | null>(null);
  const [isPredicting, setIsPredicting] = React.useState<boolean>(false);
  
  // Function to toggle between sidebars
  const toggleSidebar = (sidebar: 'drawing' | 'prediction') => {
    setActiveSidebar(prev => prev === sidebar ? 'none' : sidebar);
  };
  
  // Function to make prediction using team numbers from squares
  const handlePredict = async () => {
    // Get team numbers from squares
    const redSquares = squares.filter(square => square.type === 'red' && square.teamNumber);
    const blueSquares = squares.filter(square => square.type === 'blue' && square.teamNumber);
    
    // Check if we have enough team numbers
    if (redSquares.length < 2 || blueSquares.length < 2) {
      toast({
        title: "Missing Team Numbers",
        description: "Please assign team numbers to all squares on the field before making a prediction.",
        variant: "destructive",
      });
      return;
    }
    
    setIsPredicting(true);
    setPrediction(null);
    
    try {
      // Try to use the real API first
      const result = await predictMatch(
        [redSquares[0].teamNumber, redSquares[1].teamNumber],
        [blueSquares[0].teamNumber, blueSquares[1].teamNumber]
      );
      setPrediction(result);
    } catch (error) {
      console.error("Prediction API error:", error);
      
      // Show a toast notification about the API failure
      toast({
        title: "API Connection Error",
        description: "Could not connect to the prediction API. Using fallback prediction method.",
        variant: "destructive",
      });
      
      try {
        // Fall back to the local prediction method
        const fallbackResult = await fallbackPredictMatch(
          [redSquares[0].teamNumber, redSquares[1].teamNumber],
          [blueSquares[0].teamNumber, blueSquares[1].teamNumber]
        );
        setPrediction(fallbackResult);
        
        // Add a note to the prediction message about using fallback
        fallbackResult.prediction_msg += " (Note: This is a fallback prediction as the real API is unavailable)";
      } catch (fallbackError) {
        console.error("Fallback prediction failed:", fallbackError);
        toast({
          title: "Prediction Failed",
          description: "The team numbers provided may not be valid or there is a problem with the prediction system.",
          variant: "destructive",
        });
      }
    } finally {
      setIsPredicting(false);
    }
  };
  
  // Function to reset prediction
  const resetPrediction = () => {
    setPrediction(null);
  };
  
  return (
    <>
      {/* Sidebar Trigger Buttons - positioned differently based on sidebar state and device */}
      <div 
        className="fixed z-50 transition-all duration-300 ease-in-out top-4"
        style={{
          left: isMobile 
            ? activeSidebar !== 'none' 
              ? '260px' 
              : '50%'
            : activeSidebar !== 'none' 
              ? '260px' 
              : '16px',
          transform: isMobile && activeSidebar === 'none' ? 'translateX(-50%)' : 'none',
          display: 'flex',
          flexDirection: isMobile ? 'row' : 'column',
          gap: isMobile ? '12px' : '12px'
        }}
      >
        <Button 
          variant="outline" 
          size="icon"
          className={`h-8 w-8 rounded-full ${
            isDarkMode ? 'bg-[#1a1b26] border-[#292e42] text-[#c0caf5] hover:bg-[#292e42]' : ''
          } ${activeSidebar === 'drawing' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => toggleSidebar('drawing')}
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        
        <Button 
          variant="outline" 
          size="icon"
          className={`h-8 w-8 rounded-full ${
            isDarkMode ? 'bg-[#1a1b26] border-[#292e42] text-[#c0caf5] hover:bg-[#292e42]' : ''
          } ${activeSidebar === 'prediction' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => toggleSidebar('prediction')}
        >
          <BrainCircuitIcon className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Overlay that appears when sidebar is open */}
      {activeSidebar !== 'none' && (
        <div 
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setActiveSidebar('none')}
        />
      )}
      
      {/* Drawing Tools Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-full z-40 transform transition-transform duration-300 ease-in-out ${
          activeSidebar === 'drawing' ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className={`h-full ${isMobile ? 'w-[85vw] max-w-[250px]' : 'w-[250px] md:w-[300px]'} overflow-y-auto ${
          isDarkMode ? 'bg-[#1a1b26] border-r border-[#292e42] text-[#c0caf5]' : 'bg-white border-r'
        }`}>
          {/* Empty div for top spacing */}
          <div className="h-5"></div>
          
          <div className={`px-6 py-5 sticky top-5 z-10 flex justify-between items-center ${
            isDarkMode ? 'bg-[#1a1b26]' : 'bg-white'
          }`}>
            <h2 className="text-lg font-medium">Drawing Tools</h2>
            <Button 
              variant="ghost" 
              size="icon"
              className={`h-7 w-7 ${isDarkMode ? 'text-[#c0caf5] hover:bg-[#292e42]' : ''}`}
              onClick={() => setActiveSidebar('none')}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <div className={`px-6 pb-6 ${
            isDarkMode ? 'text-[#c0caf5]' : ''
          }`}>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="draw-mode" className="text-sm font-medium">
                    Draw Mode
                  </label>
                  <Switch
                    id="draw-mode"
                    checked={settings.isDrawMode}
                    onCheckedChange={(checked) => {
                      // When turning off draw mode, also turn off eraser
                      if (!checked) {
                        onSettingsChange({ isDrawMode: checked, isEraser: false });
                      } else {
                        onSettingsChange({ isDrawMode: checked });
                      }
                    }}
                  />
                </div>
              </div>

              {settings.isDrawMode && (
                <>
                  <Separator />
                  
                  <div className="space-y-4">
                    <label className="text-sm font-medium">Tool</label>
                    <div className="flex space-x-2">
                      <Button
                        variant={!settings.isEraser ? "default" : "outline"}
                        size="sm"
                        className={`flex items-center gap-2 ${
                          isDarkMode && !settings.isEraser 
                            ? 'bg-[#7aa2f7] hover:bg-[#3d59a1] text-[#1a1b26]' 
                            : isDarkMode 
                              ? 'border-[#292e42] text-[#c0caf5] hover:bg-[#292e42]' 
                              : ''
                        }`}
                        onClick={() => onSettingsChange({ isEraser: false })}
                      >
                        <PencilIcon className="h-4 w-4" />
                        <span>Draw</span>
                      </Button>
                      <Button
                        variant={settings.isEraser ? "default" : "outline"}
                        size="sm"
                        className={`flex items-center gap-2 ${
                          isDarkMode && settings.isEraser 
                            ? 'bg-[#7aa2f7] hover:bg-[#3d59a1] text-[#1a1b26]' 
                            : isDarkMode 
                              ? 'border-[#292e42] text-[#c0caf5] hover:bg-[#292e42]' 
                              : ''
                        }`}
                        onClick={() => onSettingsChange({ isEraser: true })}
                      >
                        <EraserIcon className="h-4 w-4" />
                        <span>Erase</span>
                      </Button>
                    </div>
                  </div>
                  
                  {!settings.isEraser && (
                    <>
                      <div className="space-y-4">
                        <label className="text-sm font-medium">Line Style</label>
                        <div className="flex space-x-2">
                          <Button
                            variant={settings.lineStyle === "solid" ? "default" : "outline"}
                            size="sm"
                            className={`flex-1 flex items-center justify-center ${
                              isDarkMode && settings.lineStyle === "solid" 
                                ? 'bg-[#7aa2f7] hover:bg-[#3d59a1] text-[#1a1b26]' 
                                : isDarkMode 
                                  ? 'border-[#292e42] text-[#c0caf5] hover:bg-[#292e42]' 
                                  : ''
                            }`}
                            onClick={() => onSettingsChange({ lineStyle: "solid" })}
                          >
                            <MinusIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={settings.lineStyle === "dotted" ? "default" : "outline"}
                            size="sm"
                            className={`flex-1 flex items-center justify-center ${
                              isDarkMode && settings.lineStyle === "dotted" 
                                ? 'bg-[#7aa2f7] hover:bg-[#3d59a1] text-[#1a1b26]' 
                                : isDarkMode 
                                  ? 'border-[#292e42] text-[#c0caf5] hover:bg-[#292e42]' 
                                  : ''
                            }`}
                            onClick={() => onSettingsChange({ lineStyle: "dotted" })}
                          >
                            <div className="flex items-center space-x-1">
                              <div className={`w-1 h-1 rounded-full ${
                                isDarkMode && settings.lineStyle === "dotted" 
                                  ? 'bg-[#1a1b26]' 
                                  : 'bg-current'
                              }`}></div>
                              <div className={`w-1 h-1 rounded-full ${
                                isDarkMode && settings.lineStyle === "dotted" 
                                  ? 'bg-[#1a1b26]' 
                                  : 'bg-current'
                              }`}></div>
                              <div className={`w-1 h-1 rounded-full ${
                                isDarkMode && settings.lineStyle === "dotted" 
                                  ? 'bg-[#1a1b26]' 
                                  : 'bg-current'
                              }`}></div>
                            </div>
                          </Button>
                          <Button
                            variant={settings.lineStyle === "dashed" ? "default" : "outline"}
                            size="sm"
                            className={`flex-1 flex items-center justify-center ${
                              isDarkMode && settings.lineStyle === "dashed" 
                                ? 'bg-[#7aa2f7] hover:bg-[#3d59a1] text-[#1a1b26]' 
                                : isDarkMode 
                                  ? 'border-[#292e42] text-[#c0caf5] hover:bg-[#292e42]' 
                                  : ''
                            }`}
                            onClick={() => onSettingsChange({ lineStyle: "dashed" })}
                          >
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <label className="text-sm font-medium">Line End</label>
                        <div className="flex space-x-2">
                          <Button
                            variant={settings.lineEndStyle === "none" ? "default" : "outline"}
                            size="sm"
                            className={`flex-1 flex items-center justify-center ${
                              isDarkMode && settings.lineEndStyle === "none" 
                                ? 'bg-[#7aa2f7] hover:bg-[#3d59a1] text-[#1a1b26]' 
                                : isDarkMode 
                                  ? 'border-[#292e42] text-[#c0caf5] hover:bg-[#292e42]' 
                                  : ''
                            }`}
                            onClick={() => onSettingsChange({ lineEndStyle: "none" })}
                          >
                            <MinusIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={settings.lineEndStyle === "arrow" ? "default" : "outline"}
                            size="sm"
                            className={`flex-1 flex items-center justify-center ${
                              isDarkMode && settings.lineEndStyle === "arrow" 
                                ? 'bg-[#7aa2f7] hover:bg-[#3d59a1] text-[#1a1b26]' 
                                : isDarkMode 
                                  ? 'border-[#292e42] text-[#c0caf5] hover:bg-[#292e42]' 
                                  : ''
                            }`}
                            onClick={() => onSettingsChange({ lineEndStyle: "arrow" })}
                          >
                            <ArrowRightIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="space-y-4">
                    <label className="text-sm font-medium">
                      {settings.isEraser ? "Eraser Size" : "Brush Size"}
                    </label>
                    <Slider
                      min={1}
                      max={20}
                      step={1}
                      value={[settings.brushSize]}
                      onValueChange={([size]) =>
                        onSettingsChange({ brushSize: size })
                      }
                    />
                    <span className="text-sm text-gray-500">
                      {settings.brushSize}px
                    </span>
                  </div>

                  {!settings.isEraser && (
                    <div className="space-y-4">
                      <label className="text-sm font-medium">Brush Color</label>
                      <div className="grid grid-cols-4 gap-2">
                        {COLORS.map((color) => (
                          <button
                            key={color}
                            className={`w-8 h-8 rounded-full border-2 ${
                              color === settings.brushColor
                                ? "border-blue-500"
                                : "border-transparent"
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => onSettingsChange({ brushColor: color })}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="pt-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className={`w-full mt-4 ${
                            isDarkMode 
                              ? 'bg-[#f7768e] hover:bg-[#db4b4b] text-[#1a1b26]' 
                              : ''
                          }`}
                        >
                          <TrashIcon className="h-4 w-4 mr-2" />
                          Clear Canvas
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className={`${isMobile ? "max-w-[90vw]" : ""} ${
                        isDarkMode ? 'bg-[#1a1b26] border-[#292e42] text-[#c0caf5]' : ''
                      }`}>
                        <AlertDialogHeader>
                          <AlertDialogTitle className={isDarkMode ? 'text-[#c0caf5]' : ''}>Clear Canvas</AlertDialogTitle>
                          <AlertDialogDescription className={isDarkMode ? 'text-[#a9b1d6]' : ''}>
                            This will remove all drawings from the canvas. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className={isDarkMode ? 'bg-[#292e42] text-[#c0caf5] hover:bg-[#414868] border-[#414868]' : ''}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={onClearCanvas}
                            className={isDarkMode ? 'bg-[#f7768e] hover:bg-[#db4b4b] text-[#1a1b26]' : ''}
                          >
                            Clear
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Prediction Tools Sidebar */}
      <div 
        className={`fixed left-0 top-0 h-full z-40 transform transition-transform duration-300 ease-in-out ${
          activeSidebar === 'prediction' ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className={`h-full ${isMobile ? 'w-[85vw] max-w-[250px]' : 'w-[250px] md:w-[300px]'} overflow-y-auto ${
          isDarkMode ? 'bg-[#1a1b26] border-r border-[#292e42] text-[#c0caf5]' : 'bg-white border-r'
        }`}>
          {/* Empty div for top spacing */}
          <div className="h-5"></div>
          
          <div className={`px-6 py-5 sticky top-5 z-10 flex justify-between items-center ${
            isDarkMode ? 'bg-[#1a1b26]' : 'bg-white'
          }`}>
            <h2 className="text-lg font-medium">Match Prediction</h2>
            <Button 
              variant="ghost" 
              size="icon"
              className={`h-7 w-7 ${isDarkMode ? 'text-[#c0caf5] hover:bg-[#292e42]' : ''}`}
              onClick={() => setActiveSidebar('none')}
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <div className={`px-6 pb-6 ${
            isDarkMode ? 'text-[#c0caf5]' : ''
          }`}>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Team Numbers</h3>
                
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-red-500">Red Alliance</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {squares
                      .filter(square => square.type === 'red')
                      .map((square, index) => (
                        <div key={square.id} className={`p-2 rounded-md ${
                          isDarkMode ? 'bg-[#24283b]' : 'bg-gray-100'
                        }`}>
                          <p className="text-xs">Team {index + 1}</p>
                          <p className={`text-sm font-medium ${
                            !square.teamNumber ? 'text-gray-400' : ''
                          }`}>
                            {square.teamNumber || 'Not set'}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-blue-500">Blue Alliance</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {squares
                      .filter(square => square.type === 'blue')
                      .map((square, index) => (
                        <div key={square.id} className={`p-2 rounded-md ${
                          isDarkMode ? 'bg-[#24283b]' : 'bg-gray-100'
                        }`}>
                          <p className="text-xs">Team {index + 1}</p>
                          <p className={`text-sm font-medium ${
                            !square.teamNumber ? 'text-gray-400' : ''
                          }`}>
                            {square.teamNumber || 'Not set'}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handlePredict}
                disabled={isPredicting}
                className={`w-full ${
                  isDarkMode 
                    ? 'bg-[#7aa2f7] hover:bg-[#3d59a1] text-[#1a1b26]' 
                    : ''
                }`}
              >
                {isPredicting ? (
                  <>
                    <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                    Predicting...
                  </>
                ) : (
                  <>
                    <BrainCircuitIcon className="h-4 w-4 mr-2" />
                    Predict Match
                  </>
                )}
              </Button>
              
              {prediction && (
                <div className={`mt-4 p-4 rounded-md ${
                  isDarkMode ? 'bg-[#24283b]' : 'bg-gray-50'
                }`}>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium">Prediction Result</h3>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6" 
                      onClick={resetPrediction}
                    >
                      <XCircleIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Red Win Probability:</span>
                      <span className={`text-sm font-medium ${
                        prediction.red_win_probability > 50 
                          ? 'text-red-500' 
                          : ''
                      }`}>
                        {Math.round(prediction.red_win_probability)}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Blue Win Probability:</span>
                      <span className={`text-sm font-medium ${
                        prediction.red_win_probability < 50 
                          ? 'text-blue-500' 
                          : ''
                      }`}>
                        {Math.round(100 - prediction.red_win_probability)}%
                      </span>
                    </div>
                    
                    <Separator className={isDarkMode ? 'bg-[#414868]' : ''} />
                    
                    <div className="text-sm">
                      <p className="font-medium mb-1">Analysis:</p>
                      <p className={`text-xs ${isDarkMode ? 'text-[#a9b1d6]' : 'text-gray-600'}`}>
                        {prediction.prediction_msg}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
