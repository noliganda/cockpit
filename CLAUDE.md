# Charlie Dashboard — Build Spec

A unified operations dashboard for Byron Film and KORUS Group. Built with Next.js 15, shadcn/ui, Tailwind, and Framer Motion.

---

## Architecture

- **Framework:** Next.js 15 (App Router)
- **UI:** shadcn/ui components
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion
- **State:** React hooks + localStorage (initial), migrate to DB later
- **Icons:** Lucide React

---

## Design System

### Colors
- Background: `#0F0F0F` (dark)
- Card: `#1A1A1A`
- Border: `#2A2A2A`
- Text Primary: `#FFFFFF`
- Text Secondary: `#A0A0A0`
- Accent Byron: `#C8FF3D` (lime)
- Accent KORUS: `#3B82F6` (blue)

### Layout
- Sidebar: 280px fixed
- Main content: fluid
- Header: 64px fixed
- Animations: 300ms ease-out, stagger children 50ms

---

## Data Models

### Workspace
```typescript
interface Workspace {
  id: string;
  name: string;
  slug: 'byron-film' | 'korus';
  color: string;
  icon: string;
}
```

### Task
```typescript
interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignee?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Project
```typescript
interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed' | 'archived';
  areaId?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
}
```

### Area
```typescript
interface Area {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  color: string;
}
```

### Contact
```typescript
interface Contact {
  id: string;
  workspaceId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  pipelineStage?: string;
  tags: string[];
  lastContact?: string;
}
```

---

## Build Priorities

### ✅ 1. KORUS Metrics (DONE)
- Revenue widget
- Project count
- Active leads counter

### ✅ 2. Multi-workspace sidebar (DONE)
- Workspace switcher
- Contextual navigation per workspace
- Visual workspace indicators

### 3. Task CRUD + Kanban board ⬅️ CURRENT
**Features:**
- Create/edit/delete tasks
- Kanban board with drag-and-drop
- Custom statuses per workspace:
  - **Byron Film:** Backlog → Pre-Production → In Production → Post-Production → Review → Delivered → Invoiced → Paid
  - **KORUS:** Lead → Qualification → Proposal → Negotiation → Won → Lost → On Hold
- Priority levels with colors
- Due dates
- Assignee support
- Tags
- Quick-add from any view

**Status Config per Workspace:**
```typescript
const byronFilmStatuses = [
  { id: 'backlog', name: 'Backlog', color: '#6B7280' },
  { id: 'pre-prod', name: 'Pre-Production', color: '#8B5CF6' },
  { id: 'in-prod', name: 'In Production', color: '#F59E0B' },
  { id: 'post-prod', name: 'Post-Production', color: '#3B82F6' },
  { id: 'review', name: 'Review', color: '#EC4899' },
  { id: 'delivered', name: 'Delivered', color: '#10B981' },
  { id: 'invoiced', name: 'Invoiced', color: '#6366F1' },
  { id: 'paid', name: 'Paid', color: '#C8FF3D' },
];

const korusStatuses = [
  { id: 'lead', name: 'Lead', color: '#6B7280' },
  { id: 'qualification', name: 'Qualification', color: '#8B5CF6' },
  { id: 'proposal', name: 'Proposal', color: '#F59E0B' },
  { id: 'negotiation', name: 'Negotiation', color: '#3B82F6' },
  { id: 'won', name: 'Won', color: '#10B981' },
  { id: 'lost', name: 'Lost', color: '#EF4444' },
  { id: 'on-hold', name: 'On Hold', color: '#EC4899' },
];
```

### 4. Projects & Areas views
- Project list/grid view
- Project detail page
- Area grouping
- Progress tracking

### 5. Sprint management
- Sprint creation
- Sprint board view
- Velocity tracking
- Burndown chart

### 6. CRM tab (pipeline + contacts)
- Pipeline view (kanban for contacts)
- Contact list with filters
- Contact detail view
- Interaction history

### 7. Documents tab (Drive/OneDrive browser)
- File browser interface
- Folder navigation
- File preview
- Recent files

### 8. Messages feed
- Unified message stream
- Integration notifications
- Mentions/assignments

### 9. Auth system (password protection)
- Simple password gate
- Session management
- No complex auth needed yet

### 10. Morning Brief tab
- Daily summary view
- Key metrics
- Today's priorities
- Overdue tasks

### 11. Ops OS sync
- Export to Obsidian format
- Sync status indicators
- Conflict resolution

### 12. Cost tab migration
- Move cost tracking from old dashboard
- Integrate into new layout

---

## File Structure

```
app/
├── page.tsx                    # Dashboard home
├── layout.tsx                  # Root layout with sidebar
├── globals.css
├── tasks/
│   ├── page.tsx               # Task list view
│   └── kanban/
│       └── page.tsx           # Kanban board
├── projects/
│   └── page.tsx               # Projects view
├── crm/
│   └── page.tsx               # CRM pipeline
├── documents/
│   └── page.tsx               # Document browser
├── brief/
│   └── page.tsx               # Morning brief
├── settings/
│   └── page.tsx               # Settings
components/
├── ui/                        # shadcn components
├── sidebar.tsx               # Main navigation
├── workspace-switcher.tsx    # Workspace selector
├── kanban-board.tsx          # Drag-drop kanban
├── task-card.tsx            # Task component
├── metric-card.tsx          # Stats widget
hooks/
├── use-local-storage.ts     # Persist state
├── use-workspace.ts         # Current workspace
lib/
├── utils.ts                 # Utilities
├── data.ts                  # Mock data / API
stores/
├── task-store.ts            # Task state management
├── workspace-store.ts       # Workspace state
types/
├── index.ts                 # TypeScript definitions
```

---

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Add shadcn components
npx shadcn add button card dialog dropdown-menu input label select tabs toast

# Install additional deps
npm install framer-motion @hello-pangea/dnd date-fns
```

---

## Notes

- Use localStorage for now, migrate to real backend later
- Each workspace has its own data namespace
- Animations should feel snappy (300ms max)
- Dark mode only (no light mode needed)
- Mobile responsive but desktop-first
