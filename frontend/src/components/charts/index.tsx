/**
 * Growth and medical event chart components
 */

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import type {
  ChartDataPoint,
  CombinedPercentileDataPoint,
  VelocityDataPoint,
  EventMarker,
} from '../../lib/chart-utils';
import { getMetricInfo } from '../../lib/chart-utils';
import { formatDate } from '../../lib/date-utils';

interface ChartContainerProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

function ChartContainer({ title, description, children }: ChartContainerProps) {
  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>{title}</h3>
        <p className="chart-description">{description}</p>
      </div>
      <div className="chart-body">
        {children}
      </div>
    </div>
  );
}

// 1-3: Single Metric Value Charts
interface MetricValueChartProps {
  data: ChartDataPoint[];
  metric: 'weight' | 'height' | 'head_circumference';
  showDescription?: boolean;
}

export function WeightValueChart({ data, showDescription = true }: Omit<MetricValueChartProps, 'metric'>) {
  const metricInfo = getMetricInfo('weight');
  
  const content = data.length === 0 ? (
    <div className="chart-empty">No weight measurements</div>
  ) : (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="dateLabel" stroke="#64748b" style={{ fontSize: '0.875rem' }} />
        <YAxis stroke="#64748b" style={{ fontSize: '0.875rem' }} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"
          stroke={metricInfo.color}
          strokeWidth={2}
          dot={{ r: 4 }}
          name={`${metricInfo.label} (${metricInfo.unit})`}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );

  if (!showDescription) return content;

  return (
    <ChartContainer
      title={`${metricInfo.icon} Weight Over Time`}
      description="Tracks body weight over time to identify steady growth, plateaus, or drops, especially around illness periods."
    >
      {content}
    </ChartContainer>
  );
}

export function HeightValueChart({ data, showDescription = true }: Omit<MetricValueChartProps, 'metric'>) {
  const metricInfo = getMetricInfo('height');
  
  const content = data.length === 0 ? (
    <div className="chart-empty">No height measurements</div>
  ) : (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="dateLabel" stroke="#64748b" style={{ fontSize: '0.875rem' }} />
        <YAxis stroke="#64748b" style={{ fontSize: '0.875rem' }} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"
          stroke={metricInfo.color}
          strokeWidth={2}
          dot={{ r: 4 }}
          name={`${metricInfo.label} (${metricInfo.unit})`}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );

  if (!showDescription) return content;

  return (
    <ChartContainer
      title={`${metricInfo.icon} Height Over Time`}
      description="Shows linear growth over time, helping identify growth spurts or prolonged slow growth."
    >
      {content}
    </ChartContainer>
  );
}

export function HeadCircumferenceValueChart({ data, showDescription = true }: Omit<MetricValueChartProps, 'metric'>) {
  const metricInfo = getMetricInfo('head_circumference');
  
  const content = data.length === 0 ? (
    <div className="chart-empty">No head circumference measurements</div>
  ) : (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="dateLabel" stroke="#64748b" style={{ fontSize: '0.875rem' }} />
        <YAxis stroke="#64748b" style={{ fontSize: '0.875rem' }} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey="value"
          stroke={metricInfo.color}
          strokeWidth={2}
          dot={{ r: 4 }}
          name={`${metricInfo.label} (${metricInfo.unit})`}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );

  if (!showDescription) return content;

  return (
    <ChartContainer
      title={`${metricInfo.icon} Head Circumference Over Time`}
      description="Monitors head growth, particularly important during infancy and early childhood."
    >
      {content}
    </ChartContainer>
  );
}

