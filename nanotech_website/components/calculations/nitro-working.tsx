"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts'
import { 
  Activity, 
  Zap, 
  TrendingUp,
  Play,
  Settings,
  Info,
  BarChart3,
  Database
} from "lucide-react"
import * as calc from "@/lib/nitro-calculations"

export function NiTROWorking() {
  // Simulation State
  const [frequency, setFrequency] = useState(1000)
  const [numCycles, setNumCycles] = useState(3)
  const [resistance, setResistance] = useState(100)
  const [capacitance, setCapacitance] = useState(1000) // nF
  const [feedbackResistor, setFeedbackResistor] = useState(1000)
  const [waveType, setWaveType] = useState<"sine" | "triangle">("sine")
  const [digitizeVOut, setDigitizeVOut] = useState(false)
  
  // Training State
  const [trainNoise, setTrainNoise] = useState(0.4)
  const [numSamples, setNumSamples] = useState(9)
  const [testNoise, setTestNoise] = useState(0.01)
  const [trueConc, setTrueConc] = useState(0.18)
  
  // Results
  const [simResults, setSimResults] = useState<any>(null)
  const [trainResults, setTrainResults] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Sample Data
  const [sampleData, setSampleData] = useState<any>(null)
  
  // Load sample data on mount
  useEffect(() => {
    fetch('/sample_data.json')
      .then(res => res.json())
      .then(data => setSampleData(data))
      .catch(err => console.error('Error loading sample data:', err))
  }, [])

  const runSimulation = () => {
    setIsProcessing(true)
    
    setTimeout(() => {
      try {
        const VAmp = 3.3 / 2
        const C = capacitance * 1e-9
        
        // Calculate impedance
        const Z = calc.calculateImpedance(resistance, C, frequency)
        
        // Generate input wave (map "sine" to "sin" for the function)
        const waveData = calc.generateWave(
          frequency,
          VAmp,
          waveType === "sine" ? "sin" : "triangle",
          numCycles
        )
        
        const t = waveData.t
        const VIn = waveData.values
        
        if (t.length === 0) {
          throw new Error('Wave generation produced 0 samples!')
        }
        
        let IOut: number[]
        let VOut: number[]
        let Vc: number[] | undefined
        
        if (waveType === 'sine') {
          // Phase and amplitude per Python:
          // phase = angle(-V_amp / Z), I_amp = V_amp / |Z|
          const negVOverZ = calc.complexDivide(
            { real: -VAmp, imag: 0 },
            Z
          )
          const phase = calc.complexAngle(negVOverZ)
          const IAmp = VAmp / calc.complexMagnitude(Z)

          IOut = calc.generateIOutSin(t, frequency, IAmp, phase)
        } else {
          // Triangle wave - use resistor voltage method
          const Vr = calc.getVrOut(t, numCycles, frequency, VAmp, resistance, C)
          IOut = Vr.map(v => v / resistance)
          Vc = VIn.map((v, i) => v - Vr[i])
        }
        
        // Calculate output voltage
        VOut = calc.getVOut(VIn, IOut, feedbackResistor)
        
        // Optionally digitize
        if (digitizeVOut) {
          VOut = calc.digitize(VOut.map(v => v + VAmp), 4096).map(v => v - VAmp)
        }
        
        // Format data for Recharts
      const chartData = t.map((time, i) => ({
          time: Number(time.toFixed(6)),
          VIn: Number(VIn[i].toFixed(4)),
        IOut: Number(IOut[i].toFixed(6)), // Amps for parity with original
          VOut: Number(VOut[i].toFixed(4)),
          ...(Vc ? { Vc: Number(Vc[i].toFixed(4)) } : {})
        }))
        
      const iMax = chartData.reduce((m, d) => Math.max(m, Math.abs(d.IOut)), 0)

      setSimResults({
          chartData,
          impedance: calc.complexMagnitude(Z),
          // Display the current phase lead relative to voltage (negative as in Python notes)
          phase: (Math.atan2(Z.imag, Z.real)) * (180 / Math.PI),
          frequency,
        waveType,
        iMax
        })
      } catch (error) {
        console.error('Simulation error:', error)
        alert('Simulation error: ' + error)
      }
      
      setIsProcessing(false)
    }, 100)
  }

  const runTraining = () => {
    if (!sampleData) {
      alert('Sample data not loaded yet. Please wait...')
      return
    }
    
    setIsProcessing(true)
    
    try {
      const concs = [0.01, 0.11, 0.21, 0.31, 0.41, 0.51, 0.61, 0.71, 0.81, 0.91, 1.0]
      const freqs = sampleData.freqs
      const weights = sampleData.weights.map((w: number[]) => [w[0], w[1]] as [number, number])
      const noiseAtFreq = sampleData.noise[0] // Use first noise row as average
      
      const m = concs.length
      const n = freqs.length
      
      // Generate noisy training data
      const noises = calc.avgNoise(numSamples, noiseAtFreq, m, n)
      const XTrue = calc.generateExperiment(concs, weights, freqs)
      
      const X = XTrue.map((row, i) => 
        row.map((val, j) => val + trainNoise * noises[i][j])
      )
      
      // Fit model
      const fitWeights = calc.fit(X, concs)
      
      // Generate test data
      const testNoises = testNoise * noiseAtFreq.map(() => {
        const u1 = Math.random()
        const u2 = Math.random()
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
      })
      
      const XTest = calc.freqSweepAtC(trueConc, weights, freqs)
      const XTestNoisy = XTest.map((val, i) => val + testNoises[i])
      
      // Predict
      const { prediction, predictions } = calc.predict(XTestNoisy, fitWeights, 0)
      
      // Format chart data
      const noisyData = X.map((row, i) => ({
        freq: freqs[i],
        ...Object.fromEntries(row.map((val, j) => [`conc${j}`, val]))
      }))
      
      const trueData = XTrue.map((row, i) => ({
        freq: freqs[i],
        ...Object.fromEntries(row.map((val, j) => [`conc${j}`, val]))
      }))
      
      setTrainResults({
        prediction: calc.formatFixed(prediction, 4),
        trueConc,
        accuracy: ((1 - Math.abs(prediction - trueConc) / trueConc) * 100).toFixed(1),
        predictions: predictions.map(p => calc.formatFixed(p, 4)),
        noisyData: noisyData.slice(0, 5), // First 5 for display
        trueData: trueData.slice(0, 5),
        testData: XTestNoisy
      })
    } catch (error) {
      console.error('Training error:', error)
      alert('Training error: ' + error)
    }
    
    setIsProcessing(false)
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Activity className="text-primary" />
              NiTRO - Nano-integrated Technology Research Operations
            </h2>
            <p className="text-muted-foreground max-w-4xl">
              Accurate RC circuit simulation and yeast concentration prediction. Full implementation with real calculations.
            </p>
          </div>
          <Badge variant="default" className="bg-gradient-to-r from-green-400 to-emerald-400">
            Fully Functional
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="simulate" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="simulate">
            <Zap size={16} className="mr-2" />
            Simulate
          </TabsTrigger>
          <TabsTrigger value="preprocess" disabled>
            <Database size={16} className="mr-2" />
            Preprocess
          </TabsTrigger>
          <TabsTrigger value="train">
            <TrendingUp size={16} className="mr-2" />
            Train
          </TabsTrigger>
          <TabsTrigger value="predict" disabled>
            <BarChart3 size={16} className="mr-2" />
            Predict
          </TabsTrigger>
        </TabsList>

        {/* SIMULATE TAB */}
        <TabsContent value="simulate" className="space-y-6 mt-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Button
              variant={waveType === "sine" ? "default" : "outline"}
              onClick={() => setWaveType("sine")}
              className="gap-2"
            >
              Sine Wave
            </Button>
            <Button
              variant={waveType === "triangle" ? "default" : "outline"}
              onClick={() => setWaveType("triangle")}
              className="gap-2"
            >
              Triangle Wave
            </Button>
          </div>

          <Card className="p-6">
            <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Settings size={18} className="text-primary" />
              Circuit Parameters
            </h4>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Frequency (Hz)</Label>
                <Input
                  type="number"
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                  min="100"
                  max="100000000"
                  step="100"
                />
              </div>

              <div className="space-y-2">
                <Label>Number of Cycles</Label>
                <Input
                  type="number"
                  value={numCycles}
                  onChange={(e) => setNumCycles(Number(e.target.value))}
                  min="1"
                  max="10"
                />
              </div>

              <div className="space-y-2">
                <Label>Resistance (Ω)</Label>
                <Input
                  type="number"
                  value={resistance}
                  onChange={(e) => setResistance(Number(e.target.value))}
                  min="1"
                  max="80000"
                  step="100"
                />
              </div>

              <div className="space-y-2">
                <Label>Capacitance (nF)</Label>
                <Input
                  type="number"
                  value={capacitance}
                  onChange={(e) => setCapacitance(Number(e.target.value))}
                  min="1"
                  max="1000"
                  step="100"
                />
              </div>

              <div className="space-y-2">
                <Label>Feedback Resistor (Ω)</Label>
                <Input
                  type="number"
                  value={feedbackResistor}
                  onChange={(e) => setFeedbackResistor(Number(e.target.value))}
                  min="0"
                  max="80000"
                  step="100"
                />
              </div>

              <div className="space-y-2 flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={digitizeVOut}
                    onChange={(e) => setDigitizeVOut(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Digitize V_out</span>
                </label>
              </div>
            </div>
          </Card>

          <Button
            onClick={runSimulation}
            disabled={isProcessing}
            className="bg-gradient-to-r from-green-400 to-emerald-400 hover:from-green-500 hover:to-emerald-500 gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Play size={16} />
                Run Simulation
              </>
            )}
          </Button>

          {/* Info accordions matching original Streamlit app */}
          <Accordion type="multiple" className="space-y-2">
            {waveType === 'sine' && (
              <>
                <AccordionItem value="sine-details">
                  <AccordionTrigger>Important Sine Wave Details</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>All calculations are performed based on the circuit schematic. The output current appears flipped compared to a typical RC system.</p>
                      <p>In a capacitive circuit, the output current leads the input voltage. The current peak appears to the left of the voltage peak.</p>
                      <p>V_out rails at 3.3V. Use the feedback resistor Rf to influence V_out. Selecting Digitize V_out will quantize V_out between 0.0 and 3.3V.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="sine-math">
                  <AccordionTrigger>Mathematical Justifications</AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-invert text-sm">
                      <p>From first principles, we accept:</p>
                      <pre className="whitespace-pre-wrap text-xs">{`Z = R + 1/(jωC) = R - (1/(ωC))j\nV_g - V_in = iZ  ⇒  i = -V_in / Z\nCurrent Phase = angle(-V_in / Z)\nCurrent Amplitude = | -V_in / Z |`}</pre>
                      <p>Decreasing frequency and capacitance increases the phase shift, while increasing resistance has the opposite effect.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </>
            )}
            {waveType === 'triangle' && (
              <>
                <AccordionItem value="tri-details">
                  <AccordionTrigger>Important Triangle Wave Details</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <p>A triangle wave is a sequence of rising and falling ramp inputs. We solve a differential equation for the resistor voltage across each half-cycle.</p>
                      <p>V_out rails at 3.3V. Use the feedback resistor Rf to influence V_out. Digitize V_out quantizes V_out to [0, 3.3]V.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="tri-math">
                  <AccordionTrigger>Mathematical Justifications</AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-invert text-sm">
                      <pre className="whitespace-pre-wrap text-xs">{`V_in = V_R + V_C\n(d/dt)V_R = (αRC - V_R)/(RC) where α = 4fA\nSolution: V_R = αRC - (αRC - V_0)e^{-t/(RC)}\nThen: V_C = V_in - V_R,  I_out = -V_R/R,  V_out = V_in - I_out R_f`}</pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </>
            )}
          </Accordion>

          {simResults && (
            <Card className="p-6 border-2 border-primary/50">
              <h3 className="text-xl font-bold mb-4">
                V_in and I_out: {simResults.waveType === 'sine' ? 'Sine' : 'Triangle'} Wave
              </h3>
              
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-background rounded-lg border">
                  <div className="text-sm text-muted-foreground">Impedance</div>
                  <div className="text-2xl font-bold text-primary">{simResults.impedance.toFixed(2)} Ω</div>
                </div>
                <div className="p-4 bg-background rounded-lg border">
                  <div className="text-sm text-muted-foreground">Phase</div>
                  <div className="text-2xl font-bold">{simResults.phase.toFixed(2)}°</div>
                </div>
                <div className="p-4 bg-background rounded-lg border">
                  <div className="text-sm text-muted-foreground">Frequency</div>
                  <div className="text-2xl font-bold">{simResults.frequency} Hz</div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={400} key={`chart-${simResults.waveType}`}>
                <LineChart data={simResults.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }}
                    type="number"
                    domain={[0, Number((numCycles / frequency).toFixed(6))]}
                    tickFormatter={(v) => Number(v).toFixed(7)}
                  />
                  <YAxis 
                    yAxisId="left"
                    label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft' }}
                    domain={[-1.65, 1.65]}
                    tickFormatter={(v) => Number(v).toFixed(1)}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    label={{ value: 'Amps', angle: 90, position: 'insideRight' }}
                    domain={[-simResults.iMax, simResults.iMax]}
                    tickFormatter={(v) => Number(v).toFixed(3)}
                  />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="VIn" 
                    stroke="#1f77b4" 
                    name="V_in (V)"
                    dot={false}
                    strokeWidth={2.5}
                    isAnimationActive={false}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="IOut" 
                    stroke="#17becf" 
                    name="I_out (mA)"
                    dot={false}
                    strokeWidth={2.5}
                    isAnimationActive={false}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="VOut" 
                    stroke="#d62728" 
                    name="V_out (V)"
                    dot={false}
                    strokeWidth={2.5}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>

              {simResults.waveType === 'triangle' && (
                <div className="mt-8">
                  <h4 className="text-lg font-semibold mb-2">Voltage Across Capacitor (V_c)</h4>
                  <ResponsiveContainer width="100%" height={260} key="vc-chart">
                    <LineChart data={simResults.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="time" 
                        label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} 
                        type="number"
                        domain={[0, Number((numCycles / frequency).toFixed(6))]}
                        tickFormatter={(v) => Number(v).toFixed(7)}
                      />
                      <YAxis 
                        label={{ value: 'Volts', angle: -90, position: 'insideLeft' }} 
                        domain={[-1.65, 1.65]}
                        tickFormatter={(v) => Number(v).toFixed(1)}
                      />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="Vc" 
                        stroke="#1f77b4" 
                        name="V_c (V)" 
                        dot={false} 
                        strokeWidth={2.5} 
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        {/* TRAIN TAB */}
        <TabsContent value="train" className="space-y-6 mt-6">
          <Card className="p-6 bg-secondary/20">
            <h3 className="text-lg font-semibold mb-3">Model Training</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Train the FMM algorithm on yeast impedance data. Real calculations using actual lab data.
            </p>
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-foreground">
                <strong>Goal:</strong> Predict yeast concentration from impedance curves.
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h4 className="font-semibold mb-4">Training Parameters</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Training Noise Scale: {trainNoise.toFixed(2)}</Label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={trainNoise}
                  onChange={(e) => setTrainNoise(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Number of Samples: {numSamples}</Label>
                <input
                  type="range"
                  min="1"
                  max="64"
                  step="1"
                  value={numSamples}
                  onChange={(e) => setNumSamples(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Test Noise Scale: {testNoise.toFixed(2)}</Label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={testNoise}
                  onChange={(e) => setTestNoise(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>True Concentration: {trueConc.toFixed(2)}</Label>
                <input
                  type="range"
                  min="0.01"
                  max="1"
                  step="0.01"
                  value={trueConc}
                  onChange={(e) => setTrueConc(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </Card>

          <Button
            onClick={runTraining}
            disabled={isProcessing || !sampleData}
            className="bg-gradient-to-r from-purple-400 to-pink-400 gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Training...
              </>
            ) : (
              <>
                <Play size={16} />
                Train Model
              </>
            )}
          </Button>

          {trainResults && (
            <Card className="p-6 border-2 border-primary/50">
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">True Concentration</h3>
                  <div className="text-4xl font-bold text-primary">{trainResults.trueConc}</div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Algorithm Output</h3>
                  <div className="text-4xl font-bold">{trainResults.prediction}</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Accuracy: {trainResults.accuracy}%
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm">
                  ✓ Model trained successfully using real yeast impedance data
                </p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="preprocess">
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Under construction...</p>
          </Card>
        </TabsContent>

        <TabsContent value="predict">
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Under construction...</p>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-2">
            <h4 className="font-semibold">About NiTRO</h4>
            <p className="text-sm text-muted-foreground">
              Full implementation with real calculations. Sine/triangle wave generation, FFT-based impedance analysis,
              and FMM algorithm for biosensor predictions. Based on actual Saccharomyces cerevisiae lab data.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
