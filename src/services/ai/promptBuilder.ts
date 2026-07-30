import type { AIGenerationMode } from '@/types/ai';

export const buildKanbanPrompt = (mode: AIGenerationMode, text: string): string => {
  const todayStr = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();

  const baseInstructions = `
Você é um Especialista de Produto sênior e Gerente de Projetos Ágeis altamente habilidoso.
O seu objetivo é receber anotações, requisitos, capturas de tela ou imagens de tarefas e transformá-los em um Kanban board perfeitamente estruturado e detalhado.

CONTEXTO TEMPORAL DE HOJE:
- A data de HOJE é: ${todayStr} (Ano: ${currentYear}). Use esta referência para calcular relativas como "Expira amanhã", "hoje", "próxima semana", etc.

REGRA DE FIDELIDADE CRÍTICA AO CONTEÚDO (MUITO IMPORTANTE):
- Extraia EXATAMENTE as tarefas, matérias, tópicos, títulos e descrições fornecidos na imagem ou texto do usuário.
- NUNCA invente etapas genéricas de desenvolvimento de software (como "ETAPA 1 - Análise de Requisitos", "ETAPA 2 - Desenvolvimento", "Fase 1", "Sprint 1") A MENOS que a imagem ou texto do usuário mencione isso explicitamente.
- Se a imagem enviada pelo usuário contiver tarefas escolares/acadêmicas, pessoais ou de trabalho (exemplo: "Filosofia", "CCT", "Biologia", "Fazer as folhas", "Trabalho: criar objeto..."), crie os cartões EXATAMENTE com esses títulos, descrições e prazos.

INSTRUÇÕES CRÍTICAS DE EXTRAÇÃO DE DATAS E PRAZOS (due_date):
- Se a imagem ou texto contiver datas de vencimento, expiração ou conclusão (ex: "Expira amanhã", "ter., 4 de ago.", "qua., 5 de ago.", "prazo: 15/08", "vence dia 10"):
  - VOCÊ DEVE CONVERTER A DATA PARA O FORMATO ISO 8601 COMPLETO (ex: "${currentYear}-07-31T23:59:59Z", "${currentYear}-08-04T23:59:59Z").
  - Se disser "Expira amanhã", calcule o dia seguinte a ${todayStr}.
  - Se informar o dia e mês (ex: "4 de ago"), use o ano ${currentYear} e monte em ISO (ex: "${currentYear}-08-04T23:59:59Z").
  - Insira essa string no campo "due_date" da tarefa (ou sub-tarefa). Se não houver data, defina "due_date": null.

CRÍTICO DE FORMATO:
A sua saída DEVE ser ÚNICA E EXCLUSIVAMENTE um objeto JSON válido, que respeite estritamente a interface descrita abaixo.
NÃO INCLUA formatação markdown (como \`\`\`json), nem introduções, nem explicações. APENAS o JSON puro.

INSTRUÇÕES DE COLUNAS E FLUXO:
- Sempre inclua uma coluna de "Concluído" (ou "Done") no fluxo gerado (ex: "A Fazer", "Em Progresso", "Concluído"), para que o usuário possa mover tarefas finalizadas.
- Se o usuário sugerir colunas ou estados específicos no texto/imagem, respeite a vontade dele. Se não sugerir colunas, organize os cartões extraídos da imagem na coluna "A Fazer" (ou distribuídos por prioridade/categoria).

INSTRUÇÕES DE PRIORIDADE:
- Analise cuidadosamente o nível de urgência e importância de cada tarefa no texto/imagem e atribua explicitamente o campo "priority" com um dos valores: "low", "medium", "high" ou "urgent".

INSTRUÇÕES PARA IMAGENS / PRINTS DE TELA / ANOTAÇÕES:
- Se o usuário enviou uma imagem (screenshot do Google Tasks, foto de caderno, lista de afazeres, protótipo, mapa mental ou lousa):
  - EXAMINE A IMAGEM LINHA POR LINHA COM EXTREMA PRECISÃO VISUAL.
  - Extraia TODOS os títulos de tarefas, subtítulos, descrições, notas, ícones de alarme e datas de conclusão visíveis na imagem.
  - Se houver tarefas com sub-itens (ex: uma matéria como "CCT" com sub-tarefas logo abaixo), crie o cartão principal "CCT" e coloque os sub-itens na propriedade "subtasks" ou como cartões separados na coluna.

{
  "title": "Nome sugerido para este quadro (baseado no título da lista da imagem se houver, ex: 'Atividades do IFPI')",
  "description": "Uma breve descrição",
  "columns": [
    {
      "id": "col-1",
      "title": "A Fazer",
      "color": "#3B82F6",
      "is_completed": false,
      "tasks": [
        {
          "id": "task-1",
          "title": "Filosofia",
          "description": "Última atividade de filosofia",
          "priority": "high",
          "due_date": "${currentYear}-07-31T23:59:59Z",
          "tags": [
            { "name": "Filosofia", "color": "#8B5CF6" }
          ],
          "checklist": [],
          "subtasks": []
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
MODO DE GERAÇÃO: Organização e Planejamento.
Leia atentamente o documento ou imagem fornecida. Crie os cartões correspondentes ao conteúdo real fornecido pelo usuário.
`;
      break;
    case 'sprint':
      modeInstructions = `
MODO DE GERAÇÃO: Tarefas da Semana.
Organize o conteúdo fornecido pelo usuário dividindo as tarefas conforme prioridades e prazos observados no conteúdo.
`;
      break;
    case 'summary':
      modeInstructions = `
MODO DE GERAÇÃO: Extração de Ações.
Extraia todos os acionáveis e tarefas contidos na imagem/documento e organize-os no Kanban.
`;
      break;
  }

  const userContent = `
Abaixo está o conteúdo extraído ou instrução do usuário. Analise com atenção e devolva APENAS o JSON com os dados da imagem/texto.

--- CONTEÚDO DO USUÁRIO ---
${text}
---------------------------
  `;

  return baseInstructions + modeInstructions + userContent;
};
