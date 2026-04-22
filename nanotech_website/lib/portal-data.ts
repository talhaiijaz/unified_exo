export type NodeType = "project" | "simulation" | "document" | "board" | "generic"
export type NodeStatus = "draft" | "published" | "archived"

export interface Node {
  id: string
  title: string
  slug: string
  description?: string
  type: NodeType
  domainId?: string
  pillarId?: string
  status: NodeStatus
  parentId?: string
  children?: Node[]
  coverImageUrl?: string
  tags?: string[]
  content?: string
  variants?: BoardVariant[]
  attachments?: Attachment[]
  relatedNodes?: string[]
}

export interface BoardVariant {
  id: string
  label: string
  specs: {
    dimensions?: string
    layers?: number
    materials?: string
    revision?: string
  }
  files?: string[]
}

export interface Attachment {
  id: string
  url: string
  title: string
  type: string
}

export const domains = [
  { id: "bio", name: "Bio", slug: "bio", icon: "🧬" },
  { id: "e-beam", name: "E-beam", slug: "e-beam", icon: "⚡" },
  { id: "energy", name: "Energy", slug: "energy", icon: "🔋" },
  { id: "exo-skeleton", name: "Exo-skeleton", slug: "exo-skeleton", icon: "🦾" },
  { id: "volvo", name: "Volvo", slug: "volvo", icon: "🚗" },
]

export const pillars = [
  { id: "theoretical", name: "Theoretical", slug: "theoretical" },
  { id: "simulation", name: "Simulation", slug: "simulation" },
  { id: "fabrication-process", name: "Fabrication Process", slug: "fabrication-process" },
  { id: "holders-design", name: "Holders/Design", slug: "holders-design" },
  { id: "electronics", name: "Electronics", slug: "electronics" },
  { id: "firmware", name: "Firmware", slug: "firmware" },
  { id: "software-data", name: "Software/Data Analytics", slug: "software-data" },
  { id: "ai-ml", name: "AI/ML", slug: "ai-ml" },
]

export const mockNodes: Node[] = [
  {
    id: "1",
    title: "Biosensor Platform",
    slug: "biosensor-platform",
    description: "Advanced biosensor technology for real-time health monitoring",
    type: "project",
    domainId: "bio",
    pillarId: "electronics",
    status: "published",
    tags: ["sensors", "healthcare", "monitoring"],
    content: "# Biosensor Platform\n\nOur biosensor platform enables real-time monitoring of biological markers...",
    children: [
      {
        id: "2",
        title: "Board Variants",
        slug: "biosensor-boards",
        description: "Different board configurations for various applications",
        type: "board",
        domainId: "bio",
        pillarId: "electronics",
        status: "published",
        parentId: "1",
        variants: [
          {
            id: "v1",
            label: '1"x11"',
            specs: {
              dimensions: '1" x 11"',
              layers: 4,
              materials: "FR-4, Gold plating",
              revision: "Rev 2.1",
            },
            files: ["schematic-v1.pdf", "gerber-v1.zip"],
          },
          {
            id: "v2",
            label: '10"x5"',
            specs: {
              dimensions: '10" x 5"',
              layers: 6,
              materials: "Rogers 4350B",
              revision: "Rev 1.3",
            },
            files: ["schematic-v2.pdf", "gerber-v2.zip"],
          },
          {
            id: "v3",
            label: "7x7mm",
            specs: {
              dimensions: "7mm x 7mm",
              layers: 2,
              materials: "Flexible PCB",
              revision: "Rev 3.0",
            },
            files: ["schematic-v3.pdf", "gerber-v3.zip"],
          },
        ],
      },
      {
        id: "3",
        title: "Sensor Calibration",
        slug: "sensor-calibration",
        description: "Calibration procedures and algorithms",
        type: "document",
        domainId: "bio",
        pillarId: "software-data",
        status: "published",
        parentId: "1",
      },
    ],
  },
  {
    id: "4",
    title: "E-beam Lithography",
    slug: "e-beam-lithography",
    description: "High-resolution nanoscale patterning",
    type: "project",
    domainId: "e-beam",
    pillarId: "fabrication-process",
    status: "published",
    tags: ["nanofabrication", "lithography"],
    children: [
      {
        id: "5",
        title: "Pattern Optimization",
        slug: "pattern-optimization",
        description: "ML-based pattern optimization",
        type: "simulation",
        domainId: "e-beam",
        pillarId: "ai-ml",
        status: "published",
        parentId: "4",
      },
    ],
  },
  {
    id: "6",
    title: "Energy Harvesting",
    slug: "energy-harvesting",
    description: "Nanoscale energy harvesting devices",
    type: "project",
    domainId: "energy",
    pillarId: "theoretical",
    status: "published",
    tags: ["energy", "harvesting", "nanodevices"],
  },
  {
    id: "7",
    title: "CNT Synthesis",
    slug: "cnt-synthesis",
    description: "Carbon nanotube synthesis optimization",
    type: "project",
    domainId: "bio",
    pillarId: "fabrication-process",
    status: "published",
    tags: ["carbon nanotubes", "synthesis"],
  },
  {
    id: "8",
    title: "Thermal Simulation",
    slug: "thermal-simulation",
    description: "Thermal analysis of nanodevices",
    type: "simulation",
    domainId: "energy",
    pillarId: "simulation",
    status: "published",
    tags: ["thermal", "simulation", "FEA"],
  },
  {
    id: "9",
    title: "Exoskeleton Control",
    slug: "exoskeleton-control",
    description: "Control algorithms for exoskeleton systems",
    type: "project",
    domainId: "exo-skeleton",
    pillarId: "firmware",
    status: "published",
    tags: ["control", "firmware", "robotics"],
  },
  {
    id: "10",
    title: "Vehicle Sensors",
    slug: "vehicle-sensors",
    description: "Sensor integration for automotive applications",
    type: "project",
    domainId: "volvo",
    pillarId: "electronics",
    status: "published",
    tags: ["automotive", "sensors", "integration"],
  },
]

export function getNodesByDomainAndPillar(domainId?: string, pillarId?: string): Node[] {
  const flattenNodes = (nodes: Node[]): Node[] => {
    return nodes.reduce((acc: Node[], node) => {
      acc.push(node)
      if (node.children) {
        acc.push(...flattenNodes(node.children))
      }
      return acc
    }, [])
  }

  const allNodes = flattenNodes(mockNodes)

  return allNodes.filter((node) => {
    if (domainId && pillarId) {
      return node.domainId === domainId && node.pillarId === pillarId
    }
    if (domainId) {
      return node.domainId === domainId
    }
    if (pillarId) {
      return node.pillarId === pillarId
    }
    return true
  })
}

export function getNodeById(id: string): Node | undefined {
  const findNode = (nodes: Node[]): Node | undefined => {
    for (const node of nodes) {
      if (node.id === id) return node
      if (node.children) {
        const found = findNode(node.children)
        if (found) return found
      }
    }
    return undefined
  }

  return findNode(mockNodes)
}

export function getNodeBySlug(slug: string): Node | undefined {
  const findNode = (nodes: Node[]): Node | undefined => {
    for (const node of nodes) {
      if (node.slug === slug) return node
      if (node.children) {
        const found = findNode(node.children)
        if (found) return found
      }
    }
    return undefined
  }

  return findNode(mockNodes)
}
