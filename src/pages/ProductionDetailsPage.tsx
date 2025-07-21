import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { AlertCircle, Image as ImageIcon, X, Plus, Beaker, AlertTriangle } from 'lucide-react';

interface Production {
  id: string;
  product_name: string;
  code: string;
  batch_number: string;
  expiry_date: string;
  batches: number;
  quantity: number;
  programmed_quantity: number;
  has_divergence: boolean;
  production_day_id: string;
  transaction_number: string | null;
  status: 'PENDING' | 'IN_PRODUCTION' | 'COMPLETED';
  product_id: string | null;
}

interface ProductionPhoto {
  id: string;
  url: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  brand: string;
  product_type: string;
  is_active: boolean;
}

interface ProductionDay {
  id: string;
  date: string;
}

const STORAGE_BUCKET = 'production-images';

export function ProductionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = id === 'new';
  const productionDayId = new URLSearchParams(location.search).get('day');
  
  const [production, setProduction] = useState<Production | null>(null);
  const [productionDay, setProductionDay] = useState<ProductionDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showYieldModal, setShowYieldModal] = useState(false);
  const [photos, setPhotos] = useState<ProductionPhoto[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<Partial<Production>>({
    product_name: '',
    code: '',
    quantity: 0,
    batch_number: '',
    expiry_date: new Date().toISOString().split('T')[0],
    batches: 0,
    programmed_quantity: 0,
    has_divergence: false,
    production_day_id: productionDayId || '',
    transaction_number: '',
    status: 'PENDING',
    product_id: null
  });
  const [yieldFormData, setYieldFormData] = useState({
    yield: '',
  });

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        await Promise.all([
          fetchProducts(),
          isNew && productionDayId ? fetchProductionDay() : null,
          !isNew && id ? fetchProduction() : null,
          ensureStorageBucket()
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, [id, isNew, productionDayId]);

  useEffect(() => {
    if (formData.transaction_number) {
      setFormData(prev => ({
        ...prev,
        status: 'COMPLETED'
      }));
    }
  }, [formData.transaction_number]);

  useEffect(() => {
    if (!isNew && production?.programmed_quantity) {
      const hasDivergence = formData.quantity !== formData.programmed_quantity;
      setFormData(prev => ({
        ...prev,
        has_divergence: hasDivergence
      }));
    }
  }, [formData.quantity, formData.programmed_quantity]);

  async function ensureStorageBucket() {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === STORAGE_BUCKET);

      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(STORAGE_BUCKET, {
          public: true,
          fileSizeLimit: 10485760 // 10MB
        });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error ensuring storage bucket exists:', error);
    }
  }

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

  async function fetchProductionDay() {
    if (!productionDayId) return;
    
    try {
      const { data, error } = await supabase
        .from('production_days')
        .select('*')
        .eq('id', productionDayId)
        .single();

      if (error) throw error;
      setProductionDay(data);
    } catch (error) {
      console.error('Error fetching production day:', error);
      navigate('/');
    }
  }

  async function fetchProduction() {
    try {
      const { data: productionData, error: productionError } = await supabase
        .from('productions')
        .select('*')
        .eq('id', id)
        .single();

      if (productionError) throw productionError;
      setProduction(productionData);
      setFormData({
        ...productionData,
        programmed_quantity: productionData.quantity
      });

      // Fetch production photos
      const { data: photosData, error: photosError } = await supabase
        .from('production_photos')
        .select('*')
        .eq('production_id', id)
        .order('created_at', { ascending: true });

      if (photosError) throw photosError;
      setPhotos(photosData || []);

      if (productionData.production_day_id) {
        const { data: dayData, error: dayError } = await supabase
          .from('production_days')
          .select('*')
          .eq('id', productionData.production_day_id)
          .single();

        if (dayError) throw dayError;
        setProductionDay(dayData);
      }
    } catch (error) {
      console.error('Error fetching production:', error);
      navigate('/');
    }
  }

  async function handleImageUpload(file: File) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productionDayId && isNew) {
      setError('Production day ID is required');
      return;
    }

    // Calculate quantity based on batches and yield
    const { data: formulations, error: formulationError } = await supabase
      .from('formulations')
      .select('yield')
      .eq('product_id', formData.product_id)
      .limit(1);

    if (formulationError) {
      console.error('Error fetching formulation:', formulationError);
      setError('Erro ao buscar formulação');
      return;
    }

    let yieldValue = null;
    if (formulations && formulations.length > 0) {
      yieldValue = formulations[0].yield;
    }

    if (!yieldValue) {
      setShowYieldModal(true);
      return;
    }

    // Use parseFloat to handle decimal values with commas
    const batchesValue = typeof formData.batches === 'string' 
      ? parseFloat(formData.batches.replace(',', '.')) 
      : formData.batches || 0;
      
    const calculatedQuantity = yieldValue ? Number(yieldValue) * batchesValue : 0;
    const programmedQuantity = calculatedQuantity;

    // If editing and quantity was manually set, use that instead
    const finalQuantity = formData.quantity || calculatedQuantity;
    const hasDivergence = finalQuantity !== programmedQuantity;

    try {
      let productionId = production?.id;

      if (isNew) {
        const { data, error } = await supabase
          .from('productions')
          .insert([{
            ...formData,
            batches: batchesValue,
            quantity: finalQuantity,
            programmed_quantity: programmedQuantity,
            status: formData.transaction_number ? 'COMPLETED' : formData.status,
            has_divergence: hasDivergence,
            user_id: '00000000-0000-0000-0000-000000000000'
          }])
          .select()
          .single();

        if (error) throw error;
        productionId = data.id;
      } else if (production) {
        const { error } = await supabase
          .from('productions')
          .update({
            ...formData,
            batches: batchesValue,
            quantity: finalQuantity,
            programmed_quantity: production.programmed_quantity,
            status: formData.transaction_number ? 'COMPLETED' : formData.status,
            has_divergence: hasDivergence,
            user_id: '00000000-0000-0000-0000-000000000000'
          })
          .eq('id', production.id);

        if (error) throw error;
      }

      // Upload new photos
      if (selectedFiles.length > 0 && productionId) {
        const uploadPromises = selectedFiles.map(async (file) => {
          const url = await handleImageUpload(file);
          return {
            production_id: productionId,
            url
          };
        });

        const uploadedPhotos = await Promise.all(uploadPromises);
        const { error: photosError } = await supabase
          .from('production_photos')
          .insert(uploadedPhotos);

        if (photosError) throw photosError;
      }

      if (productionDay) {
        navigate(`/day/${productionDay.date}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error saving production:', error);
      setError('Falha ao salvar produção');
    }
  }

  async function handleYieldSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      // Get existing formulation
      const { data: formulations, error: fetchError } = await supabase
        .from('formulations')
        .select('id')
        .eq('product_id', formData.product_id)
        .limit(1);

      if (fetchError) throw fetchError;

      if (!formulations || formulations.length === 0) {
        throw new Error('Formulação não encontrada');
      }

      // Update existing formulation's yield
      const { error: updateError } = await supabase
        .from('formulations')
        .update({
          yield: yieldFormData.yield
        })
        .eq('id', formulations[0].id);

      if (updateError) throw updateError;

      setShowYieldModal(false);
      await handleSubmit(e);
    } catch (error) {
      console.error('Error saving yield:', error);
      setError(error instanceof Error ? error.message : 'Falha ao salvar rendimento');
    }
  }

  async function handleDelete() {
    if (!production || !window.confirm('Are you sure you want to delete this production?')) {
      return;
    }

    try {
      // Delete all photos from storage
      for (const photo of photos) {
        const imagePath = photo.url.split('/').pop();
        if (imagePath) {
          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([imagePath]);
        }
      }

      const { error } = await supabase
        .from('productions')
        .delete()
        .eq('id', production.id);

      if (error) throw error;
      
      if (productionDay) {
        navigate(`/day/${productionDay.date}`);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error deleting production:', error);
      setError('Failed to delete production');
    }
  }

  async function handleDeletePhoto(photo: ProductionPhoto) {
    try {
      const imagePath = photo.url.split('/').pop();
      if (imagePath) {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([imagePath]);
      }

      const { error } = await supabase
        .from('production_photos')
        .delete()
        .eq('id', photo.id);

      if (error) throw error;

      setPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (error) {
      console.error('Error deleting photo:', error);
      setError('Failed to delete photo');
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError(`Arquivo ${file.name} muito grande. O tamanho máximo é 10MB.`);
        return false;
      }
      return true;
    });

    setSelectedFiles(prev => [...prev, ...validFiles]);
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

  if (isNew && !productionDay) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Dia de produção não encontrado</h3>
        <p className="mt-2 text-sm text-gray-500">
          Não foi possível encontrar o dia de produção selecionado.
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Voltar para a página inicial
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="product_search" className="block text-sm font-medium text-gray-700">
                Pesquisar Produto Acabado (código ou nome)
              </label>
              <input
                type="text"
                id="product_search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Digite o código ou nome do produto"
              />
              {searchTerm && filteredProducts.length > 0 && (
                <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {filteredProducts.map((product) => (
                    <li
                      key={product.id}
                      className="relative cursor-pointer select-none py-2 px-3 hover:bg-gray-100"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          product_id: product.id,
                          code: product.code,
                          product_name: product.name
                        });
                        setSearchTerm('');
                        setError(null);
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
            </div>

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                Código do Produto
              </label>
              <input
                type="text"
                id="code"
                value={formData.code || ''}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="product_name" className="block text-sm font-medium text-gray-700">
                Nome do Produto
              </label>
              <input
                type="text"
                id="product_name"
                value={formData.product_name || ''}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="batches" className="block text-sm font-medium text-gray-700">
                Batidas
                <span className="ml-1 text-gray-500 text-xs">(Pode usar decimais, ex: 0,5)</span>
              </label>
              <input
                type="text"
                id="batches"
                required
                value={formData.batches || ''}
                onChange={(e) => {
                  // Replace comma with dot for JS number parsing
                  const rawValue = e.target.value.replace(',', '.');
                  // Handle non-numeric input
                  if (rawValue === '' || !isNaN(parseFloat(rawValue))) {
                    // Store the value as entered (with comma)
                    setFormData({ ...formData, batches: e.target.value });
                  }
                }}
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            {!isNew && (
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                  Quantidade Real
                </label>
                <div className="mt-1 relative">
                  <input
                    type="number"
                    id="quantity"
                    min="0"
                    step="0.001"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  {formData.quantity !== undefined && formData.programmed_quantity !== undefined && 
                   formData.quantity !== formData.programmed_quantity && (
                    <div className="mt-1 text-sm text-yellow-600">
                      Divergência: {Math.abs(formData.quantity - formData.programmed_quantity)} unidades
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isNew && (
              <>
                <div>
                  <label htmlFor="batch_number" className="block text-sm font-medium text-gray-700">
                    Número do Lote
                  </label>
                  <input
                    type="text"
                    id="batch_number"
                    value={formData.batch_number || ''}
                    onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="expiry_date" className="block text-sm font-medium text-gray-700">
                    Data de Validade
                  </label>
                  <input
                    type="date"
                    id="expiry_date"
                    value={formData.expiry_date?.split('T')[0] || ''}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="transaction_number" className="block text-sm font-medium text-gray-700">
                    Número da Transação
                  </label>
                  <input
                    type="text"
                    id="transaction_number"
                    value={formData.transaction_number || ''}
                    onChange={(e) => setFormData({ ...formData, transaction_number: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Digite o número da transação para concluir a produção"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Ao inserir o número da transação, a produção será marcada como concluída automaticamente.
                  </p>
                </div>

                {/* Photos Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Fotos do Produto
                  </label>
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {/* Existing Photos */}
                    {photos.map((photo) => (
                      <div key={photo.id} className="relative group">
                        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200">
                          <img
                            src={photo.url}
                            alt="Production"
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(photo)}
                            className="absolute top-2 right-2 p-1 bg-red-100 rounded-full text-red-600 hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Selected Files Preview */}
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200">
                          <img
                            src={URL.createObjectURL(file)}
                            alt="Preview"
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                            className="absolute top-2 right-2 p-1 bg-red-100 rounded-full text-red-600 hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add Photo Button */}
                    <div className="aspect-w-1 aspect-h-1 w-full">
                      <label
                        htmlFor="photo-upload"
                        className="relative block w-full h-full border-2 border-gray-300 border-dashed rounded-lg p-4 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <div className="flex flex-col items-center justify-center h-full space-y-2">
                          <Plus className="h-8 w-8 text-gray-400" />
                          <span className="text-sm text-gray-500">Adicionar foto</span>
                        </div>
                        <input
                          type="file"
                          id="photo-upload"
                          multiple
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    JPG, PNG ou GIF até 10MB
                  </p>
                </div>
              </>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              {!isNew && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Excluir
                </button>
              )}
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isNew ? 'Criar Produção' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>

        {/* Yield Modal */}
        {showYieldModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Rendimento não encontrado
                </h3>
                <Beaker className="h-6 w-6 text-indigo-500" />
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Este produto não possui rendimento cadastrado. Por favor, informe o rendimento para continuar.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleYieldSubmit} className="space-y-6">
                <div>
                  <label htmlFor="yield" className="block text-sm font-medium text-gray-700">
                    Rendimento por Batida
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      id="yield"
                      required
                      min="0"
                      step="0.01"
                      value={yieldFormData.yield}
                      onChange={(e) => setYieldFormData({ yield: e.target.value })}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Ex: 100"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Este valor será salvo e usado para calcular a quantidade total automaticamente nas próximas produções.
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowYieldModal(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Salvar e Continuar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}