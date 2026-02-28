import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { CheckSquare, FolderOpen, Zap, Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const today = formatDate(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-[#A0A0A0]">{today}</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-[#A0A0A0]">Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-[#6B7280]" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">—</p>
            <p className="text-xs text-[#6B7280] mt-1">Loading from database...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-[#A0A0A0]">Projects</CardTitle>
              <FolderOpen className="h-4 w-4 text-[#6B7280]" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">—</p>
            <p className="text-xs text-[#6B7280] mt-1">Loading from database...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-[#A0A0A0]">Sprints</CardTitle>
              <Zap className="h-4 w-4 text-[#6B7280]" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">—</p>
            <p className="text-xs text-[#6B7280] mt-1">Loading from database...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-[#A0A0A0]">Contacts</CardTitle>
              <Users className="h-4 w-4 text-[#6B7280]" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">—</p>
            <p className="text-xs text-[#6B7280] mt-1">Loading from database...</p>
          </CardContent>
        </Card>
      </div>

      {/* Workspace status */}
      <Card>
        <CardHeader>
          <CardTitle>Workspaces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Byron Film', color: '#D4A017', icon: '🎬' },
              { name: 'KORUS', color: '#008080', icon: '🌏' },
              { name: 'Personal', color: '#F97316', icon: '👤' },
            ].map((ws) => (
              <div
                key={ws.name}
                className="flex items-center gap-3 rounded-lg border border-[#2A2A2A] bg-[#222222] p-3"
              >
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-md text-sm"
                  style={{ backgroundColor: ws.color + '33', color: ws.color }}
                >
                  {ws.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{ws.name}</p>
                  <p className="text-xs text-[#6B7280]">Dashboard loading...</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Getting started */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-[#A0A0A0]">
            <p>1. Go to <span className="text-white font-medium">Settings</span> → trigger a Notion sync to import your tasks</p>
            <p>2. Use <kbd className="border border-[#2A2A2A] rounded px-1 py-0.5 text-xs">⌘K</kbd> to navigate quickly</p>
            <p>3. Click the <span className="text-white font-medium">↺ sync button</span> (top right) to sync anytime</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
