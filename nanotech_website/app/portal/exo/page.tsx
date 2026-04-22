"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { listClients, type PiClient } from "@/lib/exo/api"
import { ClientCard } from "@/components/exo/client-card"

type Config = { joints: string[]; limits: Record<string,{min:number,max:number}>; speeds: Record<string, number> }
type State = { angles: Record<string, number>; velocities: Record<string, number>; enabled: boolean; e_stop: boolean }

// Keep this false for demo mode: full UI, no background API polling.
const EXO_API_ENABLED = false

const MOCK_CONFIG: Config = {
  joints: ["shoulder_pitch", "shoulder_roll", "elbow_flexion", "wrist_pitch", "wrist_yaw"],
  limits: {
    shoulder_pitch: { min: -30, max: 120 },
    shoulder_roll: { min: -45, max: 45 },
    elbow_flexion: { min: 0, max: 140 },
    wrist_pitch: { min: -60, max: 60 },
    wrist_yaw: { min: -45, max: 45 },
  },
  speeds: {
    shoulder_pitch: 40,
    shoulder_roll: 30,
    elbow_flexion: 50,
    wrist_pitch: 60,
    wrist_yaw: 60,
  },
}

const HOME_DEG: Record<string, number> = {
  shoulder_pitch: 0,
  shoulder_roll: 0,
  elbow_flexion: 0,
  wrist_pitch: 0,
  wrist_yaw: 0,
}

