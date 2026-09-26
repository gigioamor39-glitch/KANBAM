import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CRMTask, SupabaseConfig, TaskStatus } from '../types/crm.ts';

const STORAGE_KEY_CONFIG = 'crm_supabase_config';
const STORAGE_KEY_TASKS = 'crm_kanban_tasks';

export const SUPABASE_SQL_SETUP = `-- ========================================================
-- SCRIPT SQL COMPLETO PARA O SUPABASE (CRM KANBAN)
-- Copie e cole este script no SQL Editor do seu projeto Supabase
-- e clique em "RUN".
-- ========================================================

-- 1. CRIAÇÃO DA TABELA DE TAREFAS / NEGÓCIOS
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  status text not null check (status in ('Não iniciado', 'Em Andamento', 'Finalizado')),
  contact_name text default '',
  contact_email text default '',
  contact_phone text default '',
  deal_value numeric(12, 2) default 0,
  priority text default 'Média' check (priority in ('Baixa', 'Média', 'Alta', 'Urgente')),
  due_date text default '',
  tags text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. ÍNDICES PARA OTIMIZAÇÃO DE BUSCA E KANBAN
create index if not exists idx_tasks_status on public.tasks (status);
create index if not exists idx_tasks_created_at on public.tasks (created_at desc);

-- 3. GATILHO (TRIGGER) PARA ATUALIZAR 'updated_at' AUTOMATICAMENTE
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_set_timestamp on public.tasks;
create trigger trigger_set_timestamp
  before update on public.tasks
  for each row
  execute function public.handle_updated_at();

-- 4. HABILITAÇÃO DO ROW LEVEL SECURITY (RLS)
alter table public.tasks enable row level security;

-- 5. POLÍTICAS DE SEGURANÇA E ACESSO (CRUD COMPLETO)
-- Limpeza de políticas existentes anteriores
drop policy if exists "Permitir leitura de tarefas para anon e auth" on public.tasks;
drop policy if exists "Permitir inserção de tarefas para anon e auth" on public.tasks;
drop policy if exists "Permitir atualização de tarefas para anon e auth" on public.tasks;
drop policy if exists "Permitir exclusão de tarefas para anon e auth" on public.tasks;
drop policy if exists "Acesso público irrestrito a tarefas" on public.tasks;

-- Política de Leitura (SELECT)
create policy "Permitir leitura de tarefas para anon e auth"
  on public.tasks
  for select
  to anon, authenticated
  using (true);

-- Política de Inserção (INSERT)
create policy "Permitir inserção de tarefas para anon e auth"
  on public.tasks
  for insert
  to anon, authenticated
  with check (true);

-- Política de Atualização (UPDATE)
create policy "Permitir atualização de tarefas para anon e auth"
  on public.tasks
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- Política de Exclusão (DELETE)
create policy "Permitir exclusão de tarefas para anon e auth"
  on public.tasks
  for delete
  to anon, authenticated
  using (true);

-- 6. HABILITAR SINCRONIZAÇÃO EM TEMPO REAL (REALTIME)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end $$;

-- 7. BUCKET DE ARMAZENAMENTO E POLÍTICAS DE STORAGE (OPCIONAL PARA ANEXOS)
insert into storage.buckets (id, name, public)
values ('crm-files', 'crm-files', true)
on conflict (id) do nothing;

-- Políticas de Storage para o Bucket 'crm-files'
drop policy if exists "Leitura pública de arquivos crm" on storage.objects;
create policy "Leitura pública de arquivos crm"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'crm-files');

drop policy if exists "Upload de arquivos crm" on storage.objects;
create policy "Upload de arquivos crm"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'crm-files');

drop policy if exists "Atualização de arquivos crm" on storage.objects;
create policy "Atualização de arquivos crm"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'crm-files');

drop policy if exists "Exclusão de arquivos crm" on storage.objects;
create policy "Exclusão de arquivos crm"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'crm-files');
`;

