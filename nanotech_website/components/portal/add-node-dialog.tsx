"use client"

import { useState } from "react"
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
import { domains, pillars, type NodeType, type NodeStatus } from "@/lib/portal-data"

interface AddNodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDomainId?: string
  defaultPillarId?: string
  parentNodeId?: string
}

export function AddNodeDialog({
  open,
  onOpenChange,
  defaultDomainId,
  defaultPillarId,
  parentNodeId,
}: AddNodeDialogProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<NodeType>("project")
  const [domainId, setDomainId] = useState(defaultDomainId || "")
  const [pillarId, setPillarId] = useState(defaultPillarId || "")
  const [status, setStatus] = useState<NodeStatus>("draft")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // In a real app, this would save to a database
    console.log("Creating node:", {
      title,
      description,
      type,
      domainId: domainId || undefined,
      pillarId: pillarId || undefined,
      status,
      parentId: parentNodeId,
    })

    // Show success message
    alert(`Node "${title}" created successfully! (This is a demo - actual persistence would require a database)`)

    // Reset form
    setTitle("")
    setDescription("")
    setType("project")
    setDomainId(defaultDomainId || "")
    setPillarId(defaultPillarId || "")
    setStatus("draft")
    
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Add New Node</DialogTitle>
          <DialogDescription>
            Create a new research node. Fill in the details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter node title"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={type} onValueChange={(value) => setType(value as NodeType)}>
                  <SelectTrigger id="type">
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
                <Label htmlFor="status">Status *</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as NodeStatus)}>
                  <SelectTrigger id="status">
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
                <Label htmlFor="domain">Domain</Label>
                <Select value={domainId} onValueChange={setDomainId}>
                  <SelectTrigger id="domain">
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
                <Label htmlFor="pillar">Pillar</Label>
                <Select value={pillarId} onValueChange={setPillarId}>
                  <SelectTrigger id="pillar">
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
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Node</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
