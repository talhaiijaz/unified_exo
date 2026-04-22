"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Upload, 
  Play, 
  Download, 
  Info, 
  TrendingUp,
  FileText,
  Settings,
  AlertCircle
} from "lucide-react"

export function FMMCalculator() {
  const [dataInput, setDataInput] = useState("")
  const [numComponents, setNumComponents] = useState(3)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<any>(null)

  const handleCalculation = () => {
    setIsProcessing(true)
    
    // Simulate calculation (in production, this would call your backend API)
    setTimeout(() => {
      setResults({
        prediction: (Math.random() * 100).toFixed(2),
        confidence: (Math.random() * 30 + 70).toFixed(1),
        components: Array.from({ length: numComponents }, (_, i) => ({
          id: i + 1,
          weight: (Math.random()).toFixed(3),
          mean: (Math.random() * 10).toFixed(2),
          variance: (Math.random() * 5).toFixed(2)
        }))
      })
      setIsProcessing(false)
    }, 2000)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setDataInput(e.target?.result as string)
      }
      reader.readAsText(file)
    }
  }

  const loadSampleData = () => {
    const sampleData = `1.0, 2.3, 3.5, 4.2, 5.8, 6.1, 7.3, 8.5, 9.2, 10.1
2.1, 3.4, 4.6, 5.3, 6.9, 7.2, 8.4, 9.6, 10.3, 11.2
1.5, 2.8, 4.0, 4.7, 6.3, 6.6, 7.8, 9.0, 9.7, 10.6`
    setDataInput(sampleData)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Functional Mixture Modeling (FMM)
            </h2>
            <p className="text-muted-foreground max-w-3xl">
              A robust ML algorithm that enables high-accuracy regression on input data curves. 
              Perfect for predicting values from multiple data curves with associated measurements.
            </p>
          </div>
          <Badge variant="default" className="bg-gradient-to-r from-blue-400 to-cyan-400">
            Active
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="input" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="input">
            <Upload size={16} className="mr-2" />
            Input Data
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings size={16} className="mr-2" />
            Parameters
          </TabsTrigger>
          <TabsTrigger value="about">
            <Info size={16} className="mr-2" />
            About
          </TabsTrigger>
        </TabsList>

        <TabsContent value="input" className="space-y-4 mt-6">
          <Card className="p-6 bg-secondary/20">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Input Format</h4>
                <p className="text-sm text-muted-foreground">
                  Enter your data curves as comma-separated values, one curve per line. 
                  Each curve should have the same number of data points.
                </p>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="data-input">Data Curves (CSV Format)</Label>
                <Textarea
                  id="data-input"
                  value={dataInput}
                  onChange={(e) => setDataInput(e.target.value)}
                  placeholder="Enter your data curves here, one per line..."
                  rows={8}
                  className="font-mono text-sm mt-2"
                />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={loadSampleData} className="gap-2">
                  <FileText size={16} />
                  Load Sample Data
                </Button>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button variant="outline" className="gap-2">
                    <Upload size={16} />
                    Upload CSV File
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="num-components">Number of Mixture Components</Label>
              <Input
                id="num-components"
                type="number"
                min="1"
                max="10"
                value={numComponents}
                onChange={(e) => setNumComponents(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Number of Gaussian components in the mixture model (typically 2-5)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="convergence">Convergence Threshold</Label>
              <Input
                id="convergence"
                type="number"
                step="0.0001"
                defaultValue="0.001"
                placeholder="0.001"
              />
              <p className="text-xs text-muted-foreground">
                Algorithm stopping criteria (smaller = more accurate, slower)
              </p>
            </div>
          </div>

          <Card className="p-4 bg-secondary/20">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <Settings size={16} className="text-primary" />
              Advanced Settings
            </h4>
            <p className="text-sm text-muted-foreground">
              Additional parameters will be available in future updates including custom kernel functions, 
              regularization parameters, and cross-validation options.
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="space-y-4 mt-6">
          <Card className="p-6">
            <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="text-primary" />
              About FMM Algorithm
            </h3>
            <div className="space-y-4 text-muted-foreground">
              <p>
                Functional Mixture Modeling (FMM) is a robust machine learning algorithm designed for 
                high-accuracy regression on input data curves. It's particularly useful when:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>You have multiple data curves, each associated with some measured value</li>
                <li>You want to predict the value associated with a new input curve</li>
                <li>Your data contains noise or measurement errors</li>
                <li>Traditional regression methods fail due to curve complexity</li>
              </ul>
              
              <div className="border-t border-border pt-4 mt-4">
                <h4 className="font-semibold text-foreground mb-2">Key Features:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>High-accuracy predictions on noisy data</li>
                  <li>Robust to outliers and measurement errors</li>
                  <li>Automatic feature extraction from curves</li>
                  <li>Interpretable mixture components</li>
                </ul>
              </div>

              <div className="border-t border-border pt-4 mt-4">
                <h4 className="font-semibold text-foreground mb-2">Applications:</h4>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Biosensor calibration and prediction</li>
                  <li>Material property estimation from spectroscopy</li>
                  <li>Time-series classification and regression</li>
                  <li>Signal processing and pattern recognition</li>
                </ul>
              </div>

              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-4">
                <p className="text-sm text-foreground">
                  <strong>Reference:</strong> This implementation is based on research from the Berkeley Nanotech Lab. 
                  For detailed methodology and validation results, please refer to our{" "}
                  <a 
                    href="https://github.com/nazeern/nanotech" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    GitHub repository
                  </a>.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Run Calculation Button */}
      <div className="flex justify-between items-center pt-6 border-t border-border">
        <div className="text-sm text-muted-foreground">
          {dataInput ? `${dataInput.split('\n').filter(l => l.trim()).length} curves loaded` : "No data loaded"}
        </div>
        <Button
          onClick={handleCalculation}
          disabled={!dataInput || isProcessing}
          className="bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-500 hover:to-cyan-500 gap-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play size={16} />
              Run Calculation
            </>
          )}
        </Button>
      </div>

      {/* Results Display */}
      {results && (
        <Card className="p-6 border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
          <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="text-primary" />
            Results
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="p-4 bg-background rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-1">Predicted Value</div>
              <div className="text-3xl font-bold text-primary">{results.prediction}</div>
            </div>
            <div className="p-4 bg-background rounded-lg border border-border">
              <div className="text-sm text-muted-foreground mb-1">Confidence</div>
              <div className="text-3xl font-bold text-foreground">{results.confidence}%</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Mixture Components:</h4>
            <div className="space-y-2">
              {results.components.map((comp: any) => (
                <div key={comp.id} className="p-3 bg-background rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">Component {comp.id}</span>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Weight: {comp.weight}</span>
                      <span>μ: {comp.mean}</span>
                      <span>σ²: {comp.variance}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-border">
            <Button variant="outline" className="gap-2">
              <Download size={16} />
              Export Results
            </Button>
            <Button variant="outline" className="gap-2">
              <FileText size={16} />
              View Detailed Report
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
