import Navbar from '@/components/landing/Navbar'
import Hero from '@/components/landing/Hero'
import ProblemSection from '@/components/landing/ProblemSection'
import StatsSection from '@/components/landing/StatsSection'
import HowItWorksSection from '@/components/landing/HowItWorksSection'
import SocialProofSection from '@/components/landing/SocialProofSection'
import CTASection from '@/components/landing/CTASection'
import Footer from '@/components/landing/Footer'

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <ProblemSection />
        <StatsSection />
        <HowItWorksSection />
        <SocialProofSection />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
