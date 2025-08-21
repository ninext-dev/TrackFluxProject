import React, { useEffect, useState } from 'react';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { AlertTriangle, CheckCircle, Clock, TrendingUp, BarChart2, PieChart } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Sector
} from 'recharts';

interface Production {
  id: string;
  product_name: string;
  code: string;
  batch_number: string;
  quantity: number;
  programmed_quantity: number;
  has_divergence: boolean;
  status: 'PENDING' | 'IN_PRODUCTION' | 'COMPLETED';
  created_at: string;
}

interface DailyStats {
  date: string;
  completed: number;
  inProduction: number;
  pending: number;
  totalQuantity: number;
  programmedQuantity: number;
  divergences: number;
}

const COLORS = ['#10B981', '#FBBF24', '#EF4444', '#6366F1', '#8B5CF6', '#EC4899'];

const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value
  } = props;

  return (
    <g>
      <text x={cx} y={cy} dy={-20} textAnchor="middle" fill="#374151" className="text-sm">
        {payload.name}
      </text>
      <text x={cx} y={cy} dy={20} textAnchor="middle" fill="#374151" className="text-lg font-semibold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
    </g>
  );
};

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [todayStats, setTodayStats] = useState({
    completed: 0,
    inProduction: 0,
    pending: 0,
    totalQuantity: 0,
    programmedQuantity: 0,
    divergences: 0
  });
  const [recentProductions, setRecentProductions] = useState<Production[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<DailyStats[]>([]);
  const [productDistribution, setProductDistribution] = useState<{ name: string; value: number }[]>([]);
  const [departmentStats, setDepartmentStats] = useState<{ name: string; completed: number; pending: number }[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const today = new Date();
      const last7Days = subDays(today, 7);
      
      // First, get the most recent production day to determine the latest week
      const { data: latestProductionDay, error: dayError } = await supabase
        .from('production_days')
        .select('date, created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (dayError && dayError.code !== 'PGRST116') throw dayError;

      let weekStart: Date;
      let weekEnd: Date;

      if (latestProductionDay) {
        // Use the latest production day as reference for the week
        const latestDate = new Date(latestProductionDay.date);
        weekStart = startOfWeek(latestDate, { weekStartsOn: 1 }); // Monday start
        weekEnd = endOfWeek(latestDate, { weekStartsOn: 1 });
      } else {
        // Fallback to current week if no production days exist
        const today = new Date();
        weekStart = startOfWeek(today, { weekStartsOn: 1 });
        weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      }

      // Fetch productions from the latest week with department info
      const { data: productionsData, error: productionsError } = await supabase
        .from('productions')
        .select(`
          *,
          production_days!inner(date),
          department:products(department:classifications(name))
        `)
        .gte('production_days.date', weekStart.toISOString().split('T')[0])
        .lte('production_days.date', weekEnd.toISOString().split('T')[0])
        .order('created_at', { ascending: false });

      if (productionsError) throw productionsError;
      const productions = productionsData || [];

      // Calculate week's stats (instead of today's stats)
      const weekStatsData = {
        completed: productions.filter(p => p.status === 'COMPLETED').length,
        inProduction: productions.filter(p => p.status === 'IN_PRODUCTION').length,
        pending: productions.filter(p => p.status === 'PENDING').length,
        totalQuantity: productions.reduce((sum, p) => sum + p.quantity, 0),
        programmedQuantity: productions.reduce((sum, p) => sum + p.programmed_quantity, 0),
        divergences: productions.filter(p => p.has_divergence).length
      };

      setTodayStats(weekStatsData);
      setRecentProductions(productions.slice(0, 10));

      // Calculate daily stats for the last 7 days
      const dailyStatsData = eachDayOfInterval({ start: last7Days, end: today })
        .map(date => {
          const dayProductions = productions.filter(p => 
            new Date(p.created_at).toDateString() === date.toDateString()
          );
          return {
            date: format(date, 'dd/MM'),
            completed: dayProductions.filter(p => p.status === 'COMPLETED').length,
            inProduction: dayProductions.filter(p => p.status === 'IN_PRODUCTION').length,
            pending: dayProductions.filter(p => p.status === 'PENDING').length,
            totalQuantity: dayProductions.reduce((sum, p) => sum + p.quantity, 0),
            programmedQuantity: dayProductions.reduce((sum, p) => sum + p.programmed_quantity, 0),
            divergences: dayProductions.filter(p => p.has_divergence).length
          };
        });

      setDailyStats(dailyStatsData);

      // Calculate weekly stats for current week
      const currentWeekStart = startOfWeek(today);
      const currentWeekEnd = endOfWeek(today);
      const weeklyStatsData = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd })
        .map(date => {
          const dayProductions = productions.filter(p => 
            new Date(p.created_at).toDateString() === date.toDateString()
          );
          return {
            date: format(date, 'EEE', { locale: ptBR }),
            completed: dayProductions.filter(p => p.status === 'COMPLETED').length,
            inProduction: dayProductions.filter(p => p.status === 'IN_PRODUCTION').length,
            pending: dayProductions.filter(p => p.status === 'PENDING').length,
            totalQuantity: dayProductions.reduce((sum, p) => sum + p.quantity, 0),
            programmedQuantity: dayProductions.reduce((sum, p) => sum + p.programmed_quantity, 0),
            divergences: dayProductions.filter(p => p.has_divergence).length
          };
        });

      setWeeklyStats(weeklyStatsData);

      // Calculate product distribution
      const productCounts = productions.reduce((acc, prod) => {
        acc[prod.product_name] = (acc[prod.product_name] || 0) + prod.quantity;
        return acc;
      }, {} as Record<string, number>);

      setProductDistribution(
        Object.entries(productCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5)
      );

      // Calculate department statistics
      const deptStats = productions.reduce((acc, prod) => {
        const deptName = prod.department?.department?.name || 'Sem Departamento';
        if (!acc[deptName]) {
          acc[deptName] = { name: deptName, completed: 0, pending: 0 };
        }
        if (prod.status === 'COMPLETED') {
          acc[deptName].completed++;
        } else {
          acc[deptName].pending++;
        }
        return acc;
      }, {} as Record<string, { name: string; completed: number; pending: number }>);

      setDepartmentStats(Object.values(deptStats));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Concluídas Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500 opacity-10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-500 rounded-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Última Semana</p>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-green-800">Concluídas</h3>
              <p className="text-3xl font-bold text-green-700">{todayStats.completed}</p>
              <p className="text-sm text-green-600">
                {todayStats.completed + todayStats.inProduction + todayStats.pending > 0 
                  ? `${((todayStats.completed / (todayStats.completed + todayStats.inProduction + todayStats.pending)) * 100).toFixed(1)}% do total`
                  : '0% do total'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Em Produção Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500 opacity-10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-yellow-500 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide">Última Semana</p>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-yellow-800">Em Produção</h3>
              <p className="text-3xl font-bold text-yellow-700">{todayStats.inProduction}</p>
              <p className="text-sm text-yellow-600">
                {todayStats.divergences} divergências detectadas
              </p>
            </div>
          </div>
        </div>

        {/* Aguardando Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500 opacity-10 rounded-full -mr-10 -mt-10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-500 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Última Semana</p>
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-red-800">Aguardando</h3>
              <p className="text-3xl font-bold text-red-700">{todayStats.pending}</p>
              <p className="text-sm text-red-600">
                {todayStats.programmedQuantity.toLocaleString('pt-BR')} unidades programadas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Productions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Produções Recentes</h2>
        </div>
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {recentProductions.map((production) => (
            <div key={production.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900">{production.code}</span>
                    <span className="ml-2 text-gray-500">-</span>
                    <span className="ml-2 text-gray-900">{production.product_name}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    {format(new Date(production.created_at), "dd 'de' MMMM", { locale: ptBR })}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {production.quantity} un
                    </div>
                    {production.has_divergence && (
                      <div className="text-sm text-yellow-600">
                        Divergência: {Math.abs(production.quantity - production.programmed_quantity)} un
                      </div>
                    )}
                  </div>
                  <div>
                    {production.status === 'COMPLETED' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : production.status === 'IN_PRODUCTION' ? (
                      <Clock className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Production Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <BarChart2 className="h-5 w-5 mr-2 text-indigo-500" />
              Produção Diária (Últimos 7 dias)
            </h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar name="Concluídas" dataKey="completed" fill="#10B981" />
                <Bar name="Em Produção" dataKey="inProduction" fill="#FBBF24" />
                <Bar name="Pendentes" dataKey="pending" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-indigo-500" />
              Tendência Semanal
            </h2>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  name="Quantidade Total" 
                  dataKey="totalQuantity" 
                  stroke="#6366F1" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  name="Quantidade Programada" 
                  dataKey="programmedQuantity" 
                  stroke="#10B981" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department Performance */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Desempenho por Departamento</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={departmentStats}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Legend />
              <Bar name="Concluídos" dataKey="completed" fill="#10B981" />
              <Bar name="Pendentes" dataKey="pending" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Efficiency Stats */}
      <div className="mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Taxa de Conclusão Diária</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  name="Taxa de Conclusão (%)"
                  dataKey={(data) => ((data.completed / (data.completed + data.pending)) * 100).toFixed(1)}
                  stroke="#6366F1"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Product Distribution - Full Width */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-indigo-500" />
            Distribuição por Produto (Top 5)
          </h2>
        </div>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={productDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={100}
                outerRadius={160}
                onMouseEnter={onPieEnter}
              >
                {productDistribution.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend 
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}