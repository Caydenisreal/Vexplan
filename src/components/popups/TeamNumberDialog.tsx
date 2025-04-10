"use client";

import React from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useTheme } from "@/contexts/ThemeContext";

interface TeamNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamNumber: string;
  onTeamNumberChange: (value: string) => void;
  onSave: () => void;
}

const TeamNumberDialog: React.FC<TeamNumberDialogProps> = ({
  open,
  onOpenChange,
  teamNumber,
  onTeamNumberChange,
  onSave,
}) => {
  const { isDarkMode } = useTheme();

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
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
          onClick={() => onOpenChange(false)}
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
          value={teamNumber}
          onChange={(e) => onTeamNumberChange(e.target.value)}
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
            onClick={onSave}
            className={
              isDarkMode ? "bg-[#7aa2f7] text-white hover:bg-[#5d7dcb]" : ""
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeamNumberDialog;
