import { Card } from "@/components/ui/card"

export function ProjectsSection() {
  const projects = [
    {
      title: "Electron-beam Lithography",
      description:
        "Our state-of-the-art electron-beam lithography tool empowers researchers to achieve unprecedented precision in nanoscale fabrication on silicon wafers, enabling highly customizable patterns and intricate electrical circuits.",
      image: "/nano/ebeam/happymatty-min.jpg",
    },
    {
      title: "Biosensing",
      description:
        "Cutting-edge technologies for medical diagnostics using carbon nanotube-based sensors with unparalleled sensitivity, enabling in-situ detection of multiple biomarkers.",
      image: "/nano/biosensing/Functionalization-min.png",
    },
    {
      title: "Exoskeleton",
      description:
        "AI/ML-driven brainwave classification and motion aid systems that interface with sensors and actuators to assist movement and rehabilitation.",
      image: "/nano/exoskeleton/eeg.png",
    },
  ]

  return (
    <section id="projects" className="py-24 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-5xl sm:text-6xl font-bold text-foreground mb-6">Projects</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Selected initiatives drawn from our active efforts in the lab
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {projects.map((p, idx) => (
            <Card
              key={p.title}
              className="group overflow-hidden bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="aspect-video w-full overflow-hidden">
                <img src={p.image} alt={p.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {p.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{p.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
