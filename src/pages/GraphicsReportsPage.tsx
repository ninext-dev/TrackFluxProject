import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { Download, TrendingUp, TrendingDown, DollarSign, Package, CheckCircle, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Production {
  id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  status: string;
  billing_status: string;
  product: {
    name: string;
    code: string;
    department_id: string;
  } | null;
  graphics_production_day: {
    date: string;
  } | null;
}

interface DashboardStats {
  totalQuantity: number;
  totalRevenue: number;
  completedBilling: number;
  totalProductions: number;
  averageUnitCost: number;
  completionRate: number;
}

interface ChartData {
  date: string;
  quantity: number;
  revenue: number;
  productions: number;
}

interface ProductDistribution {
  name: string;
  value: number;
  quantity: number;
  color: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

export default function GraphicsReportsPage() {
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [stats, setStats] = useState<DashboardStats>({
    totalQuantity: 0,
    totalRevenue: 0,
    completedBilling: 0,
    totalProductions: 0,
    averageUnitCost: 0,
    completionRate: 0
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [productDistribution, setProductDistribution] = useState<ProductDistribution[]>([]);

  useEffect(() => {
    fetchProductions();
  }, [selectedMonth]);

  useEffect(() => {
    calculateStats();
    generateChartData();
    generateProductDistribution();
  }, [productions]);

  const fetchProductions = async () => {
    try {
      setLoading(true);
      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);

      // First, get the PA Gráfica department ID
      const { data: department, error: deptError } = await supabase
        .from('classifications')
        .select('id')
        .eq('name', 'PA Gráfica')
        .eq('type', 'DEPARTMENT')
        .single();

      if (deptError || !department) {
        console.error('Error fetching department:', deptError);
        setProductions([]);
        return;
      }

      const { data, error } = await supabase
        .from('graphics_productions')
        .select(`
          id,
          quantity,
          unit_cost,
          total_cost,
          status,
          billing_status,
          product:products!inner(
            name,
            code,
            department_id
          ),
          graphics_production_day:graphics_production_days!inner(date)
        `)
        .eq('product.department_id', department.id)
        .gte('graphics_production_day.date', format(startDate, 'yyyy-MM-dd'))
        .lte('graphics_production_day.date', format(endDate, 'yyyy-MM-dd'));

      if (error) throw error;
      setProductions(data || []);
    } catch (error) {
      console.error('Error fetching productions:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalQuantity = productions.reduce((sum, prod) => sum + (prod.quantity || 0), 0);
    const totalRevenue = productions.reduce((sum, prod) => sum + (prod.total_cost || 0), 0);
    const completedBilling = productions
      .filter(prod => prod.billing_status === 'BILLED')
      .reduce((sum, prod) => sum + (prod.total_cost || 0), 0);
    const totalProductions = productions.length;
    const averageUnitCost = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;
    const completionRate = totalProductions > 0 ? 
      (productions.filter(prod => prod.status === 'COMPLETED').length / totalProductions) * 100 : 0;

    setStats({
      totalQuantity,
      totalRevenue,
      completedBilling,
      totalProductions,
      averageUnitCost,
      completionRate
    });
  };

  const generateChartData = () => {
    const startDate = startOfMonth(selectedMonth);
    const endDate = endOfMonth(selectedMonth);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const dailyData = days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayProductions = productions.filter(prod => 
        prod.graphics_production_day?.date === dayStr
      );

      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        quantity: dayProductions.reduce((sum, prod) => sum + (prod.quantity || 0), 0),
        revenue: dayProductions.reduce((sum, prod) => sum + (prod.total_cost || 0), 0),
        productions: dayProductions.length
      };
    });

    setChartData(dailyData);
  };

  const generateProductDistribution = () => {
    const productMap = new Map<string, { quantity: number; revenue: number }>();

    productions.forEach(prod => {
      const productName = prod.product?.name || 'Produto Desconhecido';
      const existing = productMap.get(productName) || { quantity: 0, revenue: 0 };
      productMap.set(productName, {
        quantity: existing.quantity + (prod.quantity || 0),
        revenue: existing.revenue + (prod.total_cost || 0)
      });
    });

    const distribution = Array.from(productMap.entries())
      .map(([name, data], index) => ({
        name,
        value: data.revenue,
        quantity: data.quantity,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Top 8 products

    setProductDistribution(distribution);
  };

  const exportToExcel = () => {
    const exportData = productions.map(prod => ({
      'Data': prod.graphics_production_day?.date ? format(parseISO(prod.graphics_production_day.date), 'dd/MM/yyyy') : '',
      'Código': prod.product?.code || '',
      'Produto': prod.product?.name || '',
      'Quantidade': prod.quantity || 0,
      'Custo Unitário': prod.unit_cost || 0,
      'Valor Total': prod.total_cost || 0,
      'Status': prod.status === 'COMPLETED' ? 'Concluído' : prod.status === 'IN_PROGRESS' ? 'Em Andamento' : 'Pendente',
      'Status Faturamento': prod.billing_status === 'BILLED' ? 'Faturado' : 'Não Faturado'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório Gráfica');
    XLSX.writeFile(wb, `relatorio-grafica-${format(selectedMonth, 'MM-yyyy')}.xlsx`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Relatórios da Gráfica</h1>
              <p className="mt-2 text-gray-600">
                Análise detalhada da produção gráfica de {format(selectedMonth, 'MMMM yyyy', { locale: ptBR })}
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <input
                  type="month"
                  value={format(selectedMonth, 'yyyy-MM')}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split('-');
                    setSelectedMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
                  }}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={exportToExcel}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Quantidade Total</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalQuantity)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Faturamento Total</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Faturamentos Concluídos</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.completedBilling)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Taxa de Conclusão</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completionRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Production Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Produção Diária</h3>
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'quantity' ? formatNumber(value) : value,
                      name === 'quantity' ? 'Quantidade' : 'Produções'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="quantity" 
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily Revenue Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Faturamento Diário</h3>
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Product Distribution and Production Count */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Product Distribution by Revenue */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Distribuição por Produto (Faturamento)</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {productDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [formatCurrency(value), 'Faturamento']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Production Count Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Número de Produções Diárias</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [value, 'Produções']}
                  />
                  <Bar dataKey="productions" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Products List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Lista de Produtos</h3>
            <p className="mt-1 text-sm text-gray-500">
              {productions.length} produções encontradas
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantidade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productions.map((production) => (
                  <tr key={production.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {production.product?.code || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {production.product?.name || 'Produto Desconhecido'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatNumber(production.quantity || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(production.total_cost || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        production.status === 'COMPLETED' 
                          ? 'bg-green-100 text-green-800'
                          : production.status === 'IN_PROGRESS'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {production.status === 'COMPLETED' ? 'Concluído' : 
                         production.status === 'IN_PROGRESS' ? 'Em Andamento' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {productions.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma produção encontrada</h3>
              <p className="mt-1 text-sm text-gray-500">
                Não há dados de produção para o período selecionado.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}