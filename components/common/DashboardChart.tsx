import React, { memo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts';

interface DashboardChartProps {
  data: any[];
  isSchoolView: boolean;
  onBarClick: (item: any) => void;
}

const renderCustomizedLabel = (props: any) => {
  const { x, y, width, value } = props;
  const radius = 10;
  if (value === 0) return null;
  
  return (
    <g>
      <text 
        x={x + width / 2} 
        y={y - radius} 
        fill="#111827" 
        textAnchor="middle" 
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="bold"
      >
        {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) + '%' : value}
      </text>
    </g>
  );
};

const DashboardChart: React.FC<DashboardChartProps> = memo(({ data, isSchoolView, onBarClick }) => {
  return (
    <div className="h-[350px] w-full min-w-0 relative">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <BarChart 
          data={data} 
          barCategoryGap="15%"
          margin={{ top: 25, right: 15, left: -10, bottom: 20 }}
          onClick={(e: any) => {
            if (e && e.activePayload) {
              onBarClick(e.activePayload[0].payload);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9CA3AF' }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fontWeight: 'bold', fill: '#9CA3AF' }}
            allowDecimals={false}
          />
          <Tooltip 
            cursor={{ fill: '#F9FAFB', cursor: isSchoolView ? 'default' : 'pointer' }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
            formatter={(value: any) => [
              isSchoolView ? value : `${Number(value).toFixed(2)}%`, 
              isSchoolView ? 'Student Count' : 'Pass Percentage'
            ]}
          />
          <Bar 
            dataKey="victory" 
            radius={[6, 6, 0, 0]} 
            maxBarSize={45}
            fill="#000000"
            className={isSchoolView ? "cursor-default" : "cursor-pointer"}
          >
            <LabelList dataKey="victory" content={renderCustomizedLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

DashboardChart.displayName = 'DashboardChart';

export default DashboardChart;
