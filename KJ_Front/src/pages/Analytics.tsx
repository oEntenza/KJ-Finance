import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { DashboardHeader } from '../components/DashboardHeader';
import { DatePicker } from '../components/DatePicker';
import { api } from '../lib/api';
import { CATEGORY_LABELS } from '../lib/finance';

const COLORS = [
  '#60A5FA',
  '#F97316',
  '#FB7185',
  '#A78BFA',
  '#FBBF24',
  '#94A3B8',
  '#22D3EE',
  '#84CC16',
  '#34D399',
];

interface CreditCardSummary {
  id: string;
  name: string;
}

interface TransactionItem {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  paymentMethod: string;
  date: string;
  isCardStatement?: boolean;
  creditCard?: CreditCardSummary | null;
  childTransactions?: TransactionItem[];
}

function toISODate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseISODate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function flattenTransactionsForAnalytics(transactions: TransactionItem[]) {
  const flattened: TransactionItem[] = [];

  transactions.forEach((transaction) => {
    if (transaction.isCardStatement) {
      (transaction.childTransactions || []).forEach((child) => flattened.push(child));
      return;
    }

    flattened.push(transaction);
  });

  return flattened;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const isPositive = value >= 0;

    return (
      <div className="bg-[var(--color-bg)] border border-gray-800 p-3 rounded-lg shadow-2xl backdrop-blur-md">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">{payload[0].payload.name}</p>
        <p className="text-xs font-mono">
          <span className="text-gray-400">Saldo: </span>
          <span className="font-bold" style={{ color: isPositive ? 'var(--color-accent)' : '#F87171' }}>
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }).format(value)}
          </span>
        </p>
      </div>
    );
  }

  return null;
};

