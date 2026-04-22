"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { domains, pillars, type Node, type NodeType, type NodeStatus } from "@/lib/portal-data"

interface EditNodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  node: Node
}

export function EditNodeDialog({
  open,
  onOpenChange,
  node,
}: EditNodeDialogProps) {
  const [title, setTitle] = useState(node.title)
  const [description, setDescription] = useState(node.description || "")
  const [type, setType] = useState<NodeType>(node.type)
  const [domainId, setDomainId] = useState(node.domainId || "none")
  const [pillarId, setPillarId] = useState(node.pillarId || "none")
  const [status, setStatus] = useState<NodeStatus>(node.status)
  const [content, setContent] = useState(node.content || "")

  // Update form when node changes
  useEffect(() => {
    setTitle(node.title)
    setDescription(node.description || "")
    setType(node.type)
    setDomainId(node.domainId || "none")
    setPillarId(node.pillarId || "none")
    setStatus(node.status)
    setContent(node.content || "")
  }, [node])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // In a real app, this would save to a database
    console.log("Updating node:", {
      id: node.id,
      title,
      description,
      type,
      domainId: domainId === "none" ? undefined : domainId,
      pillarId: pillarId === "none" ? undefined : pillarId,
      status,
      content,
    })

    // Show success message
    alert(`Node "${title}" updated successfully! (This is a demo - actual persistence would require a database)`)
    
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Node</DialogTitle>
          <DialogDescription>
            Update the node details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter node title"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-type">Type *</Label>
                <Select value={type} onValueChange={(value) => setType(value as NodeType)}>
                  <SelectTrigger id="edit-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="simulation">Simulation</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="board">Board</SelectItem>
                    <SelectItem value="generic">Generic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status *</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as NodeStatus)}>
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-domain">Domain</Label>
                <Select value={domainId} onValueChange={setDomainId}>
                  <SelectTrigger id="edit-domain">
                    <SelectValue placeholder="Select domain" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {domains.map((domain) => (
                      <SelectItem key={domain.id} value={domain.id}>
                        {domain.icon} {domain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-pillar">Pillar</Label>
                <Select value={pillarId} onValueChange={setPillarId}>
                  <SelectTrigger id="edit-pillar">
                    <SelectValue placeholder="Select pillar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {pillars.map((pillar) => (
                      <SelectItem key={pillar.id} value={pillar.id}>
                        {pillar.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter markdown content"
                rows={8}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
