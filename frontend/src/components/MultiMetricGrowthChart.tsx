/**
 * Multi-Metric Growth Chart Component
 * Displays Weight, Height, Head Circumference, and BMI over age
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
import type { GrowthDataPoint } from '../types/api';

interface MultiMetricGrowthChartProps {
  data: GrowthDataPoint[];
  showWeight: boolean;
  showHeight: boolean;
  showHeadCirc: boolean;
  showBMI: boolean;
  isMultiChild: boolean;
  filterChildId?: number; // Add this to properly filter data
}

function MultiMetricGrowthChart({
  data,
  showWeight,
  showHeight,
  showHeadCirc,
  showBMI,
  isMultiChild,
  filterChildId,
}: MultiMetricGrowthChartProps) {
  // Filter data by child_id if a single child is selected
  const filteredData = filterChildId 
    ? data.filter(d => d.child_id === filterChildId)
    : data;

  if (filteredData.length === 0) {
    return (
      <div className="chart-empty">
        <p>No growth data available.</p>
        <p className="chart-empty-subtitle">Add wellness visits with measurements to see growth trends.</p>
      </div>
    );
  }

  // Format tooltip
  const formatTooltip = (value: any, name: string) => {
    // Convert to number if it's a string or handle null/undefined
    const numValue = typeof value === 'number' ? value : (value === null || value === undefined ? null : parseFloat(String(value)));
    
    if (numValue === null || numValue === undefined || isNaN(numValue)) {
      return ['N/A', name];
    }
    
    let formattedValue: string;
    let unit: string;
    
    switch (name) {
      case 'Weight':
        formattedValue = numValue.toFixed(1);
        unit = 'lbs';
        break;
      case 'Height':
        formattedValue = numValue.toFixed(1);
        unit = 'in';
        break;
      case 'Head Circumference':
        formattedValue = numValue.toFixed(2);
        unit = 'in';
        break;
      case 'BMI':
        formattedValue = numValue.toFixed(1);
        unit = '';
        break;
      default:
        formattedValue = numValue.toFixed(1);
        unit = '';
    }
    
    return [`${formattedValue} ${unit}`, name];
  };

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

  // Prepare chart data - for multi-child, we need to create separate data series per child
  // Also deduplicate by visit_id to prevent duplicate points
  const uniqueData = filteredData.reduce((acc, point) => {
    const existing = acc.find(p => p.visit_id === point.visit_id);
    if (!existing) {
      acc.push(point);
    }
    return acc;
  }, [] as GrowthDataPoint[]);
  
  const chartData = uniqueData.sort((a, b) => a.age_months - b.age_months);

  // Get unique children for multi-child view
  const uniqueChildren = isMultiChild
    ? Array.from(new Set(chartData.map(d => d.child_id)))
        .map(id => {
          const point = chartData.find(d => d.child_id === id);
          return point ? { id, name: point.child_name } : null;
        })
        .filter((c): c is { id: number; name: string } => c !== null)
    : [];

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

  // Transform data for multi-child view - group by age_months and create separate data keys per child
  const transformedChartData = isMultiChild
    ? (() => {
        // First, for each child, if they have multiple visits at the same age_months, keep only the most recent one
        const childAgeMap = new Map<string, GrowthDataPoint>();
        chartData.forEach(point => {
          const key = `${point.child_id}_${point.age_months}`;
          const existing = childAgeMap.get(key);
          if (!existing || new Date(point.visit_date) > new Date(existing.visit_date)) {
            childAgeMap.set(key, point);
          }
        });
        const deduplicatedData = Array.from(childAgeMap.values());

        // Group data by age_months
        const groupedByAge = new Map<number, GrowthDataPoint[]>();
        deduplicatedData.forEach(point => {
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
              transformed[`weight_${child.id}`] = childPoint?.weight_value ?? null;
              transformed[`height_${child.id}`] = childPoint?.height_value ?? null;
              transformed[`head_${child.id}`] = childPoint?.head_circumference_value ?? null;
              transformed[`bmi_${child.id}`] = childPoint?.bmi_value ?? null;
            });

            return transformed;
          });
      })()
    : chartData;

  // Calculate min/max for left axis (Weight and Height) from transformed data
  const leftAxisValues: number[] = [];
  if (showWeight) {
    if (isMultiChild) {
      uniqueChildren.forEach(child => {
        transformedChartData.forEach((point: any) => {
          const value = point[`weight_${child.id}`];
          if (value !== null && value !== undefined && !isNaN(value)) {
            leftAxisValues.push(value);
          }
        });
      });
    } else {
      transformedChartData.forEach((point: any) => {
        if (point.weight_value !== null && point.weight_value !== undefined && !isNaN(point.weight_value)) {
          leftAxisValues.push(point.weight_value);
        }
      });
    }
  }
  if (showHeight) {
    if (isMultiChild) {
      uniqueChildren.forEach(child => {
        transformedChartData.forEach((point: any) => {
          const value = point[`height_${child.id}`];
          if (value !== null && value !== undefined && !isNaN(value)) {
            leftAxisValues.push(value);
          }
        });
      });
    } else {
      transformedChartData.forEach((point: any) => {
        if (point.height_value !== null && point.height_value !== undefined && !isNaN(point.height_value)) {
          leftAxisValues.push(point.height_value);
        }
      });
    }
  }
  const leftMin = leftAxisValues.length > 0 ? Math.min(...leftAxisValues) : 0;
  const leftMax = leftAxisValues.length > 0 ? Math.max(...leftAxisValues) : 100;
  const leftPadding = leftMax > leftMin ? (leftMax - leftMin) * 0.1 : leftMax * 0.1; // 10% padding

  // Calculate min/max for right axis (Head Circ and BMI) from transformed data
  const rightAxisValues: number[] = [];
  if (showHeadCirc) {
    if (isMultiChild) {
      uniqueChildren.forEach(child => {
        transformedChartData.forEach((point: any) => {
          const value = point[`head_${child.id}`];
          if (value !== null && value !== undefined && !isNaN(value)) {
            rightAxisValues.push(value);
          }
        });
      });
    } else {
      transformedChartData.forEach((point: any) => {
        if (point.head_circumference_value !== null && point.head_circumference_value !== undefined && !isNaN(point.head_circumference_value)) {
          rightAxisValues.push(point.head_circumference_value);
        }
      });
    }
  }
  if (showBMI) {
    if (isMultiChild) {
      uniqueChildren.forEach(child => {
        transformedChartData.forEach((point: any) => {
          const value = point[`bmi_${child.id}`];
          if (value !== null && value !== undefined && !isNaN(value)) {
            rightAxisValues.push(value);
          }
        });
      });
    } else {
      transformedChartData.forEach((point: any) => {
        if (point.bmi_value !== null && point.bmi_value !== undefined && !isNaN(point.bmi_value)) {
          rightAxisValues.push(point.bmi_value);
        }
      });
    }
  }
  const rightMin = rightAxisValues.length > 0 ? Math.max(0, Math.min(...rightAxisValues)) : 0;
  const rightMax = rightAxisValues.length > 0 ? Math.max(...rightAxisValues) : 100;
  const rightPadding = rightMax > rightMin ? (rightMax - rightMin) * 0.1 : rightMax * 0.1; // 10% padding

  return (
    <div className="growth-chart-container">
      <ResponsiveContainer width="100%" height={500}>
        <LineChart data={transformedChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="age_months"
            label={{ value: 'Age (months)', position: 'insideBottom', offset: -5 }}
            tickFormatter={formatAgeLabel}
            stroke="var(--color-text-secondary)"
            style={{ fontSize: '0.875rem' }}
          />
          <YAxis
            yAxisId="left"
            label={{ value: 'Weight (lbs) / Height (in)', angle: -90, position: 'insideLeft' }}
            stroke="var(--color-text-secondary)"
            style={{ fontSize: '0.875rem' }}
            domain={[Math.max(0, leftMin - leftPadding), leftMax + leftPadding]}
            allowDataOverflow={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            label={{ value: 'Head Circ (in) / BMI', angle: 90, position: 'insideRight' }}
            stroke="var(--color-text-secondary)"
            style={{ fontSize: '0.875rem' }}
            domain={[rightMin - rightPadding, rightMax + rightPadding]}
            allowDataOverflow={false}
          />
          <Tooltip
            formatter={(value: any, name: string) => {
              // For multi-child, extract child info from dataKey
              if (isMultiChild && typeof name === 'string') {
                const match = name.match(/^(Weight|Height|Head Circ|BMI) - (.+)$/);
                if (match) {
                  return formatTooltip(value, match[1]);
                }
              }
              return formatTooltip(value, name);
            }}
            labelFormatter={(ageMonths, payload: any[]) => {
              if (!payload || payload.length === 0) {
                return `Age: ${formatAgeLabel(ageMonths)}`;
              }
              
              // For multi-child, show all children who have data at this age
              if (isMultiChild) {
                const point = transformedChartData.find((d: any) => d.age_months === ageMonths);
                if (!point) return `Age: ${formatAgeLabel(ageMonths)}`;
                
                // Get unique children from payload (which children have data at this point)
                const childrenWithData = new Set<string>();
                payload.forEach((item: any) => {
                  if (item.dataKey && typeof item.dataKey === 'string') {
                    const match = item.dataKey.match(/^(weight|height|head|bmi)_(\d+)$/);
                    if (match && item.value !== null && item.value !== undefined) {
                      const childId = parseInt(match[2]);
                      const child = uniqueChildren.find(c => c.id === childId);
                      if (child) {
                        childrenWithData.add(child.name);
                      }
                    }
                  }
                });
                
                return (
                  <div>
                    <div>Age: {formatAgeLabel(ageMonths)}</div>
                    {Array.from(childrenWithData).length > 0 && (
                      <div style={{ fontWeight: 'bold', marginTop: '4px' }}>
                        {Array.from(childrenWithData).join(', ')}
                      </div>
                    )}
                  </div>
                );
              }
              
              // Single child view
              const point = transformedChartData.find((d: any) => d.age_months === ageMonths);
              if (!point) return `Age: ${formatAgeLabel(ageMonths)}`;
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
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
          />
          
          {/* Weight lines */}
          {showWeight && (isMultiChild ? (
            uniqueChildren.map((child, idx) => {
              const dataKey = `weight_${child.id}`;
              return (
                <Line
                  key={`weight-${child.id}`}
                  yAxisId="left"
                  type="monotone"
                  dataKey={dataKey}
                  stroke={childColors[idx % childColors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  name={`Weight - ${child.name}`}
                  connectNulls={true}
                />
              );
            })
          ) : (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="weight_value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Weight"
              connectNulls={false}
            />
          ))}
          
          {/* Height lines */}
          {showHeight && (isMultiChild ? (
            uniqueChildren.map((child, idx) => {
              const dataKey = `height_${child.id}`;
              return (
                <Line
                  key={`height-${child.id}`}
                  yAxisId="left"
                  type="monotone"
                  dataKey={dataKey}
                  stroke={childColors[idx % childColors.length]}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 4 }}
                  name={`Height - ${child.name}`}
                  connectNulls={true}
                />
              );
            })
          ) : (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="height_value"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 4 }}
              name="Height"
              connectNulls={false}
            />
          ))}
          
          {/* Head Circumference lines */}
          {showHeadCirc && (isMultiChild ? (
            uniqueChildren.map((child, idx) => {
              const dataKey = `head_${child.id}`;
              return (
                <Line
                  key={`head-${child.id}`}
                  yAxisId="right"
                  type="monotone"
                  dataKey={dataKey}
                  stroke={childColors[idx % childColors.length]}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  dot={{ r: 4 }}
                  name={`Head Circ - ${child.name}`}
                  connectNulls={true}
                />
              );
            })
          ) : (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="head_circumference_value"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={{ r: 4 }}
              name="Head Circumference"
              connectNulls={false}
            />
          ))}
          
          {/* BMI lines */}
          {showBMI && (isMultiChild ? (
            uniqueChildren.map((child, idx) => {
              const dataKey = `bmi_${child.id}`;
              return (
                <Line
                  key={`bmi-${child.id}`}
                  yAxisId="right"
                  type="monotone"
                  dataKey={dataKey}
                  stroke={childColors[idx % childColors.length]}
                  strokeWidth={2}
                  strokeDasharray="10 5"
                  dot={{ r: 4 }}
                  name={`BMI - ${child.name}`}
                  connectNulls={true}
                />
              );
            })
          ) : (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="bmi_value"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="10 5"
              dot={{ r: 4 }}
              name="BMI"
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MultiMetricGrowthChart;
