import { motion } from 'framer-motion';
import { LayoutList, Zap, Shield, CheckSquare, Smartphone, Moon, CreditCard, MessageSquare } from 'lucide-react';

const features = [
  {
    icon: <LayoutList className="h-6 w-6 text-primary" />,
    title: 'Kanban Inteligente',
    description: 'Arraste e solte tarefas em um kanban fluido. Controle de categorias e prioridades.',
    colSpan: 'md:col-span-2',
  },
  {
    icon: <Zap className="h-6 w-6 text-primary" />,
    title: 'Tempo Real',
    description: 'Colaboração instantânea, sem telas de carregamento.',
    colSpan: 'md:col-span-1',
  },
  {
    icon: <CheckSquare className="h-6 w-6 text-primary" />,
    title: 'Checklist e Anexos',
    description: 'Subtarefas e arquivos diretamente nos cards do projeto.',
    colSpan: 'md:col-span-1',
  },
  {
    icon: <MessageSquare className="h-6 w-6 text-primary" />,
    title: 'Equipe e Comentários',
    description: 'Comunique-se no contexto da tarefa.',
    colSpan: 'md:col-span-1',
  },
  {
    icon: <Shield className="h-6 w-6 text-primary" />,
    title: 'Controle de Acesso',
    description: 'Permissões granulares para Administrador, Editor e Visualizador.',
    colSpan: 'md:col-span-1',
  },
  {
    icon: <CreditCard className="h-6 w-6 text-primary" />,
    title: 'Pagamento Integrado',
    description: 'Compre projetos adicionais rapidamente via PIX ou Cartão.',
    colSpan: 'md:col-span-1',
  },
  {
    icon: <Smartphone className="h-6 w-6 text-primary" />,
    title: 'Mobile First & APK',
    description: 'Acesse em qualquer dispositivo. Em breve, APK Android.',
    colSpan: 'md:col-span-1',
  },
  {
    icon: <Moon className="h-6 w-6 text-primary" />,
    title: 'Modo Escuro Nativo',
    description: 'Foco no trabalho com uma interface premium e amigável aos olhos.',
    colSpan: 'md:col-span-1',
  },
];

export function Features() {
  return (
    <section id="features" className="py-24 px-4 bg-background">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-foreground tracking-tight">
            Tudo o que você precisa, sem distrações.
          </h2>
          <p className="text-lg text-muted-foreground">
            Construído com as melhores tecnologias para garantir velocidade e segurança, sem sacrificar a estética minimalista.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className={`group p-8 rounded-3xl bg-muted/30 border border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgba(192,132,252,0.1)] relative overflow-hidden flex flex-col ${feature.colSpan}`}
            >
              <div className="w-12 h-12 rounded-2xl bg-background border border-border/50 flex items-center justify-center mb-6 shadow-sm">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-foreground">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              
              {/* Subtle hover glow inside card */}
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
