"use client"

import { useState } from "react"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Network, Briefcase, Scale, Beaker } from "lucide-react"
import Link from "next/link"

const pillarData = {
  business: {
    label: "Business",
    icon: Briefcase,
    color: "from-amber-400 to-orange-400",
    items: [
      { id: "biz-model", label: "Business Model Dev" },
      { id: "industrial", label: "Industrial Outreach" },
      { id: "market", label: "Market Intelligence" },
      { id: "competition", label: "Competition" },
    ],
  },
  law: {
    label: "Law / IP",
    icon: Scale,
    color: "from-sky-400 to-blue-400",
    items: [
      { id: "provisionals", label: "Provisionals" },
      { id: "novelty", label: "Novelty Search" },
    ],
  },
  science: {
    label: "Science",
    icon: Beaker,
    color: "from-emerald-400 to-lime-400",
    items: [
      { id: "people", label: "People" },
      { id: "pi", label: "PI" },
      { id: "student", label: "Student" },
      { id: "projects", label: "Projects" },
      { id: "resources", label: "Resources" },
    ],
  },
  nest: {
    label: "NEST",
    icon: Network,
    color: "from-emerald-400 to-teal-400",
    items: [{ id: "core", label: "NEST Overview" }],
  },
} as const

type PillarKey = keyof typeof pillarData
// View controls layout of the main diagram; NEST never becomes the primary view
type ViewMode = "overview" | "business" | "law" | "science"

type DetailState = {
  pillar: PillarKey
  itemId: string
}

