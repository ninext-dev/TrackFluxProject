import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Beaker, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { utils, writeFile } from 'xlsx';
import { SearchInput } from '../components/SearchInput';

interface Product {
  id: string;
  code: string;
  name: string;
  brand: string;
  product_type: string;
  unit_of_measure: 'KG' | 'UN' | 'L';
  is_active: boolean;
}

interface Formulation {
  id: string;
  product_id: string;
  name: string;
  description: string;
  product: Product;
}

interface FormulationItem {
  id: string;
  formulation_id: string;
  product_id: string;
  item_type: 'RECIPE' | 'PACKAGING';
  integer_quantity: number;
  weight_quantity: number;
  product: Product;
}

export function FormulationPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [formulations, setFormulations] = useState<Formulation[]>([]);
  const [filteredFormulations, setFilteredFormulations] = useState<Formulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState<string[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedFormulation, setSelectedFormulation] = useState<Formulation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFormulation, setEditingFormulation] = useState<Formulation | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    yield: '',
    product_id: '',
  });

  const [recipeItems, setRecipeItems] = useState<FormulationItem[]>([]);
  const [packagingItems, setPackagingItems] = useState<FormulationItem[]>([]);
  const [showItemSearch, setShowItemSearch] = useState(false);
  const [itemSearchType, setItemSearchType] = useState<'RECIPE' | 'PACKAGING'>('RECIPE');
  const [availableItems, setAvailableItems] = useState<Product[]>([]);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'RECIPE' | 'PACKAGING'>('RECIPE');

  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const debouncedUpdateItem = React.useCallback(
    debounce(async (item: FormulationItem, updates: Partial<FormulationItem>) => {
      try {
        const { error } = await supabase
          .from('formulation_items')
          .update(updates)
          .eq('id', item.id);

        if (error) throw error;
        await fetchFormulationItems(item.formulation_id);
      } catch (error) {
        console.error('Error updating item:', error);
        alert('Falha ao atualizar item');
      }
    }, 500),
    []
  );

  async function handleUpdateItem(item: FormulationItem, updates: Partial<FormulationItem>) {
    const updatedItems = selectedTab === 'RECIPE' ? recipeItems : packagingItems;
    const updatedItemsList = updatedItems.map(i => 
      i.id === item.id ? { ...i, ...updates } : i
    );

    if (selectedTab === 'RECIPE') {
      setRecipeItems(updatedItemsList as FormulationItem[]);
    } else {
      setPackagingItems(updatedItemsList as FormulationItem[]);
    }

    debouncedUpdateItem(item, updates);
  }

  useEffect(() => {
    fetchFormulations();
    fetchProducts();
  }, []);

  useEffect(() => {
    // Filter formulations when searchTerm changes
    if (formulations.length > 0) {
      const filtered = formulations.filter(formulation =>
        searchFilters.length === 0 || searchFilters.some(filter => {
          const searchLower = filter.toLowerCase();
          return (
            formulation.product.code.toLowerCase().includes(searchLower) ||
            formulation.product.name.toLowerCase().includes(searchLower) ||
            formulation.name.toLowerCase().includes(searchLower) ||
            (formulation.description && formulation.description.toLowerCase().includes(searchLower))
          );
        })
      );
      setFilteredFormulations(filtered);
    }
  }, [searchFilters, formulations]);

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('product_type', 'FINISHED_PRODUCT')
        .order('code');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }

  async function fetchFormulationItems(formulationId: string) {
    try {
      const { data, error } = await supabase
        .from('formulation_items')
        .select(`
          *,
          product:products(*)
        `)
        .eq('formulation_id', formulationId);

      if (error) throw error;

      const recipe = data.filter(item => item.item_type === 'RECIPE');
      const packaging = data.filter(item => item.item_type === 'PACKAGING');

      setRecipeItems(recipe);
      setPackagingItems(packaging);
    } catch (error) {
      console.error('Error fetching formulation items:', error);
    }
  }

  async function fetchAvailableItems(type: 'RECIPE' | 'PACKAGING') {
    try {
      const productTypes = type === 'RECIPE' 
        ? ['RAW_MATERIAL', 'INTERMEDIATE_PRODUCT']
        : ['PACKAGING'];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .in('product_type', productTypes)
        .order('code');

      if (error) throw error;
      setAvailableItems(data || []);
    } catch (error) {
      console.error('Error fetching available items:', error);
    }
  }

  async function fetchFormulations() {
    try {
      const { data, error } = await supabase
        .from('formulations')
        .select(`
          *,
          product:products(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFormulations(data || []);
      setFilteredFormulations(data || []);
    } catch (error) {
      console.error('Error fetching formulations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedProduct) {
      setError('Por favor, selecione um produto');
      return;
    }

    try {
      if (editingFormulation) {
        const { error } = await supabase
          .from('formulations')
          .update({
            name: formData.name,
            yield: formData.yield,
            product_id: selectedProduct.id
          })
          .eq('id', editingFormulation.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('formulations')
          .insert([{
            name: formData.name,
            yield: formData.yield,
            product_id: selectedProduct.id
          }]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingFormulation(null);
      setSelectedProduct(null);
      setFormData({ name: '', yield: '', product_id: '' });
      fetchFormulations();
    } catch (error) {
      console.error('Error saving formulation:', error);
      setError('Falha ao salvar formulação');
    }
  }

  async function handleDelete(formulation: Formulation) {
    if (!window.confirm('Tem certeza que deseja excluir esta formulação?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('formulations')
        .delete()
        .eq('id', formulation.id);

      if (error) throw error;
      fetchFormulations();
    } catch (error) {
      console.error('Error deleting formulation:', error);
      alert('Falha ao excluir formulação');
    }
  }

  async function handleAddItem(product: Product) {
    if (!editingFormulation) return;

    try {
      const { error } = await supabase
        .from('formulation_items')
        .insert([{
          formulation_id: editingFormulation.id,
          product_id: product.id,
          item_type: itemSearchType,
          integer_quantity: 0,
          weight_quantity: 0
        }]);

      if (error) throw error;
      await fetchFormulationItems(editingFormulation.id);
      setShowItemSearch(false);
      setItemSearchTerm('');
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Falha ao adicionar item');
    }
  }

  async function handleDeleteItem(item: FormulationItem) {
    if (!window.confirm('Tem certeza que deseja remover este item?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('formulation_items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;
      await fetchFormulationItems(item.formulation_id);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Falha ao remover item');
    }
  }

  function calculateTotals(items: FormulationItem[]) {
    return items.reduce((acc, item) => ({
      integer: acc.integer + (item.integer_quantity || 0),
      weight: acc.weight + (item.weight_quantity || 0)
    }), { integer: 0, weight: 0 });
  }

  const filteredProductsForSearch = products.filter(product =>
    product.code.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const filteredItems = availableItems.filter(product =>
    product.code.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
    product.name.toLowerCase().includes(itemSearchTerm.toLowerCase())
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
        <h1 className="text-2xl font-bold text-gray-900">Formulação</h1>
        <button
          onClick={() => {
            setEditingFormulation(null);
            setSelectedProduct(null);
            setFormData({ name: '', description: '', product_id: '' });
            setProductSearchTerm('');
            setShowModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Formulação
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="mb-6">
        <SearchInput
          placeholder="Pesquisar por código ou nome do produto..."
          onSearch={(filters) => setSearchFilters(filters)}
        />
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Produto
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome da Formulação
              </th>
              <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rendimento
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredFormulations.map((formulation) => (
              <tr 
                key={formulation.id}
                onClick={() => setSelectedFormulation(selectedFormulation?.id === formulation.id ? null : formulation)}
                className={`cursor-pointer hover:bg-gray-50 ${
                  selectedFormulation?.id === formulation.id ? 'bg-indigo-50' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center">
                    <div>
                      <div className="font-medium">{formulation.product.code}</div>
                      <div className="text-gray-500">{formulation.product.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formulation.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                  {formulation.yield}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating Action Buttons */}
      {selectedFormulation && (
        <div 
          className="fixed right-8 bottom-8 flex flex-col gap-4 z-50 transition-transform duration-200"
        >
          <button
            onClick={() => {
              setEditingFormulation(selectedFormulation);
              setSelectedTab('RECIPE');
              fetchFormulationItems(selectedFormulation.id);
              setShowEditModal(true);
            }}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors duration-200"
            title="Editar formulação"
          >
            <Edit2 className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleDelete(selectedFormulation)}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-colors duration-200"
            title="Excluir formulação"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Modal for creating/editing formulation */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingFormulation ? 'Editar Formulação' : 'Nova Formulação'}
            </h3>
            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Produto
                </label>
                <div className="mt-1 relative">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Pesquisar por código ou nome do produto..."
                      onClick={() => setShowProductSearch(true)}
                    />
                  </div>
                  {selectedProduct && (
                    <div className="mt-2 p-2 border border-gray-300 rounded-md bg-gray-50">
                      <div className="font-medium">{selectedProduct.code}</div>
                      <div className="text-sm text-gray-500">{selectedProduct.name}</div>
                    </div>
                  )}
                  {showProductSearch && productSearchTerm.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                      {filteredProductsForSearch.length > 0 ? (
                        filteredProductsForSearch.map((product) => (
                          <div
                            key={product.id}
                            className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                            onClick={() => {
                              setSelectedProduct(product);
                              setProductSearchTerm('');
                              setShowProductSearch(false);
                            }}
                          >
                            <div className="flex items-center">
                              <span className="font-normal block truncate">
                                {product.code} - {product.name}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-2 px-3 text-gray-500">
                          Nenhum produto encontrado
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nome da Formulação
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
                <label htmlFor="yield" className="block text-sm font-medium text-gray-700">
                  Rendimento
                </label>
                <input
                  type="number"
                  id="yield"
                  min="0"
                  required
                  value={formData.yield}
                  onChange={(e) => setFormData({ ...formData, yield: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingFormulation(null);
                    setSelectedProduct(null);
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
                  {editingFormulation ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for editing formulation items */}
      {showEditModal && editingFormulation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Editar Formulação: {editingFormulation.name}
                <div className="mt-2 text-sm text-gray-500">
                  {editingFormulation.product.code} - {editingFormulation.product.name}
                </div>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Fechar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex">
                <button
                  onClick={() => setSelectedTab('RECIPE')}
                  className={`${
                    selectedTab === 'RECIPE'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  Receita
                </button>
                <button
                  onClick={() => setSelectedTab('PACKAGING')}
                  className={`${
                    selectedTab === 'PACKAGING'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
                >
                  Envase
                </button>
              </nav>
            </div>

            {/* Add Item Button */}
            <div className="mb-4">
              <button
                onClick={() => {
                  setItemSearchType(selectedTab);
                  fetchAvailableItems(selectedTab);
                  setShowItemSearch(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-5 w-5 mr-2" />
                Adicionar {selectedTab === 'RECIPE' ? 'Matéria-Prima' : 'Embalagem'}
              </button>
            </div>

            {/* Items Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade Inteiro
                    </th>
                    <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantidade Pesagem
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(selectedTab === 'RECIPE' ? recipeItems : packagingItems).map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.product.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.product.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="number"
                          min="0"
                          value={item.integer_quantity}
                          onChange={(e) => handleUpdateItem(item, { integer_quantity: Number(e.target.value) })}
                          className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={item.weight_quantity}
                          onChange={(e) => handleUpdateItem(item, { weight_quantity: Number(e.target.value) })}
                          className="w-24 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteItem(item)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={2} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Total
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {calculateTotals(selectedTab === 'RECIPE' ? recipeItems : packagingItems).integer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {calculateTotals(selectedTab === 'RECIPE' ? recipeItems : packagingItems).weight}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Yield Field */}
            <div className="mt-6 border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-medium text-gray-900">Rendimento</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    Quantidade produzida por batida
                  </p>
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={editingFormulation.yield || ''}
                    onChange={async (e) => {
                      const newYield = e.target.value;
                      const { error } = await supabase
                        .from('formulations')
                        .update({ yield: newYield })
                        .eq('id', editingFormulation.id);
                      
                      if (error) {
                        console.error('Error updating yield:', error);
                        return;
                      }
                      
                      setEditingFormulation({
                        ...editingFormulation,
                        yield: newYield
                      });
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Item Search Modal */}
            {showItemSearch && (
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      Adicionar {itemSearchType === 'RECIPE' ? 'Matéria-Prima' : 'Embalagem'}
                    </h3>
                    <button
                      onClick={() => setShowItemSearch(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <span className="sr-only">Fechar</span>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="mb-4">
                    <input
                      type="text"
                      value={itemSearchTerm}
                      onChange={(e) => setItemSearchTerm(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Pesquisar por código ou nome..."
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto">
                    {filteredItems.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleAddItem(product)}
                        className="cursor-pointer p-2 hover:bg-gray-100 rounded-md"
                      >
                        <div className="font-medium">{product.code}</div>
                        <div className="text-sm text-gray-500">{product.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}