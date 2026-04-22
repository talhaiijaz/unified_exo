"use client"

import { useMemo, useRef, useState } from "react"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

const NUM_PINS = 18
const BUFFER_SIZE = NUM_PINS * 2
const MAX_COUNT = 100000
const HEADERS = [
  "A0",
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "A6",
  "A7",
  "A8",
  "A9",
  "A10",
  "A11",
  "A12",
  "A13",
  "A14",
  "A15",
  "A16",
  "A17",
]

function decodeSerialData(data: ArrayBuffer): number[] {
  const dataView = new DataView(data)
  const readings: number[] = []
  for (let i = 0; i < NUM_PINS; i++) {
    readings.push(dataView.getUint16(i * 2, true))
  }
  return readings
}

function saveDataToCSV(rows: (string | number)[][]) {
  const csvContent = rows.map((row) => row.join(",")).join("\n")
  const blob = new Blob([csvContent], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "data.csv"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function PotentiostatPage() {
  const [readConnected, setReadConnected] = useState(false)
  const [controlConnected, setControlConnected] = useState(false)
  const [recording, setRecording] = useState(false)
  const [count, setCount] = useState(0)
  const [sampleRate, setSampleRate] = useState("5000")
  const [pwmValue, setPwmValue] = useState("300")
  const [status, setStatus] = useState("Idle")

  const readPortRef = useRef<any>(null)
  const controlPortRef = useRef<any>(null)
  const readerRef = useRef<any>(null)
  const writerRef = useRef<any>(null)
  const recordingRef = useRef(false)
  const rowsRef = useRef<(string | number)[][]>([HEADERS])

  const hasSerial = useMemo(() => typeof navigator !== "undefined" && "serial" in navigator, [])

  async function connectReadPort() {
    try {
      const serial = (navigator as any).serial
      const port = await serial.requestPort()
      await port.open({ baudRate: 115200, bufferSize: 2047 })
      readPortRef.current = port
      setReadConnected(true)
      setStatus("Read port connected")
    } catch (err) {
      console.error("Failed to connect read port:", err)
      setReadConnected(false)
      setStatus("Read port connection failed")
    }
  }

  async function connectControlPort() {
    try {
      const serial = (navigator as any).serial
      const port = await serial.requestPort()
      await port.open({ baudRate: 9600 })
      controlPortRef.current = port
      writerRef.current = port.writable.getWriter()
      setControlConnected(true)
      setStatus("Control port connected")
    } catch (err) {
      console.error("Failed to connect control port:", err)
      setControlConnected(false)
      setStatus("Control port connection failed")
    }
  }

  async function writeControl(message: string) {
    if (!writerRef.current) return
    const data = new TextEncoder().encode(message)
    await writerRef.current.write(data)
  }

  async function startRecording() {
    const readPort = readPortRef.current
    if (!readPort || !readPort.readable || recordingRef.current) return

    rowsRef.current = [HEADERS]
    setCount(0)
    setRecording(true)
    setStatus("Recording")
    recordingRef.current = true

    let accumulatedData = new Uint8Array()
    let localCount = 0

    try {
      readerRef.current = readPort.readable.getReader()
      while (recordingRef.current) {
        const { value, done } = await readerRef.current.read()
        if (done) break
        if (!value) continue

        const tempData = new Uint8Array(accumulatedData.length + value.length)
        tempData.set(accumulatedData)
        tempData.set(value, accumulatedData.length)
        accumulatedData = tempData

        while (accumulatedData.length >= BUFFER_SIZE) {
          const dataSlice = accumulatedData.slice(0, BUFFER_SIZE)
          accumulatedData = accumulatedData.slice(BUFFER_SIZE)

          const readings = decodeSerialData(dataSlice.buffer)
          rowsRef.current.push(readings)
          localCount += 1
          if (localCount % 100 === 0) setCount(localCount)
          if (localCount >= MAX_COUNT) {
            recordingRef.current = false
            break
          }
        }
      }
    } catch (err) {
      console.error("Error during reading:", err)
      setStatus("Read error")
    } finally {
      setCount(localCount)
      setRecording(false)
      recordingRef.current = false
      try {
        await readerRef.current?.releaseLock()
      } catch {}
      saveDataToCSV(rowsRef.current)
      rowsRef.current = [HEADERS]
      setStatus("Stopped and saved CSV")
    }
  }

  async function stopRecording() {
    recordingRef.current = false
    setRecording(false)
    setStatus("Stopping...")
    try {
      await readerRef.current?.cancel()
    } catch {}
  }

  async function setPWM() {
    if (!writerRef.current) return
    const pwm = pwmValue.trim()
    const sr = sampleRate.trim()
    try {
      // Preserve the original command used by the demo page.
      await writeControl(`pwm ${pwm} ${sr}\r`)
      // Also send commands understood by the current firmware command parser.
      await writeControl(`pwmfreq ${pwm}\r`)
      await writeControl("pwmapply\r")
      setStatus("PWM command sent")
    } catch (err) {
      console.error("Failed to send PWM command:", err)
      setStatus("PWM command failed")
    }
  }

  async function setReadRate() {
    if (!writerRef.current) return
    const sr = sampleRate.trim()
    try {
      await writeControl(`readrate ${sr}\r`)
      setStatus("Sample rate command sent")
    } catch (err) {
      console.error("Failed to send sample rate command:", err)
      setStatus("Sample rate command failed")
    }
  }

  async function led(on: boolean) {
    if (!writerRef.current) return
    try {
      await writeControl(`write 13 ${on ? 1 : 0}\r`)
      setStatus(`LED ${on ? "ON" : "OFF"} command sent`)
    } catch (err) {
      console.error("Failed to send LED command:", err)
      setStatus("LED command failed")
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl md:text-4xl font-bold">Potentiostat (Browser Direct)</h1>
            <Badge variant={recording ? "default" : "outline"}>{recording ? "Recording" : "Idle"}</Badge>
          </div>

          <Card className="p-6 space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={connectReadPort}>Connect To Read Port</Button>
              <Badge variant={readConnected ? "default" : "outline"}>
                {readConnected ? "Read Connected" : "Read Disconnected"}
              </Badge>
              <Button onClick={connectControlPort} variant="outline">
                Connect To Control Port
              </Button>
              <Badge variant={controlConnected ? "default" : "outline"}>
                {controlConnected ? "Control Connected" : "Control Disconnected"}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={startRecording} disabled={!readConnected || recording}>
                Start Recording
              </Button>
              <Button onClick={stopRecording} variant="outline" disabled={!recording}>
                Stop Recording
              </Button>
              <div className="text-sm text-muted-foreground self-center">Frames captured: {count}</div>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Control Commands</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Set PWM Value</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={2500}
                    step={1}
                    value={pwmValue}
                    onChange={(e) => setPwmValue(e.target.value)}
                  />
                  <Button onClick={setPWM} disabled={!controlConnected}>
                    Set PWM
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Set Sample Rate</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={12000}
                    step={1}
                    value={sampleRate}
                    onChange={(e) => setSampleRate(e.target.value)}
                  />
                  <Button onClick={setReadRate} disabled={!controlConnected}>
                    Set SampleRate
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => led(true)} disabled={!controlConnected}>
                LED ON
              </Button>
              <Button onClick={() => led(false)} variant="outline" disabled={!controlConnected}>
                LED OFF
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-2">
            <h2 className="text-lg font-semibold">Status</h2>
            <p className="text-sm text-muted-foreground">{status}</p>
            {!hasSerial && (
              <p className="text-sm text-red-500">
                This browser does not support Web Serial. Use Chrome or Edge over HTTPS.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              This page is browser-direct: no backend is required, but the Teensy must be physically connected to the
              computer running this browser tab.
            </p>
          </Card>
        </div>
      </div>
    </main>
  )
}