export function Analytics() {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => localStorage.getItem('@KAO:analyticsStartDate') || '');
  const [endDate, setEndDate] = useState(() => localStorage.getItem('@KAO:analyticsEndDate') || '');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/transactions');
      setTransactions(flattenTransactionsForAnalytics(response.data.transactions || []));
    } catch (error) {
      console.error('Erro no K&J Intelligence:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const cachedStart = localStorage.getItem('@KAO:analyticsStartDate');
    const cachedEnd = localStorage.getItem('@KAO:analyticsEndDate');
    if (cachedStart && cachedEnd) return;

    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    setStartDate(toISODate(start));
    setEndDate(toISODate(end));
  }, []);

  useEffect(() => {
    if (startDate) localStorage.setItem('@KAO:analyticsStartDate', startDate);
  }, [startDate]);

  useEffect(() => {
    if (endDate) localStorage.setItem('@KAO:analyticsEndDate', endDate);
  }, [endDate]);

  const filteredTransactions = useMemo(() => {
    const start = parseISODate(startDate);
    const end = parseISODate(endDate);

    return transactions.filter((transaction) => {
      const date = parseISODate(transaction.date.split('T')[0] || transaction.date);
      if (!date) return false;
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  const chartData = useMemo(() => {
    if (!filteredTransactions.length) return [];

    const sortedTransactions = [...filteredTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    });

    const monthlyGroups: Record<string, any> = {};
    let runningTotal = 0;

    sortedTransactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const monthLabel = monthFormatter.format(date);

      if (!monthlyGroups[monthLabel]) {
        monthlyGroups[monthLabel] = {
          name: monthLabel,
          income: 0,
          expense: 0,
          balance: 0,
          cumulative: 0,
        };
      }

      const amount = Number(transaction.amount);
      if (transaction.type === 'INCOME') {
        monthlyGroups[monthLabel].income += amount;
        runningTotal += amount;
      } else {
        monthlyGroups[monthLabel].expense += amount;
        runningTotal -= amount;
      }

      const categoryKey = String(transaction.category).toLowerCase();
      monthlyGroups[monthLabel][categoryKey] = (monthlyGroups[monthLabel][categoryKey] || 0) + amount;
      monthlyGroups[monthLabel].balance = monthlyGroups[monthLabel].income - monthlyGroups[monthLabel].expense;
      monthlyGroups[monthLabel].cumulative = runningTotal;
    });

    return Object.values(monthlyGroups);
  }, [filteredTransactions]);

  const categories = useMemo(() => {
    const orderedKeys = Object.keys(CATEGORY_LABELS).map((key) => key.toLowerCase());
    return orderedKeys.filter((key) => filteredTransactions.some((transaction) => transaction.category.toLowerCase() === key));
  }, [filteredTransactions]);

  const categoryPieData = useMemo(() => {
    const categoryMap = new Map<string, number>();

    filteredTransactions.forEach((transaction) => {
      if (transaction.type !== 'EXPENSE') return;
      const key = String(transaction.category).toLowerCase();
      categoryMap.set(key, (categoryMap.get(key) || 0) + Number(transaction.amount));
    });

    return Array.from(categoryMap.entries()).map(([key, value]) => ({
      key,
      name: CATEGORY_LABELS[key.toUpperCase()] ?? key.replace(/_/g, ' '),
      value,
    }));
  }, [filteredTransactions]);

  const totalExpense = useMemo(() => {
    return filteredTransactions
      .filter((transaction) => transaction.type === 'EXPENSE')
      .reduce((sum, transaction) => sum + Number(transaction.amount), 0);
  }, [filteredTransactions]);

  const topCategory = useMemo(() => {
    if (!categoryPieData.length) return null;
    return [...categoryPieData].sort((a, b) => b.value - a.value)[0];
  }, [categoryPieData]);

  const categoryDetails = useMemo(() => {
    if (!categoryPieData.length || totalExpense === 0) return [];

    return [...categoryPieData]
      .sort((a, b) => b.value - a.value)
      .map((entry, index) => ({
        ...entry,
        color: COLORS[index % COLORS.length],
        percent: (entry.value / totalExpense) * 100,
      }));
  }, [categoryPieData, totalExpense]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-[var(--color-accent)] font-mono animate-pulse uppercase tracking-widest text-xs">
          Sincronizando dados Neon...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-gray-100 font-sans">
      <DashboardHeader />

      <main className="w-full px-8 py-12 space-y-8">
        <header className="relative z-20 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-light tracking-tight italic">
              Analytics <span className="font-bold text-[var(--color-accent)]">K&J</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1 uppercase tracking-[0.2em]">Gestão analítica de capital</p>
          </div>

          <div className="w-full xl:w-auto max-w-full xl:ml-auto px-4 py-3 bg-[var(--color-surface)]/40 border border-gray-800 rounded-2xl shadow-sm backdrop-blur-sm">
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold">Selecione o período</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 w-full xl:w-auto">
                <DatePicker value={startDate} onChange={setStartDate} placeholder="Data inicial" className="w-full sm:w-[180px]" />
                <DatePicker value={endDate} onChange={setEndDate} placeholder="Data final" className="w-full sm:w-[180px]" />
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8">
          <section className="bg-[var(--color-surface)] p-6 rounded-2xl border border-gray-800 shadow-2xl">
            <h2 className="text-xs font-semibold mb-8 uppercase tracking-widest text-[var(--color-accent)]">Evolução mensal das categorias</h2>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="name" stroke="#555" fontSize={11} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#555" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(value) => `R$ ${value.toFixed(2)}`} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid #333', borderRadius: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  {categories.map((category, index) => (
                    <Line
                      key={category}
                      type="monotone"
                      dataKey={category}
                      name={CATEGORY_LABELS[category.toUpperCase()] ?? category.replace(/_/g, ' ')}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={3}
                      dot={{ r: 4, fill: COLORS[index % COLORS.length], strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="bg-[var(--color-surface)] p-6 rounded-2xl border border-gray-800 shadow-2xl">
            <h2 className="text-xs font-semibold mb-8 uppercase tracking-widest text-[var(--color-accent)]">Distribuição por categoria (despesas)</h2>
            {categoryPieData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 items-center">
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                        contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid #333', borderRadius: '12px' }}
                      />
                      <Legend iconType="circle" />
                      <Pie
                        data={categoryPieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={80}
                        outerRadius={140}
                        paddingAngle={3}
                      >
                        {categoryPieData.map((entry, index) => (
                          <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-6">
                  <div className="bg-[var(--color-surface-2)] border border-gray-800 rounded-2xl p-4">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Total de despesas</p>
                    <p className="text-2xl font-semibold text-[var(--color-text)] mt-2">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpense)}
                    </p>
                    {topCategory ? (
                      <p className="text-xs text-gray-400 mt-2">
                        Maior categoria: <span className="text-[var(--color-accent)] font-semibold">{topCategory.name}</span>
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3 max-h-[260px] overflow-auto custom-scroll pr-1">
                    {categoryDetails.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-3">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-200">{entry.name}</span>
                            <span className="text-gray-400">{entry.percent.toFixed(1)}%</span>
                          </div>
                          <div className="mt-2 h-2 w-full rounded-full bg-[var(--color-bg)] border border-gray-800 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(entry.percent, 100)}%`, backgroundColor: entry.color }} />
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 min-w-[100px] text-right">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nenhuma despesa no período selecionado.</p>
            )}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <section className="bg-[var(--color-surface)] p-6 rounded-2xl border border-gray-800 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">Resultado operacional</h2>
                <TrendingUp size={16} className="text-gray-600" />
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke="#555" fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#222', opacity: 0.4 }} />
                    <Bar dataKey="balance" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.balance >= 0 ? '#60c06d' : '#F87171'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="bg-[var(--color-surface)] p-6 rounded-2xl border border-gray-800 shadow-2xl">
              <h2 className="text-xs font-semibold mb-8 uppercase tracking-widest text-[var(--color-accent)]">Evolução do patrimônio</h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPat" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60c06d" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#60c06d" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#555" fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid #333', borderRadius: '12px' }}
                      formatter={(value: number | string) => [`R$ ${Number(value).toFixed(2)}`, 'Patrimônio Total']}
                    />
                    <Area type="monotone" dataKey="cumulative" stroke="#60c06d" strokeWidth={3} fill="url(#colorPat)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}


