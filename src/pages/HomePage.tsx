import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, parseISO, isSameWeek, addDays, setDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, BarChart2, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { WeeklyReport } from '../components/WeeklyReport';

interface ProductionDay {
  id: string;
  date: string;
  created_at: string;
}

interface Production {
  id: string;
  product_name: string;
  code: string;
  batch_number: string;
  quantity: number;
  status: string;
  created_at: string;
  department_name: string | null;
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
  IN_PRODUCTION: number;
  PENDING: number;
  total: number;
}

interface Department {
  id: string;
  name: string;
}

export function HomePage() {
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
    IN_PRODUCTION: 0,
    PENDING: 0,
    total: 0
  });
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetchProductionDays();
    fetchStatusSummary();
    fetchDepartments();
  }, []);

  useEffect(() => {
    groupByWeek();
  }, [productionDays, searchDate, searchTerm]);

  async function fetchDepartments() {
    try {
      const { data, error } = await supabase
        .from('classifications')
        .select('id, name')
        .eq('type', 'DEPARTMENT')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }

  async function fetchStatusSummary() {
    try {
      const { data, error } = await supabase
        .from('productions')
        .select('status');

      if (error) throw error;

      const summary = (data || []).reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        acc.total++;
        return acc;
      }, { COMPLETED: 0, IN_PRODUCTION: 0, PENDING: 0, total: 0 } as StatusSummary);

      setStatusSummary(summary);
    } catch (error) {
      console.error('Error fetching status summary:', error);
    }
  }

  async function fetchProductionDays() {
    try {
      const { data, error } = await supabase
        .from('production_days')
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
        .from('productions')
        .select(`
          *,
          department_name:products(department:classifications(name))
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) throw error;

      // Transform the data to include department_name directly
      const transformedData = (data || []).map(prod => ({
        ...prod,
        department_name: prod.department_name?.department?.name || null
      }));

      return transformedData;
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

  async function toggleWeekReport(index: number) {
    const newGroups = [...weekGroups];
    const group = newGroups[index];
    
    if (!group.showReport) {
      const productions = await fetchProductionsForWeek(
        group.startDate,
        group.endDate
      );
      group.productions = productions;
    }
    
    group.showReport = !group.showReport;
    setWeekGroups(newGroups);
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
        .from('production_days')
        .select('id')
        .eq('date', formattedDate);

      if (queryError) throw queryError;

      if (existingDays && existingDays.length > 0) {
        setError('Já existe um dia de produção para esta data');
        return;
      }

      const { error: insertError } = await supabase
        .from('production_days')
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
        .from('production_days')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchProductionDays();
    } catch (error) {
      console.error('Error deleting production day:', error);
      alert('Falha ao excluir dia de produção');
    }
  }

  function calculatePercentage(value: number): string {
    if (statusSummary.total === 0) return '0%';
    return `${((value / statusSummary.total) * 100).toFixed(1)}%`;
  }

  function handleExportExcel() {
    try {
      const allProductions = weekGroups
        .filter(group => group.showReport)
        .flatMap(group => group.productions);

      // Group productions by department
      const productionsByDepartment = allProductions.reduce((acc, prod) => {
        const deptName = prod.department_name || 'Sem Departamento';
        if (!acc[deptName]) {
          acc[deptName] = [];
        }
        acc[deptName].push(prod);
        return acc;
      }, {} as Record<string, Production[]>);

      // Create a workbook with a sheet for each department
      const wb = utils.book_new();

      Object.entries(productionsByDepartment).forEach(([deptName, productions]) => {
        const exportData = productions.map(prod => ({
          'Código': prod.code,
          'Produto': prod.product_name,
          'Lote': prod.batch_number,
          'Quantidade': prod.quantity,
          'Status': prod.status === 'COMPLETED' ? 'Concluído' : 
                   prod.status === 'IN_PRODUCTION' ? 'Em Produção' : 
                   'Pendente',
          'Data': format(new Date(prod.created_at), 'dd/MM/yyyy')
        }));

        const ws = utils.json_to_sheet(exportData);
        utils.book_append_sheet(wb, ws, deptName);
      });

      writeFile(wb, 'producoes_por_departamento.xlsx');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Falha ao exportar dados');
    }
  }

  function filterProductionsBySearchTerm(productions: Production[]) {
    if (!searchTerm) return productions;

    const searchLower = searchTerm.toLowerCase();
    return productions.filter(prod => 
      prod.code.toLowerCase().includes(searchLower) ||
      prod.product_name.toLowerCase().includes(searchLower) ||
      prod.batch_number?.toLowerCase().includes(searchLower) ||
      prod.department_name?.toLowerCase().includes(searchLower)
    );
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
              <p className="text-green-800 text-sm font-medium">Concluídas</p>
              <p className="text-2xl font-bold text-green-600">{statusSummary.COMPLETED}</p>
            </div>
            <div className="flex items-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <span className="ml-2 text-green-600 font-semibold">
                {calculatePercentage(statusSummary.COMPLETED)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-800 text-sm font-medium">Em Produção</p>
              <p className="text-2xl font-bold text-yellow-600">{statusSummary.IN_PRODUCTION}</p>
            </div>
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <span className="ml-2 text-yellow-600 font-semibold">
                {calculatePercentage(statusSummary.IN_PRODUCTION)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-800 text-sm font-medium">Aguardando</p>
              <p className="text-2xl font-bold text-red-600">{statusSummary.PENDING}</p>
            </div>
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <span className="ml-2 text-red-600 font-semibold">
                {calculatePercentage(statusSummary.PENDING)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dias de Produção</h1>
        <button
          onClick={() => setShowNewDayModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Dia de Produção
        </button>
      </div>

      <div className="mb-6">
        <div>
          <input
            type="date"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          />
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

            {group.showReport && (
              <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
                {departments.map(dept => {
                  const deptProductions = filterProductionsBySearchTerm(group.productions)
                    .filter(prod => prod.department_name === dept.name);

                  if (deptProductions.length === 0) return null;

                  return (
                    <div key={dept.id} className="mb-8">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">
                        {dept.name}
                      </h4>
                      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Código
                              </th>
                              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Produto
                              </th>
                              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Lote
                              </th>
                              <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Quantidade
                              </th>
                              <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {deptProductions.map((production) => (
                              <tr key={production.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {production.code}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {production.product_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {production.batch_number}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                  {production.quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    production.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                    production.status === 'IN_PRODUCTION' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {production.status === 'COMPLETED' ? 'Concluído' :
                                     production.status === 'IN_PRODUCTION' ? 'Em Produção' :
                                     'Pendente'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}

                {/* Products without department */}
                {(() => {
                  const noDeptProductions = filterProductionsBySearchTerm(group.productions)
                    .filter(prod => !prod.department_name);

                  if (noDeptProductions.length === 0) return null;

                  return (
                    <div className="mb-8">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">
                        Sem Departamento
                      </h4>
                      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead>
                            <tr>
                              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Código
                              </th>
                              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Produto
                              </th>
                              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Lote
                              </th>
                              <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Quantidade
                              </th>
                              <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {noDeptProductions.map((production) => (
                              <tr key={production.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {production.code}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {production.product_name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {production.batch_number}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                  {production.quantity}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    production.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                    production.status === 'IN_PRODUCTION' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {production.status === 'COMPLETED' ? 'Concluído' :
                                     production.status === 'IN_PRODUCTION' ? 'Em Produção' :
                                     'Pendente'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <ul className="divide-y divide-gray-200">
              {group.days.map((day) => (
                <li key={day.id}>
                  <div className="flex items-center justify-between px-4 py-4 sm:px-6 hover:bg-gray-50">
                    <Link
                      to={`/day/${day.date}`}
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
        {weekGroups.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            Nenhum dia de produção encontrado
          </div>
        )}
      </div>

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