import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Download, Upload, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { read, utils, writeFile } from 'xlsx';
import { SearchInput } from '../components/SearchInput';
import { formatNumber } from '../utils/format';

interface Product {
  id: string;
  code: string;
  name: string;
  brand: string;
  product_type: 'FINISHED_PRODUCT' | 'RAW_MATERIAL' | 'INTERMEDIATE_PRODUCT' | 'PACKAGING';
  unit_of_measure: 'KG' | 'UN' | 'L' | 'PCT';
  is_active: boolean;
  department_id: string | null;
}

interface Classification {
  id: string;
  name: string;
  type: 'UNIT' | 'DEPARTMENT' | 'BRAND' | 'PRODUCT_TYPE';
}

const PRODUCT_TYPE_LABELS = {
  'FINISHED_PRODUCT': 'Produto Acabado',
  'RAW_MATERIAL': 'Matéria Prima',
  'INTERMEDIATE_PRODUCT': 'Produto Intermediário',
  'PACKAGING': 'Embalagem'
} as const;

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilters, setSearchFilters] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    brand: '',
    product_type: 'FINISHED_PRODUCT' as Product['product_type'],
    unit_of_measure: 'UN' as Product['unit_of_measure'],
    department_id: '',
    is_active: true
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchClassifications();
  }, []);

  async function fetchClassifications() {
    try {
      const { data, error } = await supabase
        .from('classifications')
        .select('*')
        .order('name');

      if (error) throw error;
      setClassifications(data || []);
    } catch (error) {
      console.error('Error fetching classifications:', error);
    }
  }

  async function fetchProducts() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('code');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleExportExcel() {
    try {
      const exportData = filteredProducts.map(product => ({
        'Código': formatNumber(Number(product.code)),
        'Nome': product.name,
        'Marca': product.brand,
        'Departamento': getDepartmentName(product.department_id),
        'Tipo': PRODUCT_TYPE_LABELS[product.product_type],
        'Unidade': product.unit_of_measure,
        'Status': product.is_active ? 'Ativo' : 'Inativo'
      }));

      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Produtos');
      
      writeFile(wb, 'produtos.xlsx');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Falha ao exportar produtos');
    }
  }

  async function handleImportCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = event.target?.result;
        const workbook = read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const importedProducts = utils.sheet_to_json(sheet);

        for (const product of importedProducts) {
          // Validate required fields
          if (!product['Código'] || !product['Nome'] || !product['Marca'] || !product['Tipo'] || !product['Unidade']) {
            throw new Error('Todos os campos são obrigatórios exceto Departamento');
          }

          // Find department by name
          let departmentId = null;
          if (product['Departamento']) {
            const department = classifications.find(
              c => c.type === 'DEPARTMENT' && 
              c.name.toLowerCase() === String(product['Departamento']).toLowerCase()
            );
            if (!department) {
              throw new Error(`Departamento não encontrado: ${product['Departamento']}`);
            }
            departmentId = department.id;
          }

          // Validate product type
          const productType = Object.entries(PRODUCT_TYPE_LABELS).find(
            ([_, label]) => label.toLowerCase() === String(product['Tipo']).toLowerCase()
          )?.[0];
          if (!productType) {
            throw new Error(`Tipo de produto inválido: ${product['Tipo']}`);
          }

          // Validate unit of measure
          const unit = classifications.find(
            c => c.type === 'UNIT' && 
            c.name.toLowerCase() === String(product['Unidade']).toLowerCase()
          );
          if (!unit) {
            throw new Error(`Unidade de medida inválida: ${product['Unidade']}`);
          }

          // Validate brand
          const brand = classifications.find(
            c => c.type === 'BRAND' && 
            c.name.toLowerCase() === String(product['Marca']).toLowerCase()
          );
          if (!brand) {
            throw new Error(`Marca não encontrada: ${product['Marca']}`);
          }

          const { error } = await supabase.from('products').insert([{
            code: String(product['Código']),
            name: String(product['Nome']),
            brand: brand.name,
            product_type: productType,
            unit_of_measure: unit.name,
            department_id: departmentId,
            is_active: true
          }]);

          if (error) throw error;
        }

        setShowImportModal(false);
        fetchProducts();
        alert('Produtos importados com sucesso!');
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error('Error importing CSV:', error);
      setError(error instanceof Error ? error.message : 'Falha ao importar produtos');
    }
  }

  function downloadTemplate() {
    const template = [
      {
        'Código': '1234',
        'Nome': 'Produto Exemplo',
        'Marca': 'Lejor',
        'Tipo': 'Produto Acabado',
        'Unidade': 'UN', 
        'Departamento': 'Padaria'
      }
    ];

    const ws = utils.json_to_sheet(template);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Template');
    writeFile(wb, 'template_produtos.xlsx');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (editingProduct) {
        // Check if the code has changed
        const codeHasChanged = editingProduct.code !== formData.code;

        // If code has changed, check if the new code already exists
        if (codeHasChanged) {
          const { data: existingProduct } = await supabase
            .from('products')
            .select('id')
            .eq('code', formData.code)
            .neq('id', editingProduct.id)
            .single();

          if (existingProduct) {
            throw new Error('Já existe um produto com este código');
          }
        }

        const { error } = await supabase
          .from('products')
          .update({
            code: formData.code,
            name: formData.name,
            brand: formData.brand,
            product_type: formData.product_type,
            unit_of_measure: formData.unit_of_measure,
            department_id: formData.department_id || null,
            is_active: formData.is_active
          })
          .eq('id', editingProduct.id);

        if (error) throw error;
      } else {
        // For new products, check if code exists
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('code', formData.code)
          .single();

        if (existingProduct) {
          throw new Error('Já existe um produto com este código');
        }

        const { error } = await supabase
          .from('products')
          .insert([{
            code: formData.code,
            name: formData.name,
            brand: formData.brand,
            product_type: formData.product_type,
            unit_of_measure: formData.unit_of_measure,
            department_id: formData.department_id || null,
            is_active: formData.is_active
          }]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingProduct(null);
      setSelectedProduct(null);
      setFormData({
        code: '',
        name: '',
        brand: '',
        product_type: 'FINISHED_PRODUCT',
        unit_of_measure: 'UN',
        department_id: '',
        is_active: true
      });
      fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      setError(error instanceof Error ? error.message : 'Falha ao salvar produto');
    }
  }

  async function handleDelete(product: Product) {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;
      setSelectedProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Falha ao excluir produto');
    }
  }

  function handleEdit(product: Product) {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      brand: product.brand,
      product_type: product.product_type,
      unit_of_measure: product.unit_of_measure,
      department_id: product.department_id || '',
      is_active: product.is_active
    });
    setShowModal(true);
  }

  const handleSearch = (filters: string[]) => {
    setSearchFilters(filters);
  };

  const getClassificationsByType = (type: string) => 
    classifications.filter(c => c.type === type);

  const getClassificationId = (type: string, name: string) => {
    const classification = classifications.find(c => c.type === type && c.name === name);
    return classification?.id;
  };

  const getClassificationName = (id: string) => {
    const classification = classifications.find(c => c.id === id);
    return classification?.name || '';
  };

  const getDepartmentName = (id: string | null) => {
    if (!id) return '';
    const department = classifications.find(c => c.id === id && c.type === 'DEPARTMENT');
    return department?.name || '';
  };

  const filteredProducts = products.filter(product => 
    searchFilters.length === 0 || isProductMatchingFilters(product, searchFilters)
  );

  function isProductMatchingFilters(product: Product, filters: string[]): boolean {
    // Group filters by whether they look like codes (only numbers) or text
    const codeFilters = filters.filter(f => /^\d+$/.test(f));
    const textFilters = filters.filter(f => !/^\d+$/.test(f));

    // If we have code filters, check if the product code matches any of them
    if (codeFilters.length > 0) {
      return codeFilters.some(filter => 
        product.code.toLowerCase().includes(filter.toLowerCase())
      );
    }

    // For text filters, product must match ALL filters
    return textFilters.length === 0 || textFilters.every(filter => {
      const searchLower = filter.toLowerCase();
      return (
        product.code.toLowerCase().includes(searchLower) ||
        product.name.toLowerCase().includes(searchLower) ||
        product.brand.toLowerCase().includes(searchLower) ||
        PRODUCT_TYPE_LABELS[product.product_type].toLowerCase().includes(searchLower) ||
        getDepartmentName(product.department_id).toLowerCase().includes(searchLower)
      );
    });
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cadastro de Produtos</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Upload className="h-5 w-5 mr-2" />
            Importar CSV
          </button>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Download className="h-5 w-5 mr-2" />
            Exportar XLSX
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              setFormData({
                code: '',
                name: '',
                brand: '',
                product_type: 'FINISHED_PRODUCT',
                unit_of_measure: 'UN',
                department_id: '',
                is_active: true
              });
              setShowModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Produto
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Importar Produtos
              </h3>
              <FileText className="h-6 w-6 text-indigo-500" />
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Instruções:</h4>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
                <li>Baixe o template clicando no botão abaixo</li>
                <li>Preencha os dados dos produtos seguindo o exemplo</li>
                <li>Salve o arquivo e faça o upload</li>
              </ol>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Campos:</h4>
              <ul className="text-sm text-gray-600 space-y-2">
                <li><strong>Código:</strong> Código único do produto</li>
                <li><strong>Nome:</strong> Nome do produto</li>
                <li><strong>Marca:</strong> Marca do produto</li>
                <li><strong>Tipo:</strong> Tipo do produto (Ex.: Matéria Prima, Embalagem) </li>
                <li><strong>Unidade:</strong> UN, KG, L ou PCT</li>
                <li><strong>Departamento:</strong> ID do departamento (opcional)</li>
                <li><strong>Aviso:</strong> Marca e Departamento devem estar exatamente como no cadastro.</li>
              </ul>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-5 w-5 mr-2" />
                Baixar Template
              </button>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer">
                  <Upload className="h-5 w-5 mr-2" />
                  Importar Arquivo
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4 mb-6">
        <SearchInput
          placeholder="Pesquisar por código, nome ou marca..."
          onSearch={handleSearch}
        />
      </div>

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
                Marca
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Departamento
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unidade
              </th>
              <th className="px-6 py-3 bg-gray-50 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProducts.map((product) => (
              <tr 
                key={product.id}
                onClick={() => setSelectedProduct(selectedProduct?.id === product.id ? null : product)}
                className={`cursor-pointer hover:bg-gray-50 ${
                  selectedProduct?.id === product.id ? 'bg-indigo-50' : ''
                } ${!product.is_active ? 'bg-gray-50' : ''}`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {product.code}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.brand}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getDepartmentName(product.department_id)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {PRODUCT_TYPE_LABELS[product.product_type]}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.unit_of_measure}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    product.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div 
        className={`fixed right-8 bottom-8 flex flex-col gap-4 z-50 transition-all duration-300 ease-in-out transform ${
          selectedProduct ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <button
          onClick={() => selectedProduct && handleEdit(selectedProduct)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors duration-200"
          title="Editar produto"
        >
          <Edit2 className="h-5 w-5" />
        </button>
        <button
          onClick={() => selectedProduct && handleDelete(selectedProduct)}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-colors duration-200"
          title="Excluir produto"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {editingProduct ? 'Editar Produto' : 'Novo Produto'}
            </h3>
            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                    Código
                  </label>
                  <input
                    type="text"
                    id="code"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
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
                  <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
                    Marca
                  </label>
                  <select
                    id="brand"
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Selecione uma marca</option>
                    {getClassificationsByType('BRAND').map((brand) => (
                      <option key={brand.id} value={brand.name}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-gray-700">
                    Departamento
                  </label>
                  <select
                    id="department"
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Selecione um departamento</option>
                    {getClassificationsByType('DEPARTMENT').map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="product_type" className="block text-sm font-medium text-gray-700">
                    Tipo de Produto
                  </label>
                  <select
                    id="product_type"
                    required
                    value={formData.product_type}
                    onChange={(e) => setFormData({ ...formData, product_type: e.target.value as Product['product_type'] })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Selecione um tipo</option>
                    {Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="unit_of_measure" className="block text-sm font-medium text-gray-700">
                    Unidade de Medida
                  </label>
                  <select
                    id="unit_of_measure"
                    required
                    value={formData.unit_of_measure}
                    onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value as Product['unit_of_measure'] })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Selecione uma unidade</option>
                    {getClassificationsByType('UNIT').map((unit) => (
                      <option key={unit.id} value={unit.name}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Produto Ativo
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
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
                  {editingProduct ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}