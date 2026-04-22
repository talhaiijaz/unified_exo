import { Card } from "@/components/ui/card"
import { Atom, Microscope, Activity } from "lucide-react"

export function ResearchAreas() {
  const areas = [
    {
      icon: Atom,
      title: "Nanomaterials",
      description:
        "Developing novel nanomaterials with unique properties for applications in energy, medicine, and electronics",
      color: "bg-[#0EA5E9]",
    },
    {
      icon: Microscope,
      title: "Lithography using CNTs",
      description:
        "Developing advanced lithography techniques using carbon nanotubes for next-generation nanofabrication",
      color: "bg-[#EC4899]",
    },
    {
      icon: Activity,
      title: "CNT-based Diagnostics",
      description:
        "Using carbon nanotubes as sensors for advanced medical diagnostics and health monitoring applications",
      color: "bg-[#0EA5E9]",
    },
  ]

  return (
    <section id="research" className="py-24 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-5xl sm:text-6xl font-bold text-foreground mb-6">Research Focus</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Our cutting-edge research spans three core areas of nanotechnology
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {areas.map((area, index) => {
            const Icon = area.icon
            return (
              <Card
                key={index}
                className="group p-8 bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className={`${area.color} p-4 rounded-2xl inline-flex mb-6`}>
                  <Icon className="w-8 h-8 text-white ml-[108px] text-center" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors text-center">
                  {area.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-center">{area.description}</p>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
