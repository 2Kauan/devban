import * as pdfjsLib from 'pdfjs-dist';

// Usando o worker local via empacotador Vite ao invés de CDN para garantir que a versão bate 100% e não sofre de bloqueios CORS.
// @ts-ignore
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractTextFromFiles(files: File[]): Promise<string> {
  if (!files || files.length === 0) return '';
  
  let combinedText = '\n\n--- CONTEÚDO DOS ARQUIVOS ENVIADOS PELO USUÁRIO ---\n\n';
  
  for (const file of files) {
    if (file.type === 'application/pdf') {
      combinedText += await extractTextFromPDF(file);
    } else if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.csv')) {
      const text = await file.text();
      combinedText += `\n[Arquivo de Texto: ${file.name}]\n${text}\n`;
    } else {
      combinedText += `\n[Arquivo: ${file.name} - Formato não suportado para extração automática de texto no frontend]\n`;
    }
  }
  
  return combinedText;
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = `\n[Documento PDF: ${file.name} (${pdf.numPages} páginas)]\n`;
    
    // Lê página por página
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // O texto no PDF vem quebrado em vários 'items'. Juntamos com espaço.
      const strings = content.items.map((item: any) => item.str);
      fullText += strings.join(' ') + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error(`Erro ao ler PDF ${file.name}:`, error);
    return `\n[Erro ao extrair texto do PDF ${file.name}. Pode estar corrompido ou protegido por senha]\n`;
  }
}
