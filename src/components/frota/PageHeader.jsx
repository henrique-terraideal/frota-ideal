import React from "react";
import { useNavigate } from "react-router-dom";

export default function PageHeader({ title, subtitle, icon: Icon, action }) {
  const navigate = useNavigate();
  return (
    <div className="px-5 pt-6 pb-3 bg-white sticky top-0 z-40 border-b border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
    </div>
  );
}