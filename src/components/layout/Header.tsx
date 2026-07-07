import { Link, useLocation } from 'react-router-dom';

export function Header() {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  
  if (isAuthPage) return null;

  return (
    <header className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <span className="text-primary-foreground font-bold text-lg leading-none">D</span>
          </div>
          <span className="font-bold text-xl tracking-tight">DevBan</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Início
          </Link>
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Recursos
          </a>
          <Link to="/preview" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Dashboard (Preview)
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium hover:text-primary transition-colors">
            Entrar
          </Link>
          <Link 
            to="/register" 
            className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            Começar Grátis
          </Link>
        </div>
      </div>
    </header>
  );
}
