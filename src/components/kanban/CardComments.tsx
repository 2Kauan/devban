import { useState } from 'react';
import { useCardActivity } from '@/hooks/useCardActivity';
import { MessageSquare, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CardCommentsProps {
  cardId: string;
  canEdit: boolean;
}

export function CardComments({ cardId, canEdit }: CardCommentsProps) {
  const { data: activities, isLoading, addComment, isAdding } = useCardActivity(cardId);
  const [newComment, setNewComment] = useState('');

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    await addComment(newComment.trim());
    setNewComment('');
  };

  return (
    <div className="mt-8 flex flex-col gap-5">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-5 h-5 text-foreground" />
        <h3 className="text-lg font-bold text-foreground">Comentários e Atividade</h3>
      </div>

      {canEdit && (
        <form onSubmit={handleAddComment} className="flex gap-3 mb-2 relative z-20">
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
            <span className="text-xs text-primary font-medium">Você</span>
          </div>
          <div className="flex-1 relative">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escreva um comentário..."
              className="w-full min-h-[40px] max-h-[120px] bg-background border border-border rounded-lg pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-y custom-scrollbar"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={isAdding || !newComment.trim()}
              className="absolute right-1.5 bottom-1.5 p-1.5 bg-primary text-primary-foreground rounded-md disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      )}

      <div className="relative mt-2">
        {/* Timeline vertical line */}
        <div className="absolute left-4 top-2 bottom-4 w-[2px] bg-border z-0"></div>

        <div className="flex flex-col gap-6 z-10 relative">
          {isLoading ? (
            <div className="text-sm text-muted-foreground ml-12">Carregando histórico...</div>
          ) : activities.length === 0 ? (
            <div className="text-sm text-muted-foreground ml-12">Nenhuma atividade registrada.</div>
          ) : (
            activities.map((item) => {
              const dateText = formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR });
              
              if (item.type === 'activity') {
                return (
                  <div key={item.id} className="flex gap-4 relative items-start">
                    <div className="w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center shrink-0 z-10 overflow-hidden mt-0.5">
                      {item.user?.avatar_url ? (
                        <img src={item.user.avatar_url} alt={item.user.name || ''} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground uppercase">{item.user?.name?.substring(0, 2) || 'S'}</span>
                      )}
                    </div>
                    <div className="flex-1 pt-1.5">
                      <p className="text-[14px] text-foreground leading-snug">
                        <span className="font-bold text-foreground">{item.user?.name || 'Sistema'}</span>{' '}
                        {item.content} <span className="text-muted-foreground text-[13px] whitespace-nowrap ml-1">- {dateText}</span>
                      </p>
                    </div>
                  </div>
                );
              }

              // type === 'comment'
              return (
                <div key={item.id} className="flex gap-4 relative items-start">
                  <div className="w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center shrink-0 z-10 overflow-hidden mt-0.5">
                    {item.user?.avatar_url ? (
                      <img src={item.user.avatar_url} alt={item.user.name || ''} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground uppercase">{item.user?.name?.substring(0, 2) || 'U'}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1.5 pt-1">
                      <span className="font-bold text-[14px] text-foreground">{item.user?.name || 'Usuário'}</span>
                      <span className="text-[13px] text-muted-foreground">{dateText}</span>
                    </div>
                    <div className="bg-muted/40 border border-border rounded-lg p-3 text-[14px] text-foreground whitespace-pre-wrap shadow-sm">
                      {item.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
