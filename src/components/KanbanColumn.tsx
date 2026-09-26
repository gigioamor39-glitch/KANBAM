import React, { useState } from 'react';
import { CRMTask, TaskStatus } from '../types/crm.ts';
import { TaskCard } from './TaskCard.tsx';
import { Plus, Circle, Clock, CheckCircle2, Inbox } from 'lucide-react';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: CRMTask[];
  onStatusChange: (id: string, newStatus: TaskStatus) => void;
  onEditTask: (task: CRMTask) => void;
  onDeleteTask: (id: string) => void;
  onViewTask: (task: CRMTask) => void;
  onAddTask: (status: TaskStatus) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  tasks,
  onStatusChange,
  onEditTask,
  onDeleteTask,
  onViewTask,
  onAddTask,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const getStatusIcon = (st: TaskStatus) => {
    switch (st) {
      case 'Não iniciado':
        return <Circle className="w-4 h-4 text-slate-400" />;
      case 'Em Andamento':
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'Finalizado':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getHeaderStyle = (st: TaskStatus) => {
    switch (st) {
      case 'Não iniciado':
        return 'border-t-2 border-t-slate-400';
      case 'Em Andamento':
        return 'border-t-2 border-t-blue-500';
      case 'Finalizado':
        return 'border-t-2 border-t-emerald-500';
    }
  };

  const totalValue = tasks.reduce((sum, t) => sum + (t.deal_value || 0), 0);
  const formattedTotal = totalValue > 0
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalValue)
    : null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onStatusChange(taskId, status);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col bg-slate-50/70 dark:bg-slate-900/50 rounded-xl p-3 border transition-colors min-h-[580px] max-h-[calc(100vh-210px)] ${
        isDragOver
          ? 'border-blue-400 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
          : 'border-slate-200/80 dark:border-slate-800'
      } ${getHeaderStyle(status)}`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-slate-200/70 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          {getStatusIcon(status)}
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm tracking-tight truncate">
            {status}
          </h3>
          <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-slate-500">
            ({tasks.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {formattedTotal && (
            <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400 font-medium">
              {formattedTotal}
            </span>
          )}
          <button
            type="button"
            onClick={() => onAddTask(status)}
            className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded transition-colors"
            title={`Adicionar tarefa em ${status}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task Cards List / Empty State */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
        {tasks.length === 0 ? (
          <div className="h-44 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex flex-col items-center justify-center p-4 text-center">
            <Inbox className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-2 stroke-1" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Nenhuma tarefa {status.toLowerCase()}
            </p>
            <button
              type="button"
              onClick={() => onAddTask(status)}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar tarefa
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onView={onViewTask}
            />
          ))
        )}
      </div>
    </div>
  );
};
