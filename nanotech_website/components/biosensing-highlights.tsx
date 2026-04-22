import { Card } from "@/components/ui/card"

export function BiosensingHighlights() {
  const items = [
    {
      title: "Functionalization",
      description:
        "Functionalizing Carbon Nanotubes with secondary amine groups, then quantifying and analyzing functionalized CNTs through fluorescence spectroscopy.",
      image: "/nano/biosensing/Functionalization-min.png",
    },
    {
      title: "Spectroscopy Testing",
      description:
        "Conducting Electrochemical impedance spectroscopy tests for determining concentrations of tacrolimus and creatinine to detect kidney failure in patients.",
      image: "/nano/biosensing/impedancespectroscopy1-min.png",
    },
    {
      title: "Fabrication",
      description:
        "Designing and fabricating microfluidic devices through CAD and microfabrication (photolithography, soft-lithography).",
      image: "/nano/biosensing/fabrication-lab-7704.jpg",
    },
    {
      title: "Analysis",
      description:
        "Using COMSOL to conduct stress analysis of CNTs to examine the durability, strength, and reliability of our CNT-based biosensing structures.",
      image: "/nano/biosensing/comsol_test_bio-min.png",
    },
  ]

  return (
    <section id="biosensing" className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">Biosensing Highlights</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Key capabilities in our CNT-based biosensing program
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <Card
              key={item.title}
              className="group overflow-hidden bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="aspect-video w-full overflow-hidden">
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
