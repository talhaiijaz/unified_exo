"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Microscope } from "lucide-react"

export function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: Array<{
      x: number
      y: number
      vx: number
      vy: number
      radius: number
    }> = []

    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1,
      })
    }

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw connections
      ctx.strokeStyle = "rgba(147, 197, 253, 0.1)"
      ctx.lineWidth = 1

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw and update particles
      particles.forEach((particle) => {
        ctx.fillStyle = "rgba(147, 197, 253, 0.6)"
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fill()

        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1
      })

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background z-0" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-20">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-slide-up">
            <Microscope className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Berkeley Nanotech Lab</span>
          </div>

          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            Pioneering the Future of{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              Nanotechnology
            </span>
          </h1>

          <p
            className="text-lg sm:text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            Discover cutting-edge innovations in carbon nanotube sensors and multidisciplinary collaborations addressing
            real-world challenges in healthcare, energy, environment, and semiconductors.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up"
            style={{ animationDelay: "0.3s" }}
          >
            <a href="#research">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 group">
                Explore Research
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
            <a href="#about">
              <Button
                size="lg"
                variant="outline"
                className="border-border text-foreground hover:bg-secondary bg-transparent"
              >
                Meet Our Team
              </Button>
            </a>
          </div>

          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { label: "Research Areas", value: "5+" },
              { label: "Publications", value: "25+" },
              { label: "Collaborations", value: "10+" },
              { label: "Lab Members", value: "50+" },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="text-center animate-slide-up"
                style={{ animationDelay: `${0.4 + index * 0.1}s` }}
              >
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-primary/50 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-glow" />
        </div>
      </div>
    </section>
  )
}
