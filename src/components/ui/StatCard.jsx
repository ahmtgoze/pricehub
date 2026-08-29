import React from 'react';
import { cn } from "@/lib/utils";

export default function StatCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  trend,
  trendUp,
  className 
}) {
  return (
    <div className={cn(
      "bg-card rounded-[18px] border border-border p-[22px] transition-colors",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend !== undefined && (
            <p className={cn(
              "text-sm font-medium",
              trendUp ? "text-emerald-600" : "text-rose-600"
            )}>
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-xl bg-secondary">
            <Icon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
