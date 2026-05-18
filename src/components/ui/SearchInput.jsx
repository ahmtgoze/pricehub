import React from 'react';
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SearchInput({ 
  value, 
  onChange, 
  placeholder = "Ara...",
  className = ""
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-11 pr-10 h-11 bg-white border-gray-200 rounded-xl focus:border-gray-300 focus:ring-1 focus:ring-gray-200 shadow-sm hover:border-gray-300 transition-all"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg"
          onClick={() => onChange('')}
        >
          <X className="h-4 w-4 text-gray-400" />
        </Button>
      )}
    </div>
  );
}
