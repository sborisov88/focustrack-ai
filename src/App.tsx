import { FocusTrackDashboard } from "@/features/dashboard/focustrack-dashboard"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function App() {
  return (
    <TooltipProvider>
      <FocusTrackDashboard />
      <Toaster />
    </TooltipProvider>
  )
}
