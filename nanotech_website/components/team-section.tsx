"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Sparkles, GraduationCap } from "lucide-react"
import { useState } from "react"
import { teamMembers } from "@/components/team-members"

export function TeamSection() {
  const [activeFunFact, setActiveFunFact] = useState<number | null>(null)

  return (
    <section id="team" className="py-24 bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <GraduationCap className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Meet the Team</span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
            Our Research Team
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            A diverse group of passionate researchers, scientists, and engineers working together to push the boundaries of nanotechnology.
          </p>
        </div>

        <div className="md:hidden flex justify-center">
          <a
            href="/team"
            className="inline-flex w-full max-w-sm items-center justify-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-8 py-4 text-base font-semibold text-primary hover:bg-primary/20 transition-all"
          >
            <GraduationCap className="h-5 w-5" />
            Meet the Team
          </a>
        </div>

        <div className="hidden md:flex md:flex-wrap md:justify-center gap-6">
          {teamMembers.map((member, index) => (
            <Card
              key={member.email}
              className="group relative w-full md:w-[260px] overflow-hidden hover:shadow-2xl transition-all duration-500 border-border hover:border-primary/50 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Gradient overlay on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${member.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
              
              <div className="p-6 relative z-10">
                {/* Profile Image */}
                <div className="relative mb-4">
                  <div className={`absolute inset-0 bg-gradient-to-br ${member.gradient} rounded-full blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500`} />
                  <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-border group-hover:border-primary transition-colors duration-300">
                    <div className={`absolute inset-0 bg-gradient-to-br ${member.gradient} opacity-20`} />
                    <img
                      src={member.image}
                      alt={member.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Name and Title */}
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {member.name}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium mb-2">
                    {member.major}
                  </p>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs bg-gradient-to-r ${member.gradient} bg-clip-text text-transparent font-semibold`}
                  >
                    {member.team}
                  </Badge>
                </div>

                {/* Contact Icons */}
                <div className="flex items-center justify-center gap-3 pt-4 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
                      onClick={(event) => {
                        event.stopPropagation()
                        setActiveFunFact((current) => (current === index ? null : index))
                      }}
                    >
                      <Sparkles size={16} />
                    </button>
                    <div
                      className={`absolute left-1/2 top-full mt-2 w-56 -translate-x-1/2 rounded-lg border border-border bg-background/95 px-3 py-2 text-xs text-foreground shadow-lg backdrop-blur transition-all duration-200 ${
                        activeFunFact === index
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-2"
                      } group-hover/fact:opacity-100 group-hover/fact:translate-y-0`}
                    >
                      <span className="font-semibold text-primary">Fun fact:</span> {member.funFact}
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative corner accent */}
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${member.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-bl-full`} />
            </Card>
          ))}
        </div>

      </div>
    </section>
  )
}
