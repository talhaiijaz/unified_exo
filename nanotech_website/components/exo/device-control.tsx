"use client"

import { useState } from "react"
import { sendDeviceCommand } from "@/lib/exo/api"

interface DeviceControlProps {
  clientId: string
  deviceType: string
  deviceId: string
}

const DEVICE_COMMANDS: Record<string, { label: string; command: string; params?: string; color?: string }[]> = {
  motor: [
    { label: "Step +100", command: "step", params: "100" },
    { label: "Step -100", command: "step", params: "-100" },
    { label: "Home", command: "home" },
    { label: "Stop", command: "stop", color: "red" },
  ],
  oled: [
    { label: "Display Text", command: "display", params: "0 Hello" },
    { label: "Clear", command: "clear" },
    { label: "Dot Sweep", command: "dot", params: "sweep" },
    { label: "Blank", command: "blank" },
  ],
  temperature: [
    { label: "Read", command: "read" },
    { label: "Control On", command: "control", params: "on" },
    { label: "Control Off", command: "control", params: "off" },
  ],
  gyroscope: [
    { label: "Read", command: "read" },
    { label: "Calibrate", command: "calibrate" },
  ],
  ultrasonic: [
    { label: "Pulse 40kHz", command: "pulse", params: "40000 500" },
    { label: "Pulse 1MHz", command: "pulse", params: "1000000 200" },
    { label: "Stop", command: "stop", color: "red" },
  ],
  vibration: [
    { label: "Low", command: "set", params: "80" },
    { label: "Medium", command: "set", params: "160" },
    { label: "High", command: "set", params: "240" },
    { label: "Stop", command: "stop", color: "red" },
  ],
  tens: [
    { label: "Low 10s", command: "set", params: "30 40 10" },
    { label: "Med 10s", command: "set", params: "60 40 10" },
    { label: "Stop", command: "stop", color: "red" },
  ],
  camera: [
    { label: "Snapshot", command: "snapshot" },
    { label: "Record Start", command: "record_start" },
    { label: "Record Stop", command: "record_stop", color: "red" },
  ],
}

const DEVICE_ICONS: Record<string, string> = {
  motor: "M",
  oled: "O",
  temperature: "T",
  gyroscope: "G",
  ultrasonic: "U",
  vibration: "V",
  tens: "E",
  camera: "C",
}

export function DeviceControl({ clientId, deviceType, deviceId }: DeviceControlProps) {
  const [lastResult, setLastResult] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [customParam, setCustomParam] = useState("")

  const commands = DEVICE_COMMANDS[deviceType] || []

  async function handleCommand(command: string, params?: string) {
    setLoading(true)
    try {
      const p = params ? Object.fromEntries(params.split(" ").map((v, i) => [`p${i}`, v])) : {}
      const result = await sendDeviceCommand(clientId, deviceType, command, p)
      setLastResult(`${result.status}: ${result.command}`)
    } catch (err: any) {
      setLastResult(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
          {DEVICE_ICONS[deviceType] || "?"}
        </span>
        <div>
          <h4 className="font-semibold capitalize">{deviceType}</h4>
          <p className="text-xs text-muted-foreground">{deviceId}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {commands.map((cmd) => (
          <button
            key={cmd.command + (cmd.params || "")}
            onClick={() => handleCommand(cmd.command, cmd.params)}
            disabled={loading}
            className={`text-xs px-3 py-2 rounded font-medium transition-colors ${
              cmd.color === "red"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-muted hover:bg-muted/80"
            } disabled:opacity-50`}
          >
            {cmd.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={customParam}
          onChange={(e) => setCustomParam(e.target.value)}
          placeholder="Custom command..."
          className="flex-1 text-xs px-2 py-1 border rounded bg-background"
        />
        <button
          onClick={() => {
            const parts = customParam.split(" ", 1)
            handleCommand(parts[0], customParam.substring(parts[0].length + 1))
          }}
          disabled={loading || !customParam}
          className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50"
        >
          Send
        </button>
      </div>

      {lastResult && (
        <p className="text-xs text-muted-foreground mt-1 truncate">{lastResult}</p>
      )}
    </div>
  )
}
