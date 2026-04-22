# Calculations Portal - User Guide

## ✅ What Was Created

### 1. New Portal Section: Calculations
- **Route**: `/portal/calculations`
- **Purpose**: Centralized hub for computational tools and calculators
- **Design**: Matches your website's gradient theme with blue/cyan/purple accents

### 2. Structure

\`\`\`
app/portal/calculations/
└── page.tsx                           # Main calculations page

components/calculations/
└── fmm-calculator.tsx                 # FMM Algorithm calculator
\`\`\`

### 3. Features Implemented

#### Main Calculations Page (`/portal/calculations`)
- **Tool Selection Cards**: Beautiful gradient cards for each calculation tool
- **Active/Coming Soon Status**: Visual indicators for tool availability
- **Modular Design**: Easy to add new calculation tools

#### NiTRO Simulator (Active) 🆕
Full integration of the [NiTRO application](https://nanotech.onrender.com/) from [GitHub](https://github.com/nazeern/nanotech):
- **Simulate Tab**:
  - RC circuit simulation with sine/triangle waves
  - Adjustable frequency, cycles, resistance, capacitance
  - Real-time waveform visualization (V_in, I_out, V_out)
  - Digitize V_out option
- **Preprocess Tab**:
  - Data cleaning and normalization
  - Upload CSV or load samples
- **Train Tab**:
  - FMM algorithm training for yeast concentration prediction
  - Configurable noise scales and sample counts
  - Impedance vs. concentration graphs
  - Algorithm accuracy reporting
- **Predict Tab**:
  - Make predictions on new impedance data
  - Multiple input source options

#### FMM Calculator (Active)
Based on the [GitHub repo](https://github.com/nazeern/nanotech):
- **Input Methods**:
  - Manual CSV data entry
  - File upload (.csv, .txt)
  - Sample data loader
- **Parameters**:
  - Number of mixture components
  - Convergence threshold
  - Advanced settings (future)
- **Results Display**:
  - Predicted value
  - Confidence percentage
  - Mixture component breakdown
  - Export capabilities

#### Placeholder / Future Tools
- Thermal Analysis Tool

### 4. Portal Integration
- Added prominent "Calculations & Tools" card on main portal page
- Smooth navigation with back buttons
- Consistent design language throughout

---

## 🚀 How to Add More Calculations

### Step 1: Create Calculator Component

Create a new file in `/components/calculations/`:

\`\`\`tsx
// components/calculations/your-calculator.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

export function YourCalculator() {
  const [input, setInput] = useState("")
  const [result, setResult] = useState<any>(null)

  const handleCalculation = () => {
    // Your calculation logic here
    const calculatedResult = /* your calculation */
    setResult(calculatedResult)
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Your Calculator Name
        </h2>
        <p className="text-muted-foreground">
          Description of what this calculator does
        </p>
      </div>

      {/* Your input fields */}
      <div className="space-y-4">
        <div>
          <Label>Input Parameter</Label>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter value..."
          />
        </div>
      </div>

      {/* Calculate button */}
      <Button onClick={handleCalculation}>
        Calculate
      </Button>

      {/* Results display */}
      {result && (
        <Card className="p-6">
          <h3 className="font-bold mb-4">Results</h3>
          {/* Display your results */}
        </Card>
      )}
    </div>
  )
}
\`\`\`

### Step 2: Register in Calculations Page

Edit `/app/portal/calculations/page.tsx`:

1. **Import your calculator**:
\`\`\`tsx
import { YourCalculator } from "@/components/calculations/your-calculator"
\`\`\`

2. **Add to calculationTools array**:
\`\`\`tsx
const calculationTools = [
  // ... existing tools
  {
    id: "your-calculator-id",
    name: "Your Calculator Name",
    description: "Brief description of what it does",
    icon: YourIcon,  // Choose from lucide-react
    gradient: "from-green-400 to-emerald-400",  // Choose gradient
    status: "active",  // "active" or "coming-soon"
    component: YourCalculator
  }
]
\`\`\`

### Step 3: Choose Your Gradient

Available gradient combinations:
- `from-blue-400 to-cyan-400` (FMM - currently used)
- `from-purple-400 to-pink-400` (CNT Capacitance)
- `from-green-400 to-emerald-400` (Thermal Analysis)
- `from-orange-400 to-red-400`
- `from-violet-400 to-purple-400`
- `from-indigo-400 to-blue-400`
- `from-teal-400 to-cyan-400`
- `from-amber-400 to-yellow-400`

### Step 4: Choose Your Icon

Popular calculation icons from `lucide-react`:
- `Calculator` - General calculations
- `Zap` - Electrical/energy calculations
- `Cpu` - Computational/processing
- `TrendingUp` - Data analysis
- `Activity` - Signal processing
- `BarChart` - Statistical analysis
- `Layers` - Material properties
- `Gauge` - Measurements

---

## 📊 Example: Adding CNT Capacitance Calculator

> Note: A CNT capacitance tool is already implemented as `components/calculations/cnt-calculator.tsx`.
> This example shows the pattern for adding additional calculators.

### 1. Create the Component

\`\`\`tsx
// components/calculations/cnt-capacitance.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CNTCapacitanceCalculator() {
  const [diameter, setDiameter] = useState("")
  const [length, setLength] = useState("")
  const [capacitance, setCapacitance] = useState<number | null>(null)

  const calculateCapacitance = () => {
    const d = parseFloat(diameter)
    const l = parseFloat(length)
    // Your formula here
    const C = /* calculation based on cnt_param_to_cap.py */
    setCapacitance(C)
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          CNT Capacitance Calculator
        </h2>
        <p className="text-muted-foreground">
          Calculate capacitance parameters for carbon nanotube sensors
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Diameter (nm)</Label>
          <Input
            type="number"
            value={diameter}
            onChange={(e) => setDiameter(e.target.value)}
            placeholder="Enter diameter..."
          />
        </div>
        <div>
          <Label>Length (μm)</Label>
          <Input
            type="number"
            value={length}
            onChange={(e) => setLength(e.target.value)}
            placeholder="Enter length..."
          />
        </div>
      </div>

      <Button onClick={calculateCapacitance}>
        Calculate
      </Button>

      {capacitance !== null && (
        <div className="p-6 bg-primary/10 rounded-lg">
          <div className="text-sm text-muted-foreground">Capacitance</div>
          <div className="text-3xl font-bold text-primary">
            {capacitance.toFixed(2)} pF
          </div>
        </div>
      )}
    </div>
  )
}
\`\`\`

### 2. Register It

In `/app/portal/calculations/page.tsx`:

\`\`\`tsx
import { CNTCapacitanceCalculator } from "@/components/calculations/cnt-capacitance"

// In calculationTools array:
{
  id: "cnt-capacitance",
  name: "CNT Capacitance Calculator",
  description: "Calculate capacitance parameters for carbon nanotube sensors",
  icon: Zap,
  gradient: "from-purple-400 to-pink-400",
  status: "active",
  component: CNTCapacitanceCalculator
}
\`\`\`

---

## 🎨 Design Guidelines

### Keep Consistent with Website Theme

1. **Colors**: Use gradient combinations that match the site
2. **Typography**: Follow existing font weights and sizes
3. **Spacing**: Use Tailwind's spacing scale (p-4, p-6, etc.)
4. **Borders**: Use `border-border` for consistency
5. **Hover Effects**: Add `hover:` states for interactivity

### Component Structure

Every calculator should have:
- **Header**: Title and description
- **Input Section**: Clear labels and placeholders
- **Action Button**: Prominent "Calculate" or "Run" button
- **Results Section**: Styled card with clear visualization
- **Export Options**: Download/save functionality (optional)

---

## 🔗 Integration with Backend (Future)

When you're ready to connect to a real backend:

1. **Create API Routes**:
\`\`\`tsx
// app/api/calculations/fmm/route.ts
export async function POST(request: Request) {
  const data = await request.json()
  // Run calculation
  return Response.json({ result })
}
\`\`\`

2. **Update Calculator**:
\`\`\`tsx
const handleCalculation = async () => {
  const response = await fetch('/api/calculations/fmm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: dataInput })
  })
  const result = await response.json()
  setResults(result)
}
\`\`\`

---

## 📝 Current Status

✅ **Implemented**:
- Calculations portal page
- **NiTRO Simulator** (Full RC circuit & biosensor prediction suite) 🆕
- FMM Calculator (with UI demo)
- Modular tool structure
- Beautiful design matching website theme

🔄 **Coming Soon / Future Work**:
- Thermal Analysis Tool

🚀 **Future Enhancements**:
- Backend API integration
- Real calculation engines
- Data persistence
- User calculation history
- Export to PDF/CSV

---

## 🎯 Quick Reference

### File Locations
- Main page: `/app/portal/calculations/page.tsx`
- Calculators: `/components/calculations/`
- Portal link: `/app/portal/page.tsx` (line 26-45)

### Key Dependencies
- `lucide-react` - Icons
- `@/components/ui/*` - UI components (Button, Input, Card, etc.)
- `tailwindcss` - Styling

### Access URL
- Local: `http://localhost:3000/portal/calculations`
- Production: `https://your-domain.com/portal/calculations`

---

Need help? The design is fully modular and extensible! 🚀
