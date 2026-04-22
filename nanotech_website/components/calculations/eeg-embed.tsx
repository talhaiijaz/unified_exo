"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const EEG_BASE_URL =
  process.env.NEXT_PUBLIC_EEG_STREAMLIT_URL ??
  "https://eeg-synthesis-framework-berkeley-nanotech-lab.streamlit.app/"

// Use Streamlit's embed mode to avoid redirect loops when iframed
const EEG_STREAMLIT_URL = `${EEG_BASE_URL}?embedded=true`

export function EEGEmbed() {
  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">EEG Synthesis Framework</h2>
          <p className="text-muted-foreground">
            Interactive synthetic EEG generator hosted on Streamlit. Use the controls in the embedded app to configure
            and generate synthetic EEG data.
          </p>
        </div>
        <Badge variant="secondary">External App</Badge>
      </div>

      <Card className="relative overflow-hidden">
        <iframe
          src={EEG_STREAMLIT_URL}
          className="w-full border-0"
          style={{ height: "900px" }}
          title="EEG Synthesis Framework"
        />
      </Card>
    </div>
  )
}
