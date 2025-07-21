import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, parseISO, isSameWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, Tag, Trash2, CheckCircle2, Clock, AlertCircle, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProductionDay {
  id: string;
  date: string;
  created_at: string;
}

interface Production {
  id: string;
  product_name: string;
  code: string;
  quantity: number;
  status: string;
  billing_status: string;
  created_at: string;
}

interface WeekGroup {
  startDate: Date;
  endDate: Date;
  days: ProductionDay[];
  showReport: boolean;
  productions: Production[];
}

interface StatusSummary {
  COMPLETED: number;
  PENDING: number;
  total: number;
  completion_rate: number;
}

export function GraphicsPage() {
  const [productionDays, setProductionDays] = useState<ProductionDay[]>([]);
  const [weekGroups, setWeekGroups] = useState<WeekGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDate, setSearchDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewDayModal, setShowNewDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return format(now, 'yyyy-MM-dd');
  });
  const [error, setError] = useState<string | null>(null);
  const [statusSummary, setStatusSummary] = useState<StatusSummary>({
    COMPLETED: 0,
    PENDING: 0,
    total: 0,
    completion_rate: 0
  });

  useEffect(() => {
    fetchProductionDays();
    fetchStatusSummary();
  }, []);

  useEffect(() => {
    groupByWeek();
  }, [productionDays, searchDate, searchTerm]);

  async function fetchStatusSummary() {
    try {
      const { data, error } = await supabase
        .from('graphics_productions')
        .select('status');

      if (error) throw error;

      const summary = (data || []).reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        acc.total++;
        return acc;
      }, { COMPLETED: 0, PENDING: 0, total: 0 } as StatusSummary);

      summary.completion_rate = summary.total > 0 
        ? (summary.COMPLETED / summary.total) * 100 
        : 0;

      setStatusSummary(summary);
    } catch (error) {
      console.error('Error fetching status summary:', error);
    }
  }

  async function fetchProductionDays() {
    try {
      const { data, error } = await supabase
        .from('graphics_production_days')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setProductionDays(data || []);
    } catch (error) {
      console.error('Error fetching production days:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProductionsForWeek(startDate: Date, endDate: Date) {
    try {
      const { data, error } = await supabase
        .from('graphics_productions')
        .select(`
          *,
          product:products(name, code)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching productions:', error);
      return [];
    }
  }

  function groupByWeek() {
    const groups: WeekGroup[] = [];
    const processedWeeks = new Set();

    productionDays.forEach((day) => {
      if (searchDate && !day.date.includes(searchDate)) return;

      const date = parseISO(day.date);
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
      const weekKey = weekStart.toISOString();

      if (!processedWeeks.has(weekKey)) {
        processedWeeks.add(weekKey);
        groups.push({
          startDate: weekStart,
          endDate: weekEnd,
          days: productionDays.filter((d) =>
            isSameWeek(parseISO(d.date), date, { weekStartsOn: 1 })
          ),
          showReport: false,
          productions: [],
        });
      }
    });

    setWeekGroups(groups);
  }

  async function createProductionDay() {
    try {
      setError(null);
      
      const selectedDateObj = parseISO(selectedDate);
      if (isNaN(selectedDateObj.getTime())) {
        setError('Data inválida selecionada');
        return;
      }

      const nextDay = addDays(selectedDateObj, 1);
      const formattedDate = format(nextDay, 'yyyy-MM-dd');

      const { data: existingDays, error: queryError } = await supabase
        .from('graphics_production_days')
        .select('id')
        .eq('date', formattedDate);

      if (queryError) throw queryError;

      if (existingDays && existingDays.length > 0) {
        setError('Já existe um dia de produção para esta data');
        return;
      }

      const { error: insertError } = await supabase
        .from('graphics_production_days')
        .insert([{ 
          date: formattedDate,
          user_id: '00000000-0000-0000-0000-000000000000'
        }]);

      if (insertError) throw insertError;

      await fetchProductionDays();
      setShowNewDayModal(false);
      setError(null);
    } catch (error) {
      console.error('Error creating production day:', error);
      setError('Falha ao criar dia de produção');
    }
  }

  async function deleteProductionDay(id: string) {
    if (!window.confirm('Tem certeza que deseja excluir este dia de produção?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('graphics_production_days')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchProductionDays();
    } catch (error) {
      console.error('Error deleting production day:', error);
      alert('Falha ao excluir dia de produção');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-800 text-sm font-medium">Produção Total</p>
              <p className="text-2xl font-bold text-green-600">{statusSummary.total}</p>
            </div>
            <BarChart2 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-800 text-sm font-medium">Total de Produtos</p>
              <p className="text-2xl font-bold text-yellow-600">{statusSummary.COMPLETED + statusSummary.PENDING}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-800 text-sm font-medium">Taxa de Conclusão</p>
              <p className="text-2xl font-bold text-indigo-600">{statusSummary.completion_rate.toFixed(1)}%</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-indigo-500" />
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Pesquisar por código, nome ou lote..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <input
              type="date"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Programação Gráfica</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie os dias de produção da gráfica
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowNewDayModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Dia de Produção
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {weekGroups.map((group, groupIndex) => (
          <div key={group.startDate.toISOString()} className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Semana de {format(group.startDate, "dd/MM")} a {format(group.endDate, "dd/MM")}
              </h3>
            </div>

            <ul className="divide-y divide-gray-200">
              {group.days.map((day) => (
                <li key={day.id}>
                  <div className="flex items-center justify-between px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <Link
                      to={`/graphics/day/${day.date}`}
                      className="flex-1 block"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            Dia de Produção
                          </p>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {format(new Date(day.date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </Link>
                    <button
                      onClick={() => deleteProductionDay(day.id)}
                      className="ml-4 p-2 text-red-600 hover:text-red-900 focus:outline-none"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* New Day Modal */}
      {showNewDayModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Criar Novo Dia de Produção
            </h3>
            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                Selecione a Data
              </label>
              <input
                type="date"
                id="date"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <p className="mt-1 text-sm text-gray-500">
                O dia de produção será criado para o dia seguinte à data selecionada.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowNewDayModal(false);
                  setError(null);
                }}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={createProductionDay}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}