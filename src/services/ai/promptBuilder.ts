import type { AIGenerationMode } from '@/types/ai';

export const buildKanbanPrompt = (mode: AIGenerationMode, text: string): string => {
  const baseInstructions = `
Você é um Especialista de Produto sênior e Gerente de Projetos Ágeis altamente habilidoso.
O seu objetivo é receber anotações, requisitos ou transcrições e transformá-los em um Kanban board perfeitamente estruturado e detalhado.

CRÍTICO:
A sua saída DEVE ser ÚNICA E EXCLUSIVAMENTE um objeto JSON válido, que respeite estritamente a interface descrita abaixo.
NÃO INCLUA formatação markdown (como \`\`\`json), nem introduções, nem explicações. APENAS o JSON puro.

INSTRUÇÕES DE COLUNAS E FLUXO:
- Sempre inclua uma coluna de "Concluído" (ou "Done") no fluxo gerado (ex: "A Fazer", "Em Progresso", "Concluído"), para que o usuário possa mover tarefas finalizadas.
- Se o usuário sugerir colunas ou estados específicos no texto, respeite a vontade dele, mas certifique-se de adicionar também a coluna de tarefas finalizadas/concluídas se ela fizer sentido no fluxo.

INSTRUÇÕES DE PRIORIDADE:
- Analise cuidadosamente o nível de urgência e importância de cada tarefa no texto e atribua explicitamente o campo "priority" com um dos valores permitidos: "low", "medium", "high" ou "urgent". Não deixe a prioridade em branco.

{
  "title": "Nome sugerido para este escopo",
  "description": "Uma breve descrição (1-2 frases)",
  "columns": [
    {
      "id": "string única (ex: col-1)",
      "title": "Nome exato da Coluna exigida ou sugerida (ex: 'A Fazer', 'Em Progresso', 'Concluído')",
      "color": "#HEX_AQUI (Cor pastel baseada na categoria da coluna)",
      "is_completed": true, // (boolean, defina true APENAS para a coluna de concluídos/entregas)
      "tasks": [
        {
          "id": "string única (ex: task-1)",
          "title": "Título claro e acionável",
          "description": "Detalhes. IMPORTANTE: Não use gambiarras como [Raia: X] no texto. NUNCA invente responsáveis ou nomes de pessoas (ex: João, Ana, Carlos) se o documento original não os citar expressamente. Mantenha os cartões não atribuídos se não houver dono claro.",
          "priority": "low" | "medium" | "high" | "urgent",
          "due_date": "2026-12-31T23:59:59Z (Opcional, extraia prazos se mencionados)",
          "tags": [
            { "name": "Nome do Departamento, Raia ou Tag", "color": "#HEX_COR (ATENÇÃO: Use cores SEMPRE diferentes e bem distintas umas das outras para cada tag diferente na lista!)" }
          ],
          "checklist": ["Passo 1", "Passo 2"],
          "subtasks": [
            {
              "id": "string única (ex: sub-1)",
              "title": "Título da sub-tarefa",
              "priority": "low" | "medium" | "high" | "urgent"
            }
          ]
        }
      ]
    }
  ]
}
`;

  let modeInstructions = '';

  switch (mode) {
    case 'planning':
      modeInstructions = `
MODO: Planejamento Macro
INSTRUÇÃO VITAL: Leia o documento do usuário. Se ele definir uma estrutura de fases/colunas próprias (ex: Concepção, Execução, Aprovação, etc), USE ESSAS COLUNAS, mas certifique-se de adicionar uma coluna de "Concluído" no final do fluxo.
Se o documento não sugerir colunas, agrupe por grandes áreas de implementação ou fases de fluxo padrão (ex: A Fazer, Em Progresso, Concluído).
Se o documento exigir Raias (Swimlanes) ou separação por departamentos, simule-as usando a array "tags" DENTRO de cada tarefa para classificá-las visualmente.
NOVIDADE CRÍTICA DE HIERARQUIA: Se o usuário enviar uma lista com um 'título pai' (ex: "ETAPA 2 - UX/UI") e várias tarefas filhas logo abaixo, NÃO crie dezenas de cartões soltos. Crie UM ÚNICO CARTÃO chamado "ETAPA 2 - UX/UI" e coloque todas as tarefas filhas na propriedade "subtasks" (array de sub-tarefas) desse cartão.
`;
      break;
    case 'sprint':
      modeInstructions = `
MODO: Sprint Backlog
INSTRUÇÃO VITAL: Leia o documento do usuário. Se ele definir um fluxo específico (ex: Desenvolvimento, Revisão por Pares, Validação Técnica), USE EXATAMENTE AS COLUNAS DELE e adicione a coluna "Concluído".
Nunca junte "Execução" com "Aprovação" se o documento pedir a separação delas.
Quebre os requisitos complexos do documento em múltiplas tarefas pequenas (action items). Respeite as regras de prioridade citadas no texto ou determine-as conforme a urgência descrita.
`;
      break;
    case 'summary':
      modeInstructions = `
MODO: Resumo de Reunião
INSTRUÇÃO VITAL: Extraia "Action Items" e acordos. Crie colunas precisas baseadas no que foi definido (ex: "Para Fazer", "Em Progresso", "Concluído" ou "Bloqueados").
Atribua corretamente os responsáveis no campo "description" (ex: **Responsável: Nome**).
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
