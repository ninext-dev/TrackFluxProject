import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { AlertTriangle, Search, Plus, Trash2, DollarSign } from 'lucide-react';

interface Product {
  id: string;
  code: string;
  name: string;
  department_id: string | null;
  unit_of_measure?: string;
}

interface Production {
  id: string;
  product_id: string;
  quantity: number;
  status: 'PENDING' | 'COMPLETED';
  billing_status: 'NOT_BILLED' | 'BILLED';
  cmv_value: number | null;
  unit_cost: number | null;
  total_cost: number | null;
}

interface Ink {
  id: string;
  ink_id: string;
  ink_quantity: number;
  quantity: number;
  product: Product;
}

interface Film {
  id: string;
  film_id: string;
  film_quantity: number;
  quantity: number;
  product: Product;
}

const LABOR_COST = 0.09; // Fixed labor cost
const TAX_RATE = 0.12; // 12% tax rate

export function GraphicsProductionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = id === 'new';
  const productionDayId = new URLSearchParams(location.search).get('day');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [inks, setInks] = useState<Product[]>([]);
  const [films, setFilms] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInks, setSelectedInks] = useState<{ ink_id: string; product: Product }[]>([]);
  const [inkQuantities, setInkQuantities] = useState<Record<string, number>>({});
  const [selectedFilms, setSelectedFilms] = useState<{ film_id: string; product: Product }[]>([]);
  const [showInkSelector, setShowInkSelector] = useState(false);
  const [showFilmSelector, setShowFilmSelector] = useState(false);
  const [filmQuantity, setFilmQuantity] = useState<number>(0);

  const [formData, setFormData] = useState<Partial<Production & { invoice_number?: string }>>({
    product_id: '',
    quantity: 0,
    status: 'PENDING',
    billing_status: 'NOT_BILLED',
    cmv_value: null,
    unit_cost: null,
    total_cost: null,
    invoice_number: ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setLoading(true);
      await Promise.all([
        fetchProducts(),
        fetchInks(),
        fetchFilms(),
        !isNew && id ? fetchProduction() : null
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('classifications')
        .select('id')
        .eq('type', 'DEPARTMENT')
        .eq('name', 'PA Gráfica')
        .single();

      if (error) throw error;

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('department_id', data.id);

      if (productsError) throw productsError;
      setProducts(productsData || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Falha ao carregar produtos');
    }
  }

  async function fetchInks() {
    try {
      const { data: deptData, error: deptError } = await supabase
        .from('classifications')
        .select('id')
        .eq('type', 'DEPARTMENT')
        .eq('name', 'MP Tinta Gráfica')
        .single();

      if (deptError) throw deptError;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('department_id', deptData.id);

      if (error) throw error;
      setInks(data || []);
    } catch (error) {
      console.error('Error fetching inks:', error);
      setError('Falha ao carregar tintas');
    }
  }

  async function fetchFilms() {
    try {
      const { data: deptData, error: deptError } = await supabase
        .from('classifications')
        .select('id')
        .eq('type', 'DEPARTMENT')
        .eq('name', 'MP Filme Gráfica')
        .single();

      if (deptError) throw deptError;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('department_id', deptData.id);

      if (error) throw error;
      setFilms(data || []);
    } catch (error) {
      console.error('Error fetching films:', error);
      setError('Falha ao carregar filmes');
    }
  }

  async function fetchProduction() {
    try {
      const { data: production, error: productionError } = await supabase
        .from('graphics_productions')
        .select(`
          *,
          product:products(*)
        `)
        .eq('id', id)
        .single();

      if (productionError) throw productionError;

      if (production.product) {
        setSelectedProduct(production.product);
      }

      const { data: inks, error: inksError } = await supabase
        .from('graphics_production_inks')
        .select(`
          *,
          product:products(*)
        `)
        .eq('graphics_production_id', id);

      if (inksError) throw inksError;

      const { data: films, error: filmsError } = await supabase
        .from('graphics_production_films')
        .select(`
          *,
          product:products(*)
        `)
        .eq('graphics_production_id', id);

      if (filmsError) throw filmsError;

      setFormData(production);
      
      if (inks && inks.length > 0) {
        setSelectedInks(inks.map(ink => ({
          ink_id: ink.ink_id,
          product: ink.product
        })));
        const quantities = inks.reduce((acc, ink) => ({
          ...acc,
          [ink.ink_id]: ink.quantity
        }), {});
        setInkQuantities(quantities);
      }
      
      if (films && films.length > 0) {
        setSelectedFilms(films.map(film => ({
          film_id: film.film_id,
          product: film.product
        })));
        setFilmQuantity(films.reduce((sum, film) => sum + film.quantity, 0));
      }
    } catch (error) {
      console.error('Error fetching production:', error);
      setError('Falha ao carregar produção');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isNew && !productionDayId) {
      setError('ID do dia de produção é necessário');
      return;
    }
    
    if (!formData.product_id) {
      setError('Por favor, selecione um produto');
      return;
    }

    if (!formData.quantity || formData.quantity <= 0) {
      setError('A quantidade deve ser maior que zero');
      return;
    }

    try {
      let productionId: string | null = id || null;

      if (isNew) {
        const { data, error } = await supabase
          .from('graphics_productions')
          .insert([{
            product_id: formData.product_id,
            quantity: formData.quantity,
            graphics_production_day_id: productionDayId,
            status: 'PENDING',
            billing_status: 'NOT_BILLED',
            cmv_value: formData.cmv_value || null,
            unit_cost: formData.unit_cost || null,
            total_cost: formData.total_cost || null
          }])
          .select()
          .single();

        if (error) throw error;
        productionId = data.id;
      } else {
        const { error } = await supabase
          .from('graphics_productions')
          .update(formData.invoice_number ? {
            product_id: formData.product_id,
            quantity: formData.quantity,
            status: formData.invoice_number ? 'COMPLETED' : 'PENDING',
            billing_status: formData.invoice_number ? 'BILLED' : 'NOT_BILLED',
            cmv_value: formData.cmv_value || null,
            unit_cost: formData.unit_cost || null,
            total_cost: formData.total_cost || null,
            invoice_number: formData.invoice_number,
            billing_status: 'BILLED',
            billing_completed_at: new Date().toISOString()
          } : {
            product_id: formData.product_id,
            quantity: formData.quantity,
            cmv_value: formData.cmv_value || null,
            unit_cost: formData.unit_cost || null,
            total_cost: formData.total_cost || null,
            invoice_number: null,
            billing_status: 'NOT_BILLED',
            billing_completed_at: null
          })
          .eq('id', id);

        if (error) throw error;
      }

      if (selectedInks.length > 0) {
        if (!isNew) {
          const { error: deleteError } = await supabase
            .from('graphics_production_inks')
            .delete()
            .eq('graphics_production_id', productionId);
            
          if (deleteError) throw deleteError;
        }

        const inkData = selectedInks.map(ink => ({
          graphics_production_id: productionId,
          ink_id: ink.ink_id,
          quantity: inkQuantities[ink.ink_id] || 0
        }));

        const { error: inksError } = await supabase
          .from('graphics_production_inks')
          .insert(inkData);

        if (inksError) throw inksError;
      }

      if (selectedFilms.length > 0) {
        if (!isNew) {
          const { error: deleteError } = await supabase
            .from('graphics_production_films')
            .delete()
            .eq('graphics_production_id', productionId);
            
          if (deleteError) throw deleteError;
        }

        const filmQuantityPerItem = filmQuantity / selectedFilms.length;
        const filmData = selectedFilms.map(film => ({
          graphics_production_id: productionId,
          film_id: film.film_id,
          quantity: filmQuantityPerItem
        }));

        const { error: filmsError } = await supabase
          .from('graphics_production_films')
          .insert(filmData);

        if (filmsError) throw filmsError;
      }

      if (productionDayId) {
        const { data: dayData, error: dayError } = await supabase
          .from('graphics_production_days')
          .select('date')
          .eq('id', productionDayId)
          .single();

        if (dayError) throw dayError;
        if (dayData) {
          navigate(`/graphics/day/${dayData.date}`);
          return;
        }
      }

      navigate('/graphics');
    } catch (error) {
      console.error('Error saving production:', error);
      const errorMessage = error instanceof Error ? error.message : 
        error?.message || 'Falha ao salvar produção. Verifique os dados e tente novamente.';
      setError(errorMessage);
    }
  }

  function calculateCosts() {
    if (!formData.cmv_value || !formData.quantity) return;

    const unitCost = formData.cmv_value / formData.quantity;
    const laborCost = LABOR_COST;
    const taxCost = (unitCost + laborCost) * TAX_RATE;
    const totalCost = unitCost + laborCost + taxCost;

    setFormData(prev => ({
      ...prev,
      unit_cost: unitCost,
      total_cost: totalCost
    }));
  }

  const filteredProducts = products.filter(product =>
    product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {(selectedProduct || formData.product_id) && (
        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold text-gray-900 truncate">
                  {selectedProduct?.name || formData.product_name}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Código: {selectedProduct?.code || formData.code}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Produto
              </label>
              <div className="mt-1">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={selectedProduct ? "Alterar produto..." : "Pesquisar produto..."}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <Search className="absolute right-3 top-2 h-5 w-5 text-gray-400" />
                </div>
                {searchTerm && (
                  <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {filteredProducts.map((product) => (
                      <li
                        key={product.id}
                        className="relative cursor-pointer select-none py-2 pl-3 pr-9 hover:bg-gray-100"
                        onClick={() => {
                          setSelectedProduct(product);
                          setFormData(prev => ({ 
                            ...prev, 
                            product_id: product.id,
                            code: product.code || '',
                            product_name: product.name || ''
                          }));
                          setSearchTerm('');
                        }}
                      >
                        <div className="flex items-center">
                          <span className="font-medium">{product.code}</span>
                          <span className="ml-2 text-gray-500">{product.name}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedProduct && (
                  <div className="mt-2 p-2 border border-gray-300 rounded-md bg-gray-50">
                    <div className="font-medium">{selectedProduct.code}</div>
                    <div className="text-sm text-gray-500">{selectedProduct.name}</div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quantidade
              </label>
              <input
                type="number"
                min="0"
                value={formData.quantity || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tintas Utilizadas
              </label>
              <div className="mt-1 space-y-2">
                {selectedInks.map((ink, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div className="flex-1">
                      <span>{ink.product.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInks(prev => prev.filter((_, i) => i !== index));
                          const newQuantities = { ...inkQuantities };
                          delete newQuantities[ink.ink_id];
                          setInkQuantities(newQuantities);
                        }}
                        className="ml-2 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="ml-4 w-32">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={inkQuantities[ink.ink_id] || 0}
                        onChange={(e) => setInkQuantities({ ...inkQuantities, [ink.ink_id]: Number(e.target.value) })}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setShowInkSelector(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Tinta
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Filmes Utilizados
              </label>
              <div className="mt-1 space-y-2">
                {selectedFilms.map((film, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <span>{film.product.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFilms(prev => prev.filter((_, i) => i !== index))}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setShowFilmSelector(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Filme
                </button>
              </div>
            </div>

            {selectedFilms.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantidade Total de Filme
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={filmQuantity}
                  onChange={(e) => setFilmQuantity(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Quantidade por filme: {(filmQuantity / selectedFilms.length).toFixed(3)}
                </p>
              </div>
            )}

            {(selectedInks.length > 0 || selectedFilms.length > 0) && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Materiais Selecionados</h3>
                <div className="bg-gray-50 p-4 rounded-md space-y-4">
                  {selectedInks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Tintas</h4>
                      <div className="space-y-2">
                        {selectedInks.map((ink, idx) => (
                          <div key={`ink-${idx}`} className="flex justify-between text-sm">
                            <span className="text-gray-600">{ink.product.name}</span>
                            <span className="text-gray-900 font-medium">
                              {inkQuantities[ink.ink_id]?.toFixed(3) || '0.000'} {ink.product.unit_of_measure || 'KG'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedFilms.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Filmes</h4>
                      <div className="space-y-2">
                        {selectedFilms.map((film, idx) => (
                          <div key={`film-${idx}`} className="flex justify-between text-sm">
                            <span className="text-gray-600">{film.product.name}</span>
                            <span className="text-gray-900 font-medium">
                              {(filmQuantity / selectedFilms.length).toFixed(3)} {film.product.unit_of_measure || 'UN'}
                            </span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-gray-200 flex justify-between text-sm">
                          <span className="font-medium text-gray-700">Total de Filme</span>
                          <span className="font-medium text-indigo-600">{filmQuantity.toFixed(3)} {selectedFilms[0]?.product.unit_of_measure || 'UN'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isNew && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900">Informações de Custo</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Valor do CMV
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">R$</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.cmv_value || ''}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, cmv_value: Number(e.target.value) }));
                          calculateCosts();
                        }}
                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                      />
                    </div>
                  </div>

                  {formData.cmv_value && formData.quantity && (
                    <div className="bg-gray-50 p-4 rounded-md space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Custo Insumos / UN:</span>
                        <span className="text-sm font-medium">
                          R$ {formData.unit_cost ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(formData.unit_cost) : '0,0000'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Custo Mão de Obra / UN:</span>
                        <span className="text-sm font-medium">R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(LABOR_COST)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Custo dos Tributos / UN:</span>
                        <span className="text-sm font-medium">
                          R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format((formData.unit_cost || 0) * TAX_RATE)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-700">Custo Unitário Total:</span>
                        <span className="text-sm font-medium text-indigo-600">
                          R$ {formData.total_cost ? new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(formData.total_cost) : '0,0000'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-200">
                        <span className="text-sm font-medium text-gray-700">Valor Total (Custo Unitário Total x Quantidade):</span>
                        <span className="text-sm font-medium text-indigo-600">
                          R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format((formData.total_cost || 0) * (formData.quantity || 0))}
                        </span>
                      </div>
                      <div className="mt-4">
                        <label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700">
                          Número da Nota Fiscal
                        </label>
                        <input
                          type="text"
                          id="invoice_number"
                          value={formData.invoice_number || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          placeholder="Digite o número da nota fiscal"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Ao preencher o número da nota fiscal, a produção será marcada como concluída e faturada automaticamente.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {isNew ? 'Criar Produção' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showInkSelector && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Selecionar Tintas
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {inks.map((ink) => (
                <label key={ink.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedInks.some(i => i.ink_id === ink.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedInks(prev => [...prev, { ink_id: ink.id, product: ink }]);
                      } else {
                        setSelectedInks(prev => prev.filter(i => i.ink_id !== ink.id));
                        const newQuantities = { ...inkQuantities };
                        delete newQuantities[ink.id];
                        setInkQuantities(newQuantities);
                      }
                    }}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900">{ink.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInkSelector(false)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {showFilmSelector && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Selecionar Filmes
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {films.map((film) => (
                <label key={film.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedFilms.some(f => f.film_id === film.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedFilms(prev => [...prev, { film_id: film.id, product: film }]);
                      } else {
                        setSelectedFilms(prev => prev.filter(f => f.film_id !== film.id));
                      }
                    }}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900">{film.name}</span>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFilmSelector(false)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}