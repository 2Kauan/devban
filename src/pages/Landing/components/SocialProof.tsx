import { motion } from 'framer-motion';

export function SocialProof() {
  // Generic company names to simulate logos
  const companies = ["Acme Corp", "Globex", "Soylent", "Initech", "Umbrella", "Massive Dynamic"];

  return (
    <section className="py-12 border-b border-border/40 bg-background/50">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-muted-foreground font-medium mb-8">
          Confiado por equipes inovadoras em todo o mundo
        </p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale">
          {companies.map((company, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="text-xl font-bold font-mono tracking-tighter"
            >
              {company}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
