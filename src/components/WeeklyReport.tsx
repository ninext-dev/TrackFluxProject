import React from 'react';
import { format, parseISO } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface Production {
  id: string;
  product_name: string;
  quantity: number;
  programmed_quantity: number;
  has_divergence: boolean;
  status: string;
  created_at: string;
}

interface WeeklyReportProps {
  productions: Production[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const STATUS_COLORS = {
  COMPLETED: '#10B981',
  IN_PRODUCTION: '#FBBF24',
  PENDING: '#EF4444',
};

const STATUS_TRANSLATIONS = {
  COMPLETED: 'Concluído',
  IN_PRODUCTION: 'Em Produção',
  PENDING: 'Pendente',
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  value,
  name,
  index
}: any) => {
  // Only show label if percentage is greater than 3%
  if (percent < 0.03) return null;

  const radius = outerRadius * 1.2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Adjust text anchor based on position
  const textAnchor = x > cx ? 'start' : 'end';

  // Format the percentage
  const percentageText = `${(percent * 100).toFixed(1)}%`;

  return (
    <g>
      <text
        x={x}
        y={y}
        textAnchor={textAnchor}
        fill="#374151"
        fontSize="12"
        dominantBaseline="central"
      >
        {`${name.length > 30 ? name.substring(0, 30) + '...' : name} (${percentageText})`}
      </text>
    </g>
  );
};

export function WeeklyReport({ productions }: WeeklyReportProps) {
  // Calculate total quantities by product
  const productQuantities = productions.reduce((acc, prod) => {
    acc[prod.product_name] = (acc[prod.product_name] || 0) + prod.quantity;
    return acc;
  }, {} as Record<string, number>);

  // Sort products by quantity and take top 10
  const pieData = Object.entries(productQuantities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, value]) => ({
      name,
      value,
    }));

  // Calculate status distribution
  const statusCount = productions.reduce(
    (acc, prod) => {
      acc[prod.status] = (acc[prod.status] || 0) + 1;
      acc.total++;
      return acc;
    },
    { COMPLETED: 0, IN_PRODUCTION: 0, PENDING: 0, total: 0 } as Record<string, number>
  );

  const statusData = Object.entries(statusCount).map(([status, count]) => ({
    status: STATUS_TRANSLATIONS[status as keyof typeof STATUS_TRANSLATIONS] || status,
    count,
  }));

  // Daily production quantities and divergences
  const dailyProduction = productions.reduce((acc, prod) => {
    const date = format(parseISO(prod.created_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = {
        quantity: 0,
        programmed: 0,
        divergences: 0,
      };
    }
    acc[date].quantity += prod.quantity;
    acc[date].programmed += prod.programmed_quantity;
    if (prod.has_divergence) {
      acc[date].divergences++;
    }
    return acc;
  }, {} as Record<string, { quantity: number; programmed: number; divergences: number }>);

  const barData = Object.entries(dailyProduction).map(([date, data]) => ({
    date: format(parseISO(date), 'dd MMM', { locale: ptBR }),
    quantidade: data.quantity,
    programado: data.programmed,
    divergências: data.divergences,
  }));

  // Calculate divergence statistics
  const divergenceStats = productions.reduce(
    (acc, prod) => {
      if (prod.has_divergence) {
        acc.total++;
        acc.difference += Math.abs(prod.quantity - prod.programmed_quantity);
      }
      return acc;
    },
    { total: 0, difference: 0 }
  );

  // Calculate statistics
  const totalQuantity = productions.reduce((sum, prod) => sum + prod.quantity, 0);
  const totalProgrammed = productions.reduce((sum, prod) => sum + prod.programmed_quantity, 0);
  const totalProducts = productions.length;
  const completedProducts = productions.filter((p) => p.status === 'COMPLETED').length;
  const completionRate = totalProducts
    ? ((completedProducts / totalProducts) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Produção Total</h3>
          <p className="text-3xl font-bold text-indigo-600">{totalQuantity}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Total de Produtos</h3>
          <p className="text-3xl font-bold text-indigo-600">{totalProducts}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Taxa de Conclusão</h3>
          <p className="text-3xl font-bold text-indigo-600">{completionRate}%</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Divergências</h3>
          <p className="text-3xl font-bold text-yellow-600">{divergenceStats.total}</p>
          {divergenceStats.total > 0 && (
            <p className="text-sm text-gray-500">
              Diferença total: {divergenceStats.difference.toFixed(2)} unidades
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Production Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Produção Diária
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar name="Quantidade Real" dataKey="quantidade" fill="#6366F1" />
                <Bar name="Quantidade Programada" dataKey="programado" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Divergences Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Divergências por Dia
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  name="Divergências"
                  dataKey="divergências"
                  stroke="#EAB308"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Distribution Pie Chart - Full Width */}
        <div className="bg-white p-4 rounded-lg shadow lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Distribuição de Produtos (Top 10)
          </h3>
          <div className="h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={renderCustomizedLabel}
                  outerRadius={180}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} unidades`, 'Quantidade']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}