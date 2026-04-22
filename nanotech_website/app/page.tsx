import { HeroSection } from "@/components/hero-section"
import { ResearchAreas } from "@/components/research-areas"
import { AboutSection } from "@/components/about-section"
import { StatsSection } from "@/components/stats-section"
import { TeamSection } from "@/components/team-section"
import { CTASection } from "@/components/cta-section"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { ProjectsSection } from "@/components/projects-section"
import { BiosensingHighlights } from "@/components/biosensing-highlights"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <StatsSection />
      <ResearchAreas />
      <ProjectsSection />
      <BiosensingHighlights />
      <AboutSection />
      <TeamSection />
      <CTASection />
      <Footer />
    </main>
  )
}
