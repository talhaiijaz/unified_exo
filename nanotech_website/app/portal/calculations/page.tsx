"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FMMCalculator } from "@/components/calculations/fmm-calculator"
import { NiTROWorking } from "@/components/calculations/nitro-working"
import { CNTCalculator } from "@/components/calculations/cnt-calculator"
import { RCCalculator } from "@/components/calculations/rc-calculator"
import { VoRfExplorer } from "@/components/calculations/vo-rf"
import { VxPlotter } from "@/components/calculations/vx-plotter"
import { CovidSimulator } from "@/components/calculations/covid-simulator"
import { BiosensingSimulation } from "@/components/calculations/biosensing-simulation"
import { EBeamEmbed } from "@/components/calculations/ebeam-embed"
import { FieldEmissionsTool } from "@/components/calculations/field-emissions-tool"
import { MicrofluidicsCalculator } from "@/components/calculations/microfluidics-calculator"
import { EEGEmbed } from "@/components/calculations/eeg-embed"
import { LMP91000Tool } from "@/components/calculations/lmp91000-tool"
import { SuperposeTool } from "@/components/calculations/superpose-tool"
import { Calculator, TrendingUp, Cpu, Zap, ArrowLeft, Activity, Droplet, Layers } from "lucide-react"
import Link from "next/link"

const calculationTools = [
  {
    id: "biosensing",
    name: "Biosensing Simulation",
    description: "Theoretical simulation with CNT, stack, analyte and dielectric",
    icon: Activity,
    gradient: "from-indigo-400 to-blue-400",
    status: "active",
    component: BiosensingSimulation
  },
  {
    id: "cnt",
    name: "CNT Capacitance Calculator",
    description: "Calculate capacitance parameters for carbon nanotube sensors",
    icon: Zap,
    gradient: "from-purple-400 to-pink-400",
    status: "active",
    component: CNTCalculator
  },
  {
    id: "covid",
    name: "COVID Detection",
    description: "Biosensor modeling for COVID-19 detection",
    icon: Activity,
    gradient: "from-rose-400 to-red-400",
    status: "active",
    component: CovidSimulator
  },
  {
    id: "ebeam",
    name: "E‑Beam Lithography",
    description: "Embedded static UI; simulation disabled in this phase",
    icon: Cpu,
    gradient: "from-slate-400 to-zinc-400",
    status: "active",
    component: EBeamEmbed
  },
  {
    id: "field-emissions",
    name: "Field Emissions GUI",
    description: "Original imported app (Stage 1) with optional Stage 3 hardware backend bridge",
    icon: Cpu,
    gradient: "from-cyan-400 to-blue-400",
    status: "active",
    component: FieldEmissionsTool
  },
  {
    id: "eeg",
    name: "EEG Synthesis",
    description: "Interactive synthetic EEG generation (Streamlit UI).",
    icon: Activity,
    gradient: "from-sky-400 to-indigo-400",
    status: "active",
    component: EEGEmbed
  },
  {
    id: "fmm",
    name: "Functional Mixture Modeling",
    description: "Robust ML algorithm for high-accuracy regression on data curves",
    icon: TrendingUp,
    gradient: "from-blue-400 to-cyan-400",
    status: "active",
    component: FMMCalculator
  },
  {
    id: "lmp91000",
    name: "LMP91000 Potentiostat",
    description: "Run cyclic voltammetry scans and stream bias-current data from the LMP91000 board",
    icon: Activity,
    gradient: "from-emerald-400 to-lime-400",
    status: "active",
    component: LMP91000Tool
  },
  {
    id: "microfluidics",
    name: "Microfluidics Calculator",
    description: "Capillary-driven flow parameters for cylindrical microchannels (PBS/water)",
    icon: Droplet,
    gradient: "from-cyan-400 to-sky-400",
    status: "active",
    component: MicrofluidicsCalculator
  },
  {
    id: "nitro",
    name: "NiTRO Simulator",
    description: "RC circuit simulation & yeast concentration prediction via impedance spectroscopy",
    icon: Activity,
    gradient: "from-green-400 to-emerald-400",
    status: "active",
    component: NiTROWorking
  },
  {
    id: "rc",
    name: "RC Calculator",
    description: "Sheet 1 equations for resistance and capacitance",
    icon: Cpu,
    gradient: "from-violet-400 to-purple-400",
    status: "active",
    component: RCCalculator
  },
  {
    id: "superpose",
    name: "Superposition Tool",
    description: "Split and superimpose halves of images or video frames for visual comparison",
    icon: Layers,
    gradient: "from-fuchsia-400 to-purple-400",
    status: "active",
    component: SuperposeTool
  },
  {
    id: "vo-rf",
    name: "Vo & Rf Explorer",
    description: "Triangle branches and op-amp output",
    icon: Cpu,
    gradient: "from-amber-400 to-orange-400",
    status: "active",
    component: VoRfExplorer
  },
  {
    id: "vx",
    name: "Vx(t) Plotter",
    description: "Generate Vx points across time",
    icon: Cpu,
    gradient: "from-emerald-400 to-teal-400",
    status: "active",
    component: VxPlotter
  },
  // Additional tools can be added here
]

