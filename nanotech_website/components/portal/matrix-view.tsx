"use client"

import React, { useState } from "react"
import { domains, pillars, getNodesByDomainAndPillar } from "@/lib/portal-data"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AddNodeDialog } from "@/components/portal/add-node-dialog"
import { Plus, X } from "lucide-react"
import Link from "next/link"

export function MatrixView() {
  const [selectedCell, setSelectedCell] = useState<{ domainId: string; pillarId: string } | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addNodeContext, setAddNodeContext] = useState<{ domainId?: string; pillarId?: string }>({})

  const handleCellClick = (domainId: string, pillarId: string) => {
    if (selectedCell?.domainId === domainId && selectedCell?.pillarId === pillarId) {
      setSelectedCell(null)
    } else {
      setSelectedCell({ domainId, pillarId })
    }
  }

  const filteredNodes = selectedCell ? getNodesByDomainAndPillar(selectedCell.domainId, selectedCell.pillarId) : []

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid gap-2" style={{ gridTemplateColumns: `200px repeat(${domains.length}, 1fr)` }}>
            {/* Header row */}
            <div className="sticky left-0 bg-background z-10"></div>
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="bg-card border border-border rounded-lg p-3 text-center font-semibold text-sm"
              >
                <div className="text-2xl mb-1">{domain.icon}</div>
                {domain.name}
              </div>
            ))}

            {/* Data rows */}
            {pillars.map((pillar) => (
              <React.Fragment key={`row-${pillar.id}`}>
                <div
                  key={`label-${pillar.id}`}
                  className="sticky left-0 bg-card border border-border rounded-lg p-3 flex items-center font-semibold text-sm z-10"
                >
                  {pillar.name}
                </div>
                {domains.map((domain) => {
                  const nodes = getNodesByDomainAndPillar(domain.id, pillar.id)
                  const isSelected = selectedCell?.domainId === domain.id && selectedCell?.pillarId === pillar.id

                  return (
                    <button
                      key={`${domain.id}-${pillar.id}`}
                      onClick={() => handleCellClick(domain.id, pillar.id)}
                      className={`bg-card border-2 rounded-lg p-3 text-left transition-all hover:border-primary hover:shadow-lg ${
                        isSelected ? "border-primary shadow-lg" : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {nodes.length} {nodes.length === 1 ? "project" : "projects"}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {nodes.slice(0, 3).map((node) => (
                          <Link key={node.id} href={`/portal/nodes/${node.slug}`} onClick={(e) => e.stopPropagation()}>
                            <Badge
                              variant="secondary"
                              className="text-xs truncate max-w-full block hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              {node.title}
                            </Badge>
                          </Link>
                        ))}
                        {nodes.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{nodes.length - 3} more</span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Filtered results */}
      {selectedCell && (
        <Card className="p-6 border-2 border-primary">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-foreground mb-1">
                {domains.find((d) => d.id === selectedCell.domainId)?.name} ×{" "}
                {pillars.find((p) => p.id === selectedCell.pillarId)?.name}
              </h3>
              <p className="text-sm text-muted-foreground">
                {filteredNodes.length} {filteredNodes.length === 1 ? "project" : "projects"} found
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                className="gap-2"
                onClick={() => {
                  setAddNodeContext({ 
                    domainId: selectedCell.domainId, 
                    pillarId: selectedCell.pillarId 
                  })
                  setShowAddDialog(true)
                }}
              >
                <Plus size={16} />
                Add Node
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedCell(null)}>
                <X size={16} />
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredNodes.map((node) => (
              <Link key={node.id} href={`/portal/nodes/${node.slug}`}>
                <Card className="p-4 hover:border-primary transition-all cursor-pointer h-full">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-foreground">{node.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {node.type}
                    </Badge>
                  </div>
                  {node.description && <p className="text-sm text-muted-foreground mb-3">{node.description}</p>}
                  {node.tags && node.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {node.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <AddNodeDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        defaultDomainId={addNodeContext.domainId}
        defaultPillarId={addNodeContext.pillarId}
      />
    </div>
  )
}
