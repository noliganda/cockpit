# ARCHIVED — Historical Phase 2a Harness Planning

**Status:** Archived / historical only  
**Archived:** 2026-03-28  
**Reason:** Superseded by **OPS v5 — Cockpit** architecture direction and unified operational event spine work.  
**Current source of truth:** `docs/architecture/v5/`

---

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
```

*Archived copy truncated here intentionally in the archive wrapper; see git history if the full original wording is ever needed.*
