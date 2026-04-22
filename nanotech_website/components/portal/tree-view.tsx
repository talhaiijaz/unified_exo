"use client"

import { useState } from "react"
import { mockNodes, type Node } from "@/lib/portal-data"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddNodeDialog } from "@/components/portal/add-node-dialog"
import { ChevronRight, ChevronDown, Plus, FileText, Folder, Cpu, FileCode, Box } from "lucide-react"
import Link from "next/link"

function getNodeIcon(type: Node["type"]) {
  switch (type) {
    case "project":
      return <Folder size={16} className="text-primary" />
    case "simulation":
      return <Cpu size={16} className="text-accent" />
    case "document":
      return <FileText size={16} className="text-muted-foreground" />
    case "board":
      return <Box size={16} className="text-chart-2" />
    default:
      return <FileCode size={16} className="text-muted-foreground" />
  }
}

function TreeNode({ 
  node, 
  level = 0, 
  onSelect 
}: { 
  node: Node; 
  level?: number;
  onSelect?: (node: Node) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(level < 1)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 hover:bg-accent/10 rounded-lg group transition-colors cursor-pointer"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => onSelect?.(node)}
      >
        {hasChildren ? (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }} 
            className="hover:text-primary transition-colors"
          >
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <div className="w-4" />
        )}

        {getNodeIcon(node.type)}

        <span className="text-sm font-medium text-foreground hover:text-primary transition-colors truncate block flex-1 min-w-0">
          {node.title}
        </span>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Badge variant="outline" className="text-xs">
            {node.type}
          </Badge>
          <div className="relative">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-6 w-6 p-0" 
              onClick={(e) => {
                e.stopPropagation();
                setShowAddMenu(!showAddMenu);
              }}
            >
              <Plus size={14} />
            </Button>
            {showAddMenu && (
              <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg p-2 z-10 min-w-[150px]">
                <Link href={`/portal/nodes/${node.slug}`}>
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 rounded transition-colors">
                    View Details
                  </button>
                </Link>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 rounded transition-colors">
                  Add Child
                </button>
                <button className="w-full text-left px-3 py-2 text-sm hover:bg-accent/10 rounded transition-colors">
                  Add Sibling
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  )
}

export function TreeView() {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  return (
    <div className="grid lg:grid-cols-[400px_1fr] gap-6">
      {/* Tree navigation */}
      <Card className="p-4 h-fit max-h-[calc(100vh-300px)] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Research Tree</h3>
          <Button 
            size="sm" 
            variant="outline" 
            className="gap-2 bg-transparent"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus size={14} />
            Add Root
          </Button>
        </div>
        <div className="space-y-1">
          {mockNodes.map((node) => (
            <TreeNode key={node.id} node={node} onSelect={setSelectedNode} />
          ))}
        </div>
      </Card>

      {/* Node details */}
      <Card className="p-6">
        {selectedNode ? (
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{selectedNode.title}</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">{selectedNode.type}</Badge>
                  <Badge variant={selectedNode.status === "published" ? "default" : "secondary"}>
                    {selectedNode.status}
                  </Badge>
                </div>
              </div>
              <Link href={`/portal/nodes/${selectedNode.slug}`}>
                <Button size="sm" className="gap-2">
                  <FileText size={16} />
                  View Full Details
                </Button>
              </Link>
            </div>
            <p className="text-muted-foreground mb-4">{selectedNode.description || "No description available"}</p>
            {selectedNode.tags && selectedNode.tags.length > 0 && (
              <div className="mt-4">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {selectedNode.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {selectedNode.children && selectedNode.children.length > 0 && (
              <div className="mt-4">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Child Nodes ({selectedNode.children.length})
                </label>
                <div className="space-y-2">
                  {selectedNode.children.map((child) => (
                    <div 
                      key={child.id} 
                      className="p-2 bg-secondary/20 rounded-lg cursor-pointer hover:bg-secondary/40 transition-colors"
                      onClick={() => setSelectedNode(child)}
                    >
                      <div className="flex items-center gap-2">
                        {getNodeIcon(child.type)}
                        <span className="text-sm font-medium">{child.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a node from the tree to view details</p>
            </div>
          </div>
        )}
      </Card>

      <AddNodeDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </div>
  )
}
