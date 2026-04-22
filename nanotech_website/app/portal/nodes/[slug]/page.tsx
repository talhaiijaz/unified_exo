"use client"

import { useState, use } from "react"
import { getNodeBySlug, domains, pillars } from "@/lib/portal-data"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EditNodeDialog } from "@/components/portal/edit-node-dialog"
import { ArrowLeft, Edit, FileText, Box, LinkIcon, History } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

export default function NodePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const node = getNodeBySlug(slug)
  const [showEditDialog, setShowEditDialog] = useState(false)

  if (!node) {
    notFound()
  }

  const domain = domains.find((d) => d.id === node.domainId)
  const pillar = pillars.find((p) => p.id === node.pillarId)

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

          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">{node.title}</h1>
                {node.description && <p className="text-lg text-muted-foreground">{node.description}</p>}
              </div>
              <Button className="gap-2" onClick={() => setShowEditDialog(true)}>
                <Edit size={16} />
                Edit
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{node.type}</Badge>
              <Badge variant={node.status === "published" ? "default" : "secondary"}>{node.status}</Badge>
              {domain && (
                <Badge variant="secondary">
                  {domain.icon} {domain.name}
                </Badge>
              )}
              {pillar && <Badge variant="secondary">{pillar.name}</Badge>}
              {node.tags?.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className={`grid w-full ${node.type === "board" ? "grid-cols-5" : "grid-cols-4"}`}>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="content">
                <FileText size={16} className="mr-2" />
                Content
              </TabsTrigger>
              {node.type === "board" && (
                <TabsTrigger value="variants">
                  <Box size={16} className="mr-2" />
                  Variants
                </TabsTrigger>
              )}
              <TabsTrigger value="relations">
                <LinkIcon size={16} className="mr-2" />
                Relations
              </TabsTrigger>
              <TabsTrigger value="history">
                <History size={16} className="mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Overview</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Title</label>
                    <p className="text-foreground">{node.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Description</label>
                    <p className="text-foreground">{node.description || "No description"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                    <p className="text-foreground capitalize">{node.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p className="text-foreground capitalize">{node.status}</p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="content" className="mt-6">
              <Card className="p-6">
                <div className="prose prose-invert max-w-none">
                  {node.content ? (
                    <div className="whitespace-pre-wrap">{node.content}</div>
                  ) : (
                    <p className="text-muted-foreground">No content available. Click Edit to add content.</p>
                  )}
                </div>
              </Card>
            </TabsContent>

            {node.type === "board" && (
              <TabsContent value="variants" className="mt-6">
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">Board Variants</h3>
                    <Button size="sm" className="gap-2">
                      <Box size={16} />
                      Add Variant
                    </Button>
                  </div>
                  {node.variants && node.variants.length > 0 ? (
                    <div className="space-y-4">
                      {node.variants.map((variant) => (
                        <Card key={variant.id} className="p-4 bg-secondary/20">
                          <h4 className="font-semibold text-lg mb-3">{variant.label}</h4>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Dimensions</label>
                              <p className="text-foreground">{variant.specs.dimensions || "N/A"}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Layers</label>
                              <p className="text-foreground">{variant.specs.layers || "N/A"}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Materials</label>
                              <p className="text-foreground">{variant.specs.materials || "N/A"}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Revision</label>
                              <p className="text-foreground">{variant.specs.revision || "N/A"}</p>
                            </div>
                          </div>
                          {variant.files && variant.files.length > 0 && (
                            <div className="mt-4">
                              <label className="text-sm font-medium text-muted-foreground mb-2 block">Files</label>
                              <div className="flex flex-wrap gap-2">
                                {variant.files.map((file) => (
                                  <Badge key={file} variant="outline">
                                    {file}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No variants available. Click Add Variant to create one.</p>
                  )}
                </Card>
              </TabsContent>
            )}

            <TabsContent value="relations" className="mt-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Related Nodes</h3>
                  <Button size="sm" className="gap-2">
                    <LinkIcon size={16} />
                    Add Relation
                  </Button>
                </div>
                <p className="text-muted-foreground">No relations defined yet.</p>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4">Change History</h3>
                <p className="text-muted-foreground">No history available.</p>
              </Card>
            </TabsContent>
          </Tabs>

          {node.children && node.children.length > 0 && (
            <div className="mt-8">
              <h3 className="text-2xl font-bold text-foreground mb-4">Child Nodes</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {node.children.map((child) => (
                  <Link key={child.id} href={`/portal/nodes/${child.slug}`}>
                    <Card className="p-4 hover:border-primary transition-all cursor-pointer h-full">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-foreground">{child.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {child.type}
                        </Badge>
                      </div>
                      {child.description && <p className="text-sm text-muted-foreground">{child.description}</p>}
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
      
      <EditNodeDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        node={node}
      />
    </main>
  )
}
