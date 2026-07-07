import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, LayoutList, Zap, Shield, BarChart3, Users } from 'lucide-react';

const features = [
  {
    icon: <LayoutList className="h-6 w-6 text-primary" />,
    title: 'Quadros Intuitivos',
    description: 'Arraste e solte tarefas em um kanban fluido e totalmente personalizável.'
  },
  {
    icon: <Zap className="h-6 w-6 text-yellow-500" />,
    title: 'Rápido como um raio',
    description: 'Interface otimizada para respostas instantâneas, sem telas de carregamento.'
  },
  {
    icon: <Users className="h-6 w-6 text-green-500" />,
    title: 'Colaboração em Tempo Real',
    description: 'Veja as atualizações da sua equipe instantaneamente, na mesma tela.'
  },
  {
    icon: <BarChart3 className="h-6 w-6 text-purple-500" />,
    title: 'Relatórios Avançados',
    description: 'Métricas e gráficos detalhados sobre a produtividade do seu time.'
  },
  {
    icon: <Shield className="h-6 w-6 text-blue-400" />,
    title: 'Segurança de Dados',
    description: 'Criptografia de ponta a ponta e controle de acesso granular.'
  },
];

export default function Landing() {
  return (
    <div className="flex-1 flex flex-col w-full bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative w-full min-h-[90vh] flex items-center justify-center pt-20 pb-16 px-4">
        {/* Background Gradients */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/20 blur-[120px] rounded-full mix-blend-multiply opacity-50 animate-pulse" />
          <div className="absolute top-1/2 -right-1/4 w-3/4 h-3/4 bg-secondary/20 blur-[120px] rounded-full mix-blend-multiply opacity-50" />
        </div>

        <div className="container relative z-10 mx-auto text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 mb-8"
          >
            <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
            <span className="text-sm font-medium">O novo padrão em produtividade</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl leading-tight"
          >
            O fim do caos na gestão dos seus <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">projetos</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            A plataforma definitiva que combina o poder do Kanban com uma interface premium e minimalista. Projetada para equipes que exigem o melhor.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 items-center justify-center"
          >
            <Link 
              to="/register" 
              className="flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full text-lg font-semibold hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
            >
              Começar Agora
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a 
              href="#features" 
              className="flex items-center gap-2 px-8 py-4 bg-background border border-border text-foreground rounded-full text-lg font-semibold hover:bg-muted transition-all shadow-sm"
            >
              Conheça os Recursos
            </a>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative w-full py-24 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Tudo o que você precisa, sem distrações.</h2>
            <p className="text-lg text-muted-foreground">Construído com as melhores tecnologias para garantir velocidade e segurança, sem sacrificar a estética.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="p-6 rounded-2xl bg-background border border-border/50 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="container relative z-10 mx-auto text-center max-w-3xl">
          <h2 className="text-4xl font-bold mb-6">Pronto para elevar o nível da sua equipe?</h2>
          <p className="text-xl text-muted-foreground mb-10">Junte-se a milhares de usuários que já abandonaram as ferramentas antigas.</p>
          <Link 
            to="/register" 
            className="inline-flex items-center gap-2 px-10 py-5 bg-foreground text-background rounded-full text-lg font-semibold hover:bg-foreground/90 transition-all hover:scale-105 active:scale-95"
          >
            Criar conta gratuita
          </Link>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="border-t border-border/40 py-12 px-4 bg-background">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">D</span>
            </div>
            <span className="font-bold text-lg">DevBan</span>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} DevBan. Todos os direitos reservados.</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Privacidade</a>
            <a href="#" className="hover:text-foreground">Termos</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
