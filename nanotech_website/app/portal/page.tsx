"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { MatrixView } from "@/components/portal/matrix-view"
import { TreeView } from "@/components/portal/tree-view"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { LayoutGrid, Network, Calculator, ArrowRight, Armchair, Orbit, Activity, Waves } from "lucide-react"
import Link from "next/link"

export default function PortalPage() {
  const [view, setView] = useState<"matrix" | "tree">("matrix")

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Research Portal</h1>
            <p className="text-lg text-muted-foreground mb-6">Explore our research organized by domains and pillars</p>

            {/* Calculations Tool Card */}
            <Link href="/portal/calculations">
              <Card className="mb-6 p-6 border-2 border-border hover:border-primary transition-all hover:shadow-lg cursor-pointer group bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-400 bg-opacity-10 border border-primary/20 group-hover:scale-110 transition-transform">
                      <Calculator className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                        Calculations & Tools
                      </h3>
                      <p className="text-muted-foreground">
                        Access NiTRO simulator, FMM algorithm, CNT capacitance calculator, and more computational tools
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            {/* BNEST Card */}
            <Link href="/portal/bnest">
              <Card className="mb-6 p-6 border-2 border-border hover:border-primary transition-all hover:shadow-lg cursor-pointer group bg-gradient-to-br from-emerald-400/10 via-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-400 to-lime-400 bg-opacity-10 border border-primary/20 group-hover:scale-110 transition-transform">
                      <Orbit className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                        BNEST Program
                      </h3>
                      <p className="text-muted-foreground">
                        Natural Evolution of Science and Technology linking business, law/IP, and scientific pillars
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            {/* Syringe Pump Control Card */}
            <Link href="/portal/pump">
              <Card className="mb-6 p-6 border-2 border-border hover:border-primary transition-all hover:shadow-lg cursor-pointer group bg-gradient-to-br from-rose-400/10 via-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-rose-400 to-amber-400 bg-opacity-10 border border-primary/20 group-hover:scale-110 transition-transform">
                      <Activity className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                        Syringe Pump Control
                      </h3>
                      <p className="text-muted-foreground">
                        Experimental syringe pump UI scaffold; backend wiring in progress (see red notice on pump page)
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            {/* Exoskeleton Control Card */}
            <Link href="/portal/exo">
              <Card className="mb-6 p-6 border-2 border-border hover:border-primary transition-all hover:shadow-lg cursor-pointer group bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-green-400 to-emerald-400 bg-opacity-10 border border-primary/20 group-hover:scale-110 transition-transform">
                      <Armchair className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                        Exoskeleton Control
                      </h3>
                      <p className="text-muted-foreground">
                        Internal control interface for joints, macros, and safety operations
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            {/* Potentiostat Card */}
            <Link href="/portal/potentiostat">
              <Card className="mb-6 p-6 border-2 border-border hover:border-primary transition-all hover:shadow-lg cursor-pointer group bg-gradient-to-br from-cyan-400/10 via-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-400 bg-opacity-10 border border-primary/20 group-hover:scale-110 transition-transform">
                      <Waves className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                        Potentiostat
                      </h3>
                      <p className="text-muted-foreground">
                        Browser-direct Teensy Web Serial interface for recording 18-channel ADC data and saving CSV
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </Card>
            </Link>

            <div className="flex gap-2">
              <Button
                variant={view === "matrix" ? "default" : "outline"}
                onClick={() => setView("matrix")}
                className="gap-2"
              >
                <LayoutGrid size={18} />
                Matrix View
              </Button>
              <Button
                variant={view === "tree" ? "default" : "outline"}
                onClick={() => setView("tree")}
                className="gap-2"
              >
                <Network size={18} />
                Tree View
              </Button>
            </div>
          </div>

          {view === "matrix" ? <MatrixView /> : <TreeView />}
        </div>
      </div>
      <Footer />
    </main>
  )
}
