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
    type: 'advance' | 'deposit';
  }[];
}

export const DashboardChart: React.FC<DashboardChartProps> = ({ data }) => {
  // 日付順にソート
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // ユニークな日付のリストを作成
  const labels = Array.from(new Set(sortedData.map(d => d.date))).sort();
  
  // 日付ごとの合計金額を算出（タイプ別）
  const advanceData = labels.map(date => 
    sortedData.filter(d => d.date === date && d.type === 'advance')
      .reduce((sum, curr) => sum + curr.amount, 0)
  );
  
  const depositData = labels.map(date => 
    sortedData.filter(d => d.date === date && d.type === 'deposit')
      .reduce((sum, curr) => sum + curr.amount, 0)
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: '立替金 (¥)',
        data: advanceData,
        borderColor: COLORS.SECONDARY,
        backgroundColor: `${COLORS.SECONDARY}22`,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: COLORS.SECONDARY,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: '預かり金 (¥)',
        data: depositData,
        borderColor: COLORS.PRIMARY,
        backgroundColor: `${COLORS.PRIMARY}22`,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: COLORS.PRIMARY,
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
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          boxWidth: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { size: 10, weight: 'bold' as const }
        }
      },
      tooltip: {
        backgroundColor: COLORS.PRIMARY,
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 14 },
        padding: 12,
        cornerRadius: 8,
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