export default function BNESTPage() {
  const [view, setView] = useState<ViewMode>("overview")
  const [activeDetail, setActiveDetail] = useState<DetailState | null>(null)

  const detailPillar = activeDetail ? pillarData[activeDetail.pillar] : null
  const detailItem =
    activeDetail && detailPillar
      ? detailPillar.items.find((item) => item.id === activeDetail.itemId)
      : null
  const DetailIcon = detailPillar?.icon

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <Link href="/portal">
            <Button variant="ghost" className="mb-6 gap-2">
              <ArrowLeft size={16} />
              Back to Portal
            </Button>
          </Link>

          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-gradient-to-br from-emerald-400 to-lime-400 bg-opacity-10 border border-emerald-400/40">
                <Network className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-foreground">BNEST</h1>
                <p className="text-lg text-muted-foreground mt-1 max-w-2xl">
                  Natural Evolution of Science and Technology (NEST) at the intersection of business, law/IP, and
                  science.
                </p>
              </div>
            </div>

            <Badge variant="outline" className="self-start md:self-auto text-xs uppercase tracking-wide">
              Portal Area
            </Badge>
          </div>

          {/* Interactive Diagram */}
          <Card className="mb-10 p-6 lg:p-10 bg-gradient-to-br from-emerald-900/40 via-emerald-950/60 to-background border-emerald-500/60 border-2 rounded-3xl shadow-[0_0_60px_rgba(16,185,129,0.25)]">
            <div className="relative mx-auto w-full max-w-5xl aspect-[16/7]">
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                {view === "overview" && (
                  <>
                    {/* Lines from center to main circles */}
                    <line x1="50%" y1="50%" x2="28%" y2="28%" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400/80" />
                    <line x1="50%" y1="50%" x2="72%" y2="28%" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400/80" />
                    <line x1="50%" y1="50%" x2="50%" y2="88%" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400/80" />
                  </>
                )}
                {view === "business" && (
                  <>
                    {/* Lines from Business center to its four nodes */}
                    <line x1="50%" y1="30%" x2="18%" y2="18%" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400/80" />
                    <line x1="50%" y1="30%" x2="16%" y2="46%" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400/80" />
                    <line x1="50%" y1="30%" x2="30%" y2="68%" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400/80" />
                    <line x1="50%" y1="30%" x2="50%" y2="64%" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400/80" />
                  </>
                )}
                {view === "law" && (
                  <>
                    {/* Lines from Law/IP center to Provisional + Novelty Search */}
                    <line x1="50%" y1="30%" x2="78%" y2="20%" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400/80" />
                    <line x1="50%" y1="30%" x2="80%" y2="56%" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400/80" />
                  </>
                )}
                {view === "science" && (
                  <>
                    <line x1="50%" y1="35%" x2="30%" y2="72%" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400/80" />
                    <line x1="50%" y1="35%" x2="50%" y2="86%" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400/80" />
                    <line x1="50%" y1="35%" x2="70%" y2="72%" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-emerald-400/80" />
                  </>
                )}
              </svg>

              {view === "overview" && (
                <>
                  {/* Central NEST Hexagon */}
                  <button
                    onClick={() => {
                      setView("overview")
                      setActiveDetail({ pillar: "nest", itemId: "core" })
                    }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                    style={{ zIndex: 10 }}
                  >
                    <div
                      className="px-12 py-10 shadow-lg border-2 border-emerald-500/80 bg-emerald-500 hover:bg-emerald-400 text-primary-foreground transition-all cursor-pointer"
                      style={{
                        clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
                        width: "240px",
                        height: "200px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span className="font-semibold text-sm leading-relaxed text-center">
                        Natural Evolution of Science and Technology: NEST
                      </span>
                    </div>
                  </button>

                  {/* Business Circle */}
                  <button
                    onClick={() => {
                      setView("business")
                      setActiveDetail({ pillar: "business", itemId: "biz-model" })
                    }}
                    className="absolute pointer-events-auto hover:scale-110 transition-transform"
                    style={{ left: "28%", top: "28%", transform: "translate(-50%, -50%)", zIndex: 10 }}
                  >
                    <div className="w-28 h-28 rounded-full border-2 border-foreground/60 bg-background hover:bg-muted shadow-lg flex items-center justify-center text-sm font-medium cursor-pointer">
                      Business
                    </div>
                  </button>

                  {/* Law / IP Circle */}
                  <button
                    onClick={() => {
                      setView("law")
                      setActiveDetail({ pillar: "law", itemId: "provisionals" })
                    }}
                    className="absolute pointer-events-auto hover:scale-110 transition-transform"
                    style={{ left: "72%", top: "28%", transform: "translate(-50%, -50%)", zIndex: 10 }}
                  >
                    <div className="w-28 h-28 rounded-full border-2 border-foreground/60 bg-background hover:bg-muted shadow-lg flex items-center justify-center text-sm font-medium cursor-pointer">
                      Law / IP
                    </div>
                  </button>

                  {/* Science Circle */}
                  <button
                    onClick={() => {
                      setView("science")
                      setActiveDetail({ pillar: "science", itemId: "projects" })
                    }}
                    className="absolute pointer-events-auto hover:scale-110 transition-transform"
                    style={{ left: "50%", top: "95%", transform: "translate(-50%, -50%)", zIndex: 10 }}
                  >
                    <div className="w-28 h-28 rounded-full border-2 border-foreground/60 bg-background hover:bg-muted shadow-lg flex items-center justify-center text-sm font-medium cursor-pointer">
                      Science
                    </div>
                  </button>
                </>
              )}

              {view === "business" && (
                <>
                  {/* Central Business Circle */}
                  <button
                    onClick={() => {
                      setView("overview")
                      setActiveDetail(null)
                    }}
                    className="absolute pointer-events-auto hover:scale-105 transition-transform"
                    style={{ left: "50%", top: "30%", transform: "translate(-50%, -50%)", zIndex: 10 }}
                  >
                    <div className="w-36 h-36 rounded-full border-2 border-foreground/80 bg-background hover:bg-muted shadow-xl flex items-center justify-center text-base font-semibold cursor-pointer">
                      Business
                    </div>
                  </button>

                  {/* Outer circles (clickable detail nodes) */}
                  {pillarData.business.items.map((item, idx) => {
                    const positions = [
                      { left: "18%", top: "18%" },
                      { left: "16%", top: "46%" },
                      { left: "30%", top: "68%" },
                      { left: "50%", top: "64%" },
                    ]
                    return (
                      <div
                        key={item.id}
                        className="absolute pointer-events-auto"
                        style={{ ...positions[idx], transform: "translate(-50%, -50%)", zIndex: 10 }}
                        onClick={() => {
                          setView("business")
                          setActiveDetail({ pillar: "business", itemId: item.id })
                        }}
                      >
                        <div className="w-24 h-24 rounded-full border border-foreground/40 bg-background/90 shadow-md flex items-center justify-center text-xs text-center px-2 cursor-pointer hover:scale-105 transition-transform">
                          {item.label}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}

              {view === "law" && (
                <>
                  {/* Central Law Circle */}
                  <button
                    onClick={() => {
                      setView("overview")
                      setActiveDetail(null)
                    }}
                    className="absolute pointer-events-auto hover:scale-105 transition-transform"
                    style={{ left: "50%", top: "30%", transform: "translate(-50%, -50%)", zIndex: 10 }}
                  >
                    <div className="w-36 h-36 rounded-full border-2 border-foreground/80 bg-background hover:bg-muted shadow-xl flex items-center justify-center text-base font-semibold cursor-pointer">
                      Law / IP
                    </div>
                  </button>

                  {/* Outer circles (clickable detail nodes) */}
                  {pillarData.law.items.map((item, idx) => {
                    const positions = [
                      { left: "78%", top: "20%" },
                      { left: "80%", top: "56%" },
                    ]
                    return (
                      <div
                        key={item.id}
                        className="absolute pointer-events-auto"
                        style={{ ...positions[idx], transform: "translate(-50%, -50%)", zIndex: 10 }}
                        onClick={() => {
                          setView("law")
                          setActiveDetail({ pillar: "law", itemId: item.id })
                        }}
                      >
                        <div className="w-24 h-24 rounded-full border border-foreground/40 bg-background/90 shadow-md flex items-center justify-center text-xs text-center px-2 cursor-pointer hover:scale-105 transition-transform">
                          {item.label}
                        </div>
                      </div>
                    )
                  })}
                </>
              )}

              {view === "science" && (
                <>
                  {/* Central Science Circle */}
                  <button
                    onClick={() => {
                      setView("overview")
                      setActiveDetail(null)
                    }}
                    className="absolute pointer-events-auto hover:scale-105 transition-transform"
                    style={{ left: "50%", top: "35%", transform: "translate(-50%, -50%)", zIndex: 10 }}
                  >
                    <div className="w-36 h-36 rounded-full border-2 border-foreground/80 bg-background hover:bg-muted shadow-xl flex items-center justify-center text-base font-semibold cursor-pointer">
                      Science
                    </div>
                  </button>

                  {/* Outer circles (clickable detail nodes) */}
                  <div
                    className="absolute pointer-events-auto"
                    style={{ left: "30%", top: "72%", transform: "translate(-50%, -50%)", zIndex: 10 }}
                    onClick={() => {
                      setView("science")
                      setActiveDetail({ pillar: "science", itemId: "people" })
                    }}
                  >
                    <div className="w-28 h-28 rounded-full border border-foreground/40 bg-background/90 shadow-md flex flex-col items-center justify-center text-xs text-center px-2 cursor-pointer hover:scale-105 transition-transform">
                      <div className="font-medium mb-1">People</div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="text-[10px] border border-foreground/20 rounded px-1.5 py-0.5 hover:bg-foreground/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            setView("science")
                            setActiveDetail({ pillar: "science", itemId: "pi" })
                          }}
                        >
                          PI
                        </button>
                        <button
                          type="button"
                          className="text-[10px] border border-foreground/20 rounded px-1.5 py-0.5 hover:bg-foreground/10"
                          onClick={(e) => {
                            e.stopPropagation()
                            setView("science")
                            setActiveDetail({ pillar: "science", itemId: "student" })
                          }}
                        >
                          Student
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    className="absolute pointer-events-auto"
                    style={{ left: "50%", top: "86%", transform: "translate(-50%, -50%)", zIndex: 10 }}
                    onClick={() => {
                      setView("science")
                      setActiveDetail({ pillar: "science", itemId: "projects" })
                    }}
                  >
                    <div className="w-24 h-24 rounded-full border border-foreground/40 bg-background/90 shadow-md flex items-center justify-center text-xs text-center px-2 cursor-pointer hover:scale-105 transition-transform">
                      Projects
                    </div>
                  </div>

                  <div
                    className="absolute pointer-events-auto"
                    style={{ left: "70%", top: "72%", transform: "translate(-50%, -50%)", zIndex: 10 }}
                    onClick={() => {
                      setView("science")
                      setActiveDetail({ pillar: "science", itemId: "resources" })
                    }}
                  >
                    <div className="w-24 h-24 rounded-full border border-foreground/40 bg-background/90 shadow-md flex items-center justify-center text-xs text-center px-2 cursor-pointer hover:scale-105 transition-transform">
                      Resources
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
          {/* Detail placeholder "pages" for inner circles */}
          {activeDetail && detailPillar && detailItem && DetailIcon && (
            <Card className="mt-6 p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${detailPillar.color} bg-opacity-10`}>
                    <DetailIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {detailPillar.label}
                    </p>
                    <h2 className="text-2xl font-semibold text-foreground">{detailItem.label}</h2>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveDetail(null)}
                >
                  Back to {detailPillar.label}
                </Button>
              </div>
              <p className="text-muted-foreground mb-3">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor,
                dignissim sit amet, adipiscing nec, ultricies sed, dolor.
              </p>
              <p className="text-muted-foreground">
                Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi. Proin
                porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat.
              </p>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </main>
  )
}
