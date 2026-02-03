/**
 * GitLab-style contribution heatmap component
 * Displays year-to-date illness data as a grid
 */

import { useMemo } from 'react';
import type { HeatmapData, HeatmapDay } from '../../types/api';
import styles from './Heatmap.module.css';

interface HeatmapProps {
  data: HeatmapData;
  onDayClick?: (date: string) => void;
  isSingleChild?: boolean; // If true, don't show numbers and use severity for color
  totalChildren?: number; // Total number of children (for max calculation when viewing all children)
}

interface DayCell {
  date: string;
  count: number;
  children: number[];
  week: number;
  dayOfWeek: number;
}

function getColorIntensity(count: number, maxCount: number): string {
  // Check if we're in dark mode
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  
  if (count === 0) {
    // For no illnesses: grey (like GitHub's contribution graph)
    return isDarkMode ? '#161b22' : '#ebedf0'; // GitHub-style grey
  }
  
  // Calculate intensity (0 to 1)
  const intensity = count / maxCount;
  
  if (isDarkMode) {
    // Dark mode: start very faint (very dark, almost background) and get brighter (lighter)
    // Start from very dark blue (almost background), go to bright blue (#3b82f6)
    const faintR = 22; // Very dark, almost background (#161b22 is background)
    const faintG = 27;
    const faintB = 34;
    
    const brightR = 59; // #3b82f6 (brighter blue)
    const brightG = 130;
    const brightB = 246;
    
    // Interpolate from very faint (very dark) to bright (light)
    const r = Math.round(faintR + (brightR - faintR) * intensity);
    const g = Math.round(faintG + (brightG - faintG) * intensity);
    const b = Math.round(faintB + (brightB - faintB) * intensity);
    
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Light mode: start very faint (almost white/background) and get brighter (more vibrant)
    // Start from almost white (#f9fafb is close to background), go to vibrant blue (#2563eb)
    const faintR = 249; // #f9fafb (almost white, very faint)
    const faintG = 250;
    const faintB = 251;
    
    const brightR = 37; // #2563eb (bright vibrant blue)
    const brightG = 99;
    const brightB = 235;
    
    // Interpolate from very faint (almost white) to bright (vibrant)
    const r = Math.round(faintR + (brightR - faintR) * intensity);
    const g = Math.round(faintG + (brightG - faintG) * intensity);
    const b = Math.round(faintB + (brightB - faintB) * intensity);
    
    return `rgb(${r}, ${g}, ${b})`;
  }
}

