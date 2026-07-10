import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { SocialProof } from './components/SocialProof';
import { Features } from './components/Features';
import { HowItWorks } from './components/HowItWorks';
import { TeamsSection } from './components/TeamsSection';
import { Pricing } from './components/Pricing';
import { Testimonials } from './components/Testimonials';
import { FAQ } from './components/FAQ';
import { CTASection } from './components/CTASection';
import { Footer } from './components/Footer';

export default function Landing() {
  return (
    <div className="flex-1 flex flex-col w-full bg-background overflow-hidden font-sans selection:bg-primary/30 selection:text-primary">
      <Navbar />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <TeamsSection />
      <Pricing />
      <Testimonials />
      <FAQ />
      <CTASection />
      <Footer />
    </div>
  );
}