function mkZeroMap(joints: string[]) {
  return Object.fromEntries(joints.map((j) => [j, 0])) as Record<string, number>
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

type Point = { x: number; y: number }

const STICK_LENGTHS = {
  torso: 80,
  neck: 18,
  upper_arm: 60,
  forearm: 50,
  thigh: 70,
  calf: 60,
  head: 24,
}

function endpoint(x: number, y: number, angleDeg: number, length: number): Point {
  const rad = (Math.PI / 180) * angleDeg
  const dx = Math.sin(rad) * length
  const dy = Math.cos(rad) * length
  return { x: x + dx, y: y + dy }
}

async function api(path: string, opts?: RequestInit): Promise<any> {
  if (!EXO_API_ENABLED) return {}
  const res = await fetch(path, { ...(opts||{}), headers: { "Content-Type": "application/json" } })
  if (!res.ok) throw new Error(await res.text())
  try { return await res.json() } catch { return {} }
}

export default function ExoPage() {
  const [config, setConfig] = useState<Config>(MOCK_CONFIG)
  const [state, setState] = useState<State>({
    angles: mkZeroMap(MOCK_CONFIG.joints),
    velocities: mkZeroMap(MOCK_CONFIG.joints),
    enabled: true,
    e_stop: false,
  })
  const [connectedPis, setConnectedPis] = useState<PiClient[]>([])
  const [serverOnline, setServerOnline] = useState(false)

  // Poll connected Pi agents
  useEffect(() => {
    const poll = async () => {
      try {
        const clients = await listClients()
        setConnectedPis(clients)
        setServerOnline(true)
      } catch {
        setServerOnline(false)
      }
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!EXO_API_ENABLED) return
    api("/api/exo/config").then((cfg) => {
      if (!cfg?.joints) return
      setConfig(cfg as Config)
      setState({
        angles: mkZeroMap((cfg as Config).joints),
        velocities: mkZeroMap((cfg as Config).joints),
        enabled: true,
        e_stop: false,
      })
    })
  }, [])

  const commandLocal = (joint: string, direction: -1 | 0 | 1, speed: number) => {
    setState((prev) => {
      if (!prev.enabled || prev.e_stop) return prev
      const max = config.speeds[joint] ?? 0
      const lim = config.limits[joint]
      const step = direction * clamp(speed, 0, 1) * max * 0.2
      return {
        ...prev,
        angles: {
          ...prev.angles,
          [joint]: clamp((prev.angles[joint] ?? 0) + step, lim.min, lim.max),
        },
        velocities: {
          ...prev.velocities,
          [joint]: direction * clamp(speed, 0, 1) * max,
        },
      }
    })
  }

  const stopLocal = (joint?: string | "all") => {
    setState((prev) => {
      if (!joint || joint === "all") return { ...prev, velocities: mkZeroMap(config.joints) }
      return { ...prev, velocities: { ...prev.velocities, [joint]: 0 } }
    })
  }

  const macroMap: Record<string, [string, 1 | -1]> = {
    arm_up: ["shoulder_pitch", +1],
    arm_down: ["shoulder_pitch", -1],
    left: ["shoulder_roll", +1],
    right: ["shoulder_roll", -1],
    elbow_flex: ["elbow_flexion", +1],
    elbow_extend: ["elbow_flexion", -1],
    wrist_up: ["wrist_pitch", +1],
    wrist_down: ["wrist_pitch", -1],
    hand_left: ["wrist_yaw", -1],
    hand_right: ["wrist_yaw", +1],
  }

  const runMacroLocal = (name: string, speed: number) => {
    const m = macroMap[name]
    if (!m) return
    commandLocal(m[0], m[1], speed)
  }

  const setEnabled = (enabled: boolean) => {
    setState((prev) => ({ ...prev, enabled, velocities: enabled ? prev.velocities : mkZeroMap(config.joints) }))
  }

  const toggleEstop = (clear: boolean) => {
    setState((prev) => ({ ...prev, e_stop: !clear, velocities: mkZeroMap(config.joints) }))
  }

  const homeAllLocal = () => {
    setState((prev) => ({ ...prev, angles: { ...HOME_DEG }, velocities: mkZeroMap(config.joints) }))
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 container mx-auto px-4 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Exoskeleton Control</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                stopLocal("all")
                void api("/api/exo/stop", { method: "POST", body: JSON.stringify({ joint: "all" }) })
              }}
            >
              Stop All
            </Button>
            <Button
              variant={state.e_stop ? "default" : "destructive"}
              onClick={() => {
                toggleEstop(!!state.e_stop)
                void api("/api/exo/estop", { method: "POST", body: JSON.stringify({ clear: !!state.e_stop }) })
              }}
            >
              {state.e_stop ? "Clear E‑STOP" : "E‑STOP"}
            </Button>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={state.enabled}
                onChange={(e) => {
                  setEnabled(e.target.checked)
                  void api("/api/exo/enable", { method: "POST", body: JSON.stringify({ enable: e.target.checked }) })
                }}
              />
              Enabled
            </label>
            <Button
              variant="outline"
              onClick={() => {
                homeAllLocal()
                void api("/api/exo/home", { method: "POST", body: JSON.stringify({}) })
              }}
            >
              Home
            </Button>
          </div>
        </div>

        {/* Connected Pi Agents */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Connected Pi Agents</h2>
            <span className={`text-xs px-2 py-1 rounded-full ${
              serverOnline ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}>
              Server: {serverOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          {connectedPis.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {connectedPis.map((pi) => (
                <ClientCard key={pi.client_id} client={pi} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {serverOnline
                ? 'No Pi agents connected. Start a Pi agent with: EXO_SIM_MODE=1 python pi_agent/agent.py'
                : 'Server offline. Start with: python server/app.py'}
            </p>
          )}
        </Card>

        <Tabs defaultValue="controls" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-xl">
            <TabsTrigger value="controls">Controls</TabsTrigger>
            <TabsTrigger value="stick">Stick Figure Kinematics</TabsTrigger>
          </TabsList>

          <TabsContent value="controls" className="space-y-6 mt-6">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground mb-2">Quick Moves</div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <MacroColumn title="Arm">
                  <MacroButton name="arm_up" label="arm up" runMacroLocal={runMacroLocal} stopLocal={stopLocal} />
                  <MacroButton name="arm_down" label="arm down" runMacroLocal={runMacroLocal} stopLocal={stopLocal} />
                </MacroColumn>
                <MacroColumn title="Shoulder">
                  <MacroButton name="left" label="left" runMacroLocal={runMacroLocal} stopLocal={stopLocal} />
                  <MacroButton name="right" label="right" runMacroLocal={runMacroLocal} stopLocal={stopLocal} />
                </MacroColumn>
                <MacroColumn title="Elbow">
                  <MacroButton name="elbow_flex" label="elbow flex" runMacroLocal={runMacroLocal} stopLocal={stopLocal} />
                  <MacroButton name="elbow_extend" label="elbow extend" runMacroLocal={runMacroLocal} stopLocal={stopLocal} />
                </MacroColumn>
                <MacroColumn title="Wrist">
                  <MacroButton name="wrist_up" label="wrist up" runMacroLocal={runMacroLocal} stopLocal={stopLocal} />
                  <MacroButton name="wrist_down" label="wrist down" runMacroLocal={runMacroLocal} stopLocal={stopLocal} />
                </MacroColumn>
                <MacroColumn title="Hand">
                  <MacroButton name="hand_left" label="hand left" runMacroLocal={runMacroLocal} stopLocal={stopLocal} />
                  <MacroButton name="hand_right" label="hand right" runMacroLocal={runMacroLocal} stopLocal={stopLocal} />
                </MacroColumn>
              </div>
            </Card>

            <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.joints.map(j => (
                <JointCard key={j} joint={j} config={config} state={state} commandLocal={commandLocal} stopLocal={stopLocal} />
              ))}
            </section>
          </TabsContent>

          <TabsContent value="stick" className="mt-6">
            <StickFigurePanel />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

function StickFigurePanel() {
  const [leftShoulder, setLeftShoulder] = useState(-20)
  const [leftElbow, setLeftElbow] = useState(10)
  const [rightShoulder, setRightShoulder] = useState(20)
  const [rightElbow, setRightElbow] = useState(-10)
  const [leftHip, setLeftHip] = useState(-5)
  const [leftKnee, setLeftKnee] = useState(10)
  const [rightHip, setRightHip] = useState(5)
  const [rightKnee, setRightKnee] = useState(-10)
  const [x, setX] = useState(200)
  const [y, setY] = useState(250)

  const torsoTop = { x, y: y - STICK_LENGTHS.torso }
  const neckTop = endpoint(torsoTop.x, torsoTop.y, 180, STICK_LENGTHS.neck)
  const leftShoulderPt = { x: torsoTop.x - 18, y: torsoTop.y }
  const rightShoulderPt = { x: torsoTop.x + 18, y: torsoTop.y }
  const leftElbowPt = endpoint(leftShoulderPt.x, leftShoulderPt.y, leftShoulder, STICK_LENGTHS.upper_arm)
  const leftHand = endpoint(leftElbowPt.x, leftElbowPt.y, leftShoulder + leftElbow, STICK_LENGTHS.forearm)
  const rightElbowPt = endpoint(rightShoulderPt.x, rightShoulderPt.y, rightShoulder, STICK_LENGTHS.upper_arm)
  const rightHand = endpoint(rightElbowPt.x, rightElbowPt.y, rightShoulder + rightElbow, STICK_LENGTHS.forearm)
  const leftHipPt = { x: x - 12, y }
  const rightHipPt = { x: x + 12, y }
  const leftKneePt = endpoint(leftHipPt.x, leftHipPt.y, leftHip, STICK_LENGTHS.thigh)
  const leftFoot = endpoint(leftKneePt.x, leftKneePt.y, leftHip + leftKnee, STICK_LENGTHS.calf)
  const rightKneePt = endpoint(rightHipPt.x, rightHipPt.y, rightHip, STICK_LENGTHS.thigh)
  const rightFoot = endpoint(rightKneePt.x, rightKneePt.y, rightHip + rightKnee, STICK_LENGTHS.calf)

  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold mb-4">Stick Figure Kinematics</h2>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <SliderRow label="Left shoulder" min={-170} max={30} value={leftShoulder} onChange={setLeftShoulder} />
          <SliderRow label="Left elbow" min={-140} max={140} value={leftElbow} onChange={setLeftElbow} />
          <SliderRow label="Right shoulder" min={-30} max={170} value={rightShoulder} onChange={setRightShoulder} />
          <SliderRow label="Right elbow" min={-140} max={140} value={rightElbow} onChange={setRightElbow} />
          <SliderRow label="Left hip" min={-90} max={90} value={leftHip} onChange={setLeftHip} />
          <SliderRow label="Left knee" min={-140} max={140} value={leftKnee} onChange={setLeftKnee} />
          <SliderRow label="Right hip" min={-90} max={90} value={rightHip} onChange={setRightHip} />
          <SliderRow label="Right knee" min={-140} max={140} value={rightKnee} onChange={setRightKnee} />
          <SliderRow label="Torso X" min={0} max={400} value={x} onChange={setX} />
          <SliderRow label="Torso Y" min={0} max={400} value={y} onChange={setY} />
        </div>

        <div className="rounded-md border border-border p-3 bg-background/60">
          <svg viewBox="0 0 400 400" className="w-full h-auto">
            <line x1={x} y1={y} x2={torsoTop.x} y2={torsoTop.y} stroke="currentColor" strokeWidth={2} />
            <line x1={torsoTop.x} y1={torsoTop.y} x2={neckTop.x} y2={neckTop.y} stroke="currentColor" strokeWidth={2} />
            <circle cx={neckTop.x} cy={neckTop.y} r={STICK_LENGTHS.head / 2} stroke="currentColor" strokeWidth={2} fill="none" />

            <line x1={leftShoulderPt.x} y1={leftShoulderPt.y} x2={leftElbowPt.x} y2={leftElbowPt.y} stroke="currentColor" strokeWidth={2} />
            <line x1={leftElbowPt.x} y1={leftElbowPt.y} x2={leftHand.x} y2={leftHand.y} stroke="currentColor" strokeWidth={2} />
            <line x1={rightShoulderPt.x} y1={rightShoulderPt.y} x2={rightElbowPt.x} y2={rightElbowPt.y} stroke="currentColor" strokeWidth={2} />
            <line x1={rightElbowPt.x} y1={rightElbowPt.y} x2={rightHand.x} y2={rightHand.y} stroke="currentColor" strokeWidth={2} />

            <line x1={leftHipPt.x} y1={leftHipPt.y} x2={leftKneePt.x} y2={leftKneePt.y} stroke="currentColor" strokeWidth={2} />
            <line x1={leftKneePt.x} y1={leftKneePt.y} x2={leftFoot.x} y2={leftFoot.y} stroke="currentColor" strokeWidth={2} />
            <line x1={rightHipPt.x} y1={rightHipPt.y} x2={rightKneePt.x} y2={rightKneePt.y} stroke="currentColor" strokeWidth={2} />
            <line x1={rightKneePt.x} y1={rightKneePt.y} x2={rightFoot.x} y2={rightFoot.y} stroke="currentColor" strokeWidth={2} />
          </svg>
        </div>
      </div>
    </Card>
  )
}

function SliderRow({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string
  min: number
  max: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block">
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-mono text-muted-foreground">{value}</span>
      </div>
      <input
        className="w-full"
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  )
}

function JointCard({
  joint,
  config,
  state,
  commandLocal,
  stopLocal,
}: {
  joint: string
  config: Config
  state: State
  commandLocal: (joint: string, direction: -1 | 0 | 1, speed: number) => void
  stopLocal: (joint?: string | "all") => void
}) {
  const limits = config.limits[joint]
  const maxSpeed = config.speeds[joint]
  const angle = state.angles[joint] ?? 0
  const pct = Math.max(0, Math.min(1, (angle - limits.min) / (limits.max - limits.min)))
  const holdRef = useRef<number | null>(null)
  const setDir = (dir: -1|0|1) => {
    commandLocal(joint, dir, 0.5)
    void api("/api/exo/command", { method: "POST", body: JSON.stringify({ joint, direction: dir, speed: 0.5 }) })
  }
  const stop = () => {
    stopLocal(joint)
    void api("/api/exo/stop", { method: "POST", body: JSON.stringify({ joint }) })
  }

  const startHold = (dir: -1|1) => {
    setDir(dir)
    if (holdRef.current) return
    holdRef.current = window.setInterval(()=>setDir(dir), 300)
  }
  const endHold = () => {
    if (holdRef.current) { window.clearInterval(holdRef.current); holdRef.current = null }
    stop()
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-2 capitalize">{joint.replace('_',' ')}</h3>
      <div className="flex items-center gap-3 mb-2">
        <div className="text-xs text-muted-foreground">{limits.min}°</div>
        <div className="flex-1 h-2 rounded-full border border-border overflow-hidden">
          <div className="h-full bg-primary" style={{ width: `${pct*100}%` }} />
        </div>
        <div className="text-xs text-muted-foreground">{limits.max}°</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="font-mono text-sm">{angle.toFixed(1)}° (max {maxSpeed}°/s)</div>
        <div className="flex items-center gap-2">
          <Button size="sm" onMouseDown={()=>startHold(-1)} onMouseUp={endHold} onMouseLeave={endHold}>−</Button>
          <Button size="sm" variant="outline" onClick={stop}>Stop</Button>
          <Button size="sm" onMouseDown={()=>startHold(+1)} onMouseUp={endHold} onMouseLeave={endHold}>+</Button>
        </div>
      </div>
    </Card>
  )
}

function MacroColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{title}</div>
      <div className="flex flex-col gap-2">
        {children}
      </div>
    </div>
  )
}

function MacroButton({
  name,
  label,
  runMacroLocal,
  stopLocal,
}: {
  name: string
  label: string
  runMacroLocal: (name: string, speed: number) => void
  stopLocal: (joint?: string | "all") => void
}) {
  return (
    <Button
      variant="outline"
      onMouseDown={() => {
        runMacroLocal(name, 0.5)
        void api("/api/exo/macro", { method: "POST", body: JSON.stringify({ name, speed: 0.5 }) })
      }}
      onMouseUp={() => {
        stopLocal("all")
        void api("/api/exo/stop", { method: "POST", body: JSON.stringify({}) })
      }}
    >
      {label}
    </Button>
  )
}