function Heatmap({ data, onDayClick, isSingleChild = false, totalChildren }: HeatmapProps) {
  // Calculate the max value for color scaling
  // For single child: max is always 10 (severity scale)
  // For all children: max is total number of children (or fallback to maxCount if totalChildren not provided)
  const maxForColor = isSingleChild ? 10 : ((totalChildren ?? data.maxCount) || 1);
  // Create a map of date -> day data for quick lookup
  const dayMap = useMemo(() => {
    const map = new Map<string, HeatmapDay>();
    data.days.forEach(day => {
      map.set(day.date, day);
    });
    return map;
  }, [data.days]);

  // Generate all days for the year and organize by week
  // CRITICAL: Each column is a week, each row is a day of week
  // All Sundays must be in row 0, all Mondays in row 1, etc.
  const weeks = useMemo(() => {
    const startDate = new Date(data.year, 0, 1);
    const endDate = new Date();
    const currentYear = new Date().getFullYear();
    
    // Only show days up to today if current year, otherwise show full year
    const lastDay = data.year === currentYear ? endDate : new Date(data.year, 11, 31);
    
    // Find the Sunday of the week containing the first day of the year
    const firstDayOfYear = new Date(startDate);
    firstDayOfYear.setHours(0, 0, 0, 0);
    const firstDayOfWeek = firstDayOfYear.getDay(); // 0 = Sunday, 6 = Saturday
    const firstSunday = new Date(firstDayOfYear);
    firstSunday.setDate(firstSunday.getDate() - firstDayOfWeek);
    
    // Find the Saturday of the week containing the last day
    const lastDayOfYear = new Date(lastDay);
    lastDayOfYear.setHours(23, 59, 59, 999);
    const lastDayOfWeek = lastDayOfYear.getDay();
    const lastSaturday = new Date(lastDayOfYear);
    lastSaturday.setDate(lastSaturday.getDate() + (6 - lastDayOfWeek));
    
    // Calculate total number of weeks needed
    const totalDays = Math.ceil((lastSaturday.getTime() - firstSunday.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const totalWeeks = Math.ceil(totalDays / 7);
    
    // Build a 2D array: weeks[weekIndex][dayOfWeek] = DayCell
    const weeksArray: DayCell[][] = [];
    
    // Initialize all weeks with empty cells
    for (let weekIndex = 0; weekIndex < totalWeeks; weekIndex++) {
      const weekDays: DayCell[] = [];
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        weekDays.push({
          date: '',
          count: 0,
          children: [],
          week: weekIndex,
          dayOfWeek,
        });
      }
      weeksArray.push(weekDays);
    }
    
    // Fill in actual days
    // CRITICAL: We iterate from firstSunday, so the first day is always Sunday (dayOfWeek = 0)
    const currentDate = new Date(firstSunday);
    let dayCount = 0;
    while (currentDate <= lastSaturday) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayData = dayMap.get(dateStr);
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Calculate week index: how many weeks from firstSunday
      const weekIndex = Math.floor(dayCount / 7);
      
      // Only include days that are within our date range
      const isInRange = currentDate >= startDate && currentDate <= lastDay;
      
      // CRITICAL: dayOfWeek MUST match the array index (0=Sunday, 1=Monday, etc.)
      // weeksArray[weekIndex][dayOfWeek] where dayOfWeek is 0-6
      if (weekIndex >= 0 && weekIndex < weeksArray.length && dayOfWeek >= 0 && dayOfWeek < 7) {
        weeksArray[weekIndex][dayOfWeek] = {
          date: isInRange ? dateStr : '', // Empty date for padding days
          count: isInRange ? (dayData?.count || 0) : 0,
          children: isInRange ? (dayData?.children || []) : [],
          week: weekIndex,
          dayOfWeek,
        };
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
      dayCount++;
    }
    
    // Convert to the expected format
    return weeksArray.map((days, weekIndex) => ({
      week: weekIndex,
      days: days, // Already in correct order (Sunday=0 to Saturday=6)
    }));
  }, [data.year, dayMap]);

  // Get day labels - ALL 7 days, one per row
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handleDayClick = (date: string) => {
    if (onDayClick) {
      onDayClick(date);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {/* Day labels - MUST align with the 7 rows of cells */}
        <div className={styles.dayLabels}>
          {dayLabels.map((label, idx) => (
            <div key={idx} className={styles.dayLabel}>
              {label}
            </div>
          ))}
        </div>
        
        {/* Weeks - Each week column has exactly 7 cells (Sunday=0 to Saturday=6) */}
        <div className={styles.weeks}>
          {weeks.map(({ week, days }) => (
            <div key={week} className={styles.week}>
              {days.map((day) => {
                // CRITICAL: days array is guaranteed to have 7 elements in order: [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
                // Render all cells, including empty padding days, to maintain alignment
                if (!day.date) {
                  return (
                    <div
                      key={`empty-${week}-${day.dayOfWeek}`}
                      className={`${styles.cell} ${styles.cellEmpty}`}
                    />
                  );
                }
                
                // Use the calculated maxForColor for consistent color scaling
                const color = getColorIntensity(day.count, maxForColor);
                const tooltipText = isSingleChild
                  ? `${day.date}: Severity ${Math.round(day.count)}/10`
                  : `${day.date}: ${Math.round(day.count)} ${Math.round(day.count) === 1 ? 'child' : 'children'} sick`;
                
                return (
                  <div
                    key={day.date}
                    className={styles.cell}
                    style={{ backgroundColor: color }}
                    title={tooltipText}
                    onClick={() => handleDayClick(day.date)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* Legend - Always show with percentage-based colors (0%, 25%, 50%, 75%, 100%) */}
      <div className={styles.legend}>
        <span className={styles.legendLabel}>Less</span>
        <div className={styles.legendColors}>
          {[0, 1, 2, 3, 4].map((level) => {
            // Calculate percentage: 0% (level 0), 25% (level 1), 50% (level 2), 75% (level 3), 100% (level 4)
            const percentage = level / 4;
            const mockCount = percentage * maxForColor;
            const color = getColorIntensity(mockCount, maxForColor);
            return (
              <div
                key={level}
                className={styles.legendCell}
                style={{ backgroundColor: color }}
              />
            );
          })}
        </div>
        <span className={styles.legendLabel}>More</span>
      </div>
    </div>
  );
}

export default Heatmap;
