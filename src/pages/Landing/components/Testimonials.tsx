import { motion } from 'framer-motion';

const testimonials = [
  {
    name: 'Sofia Martinez',
    role: 'Tech Lead @ Innovate',
    avatar: 'SM',
    quote: 'Migramos todas as nossas sprints para o DevBan. A resposta visual é tão instantânea que usar outras ferramentas agora parece lento.',
  },
  {
    name: 'Lucas Ferreira',
    role: 'Product Manager',
    avatar: 'LF',
    quote: 'O nível de detalhe na UI é impressionante. É o primeiro sistema Kanban que a equipe de engenharia e design concordou em usar.',
  },
  {
    name: 'Camila Santos',
    role: 'Startup Founder',
    avatar: 'CS',
    quote: 'A melhor funcionalidade é a simplicidade. Não preciso de 10 cliques para arrastar um card, e a colaboração em tempo real funciona perfeitamente.',
  }
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-foreground tracking-tight">
            Amado por times ágeis
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              className="p-8 rounded-3xl bg-background border border-border/50 shadow-sm flex flex-col gap-6"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {testimonial.avatar}
                </div>
                <div>
                  <h4 className="font-bold text-foreground">{testimonial.name}</h4>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed italic">
                "{testimonial.quote}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
