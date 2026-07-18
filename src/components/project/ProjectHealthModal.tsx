import { X, Activity, Lightbulb, Rocket, Settings, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import type { KanbanCardType, KanbanColumnType } from '@/types/kanban';
import type { Profile } from '@/types/database';
import { useMemo } from 'react';

interface ProjectHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: KanbanCardType[];
  columns: KanbanColumnType[];
  projectMembers: { user: Profile }[];
}

export function ProjectHealthModal({
  isOpen,
  onClose,
  cards,
  columns,
  projectMembers,
}: ProjectHealthModalProps) {
  
  // Memoized Metrics Calculations
  const metrics = useMemo(() => {
    if (!cards || !columns) return null;
    
    let completedColIds = columns.filter(c => c.is_completed).map(c => c.id);
    if (completedColIds.length === 0 && columns.length > 0) {
      const sortedCols = [...columns].sort((a, b) => b.position - a.position);
      completedColIds = [sortedCols[0].id];
    }
    
    const activeCards = cards.filter(c => !completedColIds.includes(c.column_id));
    const completedCards = cards.filter(c => completedColIds.includes(c.column_id));
    
    // 1. Time (Prazo)
    const now = new Date();
    let timeRisk = 0;
    if (activeCards.length > 0) {
      const overdueOrSoon = activeCards.filter(c => {
        if (!c.due_date) return false;
        const due = new Date(c.due_date);
        const diffDays = (due.getTime() - now.getTime()) / (1000 * 3600 * 24);
        return diffDays < 2; // Vencidos ou vencem em < 2 dias
      });
      timeRisk = Math.min((overdueOrSoon.length / activeCards.length) * 100, 100);
    }

    // 2. Resource (Recursos / Sobrecarga)
    let resourceRisk = 0;
    const activeMembers = projectMembers.length || 1;
    const avgCardsPerMember = activeCards.length / activeMembers;
    resourceRisk = Math.min((avgCardsPerMember / 5) * 100, 100); // 5+ cards = 100% risk
    
    // 3. Complexity (Complexidade)
    let complexityRisk = 0;
    if (cards.length > 0) {
      const complexCards = cards.filter(c => (c.categories?.length || 0) > 2 || c.priority === 'urgent');
      complexityRisk = Math.min((complexCards.length / cards.length) * 100, 100);
    }
    
    // 4. Scope (Escopo)
    let scopeRisk = 0;
    if (cards.length > 0) {
      // Se tiver muitas pendentes e poucas concluidas
      scopeRisk = Math.min((activeCards.length / cards.length) * 100, 100);
    }
    
    // 5. Quality (Qualidade) - Inversamente proporcional à porcentagem de conclusão
    let qualityRisk = 0;
    if (cards.length > 0) {
       qualityRisk = 100 - Math.min((completedCards.length / cards.length) * 100, 100);
    }

    const data = [
      { subject: 'Prazo', A: Math.round(timeRisk) },
      { subject: 'Recurso', A: Math.round(resourceRisk) },
      { subject: 'Complexidade', A: Math.round(complexityRisk) },
      { subject: 'Escopo', A: Math.round(scopeRisk) },
      { subject: 'Qualidade', A: Math.round(qualityRisk) },
    ];
    
    const avgRisk = Math.round((timeRisk + resourceRisk + complexityRisk + scopeRisk + qualityRisk) / 5);
    
    let focusText = 'Projeto saudável.';
    let evaluationText = 'O projeto está progredindo muito bem, sem gargalos aparentes. Continue o bom trabalho!';
    
    if (avgRisk > 30) {
       const highest = [...data].sort((a,b) => b.A - a.A)[0];
       focusText = `Foco em ${highest.subject}.`;
       
       if (highest.subject === 'Prazo') {
          evaluationText = `O risco é ${avgRisk > 60 ? 'Elevado' : 'Moderado'} principalmente devido ao Prazo. Há tarefas atrasadas ou muito próximas do vencimento, o que pode comprometer o cronograma.`;
       } else if (highest.subject === 'Recurso') {
          evaluationText = `O risco é ${avgRisk > 60 ? 'Elevado' : 'Moderado'} devido à alocação de Recursos. Um ou mais membros da equipe estão sobrecarregados com muitas tarefas simultâneas, o que gera gargalos.`;
       } else if (highest.subject === 'Complexidade') {
          evaluationText = `O risco é ${avgRisk > 60 ? 'Elevado' : 'Moderado'} por conta da Complexidade. Há muitos cards urgentes ou com excesso de categorias que exigem atenção redobrada.`;
       } else if (highest.subject === 'Escopo') {
          evaluationText = `O risco é ${avgRisk > 60 ? 'Elevado' : 'Moderado'} devido ao Escopo do projeto. A proporção de tarefas pendentes em relação ao total é muito alta, indicando acúmulo de trabalho.`;
       } else if (highest.subject === 'Qualidade') {
          evaluationText = `O risco é ${avgRisk > 60 ? 'Elevado' : 'Moderado'} em relação à Qualidade e fluxo. O avanço geral das tarefas para a coluna de concluído está muito lento.`;
       }
    }

    let radarColor = "#22c55e"; // green
    if (avgRisk > 60) radarColor = "#ef4444"; // red
    else if (avgRisk > 30) radarColor = "#eab308"; // yellow

    return {
      radarData: data,
      avgRisk,
      focusText,
      evaluationText,
      radarColor,
    };
  }, [cards, columns]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-md h-full bg-card shadow-2xl flex flex-col border-l border-border"
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Activity size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Analytics & Saúde</h2>
                <p className="text-sm text-muted-foreground">Insights em tempo real</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Project Risk Section */}
            <section className="bg-muted/30 p-5 rounded-2xl border border-border">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Activity size={16} className="text-primary" />
                Risco do Projeto
              </h3>
              
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={metrics?.radarData}>
                    <PolarGrid stroke="hsl(var(--muted-foreground) / 0.2)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                        color: 'hsl(var(--foreground))'
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                      formatter={(value: number) => [`${value}%`, 'Risco']}
                    />
                    <Radar
                      name="Risco"
                      dataKey="A"
                      stroke={metrics?.radarColor}
                      fill={metrics?.radarColor}
                      fillOpacity={0.4}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm">
                  <strong className="text-foreground">AVALIAÇÃO DE RISCO:</strong>{' '}
                  <span className={metrics?.avgRisk! > 60 ? 'text-destructive font-bold' : metrics?.avgRisk! > 30 ? 'text-yellow-500 font-bold' : 'text-green-500 font-bold'}>
                    {metrics?.avgRisk! > 60 ? 'Elevado' : metrics?.avgRisk! > 30 ? 'Moderado' : 'Baixo'} ({metrics?.avgRisk}%)
                  </span>
                </p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {metrics?.evaluationText}
                </p>
              </div>
            </section>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
