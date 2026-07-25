import React from 'react';
import { Settings2, RefreshCw, FolderKanban } from 'lucide-react';

interface IntegrationCardProps {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  isLoading?: boolean;
  hideToggle?: boolean;
  icon: React.ReactNode;
  onConfigure: () => void;
  onToggle: () => void;
  projectName?: string;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({ name, description, isActive, isLoading, hideToggle, icon, onConfigure, onToggle, projectName }) => (
  <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div className="w-20 h-20 rounded-2xl bg-white border border-border/20 shadow-sm flex items-center justify-center overflow-hidden">
          {icon}
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
          {isLoading ? 'Conectando...' : isActive ? 'Ativo' : 'Inativo'}
        </span>
      </div>
      <div>
        <h3 className="font-bold text-lg text-foreground">{name}</h3>
        <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
        {isActive && projectName && (
          <div className="flex items-center gap-1.5 text-xs text-primary font-bold mt-3">
            <FolderKanban size={14} />
            {projectName}
          </div>
        )}
      </div>
    </div>
    <div className="pt-6 mt-4 border-t border-border/40 flex items-center justify-between">
      <button onClick={onConfigure} className="text-xs font-bold text-muted-foreground hover:text-foreground flex items-center gap-1.5">
        <Settings2 size={14} /> Configurar
      </button>
      {!hideToggle && (
        <button 
          onClick={onToggle} 
          disabled={isLoading}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            isLoading 
              ? 'bg-primary/70 text-primary-foreground cursor-wait' 
              : isActive 
                ? 'bg-muted' 
                : 'bg-primary text-primary-foreground'
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw size={14} className="animate-spin" />
              Conectando
            </>
          ) : isActive ? 'Desconectar' : 'Conectar'}
        </button>
      )}
    </div>
  </div>
);