export function getSavedConfig(): SupabaseConfig {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        return { url: parsed.url, anonKey: parsed.anonKey };
      }
    }
  } catch (err) {
    console.error('Falha ao ler configuração local do Supabase:', err);
  }

  return {
    url: envUrl,
    anonKey: envKey,
  };
}

export function saveConfig(config: SupabaseConfig): void {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  currentClient = null; // Reset cached client
}

export function clearConfig(): void {
  localStorage.removeItem(STORAGE_KEY_CONFIG);
  currentClient = null;
}

let currentClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (currentClient) return currentClient;

  const config = getSavedConfig();
  if (config.url && config.anonKey) {
    try {
      currentClient = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return currentClient;
    } catch (err) {
      console.error('Erro ao inicializar Supabase Client:', err);
      return null;
    }
  }
  return null;
}

// Local Storage helpers for offline resilience
export function getLocalTasks(): CRMTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TASKS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Erro ao recuperar tarefas locais:', e);
  }
  return [];
}

export function saveLocalTasks(tasks: CRMTask[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error('Erro ao salvar tarefas locais:', e);
  }
}

// Test connectivity and table readiness
export async function testConnection(url: string, anonKey: string): Promise<{
  success: boolean;
  tableExists: boolean;
  message: string;
}> {
  if (!url || !anonKey) {
    return { success: false, tableExists: false, message: 'URL e Chave Anônima são obrigatórias.' };
  }

  try {
    const testClient = createClient(url, anonKey);
    const { data, error } = await testClient.from('tasks').select('id').limit(1);

    if (error) {
      if (error.code === '42P01' || error.message.includes('relation "public.tasks" does not exist') || error.message.includes('does not exist')) {
        return {
          success: true,
          tableExists: false,
          message: 'Conectado ao Supabase com sucesso, porém a tabela "tasks" ainda não foi criada. Execute o script SQL fornecido.',
        };
      }
      return {
        success: false,
        tableExists: false,
        message: `Falha na requisição: ${error.message} (${error.code || ''})`,
      };
    }

    return {
      success: true,
      tableExists: true,
      message: 'Conexão estabelecida e tabela "tasks" pronta para uso!',
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      tableExists: false,
      message: `Erro ao testar conexão: ${errMsg}`,
    };
  }
}

// Supabase CRUD Operations with seamless local fallback
export async function fetchTasks(): Promise<{ tasks: CRMTask[]; source: 'supabase' | 'local'; error?: string }> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: CRMTask[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description || '',
          status: item.status as TaskStatus,
          contact_name: item.contact_name || '',
          contact_email: item.contact_email || '',
          contact_phone: item.contact_phone || '',
          deal_value: Number(item.deal_value || 0),
          priority: item.priority || 'Média',
          due_date: item.due_date || '',
          tags: Array.isArray(item.tags) ? item.tags : [],
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
        // Update local cache
        saveLocalTasks(mapped);
        return { tasks: mapped, source: 'supabase' };
      }

      console.warn('Erro ao carregar do Supabase, recorrendo ao cache local:', error?.message);
      return { tasks: getLocalTasks(), source: 'local', error: error?.message };
    } catch (err: any) {
      console.warn('Exceção ao buscar no Supabase:', err.message);
      return { tasks: getLocalTasks(), source: 'local', error: err.message };
    }
  }

  return { tasks: getLocalTasks(), source: 'local' };
}

