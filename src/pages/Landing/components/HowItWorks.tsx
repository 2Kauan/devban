import { motion } from 'framer-motion';
import { UserPlus, LayoutDashboard, ListTodo, Users, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    icon: <UserPlus className="h-6 w-6 text-primary" />,
    title: 'Criar Conta',
    description: 'Cadastre-se gratuitamente em segundos.',
  },
  {
    icon: <LayoutDashboard className="h-6 w-6 text-primary" />,
    title: 'Criar Projeto',
    description: 'Seu primeiro projeto é por nossa conta.',
  },
  {
    icon: <ListTodo className="h-6 w-6 text-primary" />,
    title: 'Organizar Tarefas',
    description: 'Crie colunas e arraste cards livremente.',
  },
  {
    icon: <Users className="h-6 w-6 text-primary" />,
    title: 'Convidar Equipe',
    description: 'Trabalhe em tempo real com seu time.',
  },
  {
    icon: <CheckCircle2 className="h-6 w-6 text-primary" />,
    title: 'Finalizar',
    description: 'Acompanhe o progresso e entregue.',
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-4 bg-muted/20 relative overflow-hidden">
      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-foreground tracking-tight">
            Como Funciona
          </h2>
          <p className="text-lg text-muted-foreground">
            Do caos à organização em 5 passos simples.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-start justify-between relative">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-8 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/10 via-primary/50 to-primary/10 -z-10" />

          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="flex flex-col items-center text-center max-w-[200px] mx-auto mb-10 md:mb-0 relative group"
            >
              <div className="w-16 h-16 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center mb-6 shadow-sm group-hover:border-primary group-hover:scale-110 transition-all">
                {step.icon}
              </div>
              <h3 className="text-lg font-bold mb-2 text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
