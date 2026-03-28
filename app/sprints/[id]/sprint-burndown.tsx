"use client"
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"

interface SprintBurndownProps {
  totalTasks: number
  completedTasks: number
  startDate?: string | null
  endDate?: string | null
}

interface BurndownPoint {
  day: string
  ideal: number
  actual?: number
}

function buildBurndownData(totalTasks: number, completedTasks: number, startDate: string | null, endDate: string | null): BurndownPoint[] {
  const start = startDate ? new Date(startDate) : new Date()
  const end = endDate ? new Date(endDate) : new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000)
  const today = new Date()

  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  const elapsedDays = Math.min(totalDays, Math.max(0, Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))))

  const data: BurndownPoint[] = []

  for (let d = 0; d <= totalDays; d++) {
    const dayLabel = "D" + d
    const ideal = Math.round(totalTasks - (totalTasks * d) / totalDays)

    if (d <= elapsedDays) {
      const actualRemaining = totalTasks - Math.round((completedTasks * d) / Math.max(elapsedDays, 1))
      data.push({ day: dayLabel, ideal, actual: Math.max(0, actualRemaining) })
    } else {
      data.push({ day: dayLabel, ideal })
    }
  }

  return data
}

export function SprintBurndown({ totalTasks, completedTasks, startDate, endDate }: SprintBurndownProps) {
  const data = buildBurndownData(totalTasks, completedTasks, startDate ?? null, endDate ?? null)

  return (
    <div className="p-5 rounded-[8px] bg-[#141414] border border-[rgba(255,255,255,0.06)]">
      <h3 className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-4">Burndown Chart</h3>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <XAxis dataKey="day" tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.floor(data.length / 5)} />
          <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#222222", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 6, color: "#F5F5F5", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#6B7280" }} />
          <Line
            type="monotone"
            dataKey="ideal"
            name="Ideal"
            stroke="#4B5563"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="Actual"
            stroke="#22C55E"
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2">
        <p className="text-xs text-[#6B7280]">
          <span className="font-mono text-[#F5F5F5]">{completedTasks}</span> / {totalTasks} tasks complete
        </p>
        <p className="text-xs text-[#6B7280]">
          <span className="font-mono text-[#F5F5F5]">{totalTasks - completedTasks}</span> remaining
        </p>
      </div>
    </div>
  )
}
