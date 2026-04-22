export function StatsSection() {
  const stats = [
    {
      value: "10+ years",
      label: "of pioneering research in nanotechnology",
      company: "UC Berkeley",
    },
    {
      value: "99.9%",
      label: "sensor accuracy in healthcare applications",
      company: "Carbon Nanotubes",
    },
    {
      value: "5x faster",
      label: "detection time compared to traditional methods",
      company: "Innovation",
    },
    {
      value: "100+",
      label: "industry partnerships and collaborations",
      company: "Global Impact",
    },
  ]

  return (
    <section className="py-20 border-y border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-lg bg-card/50 border border-border hover:border-primary/50 transition-all duration-300"
            >
              <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">{stat.value}</div>
              <div className="text-sm text-muted-foreground mb-3">{stat.label}</div>
              <div className="text-xs font-semibold text-foreground">{stat.company}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
