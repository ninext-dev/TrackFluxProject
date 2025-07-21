import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, Trash2, AlertTriangle, CheckCircle, Clock, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Production {
  id: string;
  product_name: string;
  code: string;
  quantity: number;
  status: 'PENDING' | 'COMPLETED';
  billing_status: 'NOT_BILLED' | 'BILLED';
  created_at: string;
  invoice_number: string | null;
  billing_completed_at: string | null;
  cmv_value: number | null;
  unit_cost: number | null;
  total_cost: number | null;
  product?: {
    name: string;
    code: string;
    unit_of_measure: string;
  };
  films?: Array<{
    quantity: number;
    product: {
      name: string;
      unit_of_measure: string;
    };
  }>;
  inks?: Array<{
    quantity: number;
    product: {
      name: string;
      unit_of_measure: string;
    };
  }>;
}

interface ProductionDay {
  id: string;
  date: string;
  created_at: string;
}

interface StatusSummary {
  total_productions: number;
  total_products: number;
  completion_rate: number;
}

export function GraphicsProductionDayPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [productionDay, setProductionDay] = useState<ProductionDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filteredProductions, setFilteredProductions] = useState<Production[]>([]);
  const [selectedProduction, setSelectedProduction] = useState<Production | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusSummary, setStatusSummary] = useState<StatusSummary>({
    total_productions: 0,
    total_products: 0,
    completion_rate: 0
  });

  async function handleDelete(productionId: string) {
    if (!window.confirm('Tem certeza que deseja excluir esta produção?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('graphics_productions')
        .delete()
        .eq('id', productionId);

      if (error) throw error;
      fetchProductionDay();
    } catch (error) {
      console.error('Error deleting production:', error);
      alert('Falha ao excluir produção');
    }
  }

  useEffect(() => {
    if (date) {
      fetchProductionDay();
    }
  }, [date]);

  useEffect(() => {
    filterProductions();
  }, [productions, searchTerm]);

  async function createProductionDay() {
    try {
      const { data: existingDays, error: checkError } = await supabase
        .from('graphics_production_days')
        .select('*')
        .eq('date', date);

      if (checkError) throw checkError;

      if (existingDays && existingDays.length > 0) {
        setError('Já existe um dia de produção para esta data');
        return;
      }

      const { data, error } = await supabase
        .from('graphics_production_days')
        .insert([{ 
          date,
          user_id: '00000000-0000-0000-0000-000000000000'
        }])
        .select()
        .single();

      if (error) throw error;
      setProductionDay(data);
      setError(null);
      await fetchProductionDay();
    } catch (error) {
      console.error('Error creating production day:', error);
      setError('Falha ao criar dia de produção');
    }
  }

  async function fetchProductionDay() {
    try {
      const { data, error } = await supabase
        .from('graphics_production_days')
        .select('*')
        .eq('date', date);

      if (error) throw error;

      if (!data || data.length === 0) {
        setProductionDay(null);
        setError('No production day found for this date');
        setProductions([]);
        return;
      }

      setProductionDay(data[0]);
      setError(null);

      const { data: productionsData, error: productionsError } = await supabase
        .from('graphics_productions')
        .select(`
          *,
          product:products (
            name,
            code,
            unit_of_measure
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
        .eq('graphics_production_day_id', data[0].id)
        .order('created_at', { ascending: true });

      if (productionsError) throw productionsError;
      setProductions(productionsData || []);

      // Calculate status summary
      const summary = {
        total_productions: productionsData?.length || 0,
        total_products: productionsData?.reduce((sum, p) => sum + p.quantity, 0) || 0,
        completion_rate: productionsData?.length 
          ? (productionsData.filter(p => p.status === 'COMPLETED').length / productionsData.length) * 100 
          : 0
      };
      setStatusSummary(summary);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch production day data');
      setProductions([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteProductionDay() {
    if (!productionDay || !window.confirm('Tem certeza que deseja excluir este dia de produção?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('graphics_production_days')
        .delete()
        .eq('id', productionDay.id);

      if (error) throw error;
      navigate('/graphics');
    } catch (error) {
      console.error('Error deleting production day:', error);
      alert('Falha ao excluir dia de produção');
    }
  }

  function filterProductions() {
    if (!searchTerm) {
      setFilteredProductions(productions);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = productions.filter(prod => 
      prod.code?.toLowerCase().includes(searchLower) ||
      prod.product?.name?.toLowerCase().includes(searchLower) ||
      prod.product?.code?.toLowerCase().includes(searchLower)
    );

    setFilteredProductions(filtered);
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Nenhum Dia de Produção Encontrado</h3>
          <p className="mt-1 text-sm text-gray-500">
            Não há registro de produção para {format(new Date(date!), 'PPP')}
          </p>
          <div className="mt-6">
            <button
              onClick={createProductionDay}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              Criar Dia de Produção
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!productionDay) {
    return null;
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-800 text-sm font-medium">Produção Total</p>
              <p className="text-2xl font-bold text-green-600">{statusSummary.total_productions}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-800 text-sm font-medium">Total de Produtos</p>
              <p className="text-2xl font-bold text-yellow-600">{statusSummary.total_products}</p>
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
            <CheckCircle className="h-8 w-8 text-indigo-500" />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Pesquisar por código ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Produto
              </th>
              <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantidade
              </th>
              <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
          {filteredProductions.map((production) => (
            <tr 
              key={production.id} 
              className={`hover:bg-gray-50 cursor-pointer ${
                selectedProduction?.id === production.id ? 'bg-indigo-50' : ''
              }`}
              onClick={() => setSelectedProduction(
                selectedProduction?.id === production.id ? null : production
              )}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="font-medium text-gray-900">{production.code}</div>
                <div className="text-sm text-gray-500">{production.product?.name}</div>
                {(production.films?.length > 0 || production.inks?.length > 0) && (
                  <div className="mt-2 text-xs text-gray-500">
                    {production.films?.map((film, idx) => (
                      <div key={`film-${idx}`}>
                        Filme: {film.product.name} ({film.quantity.toFixed(3)} {film.product.unit_of_measure})
                      </div>
                    ))}
                    {production.inks?.map((ink, idx) => (
                      <div key={`ink-${idx}`}>
                        Tinta: {ink.product.name} ({ink.quantity.toFixed(3)} {ink.product.unit_of_measure})
                      </div>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="text-sm font-medium text-gray-900">{production.quantity} {production.product?.unit_of_measure}</div>
                <div className="text-sm text-gray-500">
                  <div className="space-y-1">
                    {production.invoice_number ? (
                      <>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          NF: {production.invoice_number}
                        </span>
                        {production.billing_completed_at && (
                          <div className="text-xs text-gray-500">
                            Faturado em: {format(new Date(production.billing_completed_at), 'dd/MM/yyyy')}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Faturamento Pendente
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  production.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {production.status === 'COMPLETED' ? 'Finalizado' : 'Pendente'}
                </span>
              </td>
            </tr>
          ))}
          {filteredProductions.length === 0 && (
            <tr>
              <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
              Nenhuma produção encontrada
              </td>
            </tr>
          )}
          </tbody>
        </table>
      </div>

      {productionDay && (
        <div className="fixed bottom-8 right-8 flex flex-col gap-4">
          {selectedProduction && (
            <>
              <button
                onClick={() => navigate(`/graphics/production/${selectedProduction.id}`)}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors duration-200"
                title="Editar produção"
              >
                <Edit2 className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDelete(selectedProduction.id)}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-colors duration-200"
                title="Excluir produção"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </>
          )}
          <button
            onClick={() => navigate(`/graphics/production/new?day=${productionDay.id}`)}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors duration-200"
            title="Nova produção"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}