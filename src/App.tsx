import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CRMTask, TaskStatus, Priority } from './types/crm.ts';
import { 
  fetchTasks, 
  insertTask, 
  updateTask, 
  deleteTask, 
  getSavedConfig,
  getSupabaseClient
} from './lib/supabase.ts';
import { KanbanColumn } from './components/KanbanColumn.tsx';
import { TaskModal } from './components/TaskModal.tsx';
import { TaskDetailsModal } from './components/TaskDetailsModal.tsx';
import { SupabaseModal } from './components/SupabaseModal.tsx';
import { 
  Plus, 
  Search, 
  Database, 
  Filter, 
  CheckCircle, 
  RefreshCw,
  FolderKanban,
  X
} from 'lucide-react';

const COLUMNS: TaskStatus[] = ['Não iniciado', 'Em Andamento', 'Finalizado'];

export default function App() {
  const [tasks, setTasks] = useState<CRMTask[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [taskModalInitialStatus, setTaskModalInitialStatus] = useState<TaskStatus>('Não iniciado');
  const [taskToEdit, setTaskToEdit] = useState<CRMTask | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [selectedTask, setSelectedTask] = useState<CRMTask | null>(null);

  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [storageSource, setStorageSource] = useState<'supabase' | 'local'>('local');

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  // Check Supabase connection & load tasks
  const loadData = useCallback(async () => {
    setIsLoading(true);
    const config = getSavedConfig();
    const hasConfig = Boolean(config.url && config.anonKey);
    setSupabaseConnected(hasConfig);

    try {
      const res = await fetchTasks();
      setTasks(res.tasks);
      setStorageSource(res.source);
    } catch (err: any) {
      console.error('Erro ao carregar tarefas:', err);
      showToast('Erro ao carregar dados.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up Supabase Realtime subscription if client exists
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const channel = client
        .channel('public:tasks')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tasks' },
          (payload) => {
            console.log('Realtime task event received:', payload);
            loadData();
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    } catch (e) {
      console.warn('Falha ao configurar canal em tempo real do Supabase:', e);
    }
  }, [loadData, supabaseConnected]);

  // Handle creating / editing task
  const handleSaveTask = async (
    taskData: Omit<CRMTask, 'id' | 'created_at' | 'updated_at'>,
    existingId?: string
  ) => {
    if (existingId) {
      // Update
      const updated = await updateTask(existingId, taskData);
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === existingId ? updated : t)));
        if (selectedTask?.id === existingId) {
          setSelectedTask(updated);
        }
        showToast('Tarefa atualizada com sucesso.');
      }
    } else {
      // Create new
      const created = await insertTask(taskData);
      setTasks((prev) => [created, ...prev]);
      showToast('Nova tarefa criada no CRM.');
    }
  };

  // Change task status (drag-and-drop or button click)
  const handleStatusChange = async (id: string, newStatus: TaskStatus) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t))
    );

    if (selectedTask && selectedTask.id === id) {
      setSelectedTask((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      await updateTask(id, { status: newStatus });
      showToast(`Status movido para "${newStatus}".`, 'info');
    } catch (err: any) {
      console.error('Falha ao atualizar status:', err);
      showToast('Erro ao atualizar status da tarefa.', 'error');
      // reload to restore truth
      loadData();
    }
  };

  // Delete task
  const handleDeleteTask = async (id: string) => {
    if (confirm('Tem certeza de que deseja excluir esta tarefa?')) {
      await deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (selectedTask?.id === id) {
        setIsDetailsModalOpen(false);
        setSelectedTask(null);
      }
      showToast('Tarefa excluída.');
    }
  };

  // Open modals
  const handleOpenNewTask = (initialStatus: TaskStatus = 'Não iniciado') => {
    setTaskToEdit(null);
    setTaskModalInitialStatus(initialStatus);
    setIsTaskModalOpen(true);
  };

  const handleOpenEdit = (task: CRMTask) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  const handleOpenView = (task: CRMTask) => {
    setSelectedTask(task);
    setIsDetailsModalOpen(true);
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.contact_name && t.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesPriority =
        priorityFilter === 'all' || t.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchQuery, priorityFilter]);

  // Overall metrics
  const totalTasksCount = tasks.length;
  const totalPipelineValue = useMemo(() => {
    return tasks.reduce((sum, t) => sum + (t.deal_value || 0), 0);
  }, [tasks]);

  const formattedTotalValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(totalPipelineValue);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Bar following Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single Text Element Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-xs">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                CRM Kanban
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-slate-400">
                Gestão Ágil de Tarefas
              </span>
            </div>
          </div>

          {/* Zone 2: Pipeline Summary Metrics & Live Status */}
          <div className="hidden md:flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span>Total de Tarefas:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                {totalTasksCount}
              </span>
            </div>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <div className="flex items-center gap-1.5">
              <span>Valor do Pipeline:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {formattedTotalValue}
              </span>
            </div>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
            <div className="flex items-center gap-2">
              <span 
                className={`w-2 h-2 rounded-full ${
                  storageSource === 'supabase' ? 'bg-emerald-500' : 'bg-amber-400'
                }`} 
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {storageSource === 'supabase' ? 'Supabase Conectado' : 'Armazenamento Local'}
              </span>
            </div>
          </div>

          {/* Zone 3: Primary Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsSupabaseModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap"
              title="Configurar Conexão com o Supabase"
            >
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Supabase</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenNewTask('Não iniciado')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>
      </header>

      {/* Filter / Search Bar */}
      <section className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, cliente, descrição ou tag..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter by Priority */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
              <span className="text-xs text-slate-400 px-2 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Prioridade:
              </span>
              {(['all', 'Urgente', 'Alta', 'Média', 'Baixa'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriorityFilter(p)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    priorityFilter === p
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {p === 'all' ? 'Todas' : p}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors"
              title="Recarregar tarefas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* Main Kanban Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Supabase Notice banner if not connected */}
        {!supabaseConnected && (
          <div className="mb-6 p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="font-semibold text-blue-950 dark:text-blue-200">
                Conecte seu Supabase para persistência na nuvem
              </p>
              <p className="text-blue-700 dark:text-blue-300/80">
                Suas tarefas criadas agora estão seguras no navegador e serão sincronizadas imediatamente ao conectar o Supabase.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSupabaseModalOpen(true)}
              className="px-3.5 py-1.5 font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shrink-0 whitespace-nowrap"
            >
              Conectar Supabase
            </button>
          </div>
        )}

        {/* 3 Kanban Columns: Não iniciado, Em Andamento, Finalizado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {COLUMNS.map((colStatus) => {
            const colTasks = filteredTasks.filter((t) => t.status === colStatus);
            return (
              <KanbanColumn
                key={colStatus}
                status={colStatus}
                tasks={colTasks}
                onStatusChange={handleStatusChange}
                onEditTask={handleOpenEdit}
                onDeleteTask={handleDeleteTask}
                onViewTask={handleOpenView}
                onAddTask={handleOpenNewTask}
              />
            );
          })}
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium text-white bg-slate-900 dark:bg-slate-100 dark:text-slate-900">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Task Creation / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        initialStatus={taskModalInitialStatus}
        taskToEdit={taskToEdit}
      />

      {/* Task Details Modal */}
      <TaskDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        task={selectedTask}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteTask}
        onStatusChange={handleStatusChange}
      />

      {/* Supabase Connection Setup Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onConfigChanged={loadData}
      />
    </div>
  );
}
