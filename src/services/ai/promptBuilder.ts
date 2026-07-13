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
      "title": "Nome exato da Coluna exigida no documento",
      "color": "#HEX_AQUI (Cor pastel baseada na categoria da coluna)",
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
          "checklist": ["Passo 1", "Passo 2"]
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
INSTRUÇÃO VITAL: Leia o documento do usuário. Se ele definir uma estrutura de fases/colunas próprias (ex: Concepção, Execução, Aprovação, etc), USE EXATAMENTE AS COLUNAS DELE. Não invente. Se um gargalo for apontado (ex: revisão por pares), desmembre isso em uma coluna específica para revisão.
Se o documento não sugerir colunas, agrupe por grandes áreas de implementação.
Se o documento exigir Raias (Swimlanes) ou separação por departamentos, simule-as usando a array "tags" DENTRO de cada tarefa para classificá-las visualmente.
`;
      break;
    case 'sprint':
      modeInstructions = `
MODO: Sprint Backlog
INSTRUÇÃO VITAL: Leia o documento do usuário. Se ele definir um fluxo específico (ex: Desenvolvimento, Revisão por Pares, Validação Técnica), USE EXATAMENTE AS COLUNAS DELE.
Nunca junte "Execução" com "Aprovação" se o documento pedir a separação delas.
Quebre os requisitos complexos do documento em múltiplas tarefas pequenas (action items). Respeite as regras de prioridade citadas no texto.
`;
      break;
    case 'summary':
      modeInstructions = `
MODO: Resumo de Reunião
INSTRUÇÃO VITAL: Extraia "Action Items" e acordos. Crie colunas precisas baseadas no que foi definido (ex: "Para Fazer Logo", "Bloqueados", "Análise").
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
