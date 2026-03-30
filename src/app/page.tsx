import Navbar from '@/components/Navbar/Navbar';
import Hero from '@/components/Hero/Hero';
import ProblemSection from '@/components/ProblemSection/ProblemSection';
import SolutionSection from '@/components/SolutionSection/SolutionSection';
import CRMPreview from '@/components/CRMPreview/CRMPreview';
import TrustSection from '@/components/TrustSection/TrustSection';
import CTASection from '@/components/CTASection/CTASection';
import Footer from '@/components/Footer/Footer';

import Chatbot from '@/components/Chatbot/Chatbot';

export default function Home() {
  return (
    <main>
      <Navbar />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <CRMPreview />
      <TrustSection />
      <CTASection />
      <Footer />
      {/* 
        Chatbot is now enabled for all environments including production/Vercel.
      */}
      <Chatbot tenantKeyProp="tpxkdour" />
    </main>
  );
}

