import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { utils, writeFile } from 'xlsx';
import { SearchInput } from '../components/SearchInput';
import { formatNumber } from '../utils/format';

type ClassificationType = 'UNIT' | 'DEPARTMENT' | 'BRAND' | 'PRODUCT_TYPE';

interface Classification {
  id: string;
  name: string;
  type: ClassificationType;
  created_at: string;
}

const CLASSIFICATION_TYPES = {
  UNIT: 'Unidade de Medida',
  DEPARTMENT: 'Departamento',
  BRAND: 'Marca',
  PRODUCT_TYPE: 'Tipo de Produto'
} as const;

export function ClassificationsPage() {
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingClassification, setEditingClassification] = useState<Classification | null>(null);
  const [selectedClassification, setSelectedClassification] = useState<Classification | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'UNIT' as ClassificationType
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClassifications();
  }, []);

  function handleEdit(classification: Classification) {
    setEditingClassification(classification);
    setFormData({
      name: classification.name,
      type: classification.type
    });
    setShowModal(true);
  }

  async function fetchClassifications() {
    try {
      const { data, error } = await supabase
        .from('classifications')
        .select('*')
        .order('type')
        .order('name');

      if (error) throw error;
      setClassifications(data || []);
    } catch (error) {
      console.error('Error fetching classifications:', error);
      setError('Falha ao carregar classificações');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const existingClassification = classifications.find(
      c => c.type === formData.type && c.name.toLowerCase() === formData.name.toLowerCase()
    );

    if (existingClassification) {
      setError('Já existe uma classificação com este nome para este tipo');
      return;
    }

    try {
      if (editingClassification) {
        const { error } = await supabase
          .from('classifications')
          .update({ name: formData.name })
          .eq('id', editingClassification.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('classifications')
          .insert([{ 
            name: formData.name.trim(), 
            type: formData.type 
          }]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingClassification(null);
      setFormData({ name: '', type: 'UNIT' });
      fetchClassifications();
    } catch (error) {
      console.error('Error saving classification:', error);
      setError('Falha ao salvar classificação. Verifique se já não existe uma classificação com este nome.');
    }
  }

  async function handleDelete(classification: Classification) {
    if (!window.confirm('Tem certeza que deseja excluir esta classificação?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('classifications')
        .delete()
        .eq('id', classification.id);

      if (error) throw error;
      fetchClassifications();
    } catch (error) {
      console.error('Error deleting classification:', error);
      setError('Falha ao excluir classificação. Verifique se ela não está sendo usada em algum produto.');
    }
  }

  const handleSearch = (filters: string[]) => {
    setSearchFilters(filters);
  };

  const filteredClassifications = classifications.filter(classification =>
    searchFilters.length === 0 || searchFilters.some(filter => {
      const searchLower = filter.toLowerCase();
      return (
        classification.name.toLowerCase().includes(searchLower) ||
        CLASSIFICATION_TYPES[classification.type].toLowerCase().includes(searchLower)
      );
    })
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Classificações</h1>
        <button
          onClick={() => {
            setEditingClassification(null);
            setFormData({ name: '', type: 'UNIT' });
            setShowModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Classificação
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <SearchInput
          placeholder="Pesquisar classificações..."
          onSearch={handleSearch}
        />
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredClassifications.map((classification) => (
              <tr 
                key={classification.id}
                onClick={() => setSelectedClassification(selectedClassification?.id === classification.id ? null : classification)}
                className={`cursor-pointer hover:bg-gray-50 ${
                  selectedClassification?.id === classification.id ? 'bg-indigo-50' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {classification.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {CLASSIFICATION_TYPES[classification.type]}
                </td>
              </tr>
            ))}
            {filteredClassifications.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                  Nenhuma classificação encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div 
        className={`fixed right-8 bottom-8 flex flex-col gap-4 z-50 transition-all duration-300 ease-in-out transform ${
          selectedClassification ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <button
          onClick={() => selectedClassification && handleEdit(selectedClassification)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors duration-200"
          title="Editar classificação"
        >
          <Edit2 className="h-5 w-5" />
        </button>
        <button
          onClick={() => selectedClassification && handleDelete(selectedClassification)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-colors duration-200"
          title="Excluir classificação"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingClassification ? 'Editar Classificação' : 'Nova Classificação'}
            </h3>
            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                  Tipo
                </label>
                <select
                  id="type"
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as ClassificationType })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  disabled={!!editingClassification}
                >
                  {Object.entries(CLASSIFICATION_TYPES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingClassification(null);
                    setError(null);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {editingClassification ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}