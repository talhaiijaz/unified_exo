"use client"

import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EEGEmbed } from "@/components/calculations/eeg-embed"
import { ArrowLeft, Activity } from "lucide-react"
import Link from "next/link"

export default function EEGPortalPage() {
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

          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-1">EEG Synthesis</h1>
                <p className="text-muted-foreground">
                  Embedded EEG Synthesis Framework for configuring and generating synthetic EEG data.
                </p>
              </div>
            </div>
          </div>

          <Card className="p-4 md:p-6">
            <EEGEmbed />
          </Card>
        </div>
      </div>
      <Footer />
    </main>
  )
}
