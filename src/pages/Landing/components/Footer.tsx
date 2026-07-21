import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-border/40 py-16 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Logo & Info */}
          <div className="md:col-span-1 flex flex-col gap-4">
            <Link to="/" className="block w-fit -ml-11 qsm:-ml-9">
              <img src="/logo-devban.webp" alt="DevBan" className="h-25 w-auto object-contain object-left dark:hidden" />
              <img src="/logo-branca2.png" alt="DevBan" className="h-25 w-auto object-contain object-left hidden dark:block" />
            </Link>
            <p className="text-sm text-muted-foreground mt-2">
              O quadro Kanban premium focado na velocidade e clareza do seu fluxo de trabalho.
            </p>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="font-bold mb-4 text-foreground">Produto</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-primary transition-colors">Recursos</a></li>
              <li><a href="#how-it-works" className="hover:text-primary transition-colors">Como Funciona</a></li>
              <li><a href="#teams" className="hover:text-primary transition-colors">Equipes</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Preços</a></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="font-bold mb-4 text-foreground">Empresa</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Sobre</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Carreiras</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contato</a></li>
            </ul>
          </div>

          {/* Links 3 */}
          <div>
            <h4 className="font-bold mb-4 text-foreground">Legal</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Privacidade</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Segurança</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} DevBan. Todos os direitos reservados.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground transition-colors">X (Twitter)</a>
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="#" className="hover:text-foreground transition-colors">Dribbble</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
