import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'O DevBan é totalmente gratuito?',
    answer: 'Sim! Atualmente estamos em fase de expansão e todos os recursos principais, incluindo colaboração em tempo real, estão disponíveis gratuitamente.'
  },
  {
    question: 'Posso convidar outras pessoas para o meu projeto?',
    answer: 'Com certeza. Você pode convidar membros por email, compartilhar links de acesso público (somente leitura ou edição) e gerenciar permissões (Dono, Admin, Editor ou Leitor).'
  },
  {
    question: 'Meus dados estão seguros?',
    answer: 'Levamos segurança a sério. Utilizamos Row Level Security (RLS) no Supabase, garantindo que apenas usuários autorizados tenham acesso aos dados do seu projeto.'
  },
  {
    question: 'Como funciona o limite de cards?',
    answer: 'Não há limite de cards! Você pode criar quantos projetos e cards forem necessários para organizar o fluxo do seu time.'
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 px-4 bg-muted/20 border-y border-border/40">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-foreground tracking-tight">
            Perguntas Frequentes
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {faqs.map((faq, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="border border-border/50 rounded-2xl bg-background overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full p-6 text-left flex items-center justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="font-semibold text-lg text-foreground">{faq.question}</span>
                <ChevronDown 
                  className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${openIndex === idx ? 'rotate-180' : ''}`} 
                />
              </button>
              
              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  >
                    <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