export async function insertTask(task: Omit<CRMTask, 'id' | 'created_at' | 'updated_at'>): Promise<CRMTask> {
  const now = new Date().toISOString();
  const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const newTask: CRMTask = {
    ...task,
    id: generatedId,
    created_at: now,
    updated_at: now,
  };

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('tasks')
        .insert([
          {
            id: newTask.id,
            title: newTask.title,
            description: newTask.description || '',
            status: newTask.status,
            contact_name: newTask.contact_name || '',
            contact_email: newTask.contact_email || '',
            contact_phone: newTask.contact_phone || '',
            deal_value: newTask.deal_value || 0,
            priority: newTask.priority || 'Média',
            due_date: newTask.due_date || '',
            tags: newTask.tags || [],
            created_at: newTask.created_at,
            updated_at: newTask.updated_at,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        const saved: CRMTask = {
          id: data.id,
          title: data.title,
          description: data.description,
          status: data.status,
          contact_name: data.contact_name,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          deal_value: Number(data.deal_value || 0),
          priority: data.priority,
          due_date: data.due_date,
          tags: data.tags || [],
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        // sync to local
        const local = getLocalTasks();
        saveLocalTasks([saved, ...local.filter((t) => t.id !== saved.id)]);
        return saved;
      }
      console.warn('Erro ao inserir no Supabase, mantendo local:', error?.message);
    } catch (err) {
      console.error('Falha de rede ao inserir no Supabase:', err);
    }
  }

  // Fallback to local storage
  const local = getLocalTasks();
  const updated = [newTask, ...local];
  saveLocalTasks(updated);
  return newTask;
}

export async function updateTask(id: string, updates: Partial<CRMTask>): Promise<CRMTask | null> {
  const now = new Date().toISOString();
  const client = getSupabaseClient();

  if (client) {
    try {
      const payload: Record<string, any> = {
        updated_at: now,
      };
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.contact_name !== undefined) payload.contact_name = updates.contact_name;
      if (updates.contact_email !== undefined) payload.contact_email = updates.contact_email;
      if (updates.contact_phone !== undefined) payload.contact_phone = updates.contact_phone;
      if (updates.deal_value !== undefined) payload.deal_value = updates.deal_value;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.due_date !== undefined) payload.due_date = updates.due_date;
      if (updates.tags !== undefined) payload.tags = updates.tags;

      const { data, error } = await client
        .from('tasks')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const updatedTask: CRMTask = {
          id: data.id,
          title: data.title,
          description: data.description,
          status: data.status,
          contact_name: data.contact_name,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
          deal_value: Number(data.deal_value || 0),
          priority: data.priority,
          due_date: data.due_date,
          tags: data.tags || [],
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
        const local = getLocalTasks();
        saveLocalTasks(local.map((t) => (t.id === id ? updatedTask : t)));
        return updatedTask;
      }
    } catch (err) {
      console.warn('Erro ao atualizar no Supabase:', err);
    }
  }

  // Fallback update in local storage
  const local = getLocalTasks();
  const existing = local.find((t) => t.id === id);
  if (!existing) return null;

  const modified: CRMTask = {
    ...existing,
    ...updates,
    updated_at: now,
  };
  saveLocalTasks(local.map((t) => (t.id === id ? modified : t)));
  return modified;
}

export async function deleteTask(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.from('tasks').delete().eq('id', id);
      if (error) {
        console.warn('Erro ao deletar no Supabase:', error.message);
      }
    } catch (err) {
      console.warn('Exceção ao deletar no Supabase:', err);
    }
  }

  const local = getLocalTasks();
  saveLocalTasks(local.filter((t) => t.id !== id));
  return true;
}

// Push local offline tasks to Supabase in bulk
export async function syncLocalTasksToSupabase(): Promise<{ count: number; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { count: 0, error: 'Supabase não está configurado.' };
  }

  const localTasks = getLocalTasks();
  if (localTasks.length === 0) {
    return { count: 0 };
  }

  try {
    const records = localTasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
      status: t.status,
      contact_name: t.contact_name || '',
      contact_email: t.contact_email || '',
      contact_phone: t.contact_phone || '',
      deal_value: t.deal_value || 0,
      priority: t.priority || 'Média',
      due_date: t.due_date || '',
      tags: t.tags || [],
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));

    const { data, error } = await client.from('tasks').upsert(records, { onConflict: 'id' }).select();

    if (error) {
      return { count: 0, error: error.message };
    }

    return { count: data?.length || records.length };
  } catch (err: any) {
    return { count: 0, error: err.message };
  }
}
