# Microfluidics Calculator Implementation Notes

## Codebase Analysis Summary

### Tech Stack
- **Framework**: Next.js 15.2.4 with React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom theme
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Charts**: Recharts 2.15.4
- **Icons**: lucide-react

### Application Architecture

#### Portal Structure
\`\`\`
/app/portal/
  ├── page.tsx                    # Main portal landing (links to calculations)
  └── calculations/
      └── page.tsx                # Calculations hub (registers all calculators)

/components/calculations/
  ├── nitro-working.tsx           # RC circuit simulation
  ├── fmm-calculator.tsx          # Functional Mixture Modeling
  ├── cnt-calculator.tsx          # CNT Capacitance
  ├── rc-calculator.tsx           # RC Calculator (Sheet 1)
  ├── vo-rf.tsx                   # Vo & Rf Explorer
  ├── vx-plotter.tsx              # Vx(t) Plotter
  ├── covid-simulator.tsx         # COVID Detection
  ├── biosensing-simulation.tsx   # Biosensing Simulation
  └── ebeam-embed.tsx             # E-Beam Lithography

/lib/calc/
  ├── rc.ts                       # RC calculation logic
  ├── cnt.ts                      # CNT calculation logic
  ├── covid.ts                    # COVID calculation logic
  └── biosensing.ts               # Biosensing calculation logic
\`\`\`

### Calculator Implementation Pattern

#### 1. Logic Module (`/lib/calc/[name].ts`)
\`\`\`typescript
// Export input and result types
export interface InputType { ... }
export interface ResultType { ... }

// Export calculation function
export function calculate(inputs: InputType): ResultType {
  // Physics/math calculations
  // Return structured results
}
\`\`\`

**Conventions:**
- Use TypeScript interfaces for type safety
- Keep pure calculation logic separate from UI
- Use descriptive variable names matching physics notation
- Include comments for complex formulas
- Handle edge cases and validation

#### 2. UI Component (`/components/calculations/[name]-calculator.tsx`)
\`\`\`typescript
"use client"

import { useState } from "react"
import { Card, Button, Input, Label, Badge } from "@/components/ui/..."
import { calculateFunction } from "@/lib/calc/[name]"

export function NameCalculator() {
  // State for inputs
  const [input1, setInput1] = useState(defaultValue)
  const [results, setResults] = useState<ResultType | null>(null)

  const run = () => {
    const output = calculateFunction({ input1, ... })
    setResults(output)
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="border-b border-border pb-4 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Calculator Name</h2>
          <p className="text-muted-foreground">Description</p>
        </div>
        <Badge>Active</Badge>
      </div>

      {/* Input section */}
      <Card className="p-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Input fields */}
        </div>
        <div className="mt-6">
          <Button onClick={run}>Run</Button>
        </div>
      </Card>

      {/* Results section */}
      {results && (
        <Card className="p-6 border-2 border-primary/30">
          {/* Display results */}
        </Card>
      )}
    </div>
  )
}
\`\`\`

**UI Patterns:**
- Always use `"use client"` directive
- Three-section layout: Header, Inputs, Results
- Use `Card` for visual grouping
- Grid layouts for multiple inputs (md:grid-cols-2, md:grid-cols-3)
- Conditional rendering for results
- Badge to indicate status
- Helper components for repeated elements (Field, Metric)

#### 3. Registration (`/app/portal/calculations/page.tsx`)
\`\`\`typescript
import { NewCalculator } from "@/components/calculations/new-calculator"
import { IconName } from "lucide-react"

const calculationTools = [
  {
    id: "unique-id",                    // URL-friendly identifier
    name: "Display Name",               // User-facing name
    description: "Brief description",   // One-liner explanation
    icon: IconName,                     // lucide-react icon
    gradient: "from-X-400 to-Y-400",   // Tailwind gradient classes
    status: "active",                   // "active" or "coming-soon"
    component: NewCalculator            // React component
  },
  // ... other tools
]
\`\`\`

**Available Gradients (unused):**
- `from-cyan-400 to-sky-400`
- `from-lime-400 to-green-400`
- `from-yellow-400 to-amber-400`
- `from-pink-400 to-rose-400`
- `from-fuchsia-400 to-purple-400`

**Available Icons (relevant):**
- `Droplet` - For fluids/liquids
- `Wind` - For flow
- `Waves` - For fluid dynamics
- `Flask` - For chemistry/lab work
- `Timer` - For time-based calculations
- `Gauge` - For pressure measurements

### Existing Calculator Examples

#### Simple Calculator (CNT)
- **Inputs**: 4 parameters (radius, length, width, height)
- **Logic**: Direct mathematical formulas
- **Output**: Table of metrics with scientific notation
- **Pattern**: Clean, straightforward calculation

#### Complex Calculator (COVID)
- **Inputs**: 15+ parameters with defaults
- **Logic**: Multi-step physics calculations
- **Output**: Table with many intermediate values
- **Pattern**: Parameter-heavy, detailed results

#### Interactive Calculator (NiTRO)
- **Inputs**: Multiple tabs for different modes
- **Logic**: Waveform generation, signal processing
- **Output**: Interactive charts with Recharts
- **Pattern**: Advanced visualization

### Design System

#### Color Scheme
- `foreground` - Main text
- `muted-foreground` - Secondary text
- `background` - Main background
- `border` - Borders
- `primary` - Accent color (blue-cyan gradient theme)

#### Spacing
- `space-y-6` - Vertical spacing between sections
- `gap-4`, `gap-6` - Grid gaps
- `p-4`, `p-6` - Padding
- `mb-2`, `mb-4` - Margins

#### Typography
- Headings: `text-2xl font-bold`, `text-xl font-bold`
- Body: `text-sm`, `text-base`
- Mono: `font-mono` for numbers

### Key Dependencies
\`\`\`json
{
  "react": "^19",
  "next": "15.2.4",
  "typescript": "^5",
  "lucide-react": "^0.454.0",
  "recharts": "2.15.4",
  "@radix-ui/react-*": "latest"
}
\`\`\`

## Microfluidics Calculator Requirements

### Goal
Calculate capillary-driven flow parameters for a 1 mm-ID cylindrical microchannel:
- **Inputs**: Tube length L (mm)
- **Outputs**: P_cap (Pa), Q (m³/s), V (m/s), T (s)

### Physics Model (from user specifications)
**Constants:**
- γ = 0.0722 N/m (surface tension, PBS/water)
- η = 0.904 × 10⁻³ N·s/m² (viscosity)
- r = 0.0005 m (radius, 1 mm diameter)
- w = 0.001 m (channel width term)
- Contact angles: θ = 0° → cos(θ) = 1

**Equations:**
\`\`\`
P_cap = γ * [(cosθ_top + cosθ_bottom)/L + (cosθ_left + cosθ_right)/w]
      = γ * (2/L + 2/w)  [when cos=1]
      = 0.1444/L + 144.4 Pa  [numerically]

R_f = 8L / (πr⁴)                      # Hagen-Poiseuille resistance
Q = (P_cap * πr⁴) / (8ηL)             # Flow rate
V = (P_cap * r²) / (8ηL)              # Average velocity
T = (8ηL²) / (P_cap * r²)             # Transit time
\`\`\`

**Test Cases (expected outputs):**
\`\`\`
L (mm)  →  T (s)
50      →  0.491
132.5   →  3.491
180.5   →  6.491
40      →  0.313
80      →  1.266
120     →  2.861
160     →  5.097
200     →  7.973
240     →  11.491
280     →  15.650
\`\`\`

### Implementation Plan

#### File Structure
\`\`\`
/lib/calc/
  └── microfluidics.ts          # Logic module (user-provided code)

/components/calculations/
  └── microfluidics-calculator.tsx   # UI component (to create)

/app/portal/calculations/
  └── page.tsx                  # Register calculator (to modify)
\`\`\`

#### Features to Implement
1. **Input Methods:**
   - Single length input (quick calculation)
   - Multiple lengths (comma-separated or array)
   - Optional parameter overrides (γ, η, diameter, w, angles)

2. **Output Display:**
   - Table view for multiple lengths
   - Individual metric cards for single calculation
   - Export to CSV option (future)

3. **Validation:**
   - Positive length values
   - Reasonable ranges (1-1000 mm typical)
   - Error handling for invalid inputs

4. **UI Enhancements:**
   - Preset buttons (default test cases)
   - Toggle between mm/m units
   - Scientific notation formatting
   - Visual indicator for very long transit times

#### Integration Steps
1. ✅ Create `/lib/calc/microfluidics.ts` with user's code
2. Create `/components/calculations/microfluidics-calculator.tsx`
3. Register in `/app/portal/calculations/page.tsx`
4. Test with provided test cases
5. Verify numerical accuracy

### Design Decisions

**Icon Choice:** `Droplet` (fluid/capillary action)
**Gradient:** `from-cyan-400 to-sky-400` (water/fluid theme)
**Input Style:** Flexible (single or multiple lengths)
**Output Style:** Responsive table for multiple lengths, metrics for single

**Key Considerations:**
- Preserve exact formula from user (including 1/L term)
- Match test case outputs precisely
- Keep defaults to reproduce user's table
- Allow overrides for future extensions (blood preset)
- Clear labeling of units
- Mobile-responsive layout

## Notes for Future Enhancements
- Blood preset (different η and γ)
- Visualization of flow over time
- Comparison between multiple scenarios
- Export functionality
- Integration with cartridge design specs
