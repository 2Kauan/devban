import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { Project } from '@/types/database';
import { FileText, Download, Clock, Search, FileImage, FileIcon, File } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
  cards: {
    title: string;
  };
  profiles: {
    name: string;
    avatar_url: string;
  } | null;
}

export default function ProjectFiles() {
  const { project } = useOutletContext<{ project: Project }>();
  const [files, setFiles] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (project?.id) {
      fetchFiles();
    }
  }, [project?.id]);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      // Query attachments connected to cards in this project
      const { data, error } = await supabase
        .from('attachments')
        .select(`
          *,
          cards!inner ( project_id, title ),
          profiles ( name, avatar_url )
        `)
        .eq('cards.project_id', project.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Type assertion / coercion for nested arrays
      const formattedFiles = (data || []).map((file: any) => ({
        ...file,
        profiles: Array.isArray(file.profiles) ? file.profiles[0] : file.profiles,
        cards: Array.isArray(file.cards) ? file.cards[0] : file.cards
      }));

      setFiles(formattedFiles);
    } catch (error: any) {
      toast.error('Erro ao buscar arquivos: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <FileImage className="text-blue-500" />;
    if (type.includes('pdf')) return <FileText className="text-red-500" />;
    if (type.includes('word') || type.includes('document')) return <FileText className="text-blue-600" />;
    if (type.includes('sheet') || type.includes('excel')) return <FileText className="text-green-600" />;
    return <FileIcon className="text-muted-foreground" />;
  };

  const filteredFiles = files.filter(f => 
    f.file_name.toLowerCase().includes(search.toLowerCase()) || 
    f.cards?.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-5xl mx-auto h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <FileText className="text-primary" size={28} />
            Arquivos do Projeto
          </h1>
          <p className="text-muted-foreground mt-2">
            Todos os arquivos e anexos enviados nas tarefas deste projeto.
          </p>
        </div>
        
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Buscar por arquivo ou tarefa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border/60 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Arquivo</th>
                <th className="px-6 py-4">Tamanho</th>
                <th className="px-6 py-4">Tarefa Origem</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    Carregando arquivos...
                  </td>
                </tr>
              ) : filteredFiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                        <File size={24} />
                      </div>
                      <p className="text-foreground font-medium text-lg">Nenhum arquivo encontrado</p>
                      <p className="text-muted-foreground max-w-sm mt-1">Os anexos adicionados aos cartões do Kanban aparecerão aqui.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredFiles.map((file, index) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={file.id} 
                    className="hover:bg-muted/10 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-background border border-border/50 flex items-center justify-center shrink-0">
                          {getFileIcon(file.file_type || '')}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground truncate max-w-[250px]" title={file.file_name}>
                            {file.file_name}
                          </span>
                          <span className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            Enviado por {file.profiles?.name || 'Desconhecido'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatBytes(file.file_size)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted/40 text-xs font-medium text-muted-foreground truncate max-w-[200px]" title={file.cards?.title}>
                        {file.cards?.title || 'Tarefa desconhecida'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} />
                        {new Date(file.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Baixar Arquivo"
                      >
                        <Download size={18} />
                      </a>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
