import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Plus, Search, Trash2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { WeeklyReport } from '../components/WeeklyReport';

interface Production {
  id: string;
  product_name: string;
  code: string;
  batch_number: string;
  expiry_date: string;
  batches: number;
  quantity: number;
  image_url: string | null;
  transaction_number: string | null;
  status: 'PENDING' | 'IN_PRODUCTION' | 'COMPLETED';
  created_at: string;
}

interface ProductionDay {
  id: string;
  date: string;
  created_at: string;
}

interface Filters {
  search: string;
  status: string;
}

export function ProductionDayPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [productions, setProductions] = useState<Production[]>([]);
  const [filteredProductions, setFilteredProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [productionDay, setProductionDay] = useState<ProductionDay | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
  });

  useEffect(() => {
    if (date) {
      fetchProductionDay();
    }
  }, [date]);

  useEffect(() => {
    filterProductions();
  }, [productions, filters]);

  async function createProductionDay() {
    try {
      const { data: existingDays, error: checkError } = await supabase
        .from('production_days')
        .select('*')
        .eq('date', date);

      if (checkError) throw checkError;

      if (existingDays && existingDays.length > 0) {
        setError('Já existe um dia de produção para esta data');
        return;
      }

      const { data, error } = await supabase
        .from('production_days')
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
        .from('production_days')
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
        .from('productions')
        .select('*')
        .eq('production_day_id', data[0].id)
        .order('created_at', { ascending: true });

      if (productionsError) throw productionsError;
      setProductions(productionsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch production day data');
      setProductions([]);
    } finally {
      setLoading(false);
    }
  }

  async function updateProductionStatus(id: string, newStatus: 'PENDING' | 'IN_PRODUCTION' | 'COMPLETED') {
    try {
      if (newStatus === 'COMPLETED') {
        navigate(`/production/${id}`);
        return;
      }

      const { error } = await supabase
        .from('productions')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      fetchProductionDay();
    } catch (error) {
      console.error('Error updating production status:', error);
      alert('Failed to update production status');
    }
  }

  async function deleteProductionDay() {
    if (!productionDay || !window.confirm('Tem certeza que deseja excluir este dia de produção?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('production_days')
        .delete()
        .eq('id', productionDay.id);

      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error('Error deleting production day:', error);
      alert('Falha ao excluir dia de produção');
    }
  }

  function filterProductions() {
    let filtered = [...productions];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.product_name.toLowerCase().includes(searchLower) ||
          p.code.toLowerCase().includes(searchLower) ||
          p.batch_number.toLowerCase().includes(searchLower) ||
          p.expiry_date.includes(searchLower) ||
          (p.transaction_number && p.transaction_number.toLowerCase().includes(searchLower))
      );
    }

    if (filters.status) {
      filtered = filtered.filter((p) => p.status === filters.status);
    }

    setFilteredProductions(filtered);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'IN_PRODUCTION':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'IN_PRODUCTION':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dia de Produção: {format(new Date(date!), 'PPP')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Gerenciar produções para este dia
          </p>
        </div>
        <div className="flex space-x-4">
          <Link
            to={`/production/new?day=${productionDay.id}`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nova Produção
          </Link>
          <button
            onClick={deleteProductionDay}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Trash2 className="h-5 w-5 mr-2" />
            Excluir Dia
          </button>
        </div>
      </div>

      <div className="mb-8">
        <WeeklyReport productions={productions} />
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label htmlFor="search" className="sr-only">
              Pesquisar
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Pesquisar por código, nome, lote..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
          <select
            className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Todos os Status</option>
            <option value="PENDING">Pendente</option>
            <option value="IN_PRODUCTION">Em Produção</option>
            <option value="COMPLETED">Concluído</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {filteredProductions.map((production) => (
            <li key={production.id} className="relative">
              <Link
                to={`/production/${production.id}`}
                className="block hover:bg-gray-50"
              >
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {production.product_name}
                        </p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {production.code}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(production.status)}`}>
                          {production.status === 'PENDING' ? 'Pendente' : 
                           production.status === 'IN_PRODUCTION' ? 'Em Produção' : 
                           'Concluído'}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center">
                        <p className="text-sm text-gray-500">
                          Lote: {production.batch_number}
                          {production.transaction_number && (
                            <span className="ml-2 text-green-600">
                              Transação: {production.transaction_number}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right text-sm whitespace-nowrap">
                        <p className="text-gray-500">
                          Validade: {format(new Date(production.expiry_date), 'PP')}
                        </p>
                        <p className="mt-1 text-gray-500">
                          Quantidade: {production.quantity}
                        </p>
                      </div>
                      {production.status !== 'COMPLETED' && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            updateProductionStatus(
                              production.id,
                              production.status === 'PENDING' ? 'IN_PRODUCTION' : 'COMPLETED'
                            );
                          }}
                          className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          {getStatusIcon(production.status)}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
          {filteredProductions.length === 0 && (
            <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
              Nenhuma produção encontrada
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}