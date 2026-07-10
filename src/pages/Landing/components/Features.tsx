import { motion } from 'framer-motion';
import { LayoutList, Zap, Shield, BarChart3, Users } from 'lucide-react';

const features = [
  {
    icon: <LayoutList className="h-6 w-6 text-primary" />,
    title: 'Quadros Intuitivos',
    description: 'Arraste e solte tarefas em um kanban fluido e totalmente personalizável. Projetado para reduzir a fricção visual.',
    colSpan: 'md:col-span-2',
  },
  {
    icon: <Zap className="h-6 w-6 text-primary" />,
    title: 'Rápido como um raio',
    description: 'Sem telas de carregamento. Atualizações instantâneas focadas na performance.',
    colSpan: 'md:col-span-1',
  },
  {
    icon: <Users className="h-6 w-6 text-primary" />,
    title: 'Colaboração Real',
    description: 'Veja as atualizações da sua equipe instantaneamente.',
    colSpan: 'md:col-span-1',
  },
  {
    icon: <BarChart3 className="h-6 w-6 text-primary" />,
    title: 'Relatórios Avançados',
    description: 'Métricas e gráficos detalhados sobre a produtividade do time.',
    colSpan: 'md:col-span-1',
  },
  {
    icon: <Shield className="h-6 w-6 text-primary" />,
    title: 'Segurança de Dados',
    description: 'Criptografia e controle de acesso granular com RLS no banco de dados.',
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
