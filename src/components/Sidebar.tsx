"use client";

import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { PanelLeftIcon, PencilIcon, EraserIcon, ChevronLeftIcon, TrashIcon, MinusIcon, MoreHorizontalIcon, ArrowRightIcon } from "lucide-react";
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
} from "../components/ui/alert-dialog";
import { useTheme } from "@/contexts/ThemeContext";

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
  onSettingsChange: (settings: Partial<DrawingSettings>) => void;
  onClearCanvas: () => void;
  isMobile?: boolean;
}

const COLORS = [
  "#ffffff",
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
];

// Component to conditionally render the sidebar trigger based on sidebar state
function SidebarTriggerButton({ isMobile }: { isMobile: boolean }) {
  const { open } = useSidebar();
  const { isDarkMode } = useTheme();
  
  if (isMobile && open) {
    return null;
  }
  
  return (
    <div className={`fixed ${isMobile ? 'left-2 top-2' : 'left-4 top-4'} z-20`}>
      <SidebarTrigger>
        <Button 
          variant="outline" 
          size="icon" 
          className={`${isDarkMode ? 'bg-[#1a1b26] border-[#292e42] hover:bg-[#292e42]' : 'bg-white hover:bg-gray-100'} shadow-md rounded-lg`}
        >
          <PanelLeftIcon className={`h-5 w-5 ${isDarkMode ? 'text-[#7aa2f7]' : ''}`} />
        </Button>
      </SidebarTrigger>
    </div>
  );
}

export default function DrawingSidebar({ settings, onSettingsChange, onClearCanvas, isMobile = false }: SidebarProps) {
  const { isDarkMode } = useTheme();
  
  return (
    <SidebarProvider defaultOpen={false}>
      <SidebarTriggerButton isMobile={isMobile} />
      
      <Sidebar 
        className={`border-r z-30 fixed left-0 top-0 ${isMobile ? 'w-[85vw] max-w-[300px]' : ''} h-screen overflow-y-auto pointer-events-auto ${
          isDarkMode ? 'bg-[#1a1b26] border-[#292e42] text-[#c0caf5]' : 'bg-white'
        }`}
        collapsible="icon"
      >
        <SidebarRail className={`cursor-w-resize transition-colors ${
          isDarkMode ? 'hover:bg-[#292e42]' : 'hover:bg-gray-100'
        }`} />
        
        <SidebarHeader className={`px-6 py-3 sticky top-0 z-10 flex justify-between items-center ${
          isDarkMode ? 'bg-[#1a1b26]' : ''
        }`}>
          {!isMobile && (
            <div className="group-data-[state=collapsed]:hidden">
              <SidebarCloseButton />
            </div>
          )}
        </SidebarHeader>
        
        <SidebarContent className={`px-6 pb-6 ${
          isDarkMode ? 'text-[#c0caf5]' : ''
        }`}>
          {/* Icon menu - only visible in collapsed state */}
          <div className="group-data-[state=expanded]:hidden flex justify-center -ml-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarExpandButton />
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
          
          {/* Regular content - only visible in expanded state */}
          <div className="space-y-6 group-data-[state=collapsed]:hidden">
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
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>
  );
}

// Separate component for the close button to properly use the sidebar context
function SidebarCloseButton() {
  const { setOpen } = useSidebar();
  const { isDarkMode } = useTheme();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-10 w-10 rounded-full hover:bg-[${isDarkMode ? '#292e42' : 'gray-100'}]`}
      onClick={() => setOpen(false)}
      aria-label="Close sidebar"
    >
      <ChevronLeftIcon className={`h-5 w-5 ${isDarkMode ? 'text-[#7aa2f7]' : ''}`} />
    </Button>
  );
}

// Separate component for expanding the sidebar
function SidebarExpandButton() {
  const { setOpen } = useSidebar();
  const { isDarkMode } = useTheme();
  
  return (
    <SidebarMenuButton 
      tooltip="Drawing Tools"
      className="flex items-center justify-center"
      onClick={() => setOpen(true)}
    >
      <PencilIcon className={`h-5 w-5 ${isDarkMode ? 'text-[#7aa2f7]' : ''}`} />
    </SidebarMenuButton>
  );
}
