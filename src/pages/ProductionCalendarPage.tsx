import React, { useEffect, useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  addWeeks,
  subWeeks,
  parseISO,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, ArrowLeft, GripVertical, Edit2, Play, CheckCircle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Production {
  id: string;
  product_name: string;
  code: string;
  quantity: number;
  status: 'PENDING' | 'IN_PRODUCTION' | 'COMPLETED';
  created_at: string;
  production_day: {
    date: string;
  };
  display_order?: number;
}

type ViewMode = 'month' | 'week' | 'day';

const STATUS_COLORS = {
  PENDING: 'bg-red-100 text-red-800 border-red-200',
  IN_PRODUCTION: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  COMPLETED: 'bg-green-100 text-green-800 border-green-200'
};

const STATUS_LABELS = {
  PENDING: 'Pendente',
  IN_PRODUCTION: 'Em Produção',
  COMPLETED: 'Concluído'
};

interface SortableProductionItemProps {
  production: Production;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

function SortableProductionItem({ 
  production, 
  isSelected, 
  onSelect
}: SortableProductionItemProps) {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: production.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${STATUS_COLORS[production.status]} ${
        isDragging ? 'shadow-lg' : ''
      } ${
        isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
      }`}
      onClick={() => onSelect(production.id)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-200 rounded"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900">{production.product_name}</h4>
            <p className="text-sm text-gray-600">Código: {production.code}</p>
            <p className="text-sm text-gray-500">Quantidade: {production.quantity}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[production.status]}`}>
            {STATUS_LABELS[production.status]}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProductionCalendarPage() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<Date | null>(null);
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedProductionId, setSelectedProductionId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchProductions();
  }, [currentDate, viewMode, selectedWeek, selectedDate]);

  async function fetchProductions() {
    try {
      setLoading(true);
      
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'month') {
        startDate = startOfMonth(currentDate);
        endDate = endOfMonth(currentDate);
      } else if (viewMode === 'week') {
        startDate = startOfWeek(selectedWeek || currentDate, { weekStartsOn: 1 });
        endDate = endOfWeek(selectedWeek || currentDate, { weekStartsOn: 1 });
      } else {
        // For day view, get productions for the specific day
        const targetDate = selectedDate || currentDate;
        startDate = new Date(targetDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(targetDate);
        endDate.setHours(23, 59, 59, 999);
      }

      // First get production days in the date range
      const { data: productionDays, error: daysError } = await supabase
        .from('production_days')
        .select('*')
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'));

      if (daysError) throw daysError;

      if (!productionDays || productionDays.length === 0) {
        setProductions([]);
        return;
      }

      // Then get productions for those days
      const productionDayIds = productionDays.map(day => day.id);
      
      const { data, error } = await supabase
        .from('productions')
        .select(`
          *,
          production_day:production_days!inner(date)
        `)
        .in('production_day_id', productionDayIds)
        .order('display_order', { ascending: true, nullsLast: true })
        .order('created_at');

      if (error) throw error;
      setProductions(data || []);
    } catch (error) {
      console.error('Error fetching productions:', error);
    } finally {
      setLoading(false);
    }
  }

  function getProductionsForDate(date: Date) {
    const dateString = format(date, 'yyyy-MM-dd');
    const dayProductions = productions.filter(production => {
      return production.production_day.date === dateString;
    });
    
    // Sort by display_order if available, otherwise by created_at
    return dayProductions.sort((a, b) => {
      if (a.display_order !== undefined && b.display_order !== undefined) {
        return a.display_order - b.display_order;
      }
      if (a.display_order !== undefined && b.display_order === undefined) {
        return -1;
      }
      if (a.display_order === undefined && b.display_order !== undefined) {
        return 1;
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id || !selectedDate) {
      return;
    }

    const dayProductions = getProductionsForDate(selectedDate);
    const oldIndex = dayProductions.findIndex(item => item.id === active.id);
    const newIndex = dayProductions.findIndex(item => item.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const newOrder = arrayMove(dayProductions, oldIndex, newIndex);
    
    // Update local state immediately for better UX
    const updatedProductions = productions.map(production => {
      const newOrderIndex = newOrder.findIndex(p => p.id === production.id);
      if (newOrderIndex !== -1) {
        return { ...production, display_order: newOrderIndex };
      }
      return production;
    });
    
    setProductions(updatedProductions);

    // Save to database
    try {
      setSaving(true);
      
      // Update display_order for all productions in this day
      const updates = newOrder.map((production, index) => ({
        id: production.id,
        display_order: index
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('productions')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) throw error;
      }

    } catch (error) {
      console.error('Error saving order:', error);
      // Revert local state on error
      fetchProductions();
    } finally {
      setSaving(false);
    }
  }

  async function handleStartProduction(productionId: string) {
    try {
      const { error } = await supabase
        .from('productions')
        .update({ status: 'IN_PRODUCTION' })
        .eq('id', productionId);

      if (error) throw error;
      
      // Refresh productions
      await fetchProductions();
      setSelectedProductionId(null);
    } catch (error) {
      console.error('Error starting production:', error);
      alert('Falha ao iniciar produção');
    }
  }

  async function handleFinalizeProduction(productionId: string) {
    navigate(`/production/${productionId}`);
  }

  async function handleDeleteProduction(productionId: string) {
    if (!window.confirm('Tem certeza que deseja excluir esta produção?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('productions')
        .delete()
        .eq('id', productionId);

      if (error) throw error;
      
      // Refresh productions
      await fetchProductions();
      setSelectedProductionId(null);
    } catch (error) {
      console.error('Error deleting production:', error);
      alert('Falha ao excluir produção');
    }
  }
  function handleDateClick(date: Date) {
    if (viewMode === 'month') {
      setSelectedWeek(date);
      setViewMode('week');
    } else if (viewMode === 'week') {
      setSelectedDate(date);
      setViewMode('day');
    }
    // Reset selection when changing views
    setSelectedProductionId(null);
  }

  function handleBackClick() {
    if (viewMode === 'day') {
      setViewMode('week');
      setSelectedDate(null);
    } else if (viewMode === 'week') {
      setViewMode('month');
      setSelectedWeek(null);
    }
    // Reset selection when going back
    setSelectedProductionId(null);
  }

  function navigateDate(direction: 'prev' | 'next') {
    if (viewMode === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else if (viewMode === 'week') {
      const newWeek = direction === 'next' 
        ? addWeeks(selectedWeek || currentDate, 1) 
        : subWeeks(selectedWeek || currentDate, 1);
      setSelectedWeek(newWeek);
    }
    // Reset selection when navigating
    setSelectedProductionId(null);
  }

  function renderMonthView() {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Calendar Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
            <div key={day} className="p-4 text-center text-sm font-medium text-gray-500 bg-gray-50">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {weeks.map((week, weekIndex) =>
            week.map((day, dayIndex) => {
              const dayProductions = getProductionsForDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`min-h-[120px] p-2 border-b border-r border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                    !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                  } ${isCurrentDay ? 'bg-blue-50' : ''}`}
                  onClick={() => handleDateClick(day)}
                >
                  <div className={`text-sm font-medium mb-2 ${isCurrentDay ? 'text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayProductions.slice(0, 3).map((production) => (
                      <div
                        key={production.id}
                        className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[production.status]}`}
                        title={`${production.code} - ${production.product_name}`}
                      >
                        <div className="truncate font-medium">{production.product_name}</div>
                      </div>
                    ))}
                    {dayProductions.length > 3 && (
                      <div className="text-xs text-gray-500 px-2">
                        +{dayProductions.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  function renderWeekView() {
    const weekStart = startOfWeek(selectedWeek || currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedWeek || currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Week Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackClick}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                Semana de {format(weekStart, 'dd/MM')} a {format(weekEnd, 'dd/MM')}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayProductions = getProductionsForDate(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[200px] p-4 border-r border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                  isCurrentDay ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleDateClick(day)}
              >
                <div className={`text-center mb-4 ${isCurrentDay ? 'text-blue-600' : ''}`}>
                  <div className="text-sm font-medium">
                    {format(day, 'EEE', { locale: ptBR })}
                  </div>
                  <div className="text-lg font-semibold">
                    {format(day, 'd')}
                  </div>
                </div>
                <div className="space-y-2">
                  {dayProductions.map((production) => (
                    <div
                      key={production.id}
                      className={`text-xs px-2 py-1 rounded border ${STATUS_COLORS[production.status]}`}
                      title={`${production.code} - ${production.product_name}`}
                    >
                      <div className="font-medium truncate">{production.product_name}</div>
                      <div className="text-gray-600">{production.code}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderDayView() {
    const dayProductions = getProductionsForDate(selectedDate!);

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Day Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackClick}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {format(selectedDate!, 'EEEE, dd \'de\' MMMM \'de\' yyyy', { locale: ptBR })}
              </h2>
            </div>
            {saving && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                <span>Salvando ordem...</span>
              </div>
            )}
          </div>
        </div>

        {/* Day Content */}
        <div className="p-6">
          {dayProductions.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma produção programada
              </h3>
              <p className="text-gray-500">
                Não há produções programadas para este dia.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Produções do Dia ({dayProductions.length})
                </h3>
                <p className="text-sm text-gray-500">
                  Arraste os itens para reordenar
                </p>
              </div>
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={dayProductions.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {dayProductions.map((production) => (
                      <SortableProductionItem
                        key={production.id}
                        production={production}
                        isSelected={selectedProductionId === production.id}
                        onSelect={setSelectedProductionId}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Fixed Action Buttons at Bottom of Screen */}
              {selectedProductionId && (
                <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
                  {productions.find(p => p.id === selectedProductionId)?.status === 'PENDING' && (
                    <button
                      onClick={() => handleStartProduction(selectedProductionId)}
                      className="w-12 h-12 flex items-center justify-center rounded-full bg-yellow-600 text-white shadow-lg hover:bg-yellow-700 transition-colors duration-200"
                      title="Iniciar Produção"
                    >
                      <Play className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleFinalizeProduction(selectedProductionId)}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition-colors duration-200"
                    title="Finalizar Produção"
                  >
                    <CheckCircle className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduction(selectedProductionId)}
                    className="w-12 h-12 flex items-center justify-center rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-colors duration-200"
                    title="Excluir Produção"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendário de Produção</h1>
          <p className="text-gray-600">
            Visualize as produções programadas por período
          </p>
        </div>
        
        {/* Legend */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-red-200 border border-red-300"></div>
            <span className="text-sm text-gray-600">Pendente</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-yellow-200 border border-yellow-300"></div>
            <span className="text-sm text-gray-600">Em Produção</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-green-200 border border-green-300"></div>
            <span className="text-sm text-gray-600">Concluído</span>
          </div>
        </div>
      </div>

      {/* Calendar Views */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
    </div>
  );
}