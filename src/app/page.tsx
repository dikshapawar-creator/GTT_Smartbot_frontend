import Navbar from '@/components/Navbar/Navbar';
import Hero from '@/components/Hero/Hero';
import ProblemSection from '@/components/ProblemSection/ProblemSection';
import SolutionSection from '@/components/SolutionSection/SolutionSection';
import CRMPreview from '@/components/CRMPreview/CRMPreview';
import TrustSection from '@/components/TrustSection/TrustSection';
import CTASection from '@/components/CTASection/CTASection';
import Footer from '@/components/Footer/Footer';

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
    </main>
  );
}