// 4-6: Percentile Charts
export function WeightPercentileChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ChartContainer
      title="⚖️ Weight Percentile Over Time"
      description="Visualizes how weight percentile tracks over time relative to age-based norms."
    >
      {data.length === 0 ? (
        <div className="chart-empty">No weight percentile data</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dateLabel" stroke="#64748b" style={{ fontSize: '0.875rem' }} />
            <YAxis domain={[0, 100]} stroke="#64748b" style={{ fontSize: '0.875rem' }} />
            <Tooltip formatter={(value: number) => `${value}%`} />
            <Line
              type="monotone"
              dataKey="percentile"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Weight Percentile"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}

export function HeightPercentileChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ChartContainer
      title="📏 Height Percentile Over Time"
      description="Shows whether height percentile remains consistent or shifts across growth periods."
    >
      {data.length === 0 ? (
        <div className="chart-empty">No height percentile data</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dateLabel" stroke="#64748b" style={{ fontSize: '0.875rem' }} />
            <YAxis domain={[0, 100]} stroke="#64748b" style={{ fontSize: '0.875rem' }} />
            <Tooltip formatter={(value: number) => `${value}%`} />
            <Line
              type="monotone"
              dataKey="percentile"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Height Percentile"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}

export function HeadPercentileChart({ data }: { data: ChartDataPoint[] }) {
  return (
    <ChartContainer
      title="⭕ Head Circumference Percentile Over Time"
      description="Tracks head circumference percentile trends over time to identify deviations early."
    >
      {data.length === 0 ? (
        <div className="chart-empty">No head circumference percentile data</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dateLabel" stroke="#64748b" style={{ fontSize: '0.875rem' }} />
            <YAxis domain={[0, 100]} stroke="#64748b" style={{ fontSize: '0.875rem' }} />
            <Tooltip formatter={(value: number) => `${value}%`} />
            <Line
              type="monotone"
              dataKey="percentile"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Head Percentile"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}

// 7: Combined Percentile Trends
export function CombinedPercentileChart({ data }: { data: CombinedPercentileDataPoint[] }) {
  return (
    <ChartContainer
      title="📊 Combined Percentile Trends"
      description="Compares percentile trends across multiple growth metrics to quickly identify divergence."
    >
      {data.length === 0 ? (
        <div className="chart-empty">No percentile data</div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dateLabel" stroke="#64748b" style={{ fontSize: '0.875rem' }} />
            <YAxis domain={[0, 100]} stroke="#64748b" style={{ fontSize: '0.875rem' }} />
            <Tooltip formatter={(value: number) => (value !== null ? `${value}%` : 'N/A')} />
            <Legend />
            <Line
              type="monotone"
              dataKey="weightPercentile"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Weight %"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="heightPercentile"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Height %"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="headPercentile"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Head %"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}

// 8: Growth by Age (Months)
export function GrowthByAgeChart({ data, metric }: { data: ChartDataPoint[]; metric: 'weight' | 'height' | 'head_circumference' }) {
  const metricInfo = getMetricInfo(metric);
  
  return (
    <ChartContainer
      title={`${metricInfo.icon} ${metricInfo.label} by Age (Months)`}
      description="Normalizes growth data by age rather than visit date to align with pediatric milestones."
    >
      {data.length === 0 ? (
        <div className="chart-empty">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="ageMonths" 
              stroke="#64748b" 
              style={{ fontSize: '0.875rem' }}
              label={{ value: 'Age (months)', position: 'insideBottom', offset: -5 }}
            />
            <YAxis stroke="#64748b" style={{ fontSize: '0.875rem' }} />
            <Tooltip 
              labelFormatter={(ageMonths) => `${ageMonths} months old`}
              formatter={(value: number) => [`${value} ${metricInfo.unit}`, metricInfo.label]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={metricInfo.color}
              strokeWidth={2}
              dot={{ r: 4 }}
              name={metricInfo.label}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}

// 9: Growth Velocity
export function GrowthVelocityChart({ data }: { data: VelocityDataPoint[] }) {
  return (
    <ChartContainer
      title="⚡ Growth Velocity (Weight Change Rate)"
      description="Highlights the rate of weight gain or loss over time, not just absolute values."
    >
      {data.length === 0 ? (
        <div className="chart-empty">Not enough data (need at least 2 measurements)</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dateLabel" stroke="#64748b" style={{ fontSize: '0.875rem' }} />
            <YAxis stroke="#64748b" style={{ fontSize: '0.875rem' }} />
            <Tooltip 
              formatter={(value: number) => [`${value} lbs/month`, 'Velocity']}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return `${label} (over ${payload[0].payload.days} days)`;
                }
                return label;
              }}
            />
            <Bar 
              dataKey="velocity" 
              fill="#3b82f6"
              name="Weight Change (lbs/month)"
            />
            <ReferenceLine y={0} stroke="#64748b" strokeDasharray="3 3" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}

// 10: Growth with Medical Event Markers
export function GrowthWithEventsChart({
  data,
  events,
  metric,
}: {
  data: ChartDataPoint[];
  events: EventMarker[];
  metric: 'weight' | 'height' | 'head_circumference';
}) {
  const metricInfo = getMetricInfo(metric);

  // Convert events to reference lines/areas with formatted dates
  // Match event dates to chart dateLabels
  const visitMarkers = events
    .filter((e) => e.type === 'doctor_visit')
    .map((e) => {
      const matchingPoint = data.find((d) => d.date === e.date);
      return matchingPoint ? { ...e, dateLabel: matchingPoint.dateLabel } : null;
    })
    .filter((e): e is EventMarker & { dateLabel: string } => e !== null);

  const illnessRanges = events
    .filter((e) => e.type === 'illness' && e.endDate)
    .map((e) => {
      const startPoint = data.find((d) => d.date === e.date);
      const endPoint = data.find((d) => d.date === e.endDate);
      return startPoint && endPoint
        ? { ...e, startLabel: startPoint.dateLabel, endLabel: endPoint.dateLabel }
        : null;
    })
    .filter((e): e is EventMarker & { startLabel: string; endLabel: string } => e !== null);

  return (
    <ChartContainer
      title={`${metricInfo.icon} ${metricInfo.label} with Medical Events`}
      description="Correlates growth changes with doctor visits and illness episodes."
    >
      {data.length === 0 ? (
        <div className="chart-empty">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="dateLabel" stroke="#64748b" style={{ fontSize: '0.875rem' }} />
            <YAxis stroke="#64748b" style={{ fontSize: '0.875rem' }} />
            <Tooltip />
            
            {/* Illness ranges as shaded areas */}
            {illnessRanges.map((illness, idx) => (
              <ReferenceArea
                key={`illness-${idx}`}
                x1={illness.startLabel}
                x2={illness.endLabel}
                fill="#fca5a5"
                fillOpacity={0.2}
                label={{ value: 'Illness', position: 'insideTop', fill: '#dc2626', fontSize: 10 }}
              />
            ))}
            
            <Line
              type="monotone"
              dataKey="value"
              stroke={metricInfo.color}
              strokeWidth={2}
              dot={{ r: 4 }}
              name={`${metricInfo.label} (${metricInfo.unit})`}
              connectNulls
            />
            
            {/* Doctor visit markers as vertical lines */}
            {visitMarkers.map((visit, idx) => (
              <ReferenceLine
                key={`visit-${idx}`}
                x={visit.dateLabel}
                stroke="#10b981"
                strokeDasharray="3 3"
                label={{ value: '🏥', position: 'top', fontSize: 14 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}

// 11: Latest Growth Snapshot
export function LatestGrowthSnapshot({
  latestMeasurements,
}: {
  latestMeasurements: {
    latest: any;
    weight: { value: number | null; percentile: number | null; change: number | null };
    height: { value: number | null; percentile: number | null; change: number | null };
    headCircumference: { value: number | null; percentile: number | null; change: number | null };
  } | null;
}) {
  if (!latestMeasurements) {
    return (
      <ChartContainer
        title="📸 Latest Growth Snapshot"
        description="Provides a quick overview of the most recent growth data at a glance."
      >
        <div className="chart-empty">No measurements yet</div>
      </ChartContainer>
    );
  }

  const { latest, weight, height, headCircumference } = latestMeasurements;

  const MetricCard = ({ label, icon, value, unit, percentile, change }: any) => (
    <div className="snapshot-card">
      <div className="snapshot-header">
        <span className="snapshot-icon">{icon}</span>
        <span className="snapshot-label">{label}</span>
      </div>
      {value !== null ? (
        <>
          <div className="snapshot-value">
            {value} {unit}
            {change !== null && (
              <span className={`snapshot-change ${change >= 0 ? 'positive' : 'negative'}`}>
                {change >= 0 ? '+' : ''}{change.toFixed(1)} {unit}
              </span>
            )}
          </div>
          {percentile !== null && (
            <div className="snapshot-percentile">{percentile}th percentile</div>
          )}
        </>
      ) : (
        <div className="snapshot-empty">No data</div>
      )}
    </div>
  );

  return (
    <ChartContainer
      title="📸 Latest Growth Snapshot"
      description="Provides a quick overview of the most recent growth data at a glance."
    >
      <div className="snapshot-date">
        Last measured: {formatDate(latest.visit_date)}
      </div>
      <div className="snapshot-grid">
        <MetricCard
          label="Weight"
          icon="⚖️"
          value={weight.value}
          unit="lbs"
          percentile={weight.percentile}
          change={weight.change}
        />
        <MetricCard
          label="Height"
          icon="📏"
          value={height.value}
          unit="in"
          percentile={height.percentile}
          change={height.change}
        />
        <MetricCard
          label="Head Circumference"
          icon="⭕"
          value={headCircumference.value}
          unit="in"
          percentile={headCircumference.percentile}
          change={headCircumference.change}
        />
      </div>
    </ChartContainer>
  );
}

// 12: Visit Frequency Over Time
export function VisitFrequencyChart({ events }: { events: EventMarker[] }) {
  // Group events by month
  const eventsByMonth = events.reduce((acc, event) => {
    const date = new Date(event.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = { month: monthKey, checkups: 0, sickVisits: 0 };
    }
    
    if (event.type === 'doctor_visit') {
      acc[monthKey].checkups++;
    } else {
      acc[monthKey].sickVisits++;
    }
    
    return acc;
  }, {} as Record<string, { month: string; checkups: number; sickVisits: number }>);

  const chartData = Object.values(eventsByMonth).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <ChartContainer
      title="🗓️ Visit Frequency Over Time"
      description="Shows the frequency and distribution of medical visits over time."
    >
      {chartData.length === 0 ? (
        <div className="chart-empty">No medical events</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" stroke="#64748b" style={{ fontSize: '0.875rem' }} />
            <YAxis stroke="#64748b" style={{ fontSize: '0.875rem' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="checkups" fill="#10b981" name="Checkups" stackId="a" />
            <Bar dataKey="sickVisits" fill="#f59e0b" name="Sick Visits" stackId="a" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}
