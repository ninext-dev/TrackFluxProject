import React, { useEffect, useState } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { Download, DollarSign, TrendingUp, BarChart2, PieChart } from 'lucide-react';
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
} from 'recharts';
import { utils, writeFile } from 'xlsx';

interface Production {
  id: string;
  product_name: string;
  code: string;
  quantity: number;
  status: 'PENDING' | 'COMPLETED';
  billing_status: 'NOT_BILLED' | 'BILLED';
  cmv_value: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  created_at: string;
}

const COLORS = ['#10B981', '#FBBF24', '#EF4444', '#6366F1', '#8B5CF6', '#EC4899'];

export function GraphicsReportsPage() {
  const [loading, setLoading] = useState(true);
  const [productions, setProductions] = useState<Production[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return format(now, 'yyyy-MM');
  });

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedMonth]);

  async function fetchMonthlyData() {
    try {
      const monthDate = parseISO(selectedMonth + '-01');
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);

      const { data, error } = await supabase
        .from('graphics_productions')
        .select(`
          *,
          quantity,
          status,
          billing_status,
          cmv_value,
          unit_cost,
          total_cost,
          created_at,
          product:products (
            name,
            code
          ),
          films:graphics_production_films (
            quantity,
            product:products (
              name,
              unit_of_measure
            )
          ),
          inks:graphics_production_inks (
            quantity,
            product:products (
              name,
              unit_of_measure
            )
          )
        `)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at');

      if (error) throw error;
      setProductions(data || []);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleExportExcel() {
    try {
      const exportData = productions.map(prod => ({
        'Código': prod.product?.code || prod.code,
        'Nome do produto': prod.product?.name || prod.product_name,
        'Filme utilizado': prod.films?.map(f => 
          `${f.product.name} (${f.quantity} ${f.product.unit_of_measure})`
        ).join(', ') || '-',
        'Custo insumos': prod.cmv_value && prod.quantity ? prod.cmv_value / prod.quantity : 0,
        'Operacional': 0.09,
        'Custo rótulo': prod.cmv_value && prod.quantity ? (prod.cmv_value / prod.quantity) + 0.09 : 0.09,
        'Preço Compra': prod.cmv_value && prod.quantity ? ((prod.cmv_value / prod.quantity) + 0.09) * 1.12 : 0.09 * 1.12
      }));

      const ws = utils.json_to_sheet(exportData);
      
      // Format numbers using Brazilian locale
      const range = utils.decode_range(ws['!ref'] || 'A1');
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = 3; C <= 6; ++C) {
          const cell = ws[utils.encode_cell({r: R, c: C})];
          if (cell && cell.t === 'n') {
            cell.z = '#,##0.0000';
          }
        }
      }

      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Relatório Gráfica');
      
      writeFile(wb, `relatorio_grafica_${selectedMonth}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Falha ao exportar relatório');
    }
  }

  // Calculate daily production data
  const dailyData = eachDayOfInterval({
    start: startOfMonth(parseISO(selectedMonth + '-01')),
    end: endOfMonth(parseISO(selectedMonth + '-01'))
  }).map(date => {
    const dayProductions = productions.filter(p => 
      format(parseISO(p.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );

    return {
      date: format(date, 'dd/MM'),
      quantidade: dayProductions.reduce((sum, p) => sum + p.quantity, 0),
      faturamento: dayProductions
        .filter(p => p.billing_status === 'BILLED')
        .reduce((sum, p) => sum + (p.total_cost || 0), 0)
    };
  });

  // Calculate product distribution
  const productDistribution = productions.reduce((acc, prod) => {
    if (!acc[prod.product_name]) {
      const name = prod.product?.name || prod.product_name;
      acc[prod.product_name] = {
        name,
        quantity: 0,
        revenue: 0
      };
    }
    acc[prod.product_name].quantity += prod.quantity;
    acc[prod.product_name].revenue += prod.total_cost || 0;
    return acc;
  }, {} as Record<string, { name: string; quantity: number; revenue: number }>);

  const topProducts = Object.values(productDistribution)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Calculate summary statistics
  const summary = {
    total_quantity: productions.reduce((sum, p) => sum + p.quantity, 0),
    total_revenue: productions
      .filter(p => p.billing_status === 'BILLED')
      .reduce((sum, p) => sum + (p.total_cost || 0), 0),
    billed_count: productions.filter(p => p.billing_status === 'BILLED').length,
    completion_rate: productions.length > 0
      ? (productions.filter(p => p.status === 'COMPLETED').length / productions.length) * 100
      : 0
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Relatório da Gráfica</h1>
        <div className="flex items-center space-x-4">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
          >
            <Download className="h-5 w-5 mr-2" />
            Exportar XLSX
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-800 text-sm font-medium">Produção Total</p>
              <p className="text-2xl font-bold text-indigo-600">{summary.total_quantity}</p>
            </div>
            <BarChart2 className="h-8 w-8 text-indigo-500" />
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-800 text-sm font-medium">Faturamento Total</p>
              <p className="text-2xl font-bold text-green-600">
                R$ {summary.total_revenue.toFixed(2)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-800 text-sm font-medium">Produções Faturadas</p>
              <p className="text-2xl font-bold text-yellow-600">{summary.billed_count}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-800 text-sm font-medium">Taxa de Conclusão</p>
              <p className="text-2xl font-bold text-purple-600">
                {summary.completion_rate.toFixed(1)}%
              </p>
            </div>
            <PieChart className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Production Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Produção Diária</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar name="Quantidade" dataKey="quantidade" fill="#6366F1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Revenue Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Faturamento Diário</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  name="Faturamento"
                  dataKey="faturamento"
                  stroke="#10B981"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Distribution */}
        <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Distribuição por Produto (Top 5)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={topProducts}
                  dataKey="quantity"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label={({ name, percent }) => 
                    `${name} (${(percent * 100).toFixed(1)}%)`
                  }
                >
                  {topProducts.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Detalhamento de Produções</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CMV
                </th>
                <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Custo Unitário
                </th>
                <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {productions.map((production) => (
                <tr key={production.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{production.product?.code}</div>
                    <div className="text-sm text-gray-500">{production.product?.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {production.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {production.cmv_value 
                      ? `R$ ${production.cmv_value.toFixed(2)}`
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {production.total_cost
                      ? `R$ ${production.total_cost.toFixed(2)}`
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      production.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {production.status === 'COMPLETED' ? 'Concluído' : 'Pendente'}
                    </span>
                    {production.billing_status === 'BILLED' && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        Faturado
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}