import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, HeartPulse } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { Project } from '@/types/database';
import { useProjectQuery } from '@/hooks/useProjectQuery';

export default function ProjectHealth() {
  const { project } = useOutletContext<{ project: Project }>();
  const { data } = useProjectQuery(project.id);

  const cards = data?.cards || [];
  const columns = data?.columns || [];
  const projectMembers = data?.projectMembers || [];

  // Memoized Metrics Calculations
  const metrics = useMemo(() => {
    if (!cards || !columns || columns.length === 0) return null;
    
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

    const radarData = [
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
       const highest = [...radarData].sort((a,b) => b.A - a.A)[0];
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
      radarData,
      avgRisk,
      focusText,
      evaluationText,
      radarColor,
    };
  }, [cards, columns, projectMembers]);

  return (
    <div className="p-8 max-w-3xl mx-auto h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <HeartPulse className="text-primary" size={28} />
          Saúde do Projeto
        </h1>
        <p className="text-muted-foreground mt-2">
          Visão geral do desempenho e identificação de riscos no seu fluxo de trabalho.
        </p>
      </div>

      <div className="bg-card border border-border/50 rounded-xl p-6 shadow-sm">
        {!metrics ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="text-muted-foreground/30 mb-4" size={48} />
            <h3 className="text-xl font-bold text-foreground mb-2">Sem dados suficientes</h3>
            <p className="text-muted-foreground max-w-sm">Adicione colunas e cartões ao seu Kanban para visualizar os insights de saúde do projeto.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="bg-muted/30 p-5 rounded-2xl border border-border">
              <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                <Activity size={16} className="text-primary" />
                Risco do Projeto
              </h3>
              
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={metrics.radarData}>
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
                      formatter={(value: any) => [`${value}%`, 'Risco']}
                    />
                    <Radar
                      name="Risco"
                      dataKey="A"
                      stroke={metrics.radarColor}
                      fill={metrics.radarColor}
                      fillOpacity={0.4}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm">
                  <strong className="text-foreground">AVALIAÇÃO DE RISCO:</strong>{' '}
                  <span className={metrics.avgRisk > 60 ? 'text-destructive font-bold' : metrics.avgRisk > 30 ? 'text-yellow-500 font-bold' : 'text-green-500 font-bold'}>
                    {metrics.avgRisk > 60 ? 'Elevado' : metrics.avgRisk > 30 ? 'Moderado' : 'Baixo'} ({metrics.avgRisk}%)
                  </span>
                </p>
                <p className="text-base text-muted-foreground mt-3 leading-relaxed">
                  {metrics.evaluationText}
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
