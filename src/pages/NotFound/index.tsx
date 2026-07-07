import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-foreground mb-4">Página não encontrada</h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        Desculpe, não conseguimos encontrar a página que você está procurando.
      </p>
      <Link 
        to="/" 
        className="px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary-hover transition-colors"
      >
        Voltar para o Início
      </Link>
    </div>
  );
}
