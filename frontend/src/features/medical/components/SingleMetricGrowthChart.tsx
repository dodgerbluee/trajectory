/**
 * Single Metric Growth Chart Component
 * Displays one growth metric (Weight, Height, Head Circ, or BMI) over age
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { GrowthDataPoint } from '@shared/types/api';
import growthStyles from './GrowthChartTab.module.css';

interface SingleMetricGrowthChartProps {
  data: GrowthDataPoint[];
  metric: 'weight' | 'height' | 'head_circumference' | 'bmi';
  mode: 'value' | 'percentile';
  isMultiChild: boolean;
  filterChildId?: number;
}

function SingleMetricGrowthChart({
  data,
  metric,
  mode,
  isMultiChild,
  filterChildId,
}: SingleMetricGrowthChartProps) {
  // Filter data by child_id if a single child is selected
  const filteredData = filterChildId 
    ? data.filter(d => d.child_id === filterChildId)
    : data;

  if (filteredData.length === 0) {
    return (
      <div className={growthStyles.chartEmpty}>
        <p>No {metric} data available.</p>
        <p className={growthStyles.chartEmptySubtitle}>Add wellness visits with {metric} measurements to see growth trends.</p>
      </div>
    );
  }

  // Deduplicate by visit_id and child_id + age_months
  const uniqueData = filteredData.reduce((acc, point) => {
    const existing = acc.find(p => p.visit_id === point.visit_id);
    if (!existing) {
      acc.push(point);
    }
    return acc;
  }, [] as GrowthDataPoint[]);

  // For each child, if they have multiple visits at the same age_months, keep only the most recent one
  const childAgeMap = new Map<string, GrowthDataPoint>();
  uniqueData.forEach(point => {
    const key = `${point.child_id}_${point.age_months}`;
    const existing = childAgeMap.get(key);
    if (!existing || new Date(point.visit_date) > new Date(existing.visit_date)) {
      childAgeMap.set(key, point);
    }
  });
  const deduplicatedData = Array.from(childAgeMap.values());
  const sortedData = deduplicatedData.sort((a, b) => a.age_months - b.age_months);


  // Color palette for multi-child
  const childColors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
  ];

  // Metric configuration
  const metricConfig = {
    weight: {
      label: 'Weight',
      unit: 'lbs',
      color: '#3b82f6',
      valueKey: 'weight_value',
      percentileKey: 'weight_percentile',
      yAxisLabel: 'Weight (lbs)',
      yAxisLabelPercentile: 'Weight Percentile',
      formatValue: (val: number) => val.toFixed(1),
      formatPercentile: (val: number) => val.toFixed(1),
    },
    height: {
      label: 'Height',
      unit: 'in',
      color: '#10b981',
      valueKey: 'height_value',
      percentileKey: 'height_percentile',
      yAxisLabel: 'Height (inches)',
      yAxisLabelPercentile: 'Height Percentile',
      formatValue: (val: number) => val.toFixed(1),
      formatPercentile: (val: number) => val.toFixed(1),
    },
    head_circumference: {
      label: 'Head Circumference',
      unit: 'in',
      color: '#f59e0b',
      valueKey: 'head_circumference_value',
      percentileKey: 'head_circumference_percentile',
      yAxisLabel: 'Head Circumference (inches)',
      yAxisLabelPercentile: 'Head Circumference Percentile',
      formatValue: (val: number) => val.toFixed(2),
      formatPercentile: (val: number) => val.toFixed(1),
    },
    bmi: {
      label: 'BMI',
      unit: '',
      color: '#ef4444',
      valueKey: 'bmi_value',
      percentileKey: 'bmi_percentile',
      yAxisLabel: 'BMI',
      yAxisLabelPercentile: 'BMI Percentile',
      formatValue: (val: number) => val.toFixed(1),
      formatPercentile: (val: number) => val.toFixed(1),
    },
  };

  const config = metricConfig[metric];
  const dataKey = mode === 'value' ? config.valueKey : config.percentileKey;
  
  // Filter out null values for the selected mode and ensure values are valid numbers
  const dataWithValues = sortedData.filter(point => {
    if (mode === 'value') {
      const rawValue = point[config.valueKey as keyof GrowthDataPoint];
      if (rawValue === null || rawValue === undefined) return false;
      // Ensure it's a valid number
      const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
      if (isNaN(numValue) || !isFinite(numValue)) return false;
      
      // Special validation for BMI: filter out unreasonable values
      if (metric === 'bmi') {
        // BMI for children should typically be between 10-30, but allow 5-50 as reasonable range
        if (numValue < 5 || numValue > 50) return false;
      }
      
      return true;
    } else {
      const rawValue = point[config.percentileKey as keyof GrowthDataPoint];
      if (rawValue === null || rawValue === undefined) return false;
      // Ensure it's a valid number
      const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
      return !isNaN(numValue) && isFinite(numValue);
    }
  });
  
  if (dataWithValues.length === 0) {
    return (
      <div className={growthStyles.chartEmpty}>
        <p>No {metric} {mode} data available.</p>
        <p className={growthStyles.chartEmptySubtitle}>Add wellness visits with {metric} {mode === 'percentile' ? 'percentile' : ''} measurements to see growth trends.</p>
      </div>
    );
  }
  
  // Get unique children for multi-child view (from dataWithValues, not sortedData)
  const uniqueChildren = isMultiChild
    ? Array.from(new Set(dataWithValues.map(d => d.child_id)))
        .map(id => {
          const point = dataWithValues.find(d => d.child_id === id);
          return point ? { id, name: point.child_name } : null;
        })
        .filter((c): c is { id: number; name: string } => c !== null)
    : [];

  // Transform data for multi-child view
  const transformedChartData = isMultiChild
    ? (() => {
        // Group data by age_months
        const groupedByAge = new Map<number, GrowthDataPoint[]>();
        dataWithValues.forEach(point => {
          const age = point.age_months;
          if (!groupedByAge.has(age)) {
            groupedByAge.set(age, []);
          }
          groupedByAge.get(age)!.push(point);
        });

        // Create one row per age_months with all children's data
        return Array.from(groupedByAge.entries())
          .sort(([ageA], [ageB]) => ageA - ageB)
          .map(([ageMonths, points]) => {
            const transformed: any = {
              age_months: ageMonths,
            };

            // For each child, find their data point at this age and populate the keys
            uniqueChildren.forEach(child => {
              const childPoint = points.find(p => p.child_id === child.id);
              const rawValue = childPoint?.[dataKey as keyof GrowthDataPoint];
              // Ensure value is a number, not a string
              let value: number | null = null;
              if (rawValue !== null && rawValue !== undefined) {
                const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
                if (!isNaN(numValue) && isFinite(numValue)) {
                  // Special validation for BMI: filter out unreasonable values
                  if (metric === 'bmi') {
                    if (numValue >= 5 && numValue <= 50) {
                      value = numValue;
                    } else {
                      value = null; // Invalid BMI value
                    }
                  } else {
                    value = numValue;
                  }
                }
              }
              transformed[`${dataKey}_${child.id}`] = value;
            });

            return transformed;
          });
      })()
    : dataWithValues;

  // Calculate Y-axis domain
  const yAxisValues: number[] = [];
  if (isMultiChild) {
    uniqueChildren.forEach(child => {
      transformedChartData.forEach((point: any) => {
        const rawValue = point[`${dataKey}_${child.id}`];
        if (rawValue !== null && rawValue !== undefined) {
          const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
          if (!isNaN(numValue) && isFinite(numValue)) {
            // Special validation for BMI: filter out unreasonable values
            if (metric === 'bmi') {
              if (numValue >= 5 && numValue <= 50) {
                yAxisValues.push(numValue);
              }
            } else {
              yAxisValues.push(numValue);
            }
          }
        }
      });
    });
  } else {
    transformedChartData.forEach((point: any) => {
      const rawValue = point[dataKey];
      if (rawValue !== null && rawValue !== undefined) {
        const numValue = typeof rawValue === 'number' ? rawValue : parseFloat(String(rawValue));
        if (!isNaN(numValue) && isFinite(numValue)) {
          // Special validation for BMI: filter out unreasonable values
          if (metric === 'bmi') {
            if (numValue >= 5 && numValue <= 50) {
              yAxisValues.push(numValue);
            }
          } else {
            yAxisValues.push(numValue);
          }
        }
      }
    });
  }
  
  // For percentiles, always use 0-100 range
  let yMin: number, yMax: number, yPadding: number;
  if (mode === 'percentile') {
    yMin = 0;
    yMax = 100;
    yPadding = 5; // 5% padding
  } else {
    if (yAxisValues.length > 0) {
      yMin = Math.min(...yAxisValues);
      yMax = Math.max(...yAxisValues);
      // For BMI, ensure reasonable bounds even if all values are filtered out
      if (metric === 'bmi') {
        if (yMin < 5) yMin = 5;
        if (yMax > 50) yMax = 50;
        // If no valid values, use default range
        if (yAxisValues.length === 0 || yMin > yMax) {
          yMin = 10;
          yMax = 30;
        }
      }
    } else {
      // Default values if no data
      if (metric === 'bmi') {
        yMin = 10;
        yMax = 30;
      } else {
        yMin = 0;
        yMax = 100;
      }
    }
    yPadding = yMax > yMin ? (yMax - yMin) * 0.1 : yMax * 0.1;
  }

  // Format age label
  const formatAgeLabel = (ageMonths: number) => {
    if (ageMonths < 12) {
      return `${ageMonths}m`;
    }
    const years = Math.floor(ageMonths / 12);
    const months = ageMonths % 12;
    if (months === 0) {
      return `${years}y`;
    }
    return `${years}y ${months}m`;
  };

  // Format tooltip
  const formatTooltip = (value: any) => {
    const numValue = typeof value === 'number' ? value : (value === null || value === undefined ? null : parseFloat(String(value)));
    if (numValue === null || numValue === undefined || isNaN(numValue)) {
      return 'N/A';
    }
    if (mode === 'percentile') {
      return `${config.formatPercentile(numValue)}th percentile`;
    }
    return `${config.formatValue(numValue)} ${config.unit}`;
  };
  
  const yAxisLabel = mode === 'percentile' ? config.yAxisLabelPercentile : config.yAxisLabel;

  return (
    <div className={growthStyles.container}>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart 
          data={transformedChartData} 
          margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="age_months"
            label={{ value: 'Age (months)', position: 'insideBottom', offset: -5 }}
            tickFormatter={formatAgeLabel}
            stroke="var(--color-text-secondary)"
            style={{ fontSize: '0.875rem' }}
          />
          <YAxis
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
            stroke="var(--color-text-secondary)"
            style={{ fontSize: '0.875rem' }}
            domain={mode === 'percentile' ? [0, 100] : [Math.max(0, yMin - yPadding), yMax + yPadding]}
            allowDataOverflow={false}
            tickFormatter={(value: number) => {
              // For BMI, ensure we only show reasonable values
              if (metric === 'bmi' && (value < 5 || value > 50 || !isFinite(value) || isNaN(value))) {
                return '';
              }
              if (mode === 'percentile') {
                return `${value.toFixed(0)}`;
              }
              return config.formatValue(value);
            }}
          />
          <Tooltip
            formatter={(value: any) => formatTooltip(value)}
            labelFormatter={(ageMonths) => {
              const point = transformedChartData.find((d: any) => d.age_months === ageMonths);
              if (!point) return `Age: ${formatAgeLabel(ageMonths)}`;
              
              if (isMultiChild) {
                return (
                  <div>
                    <div>Age: {formatAgeLabel(ageMonths)}</div>
                  </div>
                );
              }
              
              return (
                <div>
                  <div>Age: {formatAgeLabel(ageMonths)}</div>
                  {point.visit_date && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{point.visit_date}</div>}
                </div>
              );
            }}
            contentStyle={{
              backgroundColor: 'var(--color-background-card)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          
          {/* Lines */}
          {isMultiChild ? (
            uniqueChildren.map((child, idx) => {
              const childDataKey = `${dataKey}_${child.id}`;
              return (
                <Line
                  key={`${metric}-${mode}-${child.id}`}
                  type="monotone"
                  dataKey={childDataKey}
                  stroke={childColors[idx % childColors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name={child.name}
                  connectNulls={true}
                />
              );
            })
          ) : (
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={config.color}
              strokeWidth={2}
              dot={{ r: 4 }}
              name={`${config.label}${mode === 'percentile' ? ' Percentile' : ''}`}
              connectNulls={true}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default SingleMetricGrowthChart;
