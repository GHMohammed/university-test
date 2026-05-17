import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

// Hardcoded HSL values that match the design system tokens in index.css
const CHART_COLORS = {
  primary:     'hsl(213, 80%, 50%)',
  success:     'hsl(142, 71%, 45%)',
  destructive: 'hsl(0, 72%, 51%)',
  warning:     'hsl(38, 92%, 50%)',
  info:        'hsl(200, 70%, 50%)',
  muted:       'hsl(215, 15%, 50%)',
};

export { CHART_COLORS };

// ─── Bar Chart ───────────────────────────────────────────────────────────────

interface BarSeries {
  dataKey: string;
  fill: string;
  name: string;
}

interface AttendanceBarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  bars: BarSeries[];
  height?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  yDomain?: [number, number];
}

export function AttendanceBarChart({
  data,
  xKey,
  bars,
  height = 280,
  isLoading,
  emptyMessage = 'No data',
  yDomain = [0, 100],
}: AttendanceBarChartProps) {
  if (isLoading) return <Skeleton style={{ height }} className="w-full rounded-lg" />;
  if (!data.length) return (
    <div style={{ height }} className="flex items-center justify-center text-muted-foreground text-sm">
      {emptyMessage}
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
        <XAxis
          dataKey={xKey}
          tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={yDomain}
          tick={{ fontSize: 11, fill: CHART_COLORS.muted }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(0, 0%, 100%)',
            border: '1px solid hsl(214, 20%, 90%)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        {bars.map(b => (
          <Bar key={b.dataKey} dataKey={b.dataKey} fill={b.fill} name={b.name} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Pie Chart ───────────────────────────────────────────────────────────────

interface PieSlice {
  name: string;
  value: number;
  fill: string;
}

interface AttendancePieChartProps {
  data: PieSlice[];
  height?: number;
  isLoading?: boolean;
  emptyMessage?: string;
}

export function AttendancePieChart({
  data,
  height = 240,
  isLoading,
  emptyMessage = 'No data',
}: AttendancePieChartProps) {
  if (isLoading) return <Skeleton style={{ height }} className="w-full rounded-lg" />;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return (
    <div style={{ height }} className="flex items-center justify-center text-muted-foreground text-sm">
      {emptyMessage}
    </div>
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string) => [`${value} (${Math.round((value / total) * 100)}%)`, name]}
          contentStyle={{
            background: 'hsl(0, 0%, 100%)',
            border: '1px solid hsl(214, 20%, 90%)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
