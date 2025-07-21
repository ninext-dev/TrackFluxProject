import React, { useEffect, useState } from 'react';
import { Download, AlertCircle, Clock, CheckCircle, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { utils, writeFile } from 'xlsx';

interface Production {
  id: string;
  code: string;
  product_name: string;
  batches: number;
  quantity: number;
  programmed_quantity: number;
  batch_number: string;
  expiry_date: string;
  transaction_number: string | null;
  status: 'PENDING' | 'IN_PRODUCTION' | 'COMPLETED';
  department_name: string | null;
}

type ReportType = 'PENDING' | 'IN_PRODUCTION' | 'COMPLETED';

interface Department {
  id: string;
  name: string;
}

export function ProductionReportsPage() {
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportType>(() => {
    const savedStatus = localStorage.getItem('productionReportStatus');
    return (savedStatus as ReportType) || 'PENDING';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [counts, setCounts] = useState({
    PENDING: 0,
    IN_PRODUCTION: 0,
    COMPLETED: 0
  });

  useEffect(() => {
    fetchCounts();
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchProductions();
  }, [selectedReport]);
  
  useEffect(() => {
    localStorage.setItem('productionReportStatus', selectedReport);
  }, [selectedReport]);

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

  async function fetchCounts() {
    try {
      const { data, error } = await supabase
        .from('productions')
        .select('status');

      if (error) throw error;

      const statusCounts = (data || []).reduce((acc, prod) => {
        acc[prod.status] = (acc[prod.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      setCounts({
        PENDING: statusCounts['PENDING'] || 0,
        IN_PRODUCTION: statusCounts['IN_PRODUCTION'] || 0,
        COMPLETED: statusCounts['COMPLETED'] || 0
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  }

  async function fetchProductions() {
    try {
      const { data, error } = await supabase
        .from('productions')
        .select(`
          *,
          department_name:products(department:classifications(name))
        `)
        .eq('status', selectedReport)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to include department_name directly
      const transformedData = (data || []).map(prod => ({
        ...prod,
        department_name: prod.department_name?.department?.name || null
      }));

      setProductions(transformedData);
    } catch (error) {
      console.error('Error fetching productions:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleExportExcel() {
    try {
      // Group productions by department
      const productionsByDepartment = productions.reduce((acc, prod) => {
        const deptName = prod.department_name || 'Sem Departamento';
        if (!acc[deptName]) {
          acc[deptName] = [];
        }
        acc[deptName].push(prod);
        return acc;
      }, {} as Record<string, Production[]>);

      // Create a workbook with a sheet for each department
      const wb = utils.book_new();

      Object.entries(productionsByDepartment).forEach(([deptName, deptProductions]) => {
        const exportData = deptProductions.map(prod => ({
          'Código': prod.code,
          'Produto': prod.product_name,
          'Lote': prod.batch_number,
          'Qtd. Programada': prod.programmed_quantity,
          'Qtd. Realizada': prod.quantity,
          'Validade': format(new Date(prod.expiry_date), 'dd/MM/yyyy'),
          'Transação': prod.transaction_number || '',
          'Status': prod.status === 'COMPLETED' ? 'Concluído' : 
                   prod.status === 'IN_PRODUCTION' ? 'Em Produção' : 
                   'Pendente'
        }));

        const ws = utils.json_to_sheet(exportData);
        utils.book_append_sheet(wb, ws, deptName);
      });
      
      writeFile(wb, `producoes_${selectedReport.toLowerCase()}.xlsx`);
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

  const filteredProductions = filterProductionsBySearchTerm(productions);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Relatório de Programação</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => setSelectedReport('PENDING')}
            className={`p-4 rounded-lg border ${
              selectedReport === 'PENDING'
                ? 'bg-red-50 border-red-200'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  selectedReport === 'PENDING' ? 'text-red-800' : 'text-gray-800'
                }`}>
                  Aguardando Produção
                </p>
                <p className={`text-2xl font-bold ${
                  selectedReport === 'PENDING' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {counts.PENDING}
                </p>
              </div>
              <AlertCircle className={`h-8 w-8 ${
                selectedReport === 'PENDING' ? 'text-red-500' : 'text-gray-400'
              }`} />
            </div>
          </button>

          <button
            onClick={() => setSelectedReport('IN_PRODUCTION')}
            className={`p-4 rounded-lg border ${
              selectedReport === 'IN_PRODUCTION'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  selectedReport === 'IN_PRODUCTION' ? 'text-yellow-800' : 'text-gray-800'
                }`}>
                  Em Produção
                </p>
                <p className={`text-2xl font-bold ${
                  selectedReport === 'IN_PRODUCTION' ? 'text-yellow-600' : 'text-gray-600'
                }`}>
                  {counts.IN_PRODUCTION}
                </p>
              </div>
              <Clock className={`h-8 w-8 ${
                selectedReport === 'IN_PRODUCTION' ? 'text-yellow-500' : 'text-gray-400'
              }`} />
            </div>
          </button>

          <button
            onClick={() => setSelectedReport('COMPLETED')}
            className={`p-4 rounded-lg border ${
              selectedReport === 'COMPLETED'
                ? 'bg-green-50 border-green-200'
                : 'bg-white border-gray-200 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${
                  selectedReport === 'COMPLETED' ? 'text-green-800' : 'text-gray-800'
                }`}>
                  Concluído
                </p>
                <p className={`text-2xl font-bold ${
                  selectedReport === 'COMPLETED' ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {counts.COMPLETED}
                </p>
              </div>
              <CheckCircle className={`h-8 w-8 ${
                selectedReport === 'COMPLETED' ? 'text-green-500' : 'text-gray-400'
              }`} />
            </div>
          </button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">
            {selectedReport === 'PENDING' && 'Produções Aguardando'}
            {selectedReport === 'IN_PRODUCTION' && 'Produções em Andamento'}
            {selectedReport === 'COMPLETED' && 'Produções Concluídas'}
          </h2>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Download className="h-5 w-5 mr-2" />
            Exportar XLSX
          </button>
        </div>

        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Pesquisar por código, nome, lote ou departamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {departments.map(dept => {
          const deptProductions = filteredProductions.filter(prod => 
            prod.department_name === dept.name
          );

          if (deptProductions.length === 0) return null;

          return (
            <div key={dept.id} className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {dept.name}
              </h3>
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
                      <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batidas
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qtd. Programada
                      </th>
                      {selectedReport === 'COMPLETED' && (
                        <>
                          <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qtd. Realizada
                          </th>
                          <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lote
                          </th>
                          <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Validade
                          </th>
                          <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Transação
                          </th>
                        </>
                      )}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {production.batches}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {production.programmed_quantity}
                        </td>
                        {selectedReport === 'COMPLETED' && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {production.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {production.batch_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(production.expiry_date), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {production.transaction_number}
                            </td>
                          </>
                        )}
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
          const noDeptProductions = filteredProductions.filter(prod => !prod.department_name);
          
          if (noDeptProductions.length === 0) return null;

          return (
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Sem Departamento
              </h3>
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
                      <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batidas
                      </th>
                      <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Qtd. Programada
                      </th>
                      {selectedReport === 'COMPLETED' && (
                        <>
                          <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Qtd. Realizada
                          </th>
                          <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Lote
                          </th>
                          <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Validade
                          </th>
                          <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Transação
                          </th>
                        </>
                      )}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {production.batches}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {production.programmed_quantity}
                        </td>
                        {selectedReport === 'COMPLETED' && (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                              {production.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {production.batch_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {format(new Date(production.expiry_date), 'dd/MM/yyyy')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {production.transaction_number}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {filteredProductions.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma produção encontrada'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Tente pesquisar com outros termos.' : 'Não há produções para exibir.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}