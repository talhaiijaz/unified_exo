"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

export function SuperposeTool() {
  const [file, setFile] = useState<File | null>(null)
  const [intervalMs, setIntervalMs] = useState<number>(500)
  const [error, setError] = useState<string>("")
  const [isVideo, setIsVideo] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const intervalRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const clearAnimation = () => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearAnimation()
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setError("")
  }

  const handleSuperpose = () => {
    setError("")
    clearAnimation()

    if (!file) {
      setError("Please select an image or video file.")
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      setError("Unable to get 2D drawing context.")
      return
    }

    const clampedInterval = Math.max(100, intervalMs || 500)

    if (file.type.startsWith("video/")) {
      setIsVideo(true)
      const video = videoRef.current
      if (!video) return

      const url = URL.createObjectURL(file)
      video.src = url
      video.crossOrigin = "anonymous"
      video.style.display = "none"
      video.load()
      video.play().catch(() => {
        // Autoplay might be blocked; user interaction already happened via button
      })

      video.onloadedmetadata = () => {
        const width = Math.min(video.videoWidth || 400, 400)
        const height = Math.min(video.videoHeight || 400, 400)
        canvas.width = width
        canvas.height = height

        let showLeftOnRight = false

        const drawVideoFrame = () => {
          const w = width
          const h = height
          const sourceW = video.videoWidth
          const sourceH = video.videoHeight
          if (!sourceW || !sourceH) {
            rafRef.current = window.requestAnimationFrame(drawVideoFrame)
            return
          }

          const halfSourceW = Math.floor(sourceW / 2)
          const rightSourceW = sourceW - halfSourceW
          const halfCanvasW = Math.floor(w / 2)
          const rightCanvasW = w - halfCanvasW

          ctx.clearRect(0, 0, w, h)
          ctx.globalAlpha = 1.0

          // Background full frame
          ctx.drawImage(video, 0, 0, sourceW, sourceH, 0, 0, w, h)

          // Left half on left side
          ctx.drawImage(
            video,
            0,
            0,
            halfSourceW,
            sourceH,
            0,
            0,
            halfCanvasW,
            h
          )

          // Animated right side
          if (showLeftOnRight) {
            ctx.drawImage(
              video,
              0,
              0,
              halfSourceW,
              sourceH,
              halfCanvasW,
              0,
              rightCanvasW,
              h
            )
          } else {
            ctx.drawImage(
              video,
              halfSourceW,
              0,
              rightSourceW,
              sourceH,
              halfCanvasW,
              0,
              rightCanvasW,
              h
            )
          }

          rafRef.current = window.requestAnimationFrame(drawVideoFrame)
        }

        intervalRef.current = window.setInterval(() => {
          showLeftOnRight = !showLeftOnRight
        }, clampedInterval)

        drawVideoFrame()
      }
    } else {
      setIsVideo(false)

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const width = Math.min(img.width || 400, 400)
          const height = Math.min(img.height || 400, 400)
          canvas.width = width
          canvas.height = height

          let showLeftOnRight = false

          const drawFrame = () => {
            const w = width
            const h = height
            const sourceW = img.width
            const sourceH = img.height

            const halfSourceW = Math.floor(sourceW / 2)
            const rightSourceW = sourceW - halfSourceW
            const halfCanvasW = Math.floor(w / 2)
            const rightCanvasW = w - halfCanvasW

            ctx.clearRect(0, 0, w, h)
            ctx.globalAlpha = 1.0

            // Background full image
            ctx.drawImage(img, 0, 0, sourceW, sourceH, 0, 0, w, h)

            // Left half on left side
            ctx.drawImage(
              img,
              0,
              0,
              halfSourceW,
              sourceH,
              0,
              0,
              halfCanvasW,
              h
            )

            // Animated right side
            if (showLeftOnRight) {
              ctx.drawImage(
                img,
                0,
                0,
                halfSourceW,
                sourceH,
                halfCanvasW,
                0,
                rightCanvasW,
                h
              )
            } else {
              ctx.drawImage(
                img,
                halfSourceW,
                0,
                rightSourceW,
                sourceH,
                halfCanvasW,
                0,
                rightCanvasW,
                h
              )
            }
          }

          drawFrame()
          intervalRef.current = window.setInterval(() => {
            showLeftOnRight = !showLeftOnRight
            drawFrame()
          }, clampedInterval)
        }
        img.onerror = () => {
          setError("Unable to load image file.")
        }
        img.src = e.target?.result as string
      }
      reader.onerror = () => {
        setError("Failed to read file.")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
      const dataUrl = canvas.toDataURL("image/png")
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = "superposed.png"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (e) {
      setError("Download not supported in this browser.")
    }
  }

  const fmtFileInfo = () => {
    if (!file) return "No file selected"
    const sizeKb = file.size / 1024
    return `${file.name} (${sizeKb.toFixed(1)} KB)`
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Superposition Tool</h2>
          <p className="text-muted-foreground max-w-3xl">
            Split and superimpose halves of images or video frames. Useful for visual comparison, motion
            inspection, and design overlays.
          </p>
        </div>
        <Badge>Active</Badge>
      </div>

      <Card className="p-6 space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Image or Video</Label>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Button type="button" variant="outline" className="gap-2">
                    Choose File
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                  {fmtFileInfo()}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Supported formats: common images (PNG, JPG) and videos (MP4, WebM). Files are processed locally in
                your browser.
              </p>
            </div>

            <div className="space-y-2 max-w-xs">
              <Label htmlFor="interval">Switch interval (ms)</Label>
              <Input
                id="interval"
                type="number"
                min={100}
                step={100}
                value={intervalMs}
                onChange={(e) => setIntervalMs(Number(e.target.value) || 500)}
              />
              <p className="text-xs text-muted-foreground">
                Time between switching left/right halves on the right side. Minimum 100 ms.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={handleSuperpose}>
                Split &amp; Superimpose Halves
              </Button>
              <Button type="button" variant="outline" onClick={handleDownload}>
                Download Result
              </Button>
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/40 rounded-md px-3 py-2">
                {error}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="text-sm text-muted-foreground flex items-center justify-between">
              <span>Preview</span>
              <span className="text-xs">
                Canvas size automatically limited to 400 × 400 px for performance.
              </span>
            </div>

            <div className="relative border border-border rounded-lg bg-background flex items-center justify-center overflow-hidden min-h-[260px]">
              <canvas ref={canvasRef} className="max-w-full max-h-[400px]" />
              {!file && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  Select an image or video and click "Split &amp; Superimpose Halves" to begin.
                </div>
              )}
            </div>

            {/* Hidden video element used as a frame source for canvas when processing video */}
            <video
              ref={videoRef}
              style={{ display: isVideo ? "none" : "none" }}
              playsInline
              muted
            />
          </div>
        </div>
      </Card>
    </div>
  )
}
