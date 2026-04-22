import { Card } from "@/components/ui/card"
import { Users, Target, Lightbulb } from "lucide-react"

export function AboutSection() {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">About Our Lab</h2>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Led by <span className="text-primary font-semibold">Dr. Waqas Khalid</span>, the UC Berkeley
                Nanotechnology Lab is at the forefront of carbon nanotube sensor research and multidisciplinary
                innovation.
              </p>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Our team brings together experts from materials science, electrical engineering, chemistry, and
                bioengineering to tackle some of the most pressing challenges in healthcare, energy, and environmental
                sustainability.
              </p>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center">
                <img
                  src="/images/design-mode/nano.webp"
                  alt="Lab research"
                  className="rounded-2xl object-cover w-full h-full"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: "Our Mission",
                description:
                  "To advance nanotechnology research that creates meaningful impact on human health, environmental sustainability, and technological progress.",
              },
              {
                icon: Lightbulb,
                title: "Our Approach",
                description:
                  "Combining fundamental research with practical applications through interdisciplinary collaboration and cutting-edge facilities.",
              },
              {
                icon: Users,
                title: "Our Team",
                description:
                  "A diverse group of researchers, graduate students, and postdocs united by curiosity and commitment to scientific excellence.",
              },
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <Card
                  key={index}
                  className="p-6 bg-card border-border hover:border-primary/50 transition-all duration-300"
                >
                  <Icon className="w-10 h-10 text-primary mb-4" />
                  <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
