import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend, BarChart, Bar, Cell, AreaChart, Area, PieChart, Pie,
} from 'recharts';
import { LayoutDashboard, TrendingUp } from 'lucide-react';
import { DashboardHeader } from '../components/DashboardHeader';
import { DatePicker } from '../components/DatePicker';
import { api } from '../lib/api';

const COLORS = [
  '#60c06d',
  '#60A5FA',
  '#F87171',
  '#A78BFA',
  '#FBBF24',
  '#94a3b8',
  '#22d3ee',
  '#f97316',
  '#e879f9',
  '#84cc16',
  '#38bdf8',
  '#f43f5e',
];
const CATEGORY_LABELS: Record<string, string> = {
  salary: 'Salário',
  credit_card: 'Cartão de Crédito',
  housing: 'Habitação',
  transport: 'Transporte',
  food: 'Alimentação',
  health_wellness: 'Saúde e Bem-estar',
  leisure_entertainment: 'Lazer e entretenimento',
  education: 'Educação',
  finance_investments: 'Finanças e Investimentos',
  others: 'Outros',
};

function toISODate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseISODate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const isPositive = value >= 0;

    return (
      <div className="bg-[var(--color-bg)] border border-gray-800 p-3 rounded-lg shadow-2xl backdrop-blur-md">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">
          {payload[0].payload.name}
        </p>
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
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => localStorage.getItem('@KAO:analyticsStartDate') || '');
  const [endDate, setEndDate] = useState(() => localStorage.getItem('@KAO:analyticsEndDate') || '');
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/transactions');
      setTransactions(response.data.transactions || []);
    } catch (err) {
      console.error('Erro no K&J Intelligence:', err);
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
    if (startDate) {
      localStorage.setItem('@KAO:analyticsStartDate', startDate);
    }
  }, [startDate]);

  useEffect(() => {
    if (endDate) {
      localStorage.setItem('@KAO:analyticsEndDate', endDate);
    }
  }, [endDate]);

  const filteredTransactions = useMemo(() => {
    const start = parseISODate(startDate);
    const end = parseISODate(endDate);

    return transactions.filter((t) => {
      const date = normalizeDate(t.date);
      if (!date) return false;
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    });
  }, [transactions, startDate, endDate]);

  const chartData = useMemo(() => {
    if (!filteredTransactions || filteredTransactions.length === 0) return [];

    const sortedTransactions = [...filteredTransactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const monthlyGroups: Record<string, any> = {};
    let runningTotal = 0;

    const monthFormatter = new Intl.DateTimeFormat('pt-BR', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    });

    sortedTransactions.forEach((t) => {
      const date = new Date(t.date);
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

      const amount = Number(t.amount);
      if (t.type === 'INCOME') {
        monthlyGroups[monthLabel].income += amount;
        runningTotal += amount;
      } else {
        monthlyGroups[monthLabel].expense += amount;
        runningTotal -= amount;
      }

      const catKey = t.category.toLowerCase();
      monthlyGroups[monthLabel][catKey] = (monthlyGroups[monthLabel][catKey] || 0) + amount;
      monthlyGroups[monthLabel].balance = monthlyGroups[monthLabel].income - monthlyGroups[monthLabel].expense;
      monthlyGroups[monthLabel].cumulative = runningTotal;
    });

    return Object.values(monthlyGroups);
  }, [filteredTransactions]);

  const categories = useMemo(() => {
    const set = new Set(filteredTransactions.map((t) => t.category.toLowerCase()));
    return Array.from(set);
  }, [filteredTransactions]);

  const categoryPieData = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions.forEach((t) => {
      if (t.type !== 'EXPENSE') return;
      const key = String(t.category).toLowerCase();
      map.set(key, (map.get(key) || 0) + Number(t.amount));
    });
    return Array.from(map.entries()).map(([key, value]) => ({
      name: CATEGORY_LABELS[key] ?? key.replace(/_/g, ' '),
      value,
      key,
    }));
  }, [filteredTransactions]);

  const totalExpense = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }, [filteredTransactions]);

  const topCategory = useMemo(() => {
    if (!categoryPieData.length) return null;
    const sorted = [...categoryPieData].sort((a, b) => b.value - a.value);
    return sorted[0];
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
          Sincronizando Dados Neon...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-gray-100 font-sans">
      <DashboardHeader />

      <main className="px-8 py-12 max-w-[1600px] mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-light tracking-tight italic">
              K&J <span className="font-bold text-[var(--color-accent)] not-italic">Analytics</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1 uppercase tracking-[0.2em]">Gestão Analítica de Capital</p>
          </div>
        </header>

        <section className="bg-[var(--color-surface)] p-4 rounded-2xl border border-gray-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-widest text-[var(--color-accent)]">Selecione o período</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              placeholder="Data inicial"
              className="w-full sm:w-[180px]"
            />
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              placeholder="Data final"
              className="w-full sm:w-[180px]"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-12">
          <section className="bg-[var(--color-surface)] p-8 rounded-2xl border border-gray-800 shadow-2xl">
            <h2 className="text-xs font-bold mb-8 uppercase tracking-widest text-[var(--color-accent)]">Evolução Mensal das Categorias</h2>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="name" stroke="#555" fontSize={11} axisLine={false} tickLine={false} dy={10} />
                  <YAxis stroke="#555" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(v) => `R$ ${v.toFixed(2)}`} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-bg)', border: '1px solid #333', borderRadius: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  {categories.map((cat, index) => (
                    <Line
                      key={cat}
                      type="monotone"
                      dataKey={cat}
                      name={CATEGORY_LABELS[cat] ?? cat.replace(/_/g, ' ')}
                      stroke={COLORS[index % COLORS.length]}
                      strokeWidth={3}
                      dot={{ r: 4, fill: COLORS[index % COLORS.length], strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="bg-[var(--color-surface)] p-9 rounded-2xl border border-gray-800 shadow-2xl lg:col-span-2">
              <h2 className="text-xs font-bold mb-8 uppercase tracking-widest text-[var(--color-accent)]">Distribuição por Categoria (Despesas)</h2>
              {categoryPieData.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
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
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.min(entry.percent, 100)}%`, backgroundColor: entry.color }}
                              />
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="bg-[var(--color-surface)] p-8 rounded-2xl border border-gray-800 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">Resultado Operacional</h2>
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

            <section className="bg-[var(--color-surface)] p-8 rounded-2xl border border-gray-800 shadow-2xl">
              <h2 className="text-xs font-bold mb-8 uppercase tracking-widest text-[var(--color-accent)]">Evolução do Patrimônio</h2>
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
                      formatter={(v: number | string) => [`R$ ${Number(v).toFixed(2)}`, 'Patrimônio Total']}
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
