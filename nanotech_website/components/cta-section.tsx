import { Button } from "@/components/ui/button"
import { ArrowRight, Mail } from "lucide-react"

export function CTASection() {
  return (
    <section id="cta" className="py-24 bg-gradient-to-b from-secondary/20 to-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">Join Our Research Community</h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            We&#39;re always looking for passionate researchers, graduate/undergraduate students, and collaborators to join us in pushing the boundaries of nanotechnology.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <a href="mailto:waqask@berkeley.edu">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 group">
                <Mail className="mr-2 w-5 h-5" />
                Contact Us
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <a href="#team">
              <Button
                size="lg"
                variant="outline"
                className="border-border text-foreground hover:bg-secondary bg-transparent"
              >
                Meet the Team
              </Button>
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-12 border-t border-border">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">Open Positions</div>
              <p className="text-muted-foreground">PhD students, postdocs, undergrads</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">Collaborations</div>
              <p className="text-muted-foreground">Industry partnerships and academic exchanges</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">Facilities</div>
              <p className="text-muted-foreground">State-of-the-art equipment and cleanroom access</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
