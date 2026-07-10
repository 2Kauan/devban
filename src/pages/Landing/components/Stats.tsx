import { motion } from 'framer-motion';

const stats = [
  { value: '0ms', label: 'Latência percebida em interações' },
  { value: '10k+', label: 'Tarefas concluídas por equipes' },
  { value: '100%', label: 'Foco no estado de fluxo ágil' },
];

export function Stats() {
  return (
    <section id="stats" className="py-24 px-4 bg-muted/20 border-y border-border/40">
      <div className="container mx-auto max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          {stats.map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className="text-5xl md:text-6xl font-extrabold text-foreground mb-4 tracking-tighter">
                {stat.value}
              </div>
              <p className="text-muted-foreground font-medium max-w-[200px]">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
