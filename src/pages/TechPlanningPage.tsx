import React, { useState, useEffect } from 'react';
import { Calendar, Upload, FileSpreadsheet, AlertCircle, CheckCircle, ExternalLink, Download, Check, X, Edit2 } from 'lucide-react';
import { format, addDays, isValid } from 'date-fns';
import { InteractiveHoverButton } from '../components/InteractiveHoverButton';
import { supabase } from '../lib/supabase';
import { read, utils } from 'xlsx';

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

export function TechPlanningPage() {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return format(today, 'yyyy-MM-dd');
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const weekLater = addDays(today, 6);
    return format(weekLater, 'yyyy-MM-dd');
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
  const [editingResult, setEditingResult] = useState<PlanningResult | null>(null);
  const [planningId, setPlanningId] = useState<string | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [processingTime, setProcessingTime] = useState(0);

  useEffect(() => {
    // Listen for planning results
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

    const interval = setInterval(checkForResults, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [planningId, timeoutId]);

  useEffect(() => {
    // Update processing time every second
    let timer: NodeJS.Timeout;
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
      const workbook = read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json(worksheet, { raw: false });

      // Helper function to parse Excel dates
      const parseExcelDate = (value: any): string => {
        if (!value) return '';
        
        // If it's already a Date object
        if (value instanceof Date && isValid(value)) {
          return format(value, 'yyyy-MM-dd');
        }
        
        // If it's a string that looks like a date
        if (typeof value === 'string') {
          const parsedDate = new Date(value);
          if (isValid(parsedDate)) {
            return format(parsedDate, 'yyyy-MM-dd');
          }
        }
        
        // If it's a number (Excel serial date)
        if (typeof value === 'number') {
          // Excel date serial number starts from 1900-01-01
          // But Excel incorrectly treats 1900 as a leap year, so we need to adjust
          const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
          const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
          
          if (isValid(date)) {
            return format(date, 'yyyy-MM-dd');
          }
        }
        
        throw new Error(`Invalid date value: ${value}`);
      };

      // Parse the Excel data into our format
      const results: PlanningResult[] = jsonData.map((row: any, index: number) => ({
        id: `result_${index}`,
        date: parseExcelDate(row['Data'] || row['Date'] || row['data']),
        product_code: row['Código'] || row['Code'] || row['codigo'] || row['Codigo'] || '',
        product_name: row['Produto'] || row['Product'] || row['produto'] || '',
        planned_quantity: Number(row['Batidas'] || row['batidas'] || row['Batches'] || row['batches'] || 0),
        priority: 1, // Default priority
        department: '', // Not used anymore
        notes: '' // Not used anymore
      }));

      // Validate that all results have valid dates
      const invalidResults = results.filter(r => !r.date);
      if (invalidResults.length > 0) {
        throw new Error(`Found ${invalidResults.length} rows with invalid dates. Please check your Excel file.`);
      }

      const planningData: PlanningData = {
        results,
        summary: {
          total_products: results.length,
          total_quantity: results.reduce((sum, r) => sum + r.planned_quantity, 0), // Now represents total batches
          planning_period: `${startDate} até ${endDate}`
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

      // Use standard file name instead of original name
      const standardFileName = getStandardFileName(fileType, file.name);

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(standardFileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      setFile({
        name: file.name, // Keep original name for display
        file: file,
        uploaded: true,
        path: standardFileName // Store standard path
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

  // Function to delete all planning files
  const deletePlanningFiles = async () => {
    try {
      // Delete input files from pcp-reports bucket
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

      // Delete result file from pcp-results bucket
      try {
        await supabase.storage
          .from(RESULTS_BUCKET)
          .remove(['resultado_planejamento.xlsx']);
      } catch (error) {
        console.warn('Could not delete result file:', error);
      }

      // Reset file states
      setVcpFile(null);
      setRawMaterialFile(null);
      setFinishedProductFile(null);
      setEvaFile(null);

    } catch (error) {
      console.error('Error deleting planning files:', error);
    }
  };

  const validateDateRange = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 4;
  };

  const canStartPlanning = () => {
    return vcpFile?.uploaded &&
           rawMaterialFile?.uploaded &&
           finishedProductFile?.uploaded &&
           validateDateRange() &&
           uploadingFiles.size === 0;
  };

  const handleStartPlanning = async () => {
    if (!canStartPlanning()) {
      setError('Por favor, preencha todos os campos obrigatórios e aguarde o upload dos arquivos');
      return;
    }

    if (!vcpFile?.path || !rawMaterialFile?.path || !finishedProductFile?.path) {
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

      // Set timeout for 5 minutes (300 seconds)
      const timeout = setTimeout(() => {
        setIsProcessing(false);
        setPlanningId(null);
        setProcessingTime(0);
        setError('Timeout: O processamento demorou mais que o esperado (5 minutos). Tente novamente ou verifique se o n8n está funcionando corretamente.');
      }, 300000); // 5 minutes

      setTimeoutId(timeout);

      const payload = {
        vcpReportPath: vcpFile.path,
        rawMaterialReportPath: rawMaterialFile.path,
        finishedProductReportPath: finishedProductFile.path,
        evaReportPath: evaFile?.path || null,
        startDate,
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
        const errorText = await response.text();
        throw new Error(`Falha ao acionar a análise: ${response.status}`);
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      setResult(`Planejamento semanal iniciado com sucesso para o período de ${format(start, 'dd/MM/yyyy')} até ${format(end, 'dd/MM/yyyy')} (${diffDays} dias). Aguardando resultado do processamento...`);
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
      // Group results by date to create production days
      const resultsByDate = planningData.results.reduce((acc, result) => {
        if (!acc[result.date]) {
          acc[result.date] = [];
        }
        acc[result.date].push(result);
        return acc;
      }, {} as Record<string, PlanningResult[]>);

      // Process each date
      for (const [date, dateResults] of Object.entries(resultsByDate)) {
        // Check if production day already exists
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
          // Production day doesn't exist, create it
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

        // Create productions for this day
        for (const result of dateResults) {
          // Find the product by code
          const { data: product, error: productError } = await supabase
            .from('products')
            .select('id, name')
            .eq('code', result.product_code)
            .single();

          if (productError) {
            console.warn(`Product not found for code: ${result.product_code}`);
            continue;
          }

          // Get formulation to calculate quantity
          const { data: formulation, error: formulationError } = await supabase
            .from('formulations')
            .select('yield')
            .eq('product_id', product.id)
            .single();

          let calculatedQuantity = result.planned_quantity; // Default to batches if no formulation
          let programmedQuantity = result.planned_quantity;

          if (!formulationError && formulation?.yield) {
            calculatedQuantity = Number(formulation.yield) * result.planned_quantity;
            programmedQuantity = calculatedQuantity;
          }

          // Create production record
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
              expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
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
      
      // Delete all planning files after approval
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
    
    // Delete all planning files after rejection
    await deletePlanningFiles();
  };

  const handleEditResult = (result: PlanningResult) => {
    setEditingResult({ ...result });
  };

  const handleSaveEdit = () => {
    if (!editingResult || !planningData) return;

    const updatedResults = planningData.results.map(r =>
      r.id === editingResult.id ? editingResult : r
    );

    setPlanningData({
      ...planningData,
      results: updatedResults,
      summary: {
        ...planningData.summary,
        total_quantity: updatedResults.reduce((sum, r) => sum + r.planned_quantity, 0)
      }
    });

    setEditingResult(null);
  };

  const getDaysDifference = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
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
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data de Fim
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Período selecionado:</span> {getDaysDifference()} dias
                </p>
                {!validateDateRange() && (
                  <p className="text-sm text-red-600 mt-1">
                    ⚠️ Período mínimo de 5 dias necessário
                  </p>
                )}
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
              {renderFileUpload(rawMaterialFile, setRawMaterialFile, 'raw-material', 'Estoque Matéria Prima', true)}
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
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Resultado do Planejamento</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {planningData.summary.total_products} produtos • {planningData.summary.total_quantity} batidas totais
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleRejectResult}
                    className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rejeitar
                  </button>
                  <button
                    onClick={handleApproveResult}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batidas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {planningData.results.map((result) => (
                      <tr key={result.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {result.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {result.product_code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {result.product_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {result.planned_quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditResult(result)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingResult && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Editar Resultado</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Batidas</label>
                <input
                  type="number"
                  value={editingResult.planned_quantity}
                  onChange={(e) => setEditingResult({
                    ...editingResult,
                    planned_quantity: Number(e.target.value)
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setEditingResult(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}