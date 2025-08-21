import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Scale, Search, Download } from 'lucide-react';
import { read, utils, writeFile } from 'xlsx';
import { formatNumber } from '../utils/format';

interface Production {
  id: string;
  product_name: string;
  code: string;
  batches: number;
  status: 'PENDING' | 'IN_PRODUCTION' | 'COMPLETED';
  product_id: string;
}

interface Formulation {
  id: string;
  product_id: string;
  name: string;
  product: {
    name: string;
    code: string;
  };
}

interface FormulationItem {
  id: string;
  weight_quantity: number;
  integer_quantity: number;
  product: {
    id: string;
    code: string;
    name: string;
    brand: string;
  };
}

interface MaterialTotal {
  product_id: string;
  code: string;
  name: string;
  brand: string;
  total_weight: number;
  total_integer: number;
  productions: {
    product_name: string;
    code: string;
    batches: number;
    weight_per_batch: number;
    integer_per_batch: number;
  }[];
}

export function SeparationPage() {
  const [loading, setLoading] = useState(true);
  const [materialTotals, setMaterialTotals] = useState<MaterialTotal[]>([]);
  const [expandedDetails, setExpandedDetails] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSeparationData();
  }, []);

  async function fetchSeparationData() {
    try {
      // Fetch active productions (PENDING or IN_PRODUCTION)
      const { data: productions, error: productionsError } = await supabase
        .from('productions')
        .select(`
          id,
          product_name,
          code,
          batches,
          status,
          product_id
        `)
        .in('status', ['PENDING', 'IN_PRODUCTION']);

      if (productionsError) throw productionsError;

      if (!productions || productions.length === 0) {
        setMaterialTotals([]);
        setLoading(false);
        return;
      }

      // Get formulations for these products
      const { data: formulations, error: formulationsError } = await supabase
        .from('formulations')
        .select(`
          id,
          product_id,
          name,
          product:products (
            name,
            code
          )
        `)
        .in('product_id', productions.map(p => p.product_id));

      if (formulationsError) throw formulationsError;

      // Get recipe items for these formulations
      const { data: formulationItems, error: itemsError } = await supabase
        .from('formulation_items')
        .select(`
          id,
          formulation_id,
          weight_quantity,
          integer_quantity,
          product:products (
            id,
            code,
            name,
            brand
          )
        `)
        .eq('item_type', 'RECIPE')
        .in('formulation_id', formulations?.map(f => f.id) || []);

      if (itemsError) throw itemsError;

      // Calculate totals
      const totals: Record<string, MaterialTotal> = {};

      productions.forEach(production => {
        const formulation = formulations?.find(f => f.product_id === production.product_id);
        if (!formulation) return;

        const items = formulationItems?.filter(item => item.formulation_id === formulation.id) || [];
        
        items.forEach(item => {
          const materialId = item.product.id;
          if (!totals[materialId]) {
            totals[materialId] = {
              product_id: materialId,
              code: item.product.code,
              name: item.product.name,
              brand: item.product.brand,
              total_weight: 0,
              total_integer: 0,
              productions: []
            };
          }

          const weightForProduction = item.weight_quantity * production.batches;
          const integerForProduction = item.integer_quantity * production.batches;
          totals[materialId].total_weight += weightForProduction;
          totals[materialId].total_integer += integerForProduction;
          totals[materialId].productions.push({
            product_name: production.product_name,
            code: production.code,
            batches: production.batches,
            weight_per_batch: item.weight_quantity,
            integer_per_batch: item.integer_quantity
          });
        });
      });

      setMaterialTotals(Object.values(totals).sort((a, b) => a.code.localeCompare(b.code)));
    } catch (error) {
      console.error('Error fetching separation data:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleDetails(productId: string) {
    setExpandedDetails(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }

  // Filter materials based on search term
  const filteredMaterials = materialTotals.filter(material => {
    const searchLower = searchTerm.toLowerCase();
    return (
      material.code.toLowerCase().includes(searchLower) ||
      material.name.toLowerCase().includes(searchLower) ||
      material.brand.toLowerCase().includes(searchLower)
    );
  });

  function handleExportExcel() {
    try {
      const exportData = filteredMaterials.map(material => ({
        'Código': material.code,
        'Nome': material.name,
        'Marca': material.brand,
        'Quantidade Inteiro Kg': formatNumber(material.total_integer),
        'Quantidade Pesagem Kg': formatNumber(material.total_weight)
      }));

      const ws = utils.json_to_sheet(exportData);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, 'Separação');
      
      writeFile(wb, 'separacao.xlsx');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Falha ao exportar separação');
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Separação</h1>
          <p className="mt-1 text-sm text-gray-500">
            Matérias-primas necessárias para produções pendentes e em andamento
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <Download className="h-5 w-5 mr-2" />
          Exportar XLSX
        </button>
      </div>

      {/* Search Filter */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Pesquisar por código, nome ou marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredMaterials.length === 0 ? (
        <div className="text-center py-12">
          <Scale className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            {searchTerm ? 'Nenhum resultado encontrado' : 'Sem produções pendentes'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm 
              ? 'Tente pesquisar com outros termos.'
              : 'Não há produções aguardando ou em andamento para calcular as separações.'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg overflow-x-auto">
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
                <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade Inteiro (kg)
                </th>
                <th className="px-6 py-3 bg-gray-50 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade Pesagem (kg)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMaterials.map((material) => (
                <React.Fragment key={material.product_id}>
                  <tr 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleDetails(material.product_id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {material.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {material.brand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatNumber(material.total_integer)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                      {formatNumber(material.total_weight)}
                    </td>
                  </tr>
                  {expandedDetails.includes(material.product_id) && (
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium mb-2">
                          Detalhamento por Produto:
                        </div>
                        <div className="space-y-2">
                          {material.productions.map((prod, idx) => (
                            <div key={idx} className="flex justify-between text-sm text-gray-600">
                              <div>
                                {prod.code} - {prod.product_name}
                                <span className="ml-2 text-gray-500">
                                  ({prod.batches} batida{prod.batches > 1 ? 's' : ''})
                                </span>
                              </div>
                              <div className="flex space-x-4">
                                <div>
                                  Inteiro: {formatNumber(prod.integer_per_batch * prod.batches)} kg
                                  <span className="text-gray-500 ml-1">
                                    ({formatNumber(prod.integer_per_batch)} kg/batida)
                                  </span>
                                </div>
                                <div>
                                  Pesagem: {formatNumber(prod.weight_per_batch * prod.batches)} kg
                                  <span className="text-gray-500 ml-1">
                                    ({formatNumber(prod.weight_per_batch)} kg/batida)
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}