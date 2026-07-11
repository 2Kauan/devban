import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: "Como funciona o projeto gratuito?",
    answer: "Ao criar sua conta, você recebe automaticamente 1 projeto completo, com todos os recursos liberados (sem limite de cards ou membros). Você pode usá-lo para sempre sem pagar nada."
  },
  {
    question: "Como convidar pessoas para minha equipe?",
    answer: "Basta acessar as configurações do seu projeto e gerar um link de convite. Você pode definir se a pessoa será Administrador, Editor ou apenas Visualizador."
  },
  {
    question: "Como funciona o pagamento dos projetos extras?",
    answer: "Não cobramos assinaturas mensais! Se você precisar de mais de um projeto simultâneo, cada projeto adicional custa apenas R$ 5,00 em um pagamento único. Você pode pagar via PIX ou Cartão de Crédito."
  },
  {
    question: "Posso usar no celular? Existe APK?",
    answer: "Sim! A plataforma é 100% responsiva e funciona perfeitamente no navegador do seu celular. O aplicativo nativo (APK Android) já está em desenvolvimento e será lançado em breve."
  },
  {
    question: "Meus dados estão seguros?",
    answer: "Completamente. Utilizamos criptografia de ponta a ponta e políticas de acesso granulares (RLS) no banco de dados para garantir que apenas pessoas autorizadas vejam seus quadros."
  }
];

const AnimatedText = ({ text }: { text: string }) => {
  return (
    <motion.span
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.015,
          },
        },
      }}
      aria-label={text}
    >
      {text.split('').map((char, index) => (
        <motion.span
          key={index}
          variants={{
            hidden: { opacity: 0, filter: 'blur(4px)', y: 2 },
            visible: { opacity: 1, filter: 'blur(0px)', y: 0 },
          }}
          transition={{ duration: 0.2 }}
        >
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  );
};

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 px-4 bg-muted/20 border-y border-border/40">
      <div className="container mx-auto max-w-3xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4 text-foreground tracking-tight">
            Perguntas Frequentes
          </h2>
        </motion.div>

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
                    <div className="px-6 pb-6 text-muted-foreground leading-relaxed break-words">
                      <AnimatedText text={faq.answer} />
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
