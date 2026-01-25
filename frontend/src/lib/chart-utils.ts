/**
 * Chart data transformation utilities
 */

import type { Measurement, MedicalEvent, Visit } from '../types/api';
import { format, parseISO, differenceInMonths } from 'date-fns';

export interface ChartDataPoint {
  date: string;
  dateLabel: string;
  value: number | null;
  percentile: number | null;
  ageMonths?: number;
}

export interface CombinedPercentileDataPoint {
  date: string;
  dateLabel: string;
  weightPercentile: number | null;
  heightPercentile: number | null;
  headPercentile: number | null;
}

export interface VelocityDataPoint {
  date: string;
  dateLabel: string;
  velocity: number;
  days: number;
}

export interface EventMarker {
  date: string;
  type: 'doctor_visit' | 'illness';
  label: string;
  endDate?: string;
}

/**
 * Transform measurements to chart data for a specific metric
 */
export function transformMeasurementsToChartData(
  measurements: Measurement[],
  metric: 'weight' | 'height' | 'head_circumference',
  dateOfBirth?: string
): ChartDataPoint[] {
  const valueKey = `${metric}_value` as keyof Measurement;
  const percentileKey = `${metric}_percentile` as keyof Measurement;

  const filtered = measurements.filter((m) => m[valueKey] !== null);
  const sorted = [...filtered].sort((a, b) => 
    new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
  );

  return sorted.map((m) => {
    const dataPoint: ChartDataPoint = {
      date: m.measurement_date,
      dateLabel: formatDateForChart(m.measurement_date),
      value: m[valueKey] as number | null,
      percentile: m[percentileKey] as number | null,
    };

    if (dateOfBirth) {
      dataPoint.ageMonths = calculateAgeInMonths(dateOfBirth, m.measurement_date);
    }

    return dataPoint;
  });
}

/**
 * Transform visits (wellness visits with measurements) to chart data for a specific metric
 */
export function transformVisitsToChartData(
  visits: Visit[],
  metric: 'weight' | 'height' | 'head_circumference',
  dateOfBirth?: string
): ChartDataPoint[] {
  const valueKey = `${metric}_value` as keyof Visit;
  const percentileKey = `${metric}_percentile` as keyof Visit;

  // Only use wellness visits that have measurements
  const filtered = visits.filter((v) => 
    v.visit_type === 'wellness' && v[valueKey] !== null
  );
  const sorted = [...filtered].sort((a, b) => 
    new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()
  );

  return sorted.map((v) => {
    const dataPoint: ChartDataPoint = {
      date: v.visit_date,
      dateLabel: formatDateForChart(v.visit_date),
      value: v[valueKey] as number | null,
      percentile: v[percentileKey] as number | null,
    };

    if (dateOfBirth) {
      dataPoint.ageMonths = calculateAgeInMonths(dateOfBirth, v.visit_date);
    }

    return dataPoint;
  });
}

/**
 * Transform to percentile-only data
 */
export function transformToPercentileData(
  measurements: Measurement[],
  metric: 'weight' | 'height' | 'head_circumference'
): ChartDataPoint[] {
  const percentileKey = `${metric}_percentile` as keyof Measurement;
  
  const filtered = measurements.filter((m) => m[percentileKey] !== null);
  const sorted = [...filtered].sort((a, b) => 
    new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
  );

  return sorted.map((m) => ({
    date: m.measurement_date,
    dateLabel: formatDateForChart(m.measurement_date),
    value: m[percentileKey] as number,
    percentile: m[percentileKey] as number,
  }));
}

/**
 * Transform visits to percentile-only data
 */
export function transformVisitsToPercentileData(
  visits: Visit[],
  metric: 'weight' | 'height' | 'head_circumference'
): ChartDataPoint[] {
  const percentileKey = `${metric}_percentile` as keyof Visit;
  
  const filtered = visits.filter((v) => 
    v.visit_type === 'wellness' && v[percentileKey] !== null
  );
  const sorted = [...filtered].sort((a, b) => 
    new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()
  );

  return sorted.map((v) => ({
    date: v.visit_date,
    dateLabel: formatDateForChart(v.visit_date),
    value: v[percentileKey] as number,
    percentile: v[percentileKey] as number,
  }));
}

