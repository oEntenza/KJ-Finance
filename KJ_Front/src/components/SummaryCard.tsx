import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  amount: number;
  type: 'income' | 'outcome' | 'total';
}

export function SummaryCard({ title, amount, type }: SummaryCardProps) {
  const isTotal = type === 'total';
  const totalIndicatorClass = amount < 0
    ? 'bg-rose-500'
    : amount === 0
      ? 'bg-[var(--color-accent)]'
      : 'bg-emerald-500';

  const config = {
    income: { icon: <TrendingUp size={24} />, color: 'text-emerald-400' },
    outcome: { icon: <TrendingDown size={24} />, color: 'text-rose-400' },
    total: { icon: <DollarSign size={24} />, color: 'text-[var(--color-accent)]' },
  };

  return (
    <div
      className={`
      bg-[var(--color-surface)] p-6 rounded-xl border transition-all duration-300 h-full
      ${isTotal ? 'border-[var(--color-accent)]/40 shadow-[0_0_20px_rgba(192,160,96,0.08)] summary-total-highlight' : 'border-gray-800 hover:border-gray-700'}
    `}
    >
      {isTotal ? (
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg bg-[var(--color-bg)] ${config[type].color} border border-white/5`}>
            {config[type].icon}
          </div>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">
            {title}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-[0.15em]">
            {title}
          </span>
          <div className={`p-2 rounded-lg bg-[var(--color-bg)] ${config[type].color} border border-white/5`}>
            {config[type].icon}
          </div>
        </div>
      )}

      <div>
        <span className="text-2xl font-bold text-gray-100 tracking-tight">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(amount)}
        </span>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-1 w-full rounded-full bg-gray-800 overflow-hidden">
            <div
              className={`h-full ${isTotal ? totalIndicatorClass : 'bg-gray-700'}`}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
