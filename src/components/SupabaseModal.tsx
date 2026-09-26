import React, { useState } from 'react';
import { 
  X, 
  Database, 
  Check, 
  Copy, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  UploadCloud 
} from 'lucide-react';
import { 
  getSavedConfig, 
  saveConfig, 
  clearConfig, 
  testConnection, 
  SUPABASE_SQL_SETUP, 
  syncLocalTasksToSupabase 
} from '../lib/supabase.ts';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const current = getSavedConfig();
  const [url, setUrl] = useState(current.url);
  const [anonKey, setAnonKey] = useState(current.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    tableExists: boolean;
    message: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection(url.trim(), anonKey.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        tableExists: false,
        message: err.message || 'Erro inesperado ao testar conexão.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    saveConfig({ url: url.trim(), anonKey: anonKey.trim() });
    onConfigChanged();
    onClose();
  };

  const handleDisconnect = () => {
    clearConfig();
    setUrl('');
    setAnonKey('');
    setTestResult(null);
    onConfigChanged();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSyncLocal = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncLocalTasksToSupabase();
      if (res.error) {
        setSyncResult(`Erro ao sincronizar: ${res.error}`);
      } else {
        setSyncResult(`Sucesso! ${res.count} tarefa(s) sincronizada(s) com o Supabase.`);
        onConfigChanged();
      }
    } catch (err: any) {
      setSyncResult(`Falha: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Conectar ao Supabase
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Guarde todas as tarefas, status e negócios do CRM no seu banco de dados na nuvem.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Credentials Inputs */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Supabase Project URL
                </label>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  Abrir Supabase <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Supabase Anon / Public API Key
              </label>
              <input
                type="password"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !url || !anonKey}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                {isTesting ? 'Testando Conexão...' : 'Testar Conexão'}
              </button>

              {current.url && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium transition-colors"
                >
                  Desconectar
                </button>
              )}
            </div>

            {/* Test result message */}
            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs border flex items-start gap-2 ${
                  testResult.success && testResult.tableExists
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : testResult.success && !testResult.tableExists
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                }`}
              >
                {testResult.success && testResult.tableExists ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium">{testResult.message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sync Local Data to Supabase Button */}
          {url && anonKey && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="block text-xs font-medium text-slate-800 dark:text-slate-200">
                  Sincronização de Tarefas
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Transfira tarefas criadas localmente para o Supabase.
                </span>
              </div>
              <button
                type="button"
                onClick={handleSyncLocal}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
              </button>
            </div>
          )}

          {syncResult && (
            <div className="p-2.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg">
              {syncResult}
            </div>
          )}

          {/* Setup Script Guide */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Script SQL para criar a tabela no Supabase
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Execute no <strong>SQL Editor</strong> do painel Supabase para criar a estrutura completa.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded transition-colors"
              >
                {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {isCopied ? 'Copiado!' : 'Copiar SQL'}
              </button>
            </div>

            <div className="relative">
              <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono overflow-x-auto max-h-44 text-[11px] leading-relaxed">
                {SUPABASE_SQL_SETUP}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-lg transition-colors"
          >
            Salvar e Conectar
          </button>
        </div>
      </div>
    </div>
  );
};
