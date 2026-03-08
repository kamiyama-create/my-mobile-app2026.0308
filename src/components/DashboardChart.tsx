import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { COLORS } from '../constants';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardChartProps {
  data: {
    date: string;
    amount: number;
    category: string;
  }[];
}

export const DashboardChart: React.FC<DashboardChartProps> = ({ data }) => {
  // 日付順にソート
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // 日付ごとの合計金額を算出
  const dailyTotals = sortedData.reduce((acc, curr) => {
    acc[curr.date] = (acc[curr.date] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const labels = Object.keys(dailyTotals);
  const values = Object.values(dailyTotals);

  const chartData = {
    labels,
    datasets: [
      {
        label: '支出推移 (¥)',
        data: values,
        borderColor: COLORS.SECONDARY,
        backgroundColor: `${COLORS.SECONDARY}22`,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: COLORS.SECONDARY,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: COLORS.PRIMARY,
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 14 },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 10 },
          color: '#94a3b8',
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f1f5f9',
        },
        ticks: {
          font: { size: 10 },
          color: '#94a3b8',
          callback: (value: any) => `¥${value.toLocaleString()}`,
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100 h-64">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-stone-800">支出トレンド</h3>
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Spreadsheet Sync</span>
      </div>
      <div className="h-44">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};