/**
 * Transform to combined percentile data
 */
export function transformToCombinedPercentileData(
  measurements: Measurement[]
): CombinedPercentileDataPoint[] {
  const sorted = [...measurements].sort((a, b) => 
    new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime()
  );

  return sorted.map((m) => ({
    date: m.measurement_date,
    dateLabel: formatDateForChart(m.measurement_date),
    weightPercentile: m.weight_percentile,
    heightPercentile: m.height_percentile,
    headPercentile: m.head_circumference_percentile,
  }));
}

/**
 * Transform visits to combined percentile data
 */
export function transformVisitsToCombinedPercentileData(
  visits: Visit[]
): CombinedPercentileDataPoint[] {
  const filtered = visits.filter((v) => v.visit_type === 'wellness');
  const sorted = [...filtered].sort((a, b) => 
    new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()
  );

  return sorted.map((v) => ({
    date: v.visit_date,
    dateLabel: formatDateForChart(v.visit_date),
    weightPercentile: v.weight_percentile,
    heightPercentile: v.height_percentile,
    headPercentile: v.head_circumference_percentile,
  }));
}

/**
 * Calculate growth velocity (weight change per month)
 */
export function calculateGrowthVelocity(measurements: Measurement[]): VelocityDataPoint[] {
  const weightMeasurements = measurements
    .filter((m) => m.weight_value !== null)
    .sort((a, b) => new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime());

  if (weightMeasurements.length < 2) {
    return [];
  }

  const velocities: VelocityDataPoint[] = [];

  for (let i = 1; i < weightMeasurements.length; i++) {
    const prev = weightMeasurements[i - 1];
    const curr = weightMeasurements[i];

    const prevWeight = prev.weight_value!;
    const currWeight = curr.weight_value!;
    const weightChange = currWeight - prevWeight;

    const prevDate = new Date(prev.measurement_date);
    const currDate = new Date(curr.measurement_date);
    const daysBetween = Math.max(1, Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Convert to change per month (30 days)
    const velocityPerMonth = (weightChange / daysBetween) * 30;

    velocities.push({
      date: curr.measurement_date,
      dateLabel: formatDateForChart(curr.measurement_date),
      velocity: Math.round(velocityPerMonth * 10) / 10,
      days: daysBetween,
    });
  }

  return velocities;
}

/**
 * Calculate growth velocity from visits
 */
export function calculateGrowthVelocityFromVisits(visits: Visit[]): VelocityDataPoint[] {
  const weightVisits = visits
    .filter((v) => v.visit_type === 'wellness' && v.weight_value !== null)
    .sort((a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime());

  if (weightVisits.length < 2) {
    return [];
  }

  const velocities: VelocityDataPoint[] = [];

  for (let i = 1; i < weightVisits.length; i++) {
    const prev = weightVisits[i - 1];
    const curr = weightVisits[i];

    const prevWeight = prev.weight_value!;
    const currWeight = curr.weight_value!;
    const weightChange = currWeight - prevWeight;

    const prevDate = new Date(prev.visit_date);
    const currDate = new Date(curr.visit_date);
    const daysBetween = Math.max(1, Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Convert to change per month (30 days)
    const velocityPerMonth = (weightChange / daysBetween) * 30;

    velocities.push({
      date: curr.visit_date,
      dateLabel: formatDateForChart(curr.visit_date),
      velocity: Math.round(velocityPerMonth * 10) / 10,
      days: daysBetween,
    });
  }

  return velocities;
}

/**
 * Transform medical events to markers
 */
export function transformEventsToMarkers(events: MedicalEvent[]): EventMarker[] {
  return events.map((e) => ({
    date: e.start_date,
    type: e.event_type,
    label: e.event_type === 'doctor_visit' ? 'Visit' : 'Illness',
    endDate: e.end_date || undefined,
  }));
}

/**
 * Transform visits to event markers
 */
export function transformVisitsToMarkers(visits: Visit[]): EventMarker[] {
  return visits.map((v) => {
    if (v.visit_type === 'wellness') {
      return {
        date: v.visit_date,
        type: 'doctor_visit' as const,
        label: 'Wellness Visit',
      };
    } else {
      return {
        date: v.visit_date,
        type: 'illness' as const,
        label: v.illness_type ? v.illness_type.replace('_', ' ') : 'Illness',
        endDate: v.end_date || undefined,
      };
    }
  });
}

/**
 * Calculate age in months from date of birth
 */
export function calculateAgeInMonths(dateOfBirth: string, measurementDate: string): number {
  return differenceInMonths(parseISO(measurementDate), parseISO(dateOfBirth));
}

/**
 * Format date for chart display
 */
export function formatDateForChart(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy');
  } catch {
    return dateString;
  }
}

/**
 * Get metric display info
 */
export function getMetricInfo(metric: 'weight' | 'height' | 'head_circumference') {
  const info = {
    weight: {
      label: 'Weight',
      unit: 'lbs',
      icon: '⚖️',
      color: '#3b82f6',
      percentileColor: '#93c5fd',
    },
    height: {
      label: 'Height',
      unit: 'in',
      icon: '📏',
      color: '#10b981',
      percentileColor: '#6ee7b7',
    },
    head_circumference: {
      label: 'Head Circumference',
      unit: 'in',
      icon: '⭕',
      color: '#f59e0b',
      percentileColor: '#fcd34d',
    },
  };

  return info[metric];
}

/**
 * Calculate Y-axis domain with padding
 */
export function calculateYDomain(data: ChartDataPoint[]): [number, number] {
  const values = data
    .map((d) => d.value)
    .filter((v): v is number => v !== null);

  if (values.length === 0) {
    return [0, 100];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const padding = range * 0.1 || 1;

  return [Math.floor(min - padding), Math.ceil(max + padding)];
}

/**
 * Calculate percentile Y-axis domain
 */
export function calculatePercentileDomain(): [number, number] {
  return [0, 100];
}

/**
 * Get latest measurement for each metric
 */
export function getLatestMeasurements(measurements: Measurement[]) {
  if (measurements.length === 0) {
    return null;
  }

  const sorted = [...measurements].sort((a, b) => 
    new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime()
  );

  const latest = sorted[0];
  const previous = sorted[1];

  return {
    latest,
    previous,
    weight: {
      value: latest.weight_value,
      percentile: latest.weight_percentile,
      change: previous?.weight_value ? latest.weight_value! - previous.weight_value : null,
    },
    height: {
      value: latest.height_value,
      percentile: latest.height_percentile,
      change: previous?.height_value ? latest.height_value! - previous.height_value : null,
    },
    headCircumference: {
      value: latest.head_circumference_value,
      percentile: latest.head_circumference_percentile,
      change: previous?.head_circumference_value ? latest.head_circumference_value! - previous.head_circumference_value : null,
    },
  };
}

/**
 * Get latest measurements from visits
 */
export function getLatestMeasurementsFromVisits(visits: Visit[]) {
  const wellnessVisits = visits.filter((v) => v.visit_type === 'wellness');
  
  if (wellnessVisits.length === 0) {
    return null;
  }

  const sorted = [...wellnessVisits].sort((a, b) => 
    new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
  );

  const latest = sorted[0];
  const previous = sorted[1];

  return {
    latest,
    previous,
    weight: {
      value: latest.weight_value,
      percentile: latest.weight_percentile,
      change: previous?.weight_value ? latest.weight_value! - previous.weight_value : null,
    },
    height: {
      value: latest.height_value,
      percentile: latest.height_percentile,
      change: previous?.height_value ? latest.height_value! - previous.height_value : null,
    },
    headCircumference: {
      value: latest.head_circumference_value,
      percentile: latest.head_circumference_percentile,
      change: previous?.head_circumference_value ? latest.head_circumference_value! - previous.head_circumference_value : null,
    },
  };
}
