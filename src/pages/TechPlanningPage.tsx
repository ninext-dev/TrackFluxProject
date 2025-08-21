import React, { useState, useEffect } from 'react';
import { Calendar, Upload, FileSpreadsheet, AlertCircle, CheckCircle, CheckSquare, ExternalLink, Download, Check, X, Edit2, Plus, Trash2 } from 'lucide-react';
import { format, addDays, isValid, parse, toDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { InteractiveHoverButton } from '../components/InteractiveHoverButton';
import { supabase } from '../lib/supabase';
import { read, utils } from 'xlsx';

export function TechPlanningPage() {

  interface ImportedFile {
    name: string;
    file: File;
    uploaded: boolean;
    path?: string;
  }

  interface PlanningResult {
    id: string;
    date: string;
    product_code: string;
    product_name: string;
    planned_quantity: number;
    yield?: number; // Rendimento do produto
    calculated_quantity?: number; // Quantidade calculada (batidas x rendimento)
    priority: number;
    department: string;
    notes?: string;
  }

  interface PlanningData {
    results: PlanningResult[];
    summary: {
      total_products: number;
      total_quantity: number;
      planning_period: string;
    };
  }

  const STORAGE_BUCKET = 'pcp-reports';
  const RESULTS_BUCKET = 'pcp-results';

  // Helper function to get standard file names
  function getStandardFileName(fileType: string, originalFileName: string): string {
    const extension = originalFileName.split('.').pop() || 'xlsx';
    
    switch (fileType) {
      case 'vcp':
        return `planilha_vcp.${extension}`;
      case 'raw-material':
        return `estoque_mp.${extension}`;
      case 'finished-product':
        return `estoque_pa.${extension}`;
      case 'eva':
        return `planilha_eva.${extension}`;
      default:
        return originalFileName;
    }
  }

  // Função para converter datas para UTC+3
  function toUTC3(date: Date): Date {
    return new Date(date.getTime() + 3 * 60 * 60 * 1000);
  }

  // Função para converter string dd/MM/yyyy ou dd/MM/yy para Date
  function parseBrazilianDate(value: string): Date {
    if (!value) return new Date('');
    
    // Tenta primeiro o formato dd/MM/yyyy
    let parsed = parse(value, 'dd/MM/yyyy', new Date());
    
    // Se não for válido, tenta o formato dd/MM/yy
    if (!isValid(parsed)) {
      parsed = parse(value, 'dd/MM/yy', new Date());
    }
    
    return isValid(parsed) ? parsed : new Date('');
  }

  // Função para converter string dd/MM/yyyy para Date UTC+3
  function parseBrazilianDateToUTC3(value: string): Date {
    const parsed = parseBrazilianDate(value);
    if (!isValid(parsed)) return parsed;
    return toUTC3(parsed);
  }

  // Função para converter Date ou string ISO para string dd/MM/yyyy considerando UTC+3
  function formatBrazilianDateUTC3(date: string | Date): string {
    let d: Date;
    if (typeof date === 'string') {
      d = new Date(date);
    } else {
      d = date;
    }
    if (!isValid(d)) return '';
    return format(toUTC3(d), 'dd/MM/yyyy', { locale: ptBR });
  }

  // Função para converter Date para ISO considerando UTC+3
  function formatISODateUTC3(date: string | Date): string {
    let d: Date;
    if (typeof date === 'string') {
      d = new Date(date);
    } else {
      d = date;
    }
    if (!isValid(d)) return '';
    return format(toUTC3(d), 'yyyy-MM-dd');
  }


  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return format(today, 'dd/MM/yyyy');
  });

  const [vcpFile, setVcpFile] = useState<ImportedFile | null>(null);
  const [rawMaterialFile, setRawMaterialFile] = useState<ImportedFile | null>(null);
  const [finishedProductFile, setFinishedProductFile] = useState<ImportedFile | null>(null);
  const [evaFile, setEvaFile] = useState<ImportedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const [selectedResult, setSelectedResult] = useState<PlanningResult | null>(null);
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [processingTime, setProcessingTime] = useState(0);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [newProductData, setNewProductData] = useState({
    date: '',
    product_code: '',
    product_name: '',
    planned_quantity: 0,
    yield: 1,
    priority: 1,
    department: '',
    notes: '',
    search: ''
  });
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<any>({});

  // Fetch products from Supabase
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

  useEffect(() => {
    fetchProducts();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showProductDropdown && target && !target.closest('.relative')) {
        setShowProductDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProductDropdown]);

  // Reset product data when modal closes
  useEffect(() => {
    if (!showAddProductModal) {
      setNewProductData({
        date: '',
        product_code: '',
        product_name: '',
        planned_quantity: 0,
        yield: 1,
        priority: 1,
        department: '',
        notes: '',
        search: ''
      });
      setShowProductDropdown(false);
    }
  }, [showAddProductModal]);

  useEffect(() => {
    const checkForResults = async () => {
      if (planningId) {
        try {
          const { data: files } = await supabase.storage
            .from(RESULTS_BUCKET)
            .list('', {
              search: 'resultado_planejamento'
            });

          if (files && files.length > 0) {
            const resultFile = files.find(f => f.name === 'resultado_planejamento.xlsx');
            if (resultFile) {
              await loadPlanningResult('resultado_planejamento.xlsx');
              if (timeoutId) {
                clearTimeout(timeoutId);
                setTimeoutId(null);
              }
              setPlanningId(null);
              setProcessingTime(0);
            }
          }
        } catch (error) {
          console.error('Error checking for results:', error);
        }
      }
    };

    const interval = setInterval(checkForResults, 50000); // Check every 50 seconds
    return () => clearInterval(interval);
  }, [planningId, timeoutId]);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isProcessing && planningId) {
      timer = setInterval(() => {
        setProcessingTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isProcessing, planningId]);

  const ensureStorageBucket = async (bucketName: string) => {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

      if (!bucketExists) {
        const { error } = await supabase.storage.createBucket(bucketName, {
          public: false,
          fileSizeLimit: 50485760 // 50MB
        });

        if (error) throw error;
      }
    } catch (error) {
      console.error(`Error ensuring storage bucket ${bucketName} exists:`, error);
    }
  };

  const loadPlanningResult = async (fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from(RESULTS_BUCKET)
        .download(fileName);

      if (error) throw error;

      const arrayBuffer = await data.arrayBuffer();
      const workbook = read(arrayBuffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet, { header: 1, raw: false });
      
      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1);

      // Fetch products and formulations in a single call for performance
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`id, code, name, formulations(yield)`);

      if (productError) throw productError;

      const productMap = new Map();
      (productData || []).forEach(p => {
        productMap.set(p.code, {
          id: p.id,
          name: p.name,
          yield: p.formulations?.[0]?.yield || 1
        });
      });

      // Find column indices
      const dateIndex = headers.findIndex(h => ['data', 'Data', 'date', 'Date'].includes(h));
      const codeIndex = headers.findIndex(h => ['Código', 'Código', 'Code', 'code'].includes(h));
      const batchesIndex = headers.findIndex(h => ['Batidas', 'Batidas', 'Batches', 'batches'].includes(h));

      if (dateIndex === -1 || codeIndex === -1 || batchesIndex === -1) {
        throw new Error("Colunas 'Data', 'Código' ou 'Batidas' não encontradas no arquivo. Por favor, verifique o cabeçalho.");
      }

      const results: PlanningResult[] = [];
      rows.forEach((row: any[], index: number) => {
        const productCode = String(row[codeIndex] || '').trim();
        const batches = Number(row[batchesIndex]);

        // Skip rows without product code or invalid batches
        if (!productCode || batches <= 0) return;

        let dateValue = row[dateIndex];
        let dateISO = '';
        if (dateValue) {
          try {
            // Tenta converter a data em vários formatos
            let parsedDate;
            
            // Verifica se é uma string no formato brasileiro dd/mm/yyyy ou dd/mm/yy
            if (typeof dateValue === 'string') {
              // Tenta formato dd/mm/yyyy
              parsedDate = parse(dateValue, 'dd/MM/yyyy', new Date());
              
              // Se não for válido, tenta formato dd/mm/yy
              if (!isValid(parsedDate)) {
                parsedDate = parse(dateValue, 'dd/MM/yy', new Date());
              }
            } else {
              // Se não for string, tenta converter diretamente (para datas do Excel)
              parsedDate = new Date(dateValue);
            }
            
            if (isValid(parsedDate)) {
              dateISO = formatISODateUTC3(parsedDate);
            }
          } catch (e) {
            console.error(`Erro ao parsear data na linha ${index + 2}: ${dateValue}`, e);
          }
        }
        
        const productInfo = productMap.get(productCode);
        const yieldValue = productInfo?.yield || 1;
        const productName = productInfo?.name || 'Não Encontrado';
        const calculatedQuantity = batches * yieldValue;

        results.push({
          id: `result_${index}`,
          date: dateISO,
          product_code: productCode,
          product_name: productName,
          planned_quantity: batches,
          yield: yieldValue,
          calculated_quantity: calculatedQuantity,
          priority: 1,
          department: '',
          notes: ''
        });
      });

      const invalidResults = results.filter(r => !r.date);
      if (invalidResults.length > 0) {
        throw new Error(`Encontradas ${invalidResults.length} linhas com datas inválidas. Por favor, verifique seu arquivo Excel.`);
      }

      const planningData: PlanningData = {
        results,
        summary: {
          total_products: results.length,
          total_quantity: results.reduce((sum, r) => sum + r.planned_quantity, 0),
          planning_period: `${startDate}`
        }
      };

      setPlanningData(planningData);
      setShowApprovalModal(true);
      setIsProcessing(false);
      setSuccess('Resultado do planejamento carregado com sucesso!');
    } catch (error) {
      console.error('Error loading planning result:', error);
      setError(`Erro ao carregar resultado do planejamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    setFile: React.Dispatch<React.SetStateAction<ImportedFile | null>>,
    fileType: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de arquivo não suportado. Use apenas .xlsx, .xls ou .csv');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('Arquivo muito grande. O tamanho máximo é 50MB.');
      return;
    }

    setError(null);
    setUploadingFiles(prev => new Set(prev).add(fileType));

    try {
      await ensureStorageBucket(STORAGE_BUCKET);

      const standardFileName = getStandardFileName(fileType, file.name);

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(standardFileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      setFile({
        name: file.name,
        file: file,
        uploaded: true,
        path: standardFileName
      });

      setSuccess(`${file.name} enviado com sucesso!`);
      setTimeout(() => setSuccess(null), 3000);

    } catch (error) {
      console.error('Error uploading file:', error);
      setError(`Erro ao enviar ${file.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setFile({
        name: file.name,
        file: file,
        uploaded: false
      });
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileType);
        return newSet;
      });
    }
  };

  const removeFile = async (
    setFile: React.Dispatch<React.SetStateAction<ImportedFile | null>>,
    file: ImportedFile | null
  ) => {
    if (file?.path) {
      try {
        await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([file.path]);
      } catch (error) {
        console.error('Error removing file from storage:', error);
      }
    }
    setFile(null);
  };

  const deletePlanningFiles = async () => {
    try {
      const inputFiles = [
        'planilha_vcp.xlsx',
        'estoque_mp.xlsx',
        'estoque_pa.xlsx',
        'planilha_eva.xlsx'
      ];

      for (const fileName of inputFiles) {
        try {
          await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([fileName]);
        } catch (error) {
          console.warn(`Could not delete ${fileName}:`, error);
        }
      }

      try {
        await supabase.storage
          .from(RESULTS_BUCKET)
          .remove(['resultado_planejamento.xlsx']);
      } catch (error) {
        console.warn('Could not delete result file:', error);
      }

      setVcpFile(null);
      setRawMaterialFile(null);
      setFinishedProductFile(null);
      setEvaFile(null);

    } catch (error) {
      console.error('Error deleting planning files:', error);
    }
  };

  const validateDateRange = () => {
    const start = parseBrazilianDate(startDate);
    return isValid(start);
  };

  const canStartPlanning = () => {
    return vcpFile?.uploaded &&
              finishedProductFile?.uploaded &&
              validateDateRange() &&
              uploadingFiles.size === 0;
  };

  const handleStartPlanning = async () => {
    if (!canStartPlanning()) {
      setError('Por favor, preencha todos os campos obrigatórios e aguarde o upload dos arquivos');
      return;
    }

    if (!vcpFile?.path || !finishedProductFile?.path) {
      setError('Por favor, faça o upload de todos os arquivos obrigatórios');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);
    setSuccess(null);

    try {
      await ensureStorageBucket(RESULTS_BUCKET);

      const webhookUrl = import.meta.env.VITE_N8N_PCP_WEBHOOK_URL;

      if (!webhookUrl) {
        throw new Error('URL do webhook não configurada');
      }

      const { data: { user } } = await supabase.auth.getUser();
      const currentPlanningId = Date.now().toString();
      setPlanningId(currentPlanningId);

      const timeout = setTimeout(() => {
        setIsProcessing(false);
        setPlanningId(null);
        setProcessingTime(0);
        setError('Timeout: O processamento demorou mais que o esperado (5 minutos). Tente novamente ou verifique se o n8n está funcionando corretamente.');
      }, 300000);

      setTimeoutId(timeout);

      const startDateParsed = parseBrazilianDate(startDate);
      const startDateISO = formatISODateUTC3(startDateParsed);

      const payload = {
        vcpReportPath: vcpFile.path,
        rawMaterialReportPath: rawMaterialFile?.path || null,
        finishedProductReportPath: finishedProductFile.path,
        evaReportPath: evaFile?.path || null,
        startDate: startDateISO,
        
        planningId: currentPlanningId,
        callbackUrl: `${window.location.origin}/api/planning-webhook`,
        triggeredByUserId: user?.id || 'anonymous',
        timestamp: new Date().toISOString()
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Falha ao acionar a análise: ${response.status}`);
      }

      const start = parseBrazilianDate(startDate);
      const diffDays = 1;

      setResult(`Planejamento semanal iniciado com sucesso para o período de ${formatBrazilianDateUTC3(start)}. Aguardando resultado do processamento...`);
      setSuccess('Análise iniciada! Aguardando resultado do n8n...');

    } catch (error) {
      console.error('Error triggering webhook:', error);

      setError(error instanceof Error ? error.message : 'Erro ao processar o planejamento. Tente novamente.');
      setIsProcessing(false);
      setPlanningId(null);
      setProcessingTime(0);
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleApproveResult = async () => {
    if (!planningData) return;

    try {
      const resultsByDate = planningData.results.reduce((acc, result) => {
        if (!acc[result.date]) {
          acc[result.date] = [];
        }
        acc[result.date].push(result);
        return acc;
      }, {} as Record<string, PlanningResult[]>);

      for (const [date, dateResults] of Object.entries(resultsByDate)) {
        const { data: existingDays, error: dayCheckError } = await supabase
          .from('production_days')
          .select('id')
          .eq('date', date)
          .limit(1);

        let productionDayId: string;

        if (dayCheckError) {
          throw dayCheckError;
        }

        if (!existingDays || existingDays.length === 0) {
          const { data: newDay, error: createDayError } = await supabase
            .from('production_days')
            .insert([{
              date: date,
              user_id: '00000000-0000-0000-0000-000000000000'
            }])
            .select()
            .single();

          if (createDayError) throw createDayError;
          productionDayId = newDay.id;
        } else {
          productionDayId = existingDays[0].id;
        }

        for (const result of dateResults) {
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, name')
            .eq('code', result.product_code)
            .single();

          if (productError) {
            console.warn(`Product not found for code: ${result.product_code}`);
            continue;
          }

          const { data: formulation, error: formulationError } = await supabase
            .from('formulations')
            .select('yield')
            .eq('product_id', product.id)
            .single();

          let calculatedQuantity = result.planned_quantity;
          let programmedQuantity = result.planned_quantity;

          if (!formulationError && formulation?.yield) {
            calculatedQuantity = Number(formulation.yield) * result.planned_quantity;
            programmedQuantity = calculatedQuantity;
          }

          const { error: productionError } = await supabase
            .from('productions')
            .insert([{
              production_day_id: productionDayId,
              product_id: product.id,
              code: result.product_code,
              product_name: result.product_name || product.name,
              batches: result.planned_quantity,
              quantity: calculatedQuantity,
              programmed_quantity: programmedQuantity,
              batch_number: '',
              expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              status: 'PENDING',
              has_divergence: false,
              user_id: '00000000-0000-0000-0000-000000000000'
            }]);

          if (productionError) {
            console.error('Error creating production:', productionError);
            throw productionError;
          }
        }
      }

      setSuccess('Planejamento aprovado e salvo com sucesso! As produções foram criadas nos dias correspondentes.');
      setShowApprovalModal(false);
      setPlanningData(null);
      
      await deletePlanningFiles();
    } catch (error) {
      console.error('Error approving result:', error);
      setError('Erro ao aprovar planejamento');
    }
  };

  const handleRejectResult = async () => {
    setShowApprovalModal(false);
    setPlanningData(null);
    setError('Planejamento rejeitado. Você pode ajustar os parâmetros e tentar novamente.');
    
    await deletePlanningFiles();
  };

  const handleEditResult = (result: PlanningResult) => {
    setEditingId(result.id);
    setEditingData({
      date: formatBrazilianDateUTC3(result.date), // Format the ISO date to dd/mm/yyyy for the input
      planned_quantity: result.planned_quantity,
      calculated_quantity: result.calculated_quantity
    });
  };

  const parseBrazilianDateToISO = (value: string): string => {
    if (!value) return '';
    
    // Tenta primeiro o formato dd/MM/yyyy
    let parsedDate = parse(value, 'dd/MM/yyyy', new Date());
    
    // Se não for válido, tenta o formato dd/MM/yy
    if (!isValid(parsedDate)) {
      parsedDate = parse(value, 'dd/MM/yy', new Date());
    }
    
    if (isValid(parsedDate)) {
      return formatISODateUTC3(parsedDate);
    }
    return '';
  };
  
  const handleSaveEdit = (resultId: string) => {
    if (!planningData) return;

    const dateISO = parseBrazilianDateToISO(editingData.date);
    if (!dateISO) {
      alert('Data inválida. Use o formato dd/mm/aaaa ou dd/mm/aa.');
      return;
    }
    
    const updatedResults = planningData.results.map(r =>
      r.id === resultId ? {
        ...r,
        date: dateISO,
        planned_quantity: Number(editingData.planned_quantity),
        calculated_quantity: Number(editingData.calculated_quantity)
      } : r
    );
    
    setPlanningData({
      ...planningData,
      results: updatedResults,
      summary: {
        ...planningData.summary,
        total_quantity: updatedResults.reduce((sum, r) => sum + r.planned_quantity, 0)
      }
    });

    setEditingId(null);
    setEditingData({});
  };


  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData({});
  };

  const handleDeleteResult = (result?: PlanningResult) => {
    if (!planningData) return;
    
    // Se temos produtos selecionados e nenhum resultado específico, excluir múltiplos
    if (selectedProducts.length > 0 && !result) {
      if (!window.confirm(`Tem certeza que deseja excluir ${selectedProducts.length} produto(s) do planejamento?`)) {
        return;
      }

      const updatedResults = planningData.results.filter(r => !selectedProducts.includes(r.id));
      
      setPlanningData({
        ...planningData,
        results: updatedResults,
        summary: {
          ...planningData.summary,
          total_products: updatedResults.length,
          total_quantity: updatedResults.reduce((sum, r) => sum + r.planned_quantity, 0)
        }
      });

      setSelectedProducts([]);
      setSelectedResult(null);
    } else if (result) {
      // Exclusão de um único produto
      if (!window.confirm('Tem certeza que deseja excluir este produto do planejamento?')) {
        return;
      }

      const updatedResults = planningData.results.filter(r => r.id !== result.id);
      
      setPlanningData({
        ...planningData,
        results: updatedResults,
        summary: {
          ...planningData.summary,
          total_products: updatedResults.length,
          total_quantity: updatedResults.reduce((sum, r) => sum + r.planned_quantity, 0)
        }
      });

      setSelectedResult(null);
    }
  };

  const handleAddProduct = async () => {
    if (!planningData) return;

    if (!newProductData.date || !newProductData.product_code || !newProductData.product_name || newProductData.planned_quantity <= 0) {
      alert('Por favor, preencha todos os campos obrigatórios: Data, Produto e Batidas (maior que 0)');
      return;
    }

    const parsedDate = new Date(newProductData.date);
    if (!isValid(parsedDate)) {
      alert('Por favor, selecione uma data válida');
      return;
    }

    const dateISO = newProductData.date;

    let productId = null;
    let yieldValue = 1;
    let calculatedQuantity = newProductData.planned_quantity;

    try {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, formulations(yield)')
        .eq('code', newProductData.product_code)
        .single();

      if (!productError && product) {
        productId = product.id;
        if (product.formulations?.length && product.formulations[0]?.yield) {
          yieldValue = Number(product.formulations[0].yield);
          calculatedQuantity = yieldValue * newProductData.planned_quantity;
        }
      }
    } catch (error) {
      console.error('Error fetching product data:', error);
    }

    const newResult: PlanningResult = {
      id: `new-${Date.now()}`,
      date: dateISO,
      product_code: newProductData.product_code,
      product_name: newProductData.product_name,
      planned_quantity: newProductData.planned_quantity,
      yield: yieldValue,
      calculated_quantity: calculatedQuantity,
      priority: newProductData.priority,
      department: newProductData.department,
      notes: newProductData.notes
    };

    const updatedResults = [...planningData.results, newResult];
    
    setPlanningData({
      ...planningData,
      results: updatedResults,
      summary: {
        ...planningData.summary,
        total_products: updatedResults.length,
        total_quantity: updatedResults.reduce((sum, r) => sum + r.planned_quantity, 0)
      }
    });

    setNewProductData({
      date: '',
      product_code: '',
      product_name: '',
      planned_quantity: 0,
      yield: 1,
      priority: 1,
      department: '',
      notes: '',
      search: ''
    });

    setShowAddProductModal(false);
  };

  const getDaysDifference = () => {
    const start = parseBrazilianDate(startDate);
    if (!isValid(start)) return 0;
    return 1;
  };

  const renderFileUpload = (
    file: ImportedFile | null,
    setFile: React.Dispatch<React.SetStateAction<ImportedFile | null>>,
    fileType: string,
    title: string,
    isRequired: boolean = true
  ) => {
    const isUploading = uploadingFiles.has(fileType);

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 text-sm">{title}</h4>
          {isRequired ? (
            <span className="text-red-500 text-xs">*Obrigatório</span>
          ) : (
            <span className="text-gray-500 text-xs">Opcional</span>
          )}
        </div>

        {!file ? (
          <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center">
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mb-1"></div>
                  <p className="text-xs text-gray-500">Enviando...</p>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mb-1 text-gray-400" />
                  <p className="text-xs text-gray-500">Clique para importar</p>
                </>
              )}
            </div>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFileUpload(e, setFile, fileType)}
              disabled={isUploading}
            />
          </label>
        ) : (
          <div className={`flex items-center justify-between p-2 border rounded-lg ${
            file.uploaded ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center space-x-2">
              {file.uploaded ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
              )}
              <span className={`text-xs ${file.uploaded ? 'text-green-800' : 'text-yellow-800'}`}>
                {file.name}
              </span>
            </div>
            <button
              onClick={() => removeFile(setFile, file)}
              className="text-red-600 hover:text-red-800 text-sm"
              disabled={isUploading}
            >
              ×
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Tech Planning</h1>
        <p className="text-gray-600">Sistema inteligente de planejamento de produção</p>
      </div>

      {/* Controls Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Date Range Selector */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <Calendar className="h-6 w-6 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Período de Planejamento</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Início
                </label>
                <input
                  type="text"
                  placeholder="dd/mm/aaaa"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Período selecionado:</span> 1 dia
                </p>
                {}
              </div>
            </div>
          </div>

          {/* File Imports */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Arquivos de Entrada</h3>
            </div>
            <div className="space-y-3">
              {renderFileUpload(vcpFile, setVcpFile, 'vcp', 'Planilha VCP', true)}
              {renderFileUpload(finishedProductFile, setFinishedProductFile, 'finished-product', 'Estoque Produto Acabado', true)}
              {renderFileUpload(evaFile, setEvaFile, 'eva', 'Planilha EVA', false)}
            </div>
          </div>
        </div>

        {/* Start Planning Button */}
        <div className="mt-8 flex justify-center">
          <InteractiveHoverButton
            text={isProcessing ? "Processando..." : "Iniciar Planejamento"}
            onClick={handleStartPlanning}
            disabled={!canStartPlanning() || isProcessing}
            className={`${
              !canStartPlanning() || isProcessing
                ? 'opacity-50 cursor-not-allowed border-gray-300 text-gray-500'
                : ''
            }`}
          />
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Resultado do Planejamento</h3>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Erro</h4>
                <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-3" />
              <div>
                <h4 className="text-sm font-medium text-green-800">Sucesso</h4>
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Processando Dados
            </h4>
            <p className="text-gray-500">
              Aguardando resposta do n8n...
            </p>
            {processingTime > 0 && (
              <p className="text-sm text-gray-400 mt-2">
                Tempo decorrido: {formatTime(processingTime)}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Timeout em 5 minutos
            </p>
            {planningId && (
              <p className="text-sm text-gray-400 mt-2">
                ID da Requisição: {planningId}
              </p>
            )}
          </div>
        )}

        {result && !isProcessing && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">{result}</p>
          </div>
        )}

        {!isProcessing && !result && !error && !success && (
          <div className="text-center py-12">
            <FileSpreadsheet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">
              Aguardando Planejamento
            </h4>
            <p className="text-gray-500">
              Configure os parâmetros e inicie o planejamento para ver os resultados aqui.
            </p>
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && planningData && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">Resultado do Planejamento</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {planningData.summary.total_products} produtos • {planningData.summary.total_quantity} batidas totais
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowAddProductModal(true)}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-blue-600 hover:bg-blue-50 transition-colors duration-200"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Produto
                  </button>
                  <button
                    onClick={handleRejectResult}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rejeitar
                  </button>
                  <button
                    onClick={handleApproveResult}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-green-500 hover:bg-green-600 transition-colors duration-200"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {selectedProducts.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-sm text-blue-700 flex items-center">
                    <CheckSquare className="h-4 w-4 mr-2" />
                    {selectedProducts.length} produto(s) selecionado(s). Use o botão de exclusão no canto inferior direito para remover todos de uma vez.
                  </p>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                          onChange={(e) => {
                            // Implementar seleção de todos os produtos
                            const isChecked = e.target.checked;
                            if (isChecked) {
                              setSelectedProducts(planningData.results.map(result => result.id));
                            } else {
                              setSelectedProducts([]);
                            }
                          }}
                          checked={selectedProducts?.length === planningData.results.length && planningData.results.length > 0}
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Batidas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Quantidade
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {planningData.results.map((result) => (
                      <tr 
                        key={result.id} 
                        className={`hover:bg-gray-50 cursor-pointer transition-colors duration-150 ${
                          selectedResult?.id === result.id ? 'bg-blue-50 border-l-2 border-blue-400' : ''
                        }`}
                        onClick={() => setSelectedResult(selectedResult?.id === result.id ? null : result)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <input 
                            type="checkbox" 
                            className="rounded border-gray-300 text-blue-500 focus:ring-blue-400"
                            checked={selectedProducts?.includes(result.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (e.target.checked) {
                                setSelectedProducts([...(selectedProducts || []), result.id]);
                              } else {
                                setSelectedProducts((selectedProducts || []).filter(id => id !== result.id));
                              }
                            }}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {editingId === result.id ? (
                            <input
                              type="text"
                              value={editingData.date}
                              onChange={e => setEditingData({ ...editingData, date: e.target.value })}
                              className="border border-gray-200 rounded-md px-3 py-1.5 w-32 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-colors duration-200"
                              placeholder="dd/mm/aaaa"
                            />
                          ) : (
                            result.date && isValid(new Date(result.date)) 
                              ? formatBrazilianDateUTC3(result.date)
                              : 'Data inválida'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                          {result.product_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {result.product_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {editingId === result.id ? (
                            <input
                              type="number"
                              value={editingData.planned_quantity}
                              onChange={e => {
                                const batidas = Number(e.target.value);
                                setEditingData({ ...editingData, planned_quantity: batidas, calculated_quantity: batidas * (result.yield || 1) });
                              }}
                              min={1}
                              className="border border-gray-200 rounded-md px-3 py-1.5 w-20 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition-colors duration-200"
                            />
                          ) : (
                            result.planned_quantity
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                          {result.calculated_quantity !== undefined
                            ? result.calculated_quantity
                            : result.planned_quantity * (result.yield || 1)}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Floating Action Buttons */}
            {(selectedResult || selectedProducts.length > 0) && (
              <div className="fixed right-6 bottom-6 z-50">
                <div className="bg-white rounded-xl shadow-md p-2 flex flex-col gap-2">
                  {selectedProducts.length > 0 ? (
                    <>
                      <button
                        onClick={() => handleDeleteResult()}
                        className="flex items-center justify-center w-10 h-10 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-200 shadow-sm"
                        title={`Excluir ${selectedProducts.length} produto(s)`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  ) : editingId === selectedResult?.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(selectedResult.id)}
                        className="flex items-center justify-center w-10 h-10 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors duration-200 shadow-sm"
                        title="Salvar alterações"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center justify-center w-10 h-10 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors duration-200 shadow-sm"
                        title="Descartar alterações"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : selectedResult && (
                    <>
                      <button
                        onClick={() => handleEditResult(selectedResult)}
                        className="flex items-center justify-center w-10 h-10 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors duration-200 shadow-sm"
                        title="Editar produto"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Adicionar Produto</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Data *</label>
                <input
                  type="date"
                  value={newProductData.date}
                  onChange={(e) => setNewProductData({
                    ...newProductData,
                    date: e.target.value
                  })}
                  className={`mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors duration-200 ${
                    !newProductData.date ? 'border-red-200' : 'border-gray-200'
                  }`}
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700">Pesquisar Produto *</label>
                <input
                  type="text"
                  value={newProductData.search || ""}
                  onChange={(e) => {
                    setNewProductData({
                      ...newProductData,
                      search: e.target.value
                    });
                    setShowProductDropdown(e.target.value.length > 0);
                  }}
                  onFocus={() => setShowProductDropdown(newProductData.search.length > 0)}
                  placeholder="Digite o código ou nome do produto"
                  className={`mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors duration-200 ${
                    !newProductData.product_code ? 'border-red-200' : 'border-gray-200'
                  }`}
                />
                {showProductDropdown && newProductData.search && (
                  <div className="absolute z-10 mt-1 w-full bg-white/90 shadow-lg max-h-60 rounded-lg py-1 text-base ring-1 ring-gray-200 overflow-auto focus:outline-none sm:text-sm backdrop-blur-sm">
                    {products
                      .filter(product => 
                        product.code.toLowerCase().includes(newProductData.search.toLowerCase()) ||
                        product.name.toLowerCase().includes(newProductData.search.toLowerCase())
                      )
                      .slice(0, 10)
                      .map((product) => (
                        <div
                          key={product.id}
                          className="cursor-pointer select-none py-2 px-3 hover:bg-blue-50 transition-colors duration-200"
                          onClick={() => {
                            setNewProductData({
                              ...newProductData,
                              product_code: product.code,
                              product_name: product.name,
                              search: `${product.code} - ${product.name}`
                            });
                            setShowProductDropdown(false);
                          }}
                        >
                          <div className="flex items-center">
                            <span className="font-medium text-blue-600">{product.code}</span>
                            <span className="ml-2 text-gray-600">{product.name}</span>
                          </div>
                        </div>
                      ))
                    }
                    {products.filter(product => 
                      product.code.toLowerCase().includes(newProductData.search.toLowerCase()) ||
                      product.name.toLowerCase().includes(newProductData.search.toLowerCase())
                    ).length === 0 && (
                      <div className="py-3 px-4 text-gray-500 text-center italic">
                        Nenhum produto encontrado
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Batidas *</label>
                <input
                  type="number"
                  min="1"
                  value={newProductData.planned_quantity}
                  onChange={(e) => setNewProductData({
                    ...newProductData,
                    planned_quantity: Number(e.target.value)
                  })}
                  className={`mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors duration-200 ${
                    newProductData.planned_quantity <= 0 ? 'border-red-200' : 'border-gray-200'
                  }`}
                />
              </div>

            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddProductModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddProduct}
                className="px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors duration-200"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}