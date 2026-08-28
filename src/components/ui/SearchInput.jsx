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
    // h-[38px]: sarmalayici flex/grid icinde ESNEYIP uzuyordu; buyutec
    // girdinin degil uzayan kutunun ortasina hizalandigi icin asagida
    // kaliyordu. self-end: yanindaki etiketli filtrelerde secim kutusu
    // altta oldugu icin arama kutusu onlarla ayni hizaya oturuyor.
    <div className={`relative h-[38px] self-end ${className}`}>
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-11 pr-10 h-[38px] bg-card border-border rounded-[11px] focus:border-input focus:ring-1 focus:ring-ring/20 hover:border-input transition-colors"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg"
          onClick={() => onChange('')}
        >
          <X className="h-4 w-4 text-muted-foreground/70" />
        </Button>
      )}
    </div>
  );
}
