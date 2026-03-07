# Phase 2a — Harness + MCP Co-Pilot Architecture

**Status:** Planning  
**Started:** 2026-03-08  
**Owner:** Charlie + Oli (collaborative)  
**Estimated Duration:** 3-4 weeks  

---

## Executive Summary

Phase 2a builds the **MCP co-pilot server** that positions me as a collaborator *inside* Claude Code/Cursor (not watching from outside). This is the harness layer that bridges you and the IDE, enables real-time guidance, and creates the foundation for all subsequent phases (data ingestion, embeddings, synthesis).

**Key insight:** The harness determines how AI fits into your work, not the model. This phase builds that relationship.

---

## The Three-Layer Architecture

### Layer 1: IDE Harness
**Tool:** Claude Code or Cursor or antigravity 
**Your role:** Write code, ask questions, see results  
**My role:** Co-pilot, context-aware assistant

Features:
- Full project context (files, git history, codebase)
- Persistent memory (remembers what you're building)
- Zero interruption (only responds when you ask)
- Pause mechanism (for Whisper corrections)

### Layer 2: MCP Server (The Harness Logic)
**Runs on:** Mac mini  
**Protocol:** Model Context Protocol (JSON-RPC 2.0)  
**Connected to:** Claude Code, Cursor, future AI tools  

Provides:
- File system resources (project context)
- Code analysis tools (is this the right approach?)
- Project metadata (decisions, intent, history)
- Query interface (natural language questions)

### Layer 3: Support Infrastructure
**Handles:**
- Action logging (what gets built)
- File watching (track changes)
- Slack pause interface (error correction)
- Vector embeddings (feeds later phases)

---

## Technical Specification

### MCP Server Interface

**Resources (Read-Only Context)**

```
/project/structure
  → Full directory tree, file sizes, types

/project/files/{path}
  → Raw file contents (auto-filtered for git-ignored)

/git/history
  → Last 50 commits, branches, recent changes

/git/status
  → Current branch, staged changes, uncommitted files

/context/project
  → Metadata: name, phase, intent, key decisions

/context/history
  → Recent discussions, past approaches tried, learnings
```

**Tools (Exposed to Claude Code/Cursor)**

```
query_codebase(question: string) → answer
  Example: "Is this the right way to structure a React component?"
  Returns: Context-aware guidance based on project codebase

get_project_status() → status
  Returns: Current phase, outstanding tasks, blockers

suggest_approach(problem: string) → suggestion
  Example: "How should I integrate embeddings?"
  Returns: Approach recommendation with rationale

search_memory(query: string) → results
  Returns: Relevant past decisions, learnings, patterns
```

**Configuration (Claude Code)**

```json
{
  "mcpServers": {
    "copilot": {
      "command": "node",
      "args": ["/Users/charlie/.openclaw/workspace/bin/mcp-copilot.js"],
      "env": {
        "PROJECT_ROOT": "/Users/charlie/.openclaw/workspace/olivier-marcolin/projects/charlie-dashboard",
        "MEMORY_DIR": "/Users/charlie/.openclaw/workspace/memory"
      }
    }
  }
}
```

### Action Logging Schema

Every action gets logged to `/logs/actions/{timestamp}.jsonl`:

```json
{
  "id": "action_20260308_001",
  "timestamp": "2026-03-08T00:45:30Z",
  "actor": "claude-code",
  "action": "file_edit|file_create|command_run",
  
  "target": {
    "type": "file|directory|process",
    "path": "app/components/harness-copilot.tsx"
  },
  
  "outcome": "success|error|partial",
  "duration_ms": 2341,
  
  "context": {
    "phase": "2a",
    "project": "charlie-dashboard",
    "parent_task": "build-mcp-server",
    "prompt": "original user instruction"
  },
  
  "metadata": {
    "tokens_used": 1200,
    "lines_changed": 47,
    "files_affected": 3
  },
  
  "error": null,
  "summary": "Added query_codebase handler, tested with sample question"
}
```

### Pause Interface (Slack)

```
/harness pause
  → Stops Claude Code execution mid-run
  → Waits for corrected input
  → Returns status in thread

/harness resume <corrected_prompt>
  → Restarts with new prompt
  → Logs the correction
  → Continues execution

/harness status
  → Shows current state, logs from last 10 actions

/harness abort
  → Full stop, can review/restart manually
```

---

## Implementation Roadmap

### Week 1: MCP Server Foundation
- [ ] Initialize MCP server project
- [ ] Implement resource providers (files, git, context)
- [ ] Add basic tools (query_codebase, get_status)
- [ ] Test with Claude Code locally
- [ ] Document configuration

**Deliverable:** Working MCP server that Claude Code can query

### Week 2: Logging + File Watcher
- [ ] Set up file watcher on project directory
- [ ] Implement action logging schema
- [ ] Create log parser for later vectorization
- [ ] Add Slack interface (pause/resume)
- [ ] Test with real edits

**Deliverable:** Complete action audit trail

### Week 3: Integration + Optimization
- [ ] Integrate MCP + file watcher
- [ ] Add Slack relay for important actions
- [ ] Performance testing (latency, memory)
- [ ] Documentation for Cursor setup
- [ ] Refine based on real usage

**Deliverable:** Stable, production-ready harness

### Week 4: Preparation for Phase 2
- [ ] Database connector scaffold (preps for Gmail/Drive/Notion)
- [ ] Vector store config file (preps for embeddings)
- [ ] Example synthesis cron structure (preps for phase 6)
- [ ] Phase 2b handoff docs

**Deliverable:** Clean foundation for data ingestion

---

## Success Criteria

- ✅ MCP server responds to queries in <500ms
- ✅ File watcher captures all edits (100% accuracy)
- ✅ Pause mechanism works reliably (tested with 10+ Whisper corrections)
- ✅ Logs are queryable and complete (all metadata present)
- ✅ Claude Code setup takes <5 minutes
- ✅ Zero data loss on pause/resume cycles

---

## Scope Notes

### Included in Phase 2a
✅ MCP server architecture  
✅ File watching + logging  
✅ Slack pause interface  
✅ Claude Code integration  
✅ Action schema design  

### Deferred (Later Phases)
❌ Vector embeddings (Phase 3)  
❌ Postgres data ingestion (Phase 2b)  
❌ Ollama/local models (Phase 2+, when hardware ready)  
❌ Weekly synthesis cron (Phase 6)  
❌ Memory migration (Phase 7)  

### Not in This Project
❌ External harness tools (Anthropic, OpenAI responsibility)  
❌ Model improvements (Claude's model is what it is)  

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| MCP latency issues | Profile early, optimize hot paths |
| File watcher missing edits | Comprehensive testing, fallback polling |
| Slack API rate limits | Queue messages, batch on pause/resume |
| Log storage bloat | Compression, archival after 30 days |
| Cursor setup complexity | Detailed docs, example configs, video walkthrough |

---

## How Phase 2a Feeds Future Phases

```
Phase 2a (Harness)
    ↓
[Action logs + project context ready]
    ↓
Phase 2 (Data Ingestion)
  → Logs inform decision-making on data schema
    ↓
Phase 3 (Embeddings)
  → Action logs vectorized for empirical memory
    ↓
Phase 4 (MCP Exposure)
  → This MCP server becomes the hub
    ↓
Phase 5 (Auto-Capture)
  → Knows what to capture based on logs
    ↓
Phase 6 (Weekly Synthesis)
  → Analyzes logs + data for patterns
    ↓
Phase 7 (Memory Migration)
  → Logs seed the new empirical memory system
```

---

## Decision Points

1. **Cursor vs Claude Code (or both)?**
   - Claude Code for now, add Cursor support in Phase 2b?
   - Or support both from day one?

2. **Slack relay level?**
   - Only on pause/resume, or also on major file changes?
   - Risk of notification spam vs. visibility

3. **Log retention policy?**
   - Forever (more memory, larger storage)?
   - 90 days (balance memory + space)?
   - Configurable per-project?

4. **MCP server as systemd service?**
   - Start on Mac mini boot, run persistently?
   - Or start on-demand when Claude Code runs?

---

## Next Steps

1. **Document MCP server code structure** (types, interfaces)
2. **Create skeleton project** (TypeScript, depends on @modelcontextprotocol/sdk)
3. **Setup local testing** (Claude Code with local MCP)
4. **Brief Oli** on decisions (Cursor support, log retention, etc.)
5. **Begin implementation** (Week 1: MCP foundation)

---

**Created by:** Charlie  
**For:** Oli  
**Context:** Harness Architecture Sprint (2026-03-08)  
**Location:** `olivier-marcolin/projects/charlie-dashboard/PHASE-2A-HARNESS.md`
