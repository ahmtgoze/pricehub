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
      "bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow",
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-sm text-slate-500">{subtitle}</p>
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
          <div className="p-3 rounded-xl bg-slate-50">
            <Icon className="h-6 w-6 text-slate-600" />
          </div>
        )}
      </div>
    </div>
  );
}
