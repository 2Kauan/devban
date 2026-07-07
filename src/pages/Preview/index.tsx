import { ArrowLeft, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { KanbanBoard } from '@/components/kanban/KanbanBoard';

export default function Preview() {
  const columns = [
    { id: 'col-1', project_id: 'preview', title: 'Ideias', position: 1000, description: '', created_at: '', updated_at: '' },
    { id: 'col-2', project_id: 'preview', title: 'A Fazer', position: 2000, description: '', created_at: '', updated_at: '' },
    { id: 'col-3', project_id: 'preview', title: 'Fazendo', position: 3000, description: '', created_at: '', updated_at: '' },
    { id: 'col-4', project_id: 'preview', title: 'Concluído', position: 4000, description: '', created_at: '', updated_at: '' }
  ];

  const cards = [
    { id: 'card-1', project_id: 'preview', column_id: 'col-1', title: 'Criar nova logo', description: 'Explorar ideias minimalistas', position: 1000, priority: 'medium', created_at: '', updated_at: '' },
    { id: 'card-2', project_id: 'preview', column_id: 'col-2', title: 'Redesign da Landing Page', description: 'Focar na taxa de conversão', position: 1000, priority: 'high', due_date: '2024-12-31', created_at: '', updated_at: '' },
    { id: 'card-3', project_id: 'preview', column_id: 'col-3', title: 'Integração com Asaas', description: 'Configurar webhooks e split', position: 1000, priority: 'urgent', due_date: '2024-10-15', created_at: '', updated_at: '' },
    { id: 'card-4', project_id: 'preview', column_id: 'col-4', title: 'Setup Inicial', description: 'Configuração do repositório', position: 1000, priority: 'low', created_at: '', updated_at: '' },
  ] as any[];

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-muted/10 overflow-hidden">
      {/* Project Header */}
      <header className="bg-card border-b border-border p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-tight">Projeto Demonstração</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-semibold uppercase">Modo Preview</span>
              <span className="w-1 h-1 bg-border rounded-full"></span>
              <span>4 colunas</span>
              <span className="w-1 h-1 bg-border rounded-full"></span>
              <span>4 tarefas</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64 opacity-50 pointer-events-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all"
            />
          </div>
          <button className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent rounded-lg transition-colors opacity-50 cursor-not-allowed">
            <Filter size={18} />
          </button>
          <div className="w-px h-6 bg-border mx-1"></div>
          <Link to="/register" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg transition-colors text-sm hover:scale-105 active:scale-95 shadow-sm">
            Criar conta para editar
          </Link>
        </div>
      </header>

      {/* Kanban Area */}
      <div className="flex-1 overflow-hidden p-6 pointer-events-none opacity-90">
        <div className="h-full pointer-events-none select-none">
          <KanbanBoard 
            columns={columns}
            cards={cards}
            onColumnsChange={() => {}}
            onCardsChange={() => {}}
            onCardClick={() => {}}
            onAddCard={() => {}}
            onAddColumn={() => {}}
            onUpdateColumn={() => {}}
            onDeleteColumn={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
