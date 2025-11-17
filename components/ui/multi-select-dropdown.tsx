// components/ui/multi-select-dropdown.tsx
"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type MultiSelectOption = {
  label: string;
  value: string;
};

interface MultiSelectDropdownProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  triggerLabel: string;
  className?: string;
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  triggerLabel,
  className,
}: MultiSelectDropdownProps) {
  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const displayLabel =
    selected.length === 0
      ? `All ${triggerLabel}s`
      : selected.length === 1
      ? options.find((opt) => opt.value === selected[0])?.label
      : `${selected.length} ${triggerLabel}s selected`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-[250px] justify-between", className)}
        >
          {displayLabel}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[250px] max-h-60 overflow-y-auto">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={(e) => {
              e.preventDefault(); // Prevent menu from closing on click
              handleSelect(option.value);
            }}
          >
            <div
              className={cn(
                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                selected.includes(option.value)
                  ? "bg-primary text-primary-foreground"
                  : "opacity-50 [&_svg]:invisible"
              )}
            >
              <Check className={cn("h-4 w-4")} />
            </div>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}