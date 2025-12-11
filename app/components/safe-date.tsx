// ============================================
// FILE: app/components/safe-date.tsx
// ============================================
import { useEffect, useState } from "react";

interface SafeDateProps {
  date: Date | string | null | undefined;
  format?: "date" | "datetime" | "relative" | "time";
  className?: string;
  fallback?: string;
}

export function SafeDate({ 
  date, 
  format = "date", 
  className,
  fallback = "Never"
}: SafeDateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return <span className={className}>{fallback}</span>;
  }

  if (!date) {
    return <span className={className}>{fallback}</span>;
  }

  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Check if valid date
  if (isNaN(dateObj.getTime())) {
    return <span className={className}>{fallback}</span>;
  }

  if (format === "date") {
    return <span className={className}>{dateObj.toLocaleDateString()}</span>;
  }

  if (format === "datetime") {
    return <span className={className}>{dateObj.toLocaleString()}</span>;
  }

  if (format === "time") {
    return <span className={className}>{dateObj.toLocaleTimeString()}</span>;
  }

  // Relative format (e.g., "2 days ago")
  if (format === "relative") {
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return <span className={className}>Just now</span>;
    if (minutes < 60) return <span className={className}>{minutes}m ago</span>;
    if (hours < 24) return <span className={className}>{hours}h ago</span>;
    if (days === 0) return <span className={className}>Today</span>;
    if (days === 1) return <span className={className}>Yesterday</span>;
    if (days < 7) return <span className={className}>{days}d ago</span>;
    if (days < 30) return <span className={className}>{Math.floor(days / 7)}w ago</span>;
    
    return <span className={className}>{dateObj.toLocaleDateString()}</span>;
  }

  return <span className={className}>{dateObj.toLocaleDateString()}</span>;
}
