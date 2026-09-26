import React, { useState } from 'react';
import { CRMTask, TaskStatus } from '../types/crm.ts';
import { 
  Calendar, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  Trash2, 
  Edit3, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Circle,
  MoreVertical,
  ExternalLink
} from 'lucide-react';

interface TaskCardProps {
  task: CRMTask;
  onStatusChange: (id: string, newStatus: TaskStatus) => void;
  onEdit: (task: CRMTask) => void;
  onDelete: (id: string) => void;
  onView: (task: CRMTask) => void;
}

const STATUS_FLOW: TaskStatus[] = ['Não iniciado', 'Em Andamento', 'Finalizado'];

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onStatusChange,
  onEdit,
  onDelete,
  onView,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const currentIndex = STATUS_FLOW.indexOf(task.status);
  const prevStatus = currentIndex > 0 ? STATUS_FLOW[currentIndex - 1] : null;
  const nextStatus = currentIndex < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIndex + 1] : null;

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null || val === 0) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const getPriorityStyle = (priority?: string) => {
    switch (priority) {
      case 'Urgente':
        return 'text-rose-600 dark:text-rose-400';
      case 'Alta':
        return 'text-amber-600 dark:text-amber-400';
      case 'Baixa':
        return 'text-slate-500 dark:text-slate-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={`group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-40 scale-[0.98]' : 'opacity-100'
      }`}
    >
      {/* Top row: Priority & Options */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`font-medium ${getPriorityStyle(task.priority)}`}>
            {task.priority || 'Média'}
          </span>
          {task.tags && task.tags.length > 0 && (
            <>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
              <span className="text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                {task.tags.join(', ')}
              </span>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
            title="Ações da tarefa"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-20" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(false);
                }} 
              />
              <div className="absolute right-0 top-6 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-30 text-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onView(task);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  Detalhes
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onEdit(task);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                  Editar
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                    onDelete(task.id);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 
        onClick={() => onView(task)}
        className="font-medium text-slate-900 dark:text-slate-100 text-sm leading-snug mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2"
      >
        {task.title}
      </h4>

      {/* Description excerpt if present */}
      {task.description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Metadata items: Client & Value & Due Date */}
      <div className="space-y-1.5 pt-1 text-xs text-slate-600 dark:text-slate-400">
        {task.contact_name && (
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{task.contact_name}</span>
          </div>
        )}

        {formatCurrency(task.deal_value) && (
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium font-mono tabular-nums">
            <DollarSign className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{formatCurrency(task.deal_value)}</span>
          </div>
        )}

        {task.due_date && (
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Prazo: {task.due_date}</span>
          </div>
        )}
      </div>

      {/* Quick Move Footer Controls */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        {prevStatus ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(task.id, prevStatus);
            }}
            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            title={`Mover para ${prevStatus}`}
          >
            <ArrowLeft className="w-3 h-3" />
            <span className="truncate max-w-[80px]">{prevStatus}</span>
          </button>
        ) : (
          <span />
        )}

        {nextStatus && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(task.id, nextStatus);
            }}
            className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 ml-auto transition-colors"
            title={`Mover para ${nextStatus}`}
          >
            <span className="truncate max-w-[90px]">{nextStatus}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