export default function CalculationsPage() {
  const [selectedTool, setSelectedTool] = useState("nitro")

  const activeTool = calculationTools.find(tool => tool.id === selectedTool)

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/portal">
            <Button variant="ghost" className="mb-6 gap-2">
              <ArrowLeft size={16} />
              Back to Portal
            </Button>
          </Link>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Calculator className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground">Calculations</h1>
                <p className="text-lg text-muted-foreground mt-2">
                  Advanced computational tools for nanotechnology research
                </p>
              </div>
            </div>
          </div>

          {/* Tool Selection Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {calculationTools.map((tool) => {
              const Icon = tool.icon
              const isSelected = selectedTool === tool.id
              const isActive = tool.status === "active"

              return (
                <button
                  key={tool.id}
                  onClick={() => isActive && setSelectedTool(tool.id)}
                  disabled={!isActive}
                  className={`text-left transition-all duration-300 ${
                    !isActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <Card
                    className={`p-6 h-full border-2 transition-all hover:shadow-xl ${
                      isSelected 
                        ? "border-primary shadow-lg" 
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="relative">
                      {/* Gradient background */}
                      <div
                        className={`absolute inset-0 ${
                          tool.id === "nitro" ? "" : `bg-gradient-to-br ${tool.gradient}`
                        } opacity-0 ${
                          isSelected ? "opacity-10" : "group-hover:opacity-5"
                        } transition-opacity rounded-lg`}
                      />
                      
                      <div className="relative">
                        <div className="flex items-start justify-between mb-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${tool.gradient} bg-opacity-10`}>
                            <Icon className={`w-6 h-6 text-primary`} />
                          </div>
                          {tool.status === "coming-soon" && (
                            <Badge variant="secondary" className="text-xs">
                              Coming Soon
                            </Badge>
                          )}
                        </div>

                        <h3 className={`text-lg font-bold mb-2 transition-colors ${
                          isSelected ? "text-primary" : "text-foreground"
                        }`}>
                          {tool.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  </Card>
                </button>
              )
            })}
          </div>

          {/* Active Tool Display */}
          <Card className="p-6">
            {activeTool?.component ? (
              <activeTool.component />
            ) : (
              <div className="text-center py-12">
                <div className={`inline-flex p-4 rounded-full bg-gradient-to-br ${activeTool?.gradient} bg-opacity-10 mb-4`}>
                  {activeTool && <activeTool.icon className="w-12 h-12 text-primary" />}
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {activeTool?.name}
                </h3>
                <p className="text-muted-foreground mb-4">
                  This calculation tool is currently under development.
                </p>
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
            )}
          </Card>
        </div>
      </div>
      <Footer />
    </main>
  )
}
