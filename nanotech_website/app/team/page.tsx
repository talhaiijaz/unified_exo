"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Mail, Sparkles, ArrowLeft } from "lucide-react"
import { teamMembers, type TeamMember } from "@/components/team-members"

const yearOrder: TeamMember["year"][] = ["PI", "Senior", "Junior", "Sophomore", "Freshman"]

export default function TeamPage() {
  const [activeFunFact, setActiveFunFact] = useState<string | null>(null)

  const groupedMembers = useMemo(() => {
    return yearOrder
      .map((year) => ({
        year,
        members: teamMembers.filter((member) => member.year === year)
      }))
      .filter((group) => group.members.length > 0)
  }, [])

  return (
    <main className="min-h-screen bg-background py-14 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <Link
            href="/#team"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/70 px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>

        <div className="text-center mb-12 sm:mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">Team Directory</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Meet everyone in the lab, organized by seniority.
          </p>
        </div>

        <div className="space-y-10 sm:space-y-12">
          {groupedMembers.map((group) => (
            <section key={group.year}>
              <div className="flex items-center gap-3 mb-5 sm:mb-6">
                <div className="h-px flex-1 bg-border" />
                <Badge variant="outline" className="px-3 py-1 text-sm font-semibold tracking-wide">
                  {group.year}
                </Badge>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {group.members.map((member) => (
                  <Card
                    key={member.email}
                    className="group relative overflow-hidden border-border bg-card/70 hover:border-primary/50 transition-all duration-300"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${member.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                    <div className="relative p-5">
                      <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full border-2 border-border">
                        <img src={member.image} alt={member.name} className="h-full w-full object-cover" />
                      </div>

                      <div className="text-center mb-4">
                        <h2 className="text-lg font-bold text-foreground leading-tight">{member.name}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{member.major}</p>
                        <p className="mt-1 text-sm font-medium text-primary">{member.team}</p>
                      </div>

                      <div className="flex items-center justify-center gap-3 pt-3 border-t border-border">
                        <a
                          href={`mailto:${member.email}`}
                          className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200"
                          title="Send email"
                        >
                          <Mail size={16} />
                        </a>

                        <div className="relative group/fact">
                          <button
                            type="button"
                            className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all duration-200"
                            onClick={() => {
                              setActiveFunFact((current) => (current === member.email ? null : member.email))
                            }}
                          >
                            <Sparkles size={16} />
                          </button>
                          <div
                            className={`absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-background/95 px-3 py-2 text-xs text-foreground shadow-lg backdrop-blur transition-all duration-200 ${
                              activeFunFact === member.email
                                ? "opacity-100 translate-y-0"
                                : "opacity-0 translate-y-2"
                            } group-hover/fact:opacity-100 group-hover/fact:translate-y-0`}
                          >
                            <span className="font-semibold text-primary">Fun fact:</span> {member.funFact}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  )
}
