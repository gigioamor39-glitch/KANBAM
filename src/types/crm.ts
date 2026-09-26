export type TaskStatus = 'Não iniciado' | 'Em Andamento' | 'Finalizado';

export type Priority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

export interface CRMTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  deal_value?: number;
  priority?: Priority;
  due_date?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  isChecking: boolean;
  error?: string | null;
  tableExists?: boolean;
}
