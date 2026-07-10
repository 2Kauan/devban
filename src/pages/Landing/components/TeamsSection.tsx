import { motion } from 'framer-motion';
import { ShieldCheck, Pencil, Eye, Users2 } from 'lucide-react';

const roles = [
  {
    icon: <ShieldCheck className="h-6 w-6 text-primary" />,
    title: 'Administrador',
    description: 'Controle total. Adiciona membros, exclui projetos e altera configurações vitais.',
  },
  {
    icon: <Pencil className="h-6 w-6 text-primary" />,
    title: 'Editor',
    description: 'Pode criar, editar e mover cards, mas não pode alterar configurações do projeto.',
  },
  {
    icon: <Eye className="h-6 w-6 text-primary" />,
    title: 'Visualizador',
    description: 'Apenas acompanha o progresso, sem permissão de edição. Ideal para clientes.',
  },
];

export function TeamsSection() {
  return (
    <section id="teams" className="py-24 px-4 bg-background">
      <div className="container mx-auto max-w-5xl">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          {/* Left Side - Info */}
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted border border-border/50 text-sm font-medium">
              <Users2 className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Colaboração</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
              Feito para equipes de todos os tamanhos.
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Trabalhar sozinho é bom, em equipe é incrível. O DevBan conta com um sistema de permissões 
              robusto que protege a integridade do seu projeto sem gerar gargalos na comunicação.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Convide via link e defina o papel de cada membro num piscar de olhos.
            </p>
          </div>

          {/* Right Side - Cards */}
          <div className="flex-1 w-full space-y-4">
            {roles.map((role, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="p-6 rounded-2xl bg-muted/30 border border-border/50 flex items-start gap-4 hover:border-primary/40 transition-colors"
              >
                <div className="p-3 bg-background rounded-xl shadow-sm border border-border/50">
                  {role.icon}
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{role.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{role.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
