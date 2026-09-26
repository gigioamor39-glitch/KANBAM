import React from 'react';
import { CRMTask, TaskStatus } from '../types/crm.ts';
import { 
  X, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  DollarSign, 
  Edit3, 
  Trash2, 
  Clock, 
  Tag 
} from 'lucide-react';

interface TaskDetailsModalProps {
  task: CRMTask | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (task: CRMTask) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: TaskStatus) => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  task,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  if (!isOpen || !task) return null;

  const formatCurrency = (val?: number) => {
    if (val === undefined || val === null || val === 0) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Não definido';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1 pr-4">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Tarefa #{task.id.slice(0, 8)}
            </span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 leading-snug">
              {task.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Switcher Bar */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-lg border border-slate-200/80 dark:border-slate-700">
            <span className="block text-xs text-slate-500 dark:text-slate-400 mb-2">
              Status Atual no Kanban:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Não iniciado', 'Em Andamento', 'Finalizado'] as TaskStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => onStatusChange(task.id, st)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    task.status === st
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                Valor do Negócio
              </span>
              <div className="flex items-center gap-1 font-mono text-base font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                <DollarSign className="w-4 h-4 shrink-0" />
                <span>{formatCurrency(task.deal_value)}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
              <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                Prioridade & Prazo
              </span>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200">
                <span>{task.priority || 'Média'}</span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {task.due_date ? task.due_date : 'Sem prazo'}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Details */}
          {(task.contact_name || task.contact_email || task.contact_phone) && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Contato / Cliente
              </h4>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                {task.contact_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-900 dark:text-slate-100">{task.contact_name}</span>
                  </div>
                )}
                {task.contact_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <a href={`mailto:${task.contact_email}`} className="hover:underline text-blue-600 dark:text-blue-400">
                      {task.contact_email}
                    </a>
                  </div>
                )}
                {task.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{task.contact_phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Descrição & Observações
              </h4>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg text-xs leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {task.description}
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Etiquetas
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded"
                  >
                    <Tag className="w-3 h-3 text-slate-400" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Timestamps */}
          <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3">
            <span>Criado em: {formatDate(task.created_at)}</span>
            <span>Atualizado: {formatDate(task.updated_at)}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(task.id);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Excluir Tarefa
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(task);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar Dados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
