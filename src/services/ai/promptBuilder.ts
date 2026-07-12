import type { AIGenerationMode } from '@/types/ai';

export const buildKanbanPrompt = (mode: AIGenerationMode, text: string): string => {
  const baseInstructions = `
Você é um Especialista de Produto sênior e Gerente de Projetos Ágeis altamente habilidoso.
O seu objetivo é receber anotações, requisitos ou transcrições e transformá-los em um Kanban board perfeitamente estruturado e detalhado.

CRÍTICO:
A sua saída DEVE ser ÚNICA E EXCLUSIVAMENTE um objeto JSON válido, que respeite estritamente a interface descrita abaixo.
NÃO INCLUA formatação markdown (como \`\`\`json), nem introduções, nem explicações. APENAS o JSON puro.

{
  "title": "Nome sugerido para este escopo",
  "description": "Uma breve descrição (1-2 frases)",
  "columns": [
    {
      "id": "string única (ex: col-1)",
      "title": "Nome da Coluna (ex: Backlog, To Do, Em Andamento...)",
      "color": "#HEX_AQUI (Escolha uma cor pastel bonita para esta coluna baseada na categoria/urgência dela. Obrigatório!)",
      "tasks": [
        {
          "id": "string única (ex: task-1)",
          "title": "Título claro e acionável da tarefa",
          "description": "Detalhes da tarefa. IMPORTANTE: Se o texto mencionar quem vai fazer isso (responsável/assignee) ou o cargo, escreva no topo da descrição em negrito: **Responsável:** [Nome]. Depois, quebre a linha e explique a tarefa.",
          "priority": "low" | "medium" | "high",
          "checklist": ["Passo 1", "Passo 2", "Passo 3"] // OBRIGATÓRIO: Crie sempre 2 a 5 subtarefas práticas se a tarefa for o mínimo complexa.
        }
      ]
    }
  ],
  "suggested_categories": [
    { "id": "cat-1", "name": "Frontend", "color": "#3b82f6" }
  ]
}
`;

  let modeInstructions = '';

  switch (mode) {
    case 'planning':
      modeInstructions = `
MODO DE GERAÇÃO: Planejamento Macro
Aja focando na estrutura ampla do projeto. Crie colunas separadas por Grandes Fases ou Áreas de Responsabilidade (ex: "Fundação Técnica", "Backend", "Frontend", "Marketing e Lançamento").
Evite colunas de fluxo ágil (To Do, Doing). Agrupe as tarefas de acordo com suas categorias e fases de implementação lógica.
`;
      break;
    case 'sprint':
      modeInstructions = `
MODO DE GERAÇÃO: Sprint Backlog
Aja focando no fluxo de execução ágil do dia a dia. Crie colunas representando os estágios do desenvolvimento (ex: "Backlog", "To Do (Esta Sprint)", "Em Progresso", "Review", "Done").
Crie tarefas extremamente acionáveis, pequenas e claras. Se algo no texto for grande demais, quebre em múltiplas tarefas.
`;
      break;
    case 'summary':
      modeInstructions = `
MODO DE GERAÇÃO: Resumo de Reunião
Aja focando em extrair "Action Items". Ignore a conversa e o ruído. Encontre o que precisa ser feito, quem (se aplicável) e quando.
Crie colunas como "Para Fazer Logo", "Para Investigar/Validar", "Bloqueados". Transforme os acordos da reunião diretamente em tarefas práticas.
`;
      break;
  }

  const userContent = `
Abaixo está o conteúdo fornecido pelo usuário. Analise com atenção e devolva APENAS o JSON.

--- CONTEÚDO DO USUÁRIO ---
${text}
---------------------------
  `;

  return baseInstructions + modeInstructions + userContent;
};
