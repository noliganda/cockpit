# LLM Council Transcript — Is Cockpit overkill, nice-to-have, or necessary?

**Date:** 2026-07-02 23:51 (Australia/Sydney)
**Method:** 5 independent advisors → anonymized peer review (5 reviewers) → chairman synthesis
**Trigger:** Oli, after dispatch engine Phase 2 landed the same day.

## Original question

> Can you give me your opinion about this build and its objectives. Is it nice to have, an overkill, or absolutely necessary? What do you think is the bare minimum we should actually have to be able to organize a project and get up and running, taking into consideration that I believe an agentic workflow is the future? And that we will more and more be a one-man band, having to do everything.

## Framed question (as given to all advisors)

Oli runs everything solo — a film company (Byron Film), a group venture (KORUS), and personal/consulting work — and is betting on agentic workflows: AI agents (Hermes, Claude Code, future operators) doing an increasing share of execution while he directs. To coordinate this he has been building "Cockpit" (OPS v5): a custom Next.js + Postgres web app as the single system of record — task hierarchy/lifecycle, append-only activity log with vector search, operator registry (humans AND agents) with budgets, agent session tracking, wakeup-request queue, Slack/email intake, Notion sync, calendar integration, user tables, priority engine, dashboards, and a just-completed dispatch engine (dependency graph, cascade, cron dispatcher, harness adapters). Two more dispatch phases planned, plus a backlog of UI rebuilds, governance queues, CLI wrappers.

Reality check: ~23 tasks in the production DB, 2 operators until today, Hobby hosting plan, dispatch feature-complete but switched OFF, no real agent ever auto-dispatched, spec admits tasks go stale "In Progress for weeks" and Cockpit "drifts from reality."

Question: nice-to-have, overkill, or necessary — and what's the bare minimum system for a solo operator who believes (1) agentic workflows are the future and (2) he'll increasingly be a one-man band?

---

## Advisor responses

### The Contrarian

Here's the fatal flaw: Cockpit's spec admits tasks sit "In Progress for weeks" and the tool "drifts from reality" — and the response was to build a dispatch engine. You had a *usage* problem and you shipped an *infrastructure* answer. That's the tell. Twenty-three tasks don't need vector embeddings, hybrid semantic search, a wakeup-request coalescing queue, or an operator budget registry. You could hold 23 tasks in your head. You built a system of record before there was a record worth systematizing.

Ask the question you're avoiding: what revenue-producing work happened in Byron Film or KORUS during the months Cockpit was built? If Cockpit vanished tomorrow, what actually breaks? Nothing auto-dispatches — the flagship feature is switched off and has never run a real agent. You've built an airport for planes that haven't been invented into service yet.

The deeper trap: your two convictions don't imply this build. "Agents are the future" argues for *using* agents on business work daily and letting tooling emerge from felt friction. Instead you inverted it — the agents' biggest project is building their own filing cabinet. That's the classic solo-founder failure mode: meta-work feels like progress because it compiles.

Also, nobody's pricing the maintenance tax. A custom Next.js/Postgres app with eight subsystems is a liability you alone must patch, migrate, and debug forever — on a Hobby plan, with no tests.

Bare minimum: a markdown task list per venture, a weekly review, and agents pointed at *client-facing* work. Freeze Cockpit for 60 days. If you genuinely miss it — not the building of it, the *using* of it — you'll know exactly which 10% to keep. My bet: you won't miss the other 90%.

### The First Principles Thinker

Strip the question down. You asked "is this build necessary?" — wrong question. The right question: **what is the actual bottleneck between Oli and revenue?** It is not task coordination. A solo operator with ~23 tasks does not have a coordination problem. Coordination problems emerge from *scale* — multiple actors generating work faster than one brain can track. You have two operators, one of whom is you, and the other has never been auto-dispatched.

First principles: a system of record is justified when the cost of *not* having it (dropped balls, duplicated work, lost context) exceeds the cost of maintaining it. At your scale, the cost of not having it is near zero — you can hold 23 tasks in a text file. The cost of having it is months of your only scarce resource. The spec's own admission — tasks stale for weeks, Cockpit "drifting from reality" — is the tell: the system already demands more maintenance energy than the work it organizes. That's an inverted tool.

Notice what you actually built: not an ops tool, but *infrastructure for a hypothetical future* — dispatch engines for agents that don't run, budgets for operators that don't exist. You're building the nervous system before the organism. Convictions (1) and (2) don't require Cockpit; they require **agents doing real business work today** — invoices processed, emails drafted, Eklair shipped. The coordination layer should be *extracted from* observed agent-work friction, not speculated in advance.

Bare minimum: a markdown task list per workspace in git, Hermes reading/writing it, and a weekly review ritual. When real dispatched-agent volume creates real pain, you'll know exactly which 10% of Cockpit to resurrect — and it will be a different 10% than you'd guess today.

Freeze the build. Point the agents at the businesses. Let demand pull the infrastructure into existence.

### The Expansionist

Everyone is going to tell you 23 tasks doesn't justify this stack. Wrong frame. Cockpit isn't a task manager for one guy — it's an accidental prototype of the scarcest product category of the next five years: the agent-native operating layer for solo operators running multi-entity businesses. Linear, Asana, Notion — all built for human teams. Nobody has shipped the system of record where humans and agents are peers in the same operator registry, with budgets, session tracking, dispatch, and an append-only event spine agents can semantically query. You built that. Before the market has a name for it.

The undervalued asset isn't the app — it's the *schema*. The operator model, activity-log-as-truth, wakeup queues, harness adapters: that's transferable IP. If agentic work goes the way you're betting, every solo operator and 5-person studio hits your exact problem in 18 months. Cockpit-as-product, Cockpit-as-open-source-with-hosted-tier, or Cockpit as the credibility artifact that makes KORUS and your consulting 10x more sellable — "the guy who runs three businesses through an agent cockpit" is a category-defining story. Byron Film becomes the case study: the first film company operated agent-first.

And the compounding math: if dispatch actually works, your capacity isn't 1x — it's 1 + N operators, each logged, budgeted, measurable. The 23-task database isn't evidence of failure; it's evidence you built the airport before the planes landed. Planes are landing quarterly now.

So the bigger play: stop treating this as internal tooling and start treating it as the flagship. Turn dispatch ON this month, even ugly, even for one agent — because a working demo of auto-dispatched agent labor is worth more than the next three phases combined. The bare minimum question is small-ball. The real question is whether you're building your admin tool or your next company.

### The Outsider

Here is what a stranger sees, stripped of your context: a man with 23 tasks built a coordination platform with an event spine, vector search, budget governance, operator registries, and a dispatch engine — for a team of two, one of whom is him. Twenty-three tasks fit on a napkin. You have built an air traffic control tower for an airfield with one plane, and the plane is you.

Three things you can no longer see because you're inside it:

1. **The spec indicts itself.** Your own problem statement says tasks sit "In Progress for weeks" and the system "drifts from reality." An outsider reads that plainly: the tool you built to track work is not being used, and your response was to build more tool. That is the signature of a procrastination artifact — the fix for the system failing is never phase 3 of the system.
2. **The work is circular.** You believe agents will do an increasing share of execution. What have the agents mostly executed so far? The platform for coordinating agents. The dispatch engine has dispatched zero real tasks. Byron Film and KORUS — the actual businesses — appear in this pitch only as names. What did they ship while Cockpit was being built? A stranger would ask that first.
3. **You already own the answer.** You built Notion sync. Notion — or Linear, or a markdown file the agents can read — already does 90% of what a one-man band needs: a list, a priority, a log. Your bare minimum is one shared task list your agents can read and write, plus a daily review habit. That's it.

The convictions may be right. But convictions about the future don't require infrastructure ahead of demand. Freeze the build. Run the businesses for 60 days on what exists. Build the next feature only when a real bottleneck screams for it.

### The Executor

Cockpit is overbuilt for its inputs. You have 23 tasks, one human, and a dispatch engine that has never dispatched anything. That's not a nervous system — that's a factory built before the first customer order. The tell is in your own spec: tasks rot "In Progress for weeks" while you build embeddings and wakeup queues. You're automating a workflow you don't actually run yet.

What do you do Monday morning? Three things:

1. **Freeze the build.** No tmux steering, no governance queues, no UI rebuilds. The dispatch engine ships when it has dispatched ten real tasks, not before. Phase 2 and 3 are earned, not planned.
2. **Turn on what exists with one real task.** The dispatch engine needs a local host? Your Mac is a local host. Run the cron by hand if you must. Pick one real Byron Film or KORUS deliverable, register it, dispatch Hermes at it, and see what breaks. One end-to-end loop with real work teaches you more than a month of hardening.
3. **Adopt a brutal usage rule:** every task in Cockpit or Cockpit dies. If next Friday the DB still has ~23 tasks, the honest answer is that a markdown file plus Hermes reading it was the bare-minimum system all along — and you already have that.

The bare minimum for a one-man agentic shop is: a task list agents can read and write via API (you have it), an activity log (you have it), and one working dispatch loop (you almost have it). Everything else — priority engines, Notion sync, user tables, budgets for operators who don't exist — is inventory, not leverage.

Your convictions may be right. But conviction (1) is proven by dispatching an agent, not by building the dispatcher. Ship the loop. This week.

---

## Peer reviews

Anonymization mapping: **A = Executor, B = First Principles, C = Outsider, D = Expansionist, E = Contrarian.**

### Review 1

**1. Strongest: A.** It alone converts the diagnosis into a falsifiable test that uses what exists rather than torching it: dispatch one real task this week, and "every task in Cockpit or Cockpit dies" by Friday. B, C, and E reach the same verdict but prescribe regression to markdown, discarding a working API and log that agents already consume. A's "earned, not planned" rule for Phases 2–3 is the most operationally useful sentence across all five.

**2. Biggest blind spot: D.** Turning an unused internal tool into a product doubles the workload it just argued away — now Oli must run three businesses *and* a devtools startup, with zero external validation, no auth story beyond a shared bearer token, and a Hobby plan. "The schema is transferable IP" is unfalsifiable flattery; unproven-in-anger schemas are worthless.

**3. What all five missed:** the cost model. Everyone priced Cockpit in scarce founder-months, but agents did much of the building — the real costs are Oli's *attention* and the perpetual maintenance tax, and the real risk is that agent labor makes building the wrong thing feel cheap. Also: Cockpit logs its own usage; nobody proposed querying that activity log to decide, with data, which 10% survives.

### Review 2

1. **Strongest: A.** It alone converts the diagnosis into a testable Monday plan: freeze, run one real dispatch end-to-end on existing infrastructure, and a falsifiable kill-rule ("if Friday still ~23 tasks, markdown wins"). B, C, and E reach the same verdict but prescribe demolition; A salvages the nearly-complete loop and makes the conviction empirically checkable this week.

2. **Biggest blind spot: D.** Its productize pivot hands a solo operator a *third* job — building, marketing, and supporting a product — while Byron Film and KORUS starve, and its "category-defining story" rests on a dispatch engine that has never dispatched. It also assumes schema-as-IP has value before a single external user validates the workflow. Contrarian energy, but it doubles down on exactly the meta-work trap E names.

3. **What all five missed:** the cost accounting is wrong. Cockpit was substantially built by agents, so "months of your scarce resource" overstates build cost — the real recurring cost is Oli's *attention and maintenance tax*, which markdown doesn't eliminate. Nobody notes that "tasks go stale" is a review-ritual failure that will follow him to any tool; and nobody separates the cheap system-of-record layer (keep) from the premature orchestration layer (pause), treating Cockpit as all-or-nothing.

### Review 3

1. **Strongest: A.** It alone converts diagnosis into a falsifiable test with a deadline: dispatch one real task this week, "every task in Cockpit or Cockpit dies," and gates Phase 2/3 on ten real dispatches. B, C, and E share the diagnosis but prescribe vaguer 60-day freezes; A's "conviction is proven by dispatching, not by building the dispatcher" is the sharpest actionable line, and it credits what already exists (API, log, near-working loop) rather than defaulting to markdown.

2. **Biggest blind spot: D.** It answers a question nobody asked (is this a startup?) while skipping the asked one, hand-waves "planes are landing quarterly" with zero evidence, and ignores that a product play would multiply the maintenance burden the other four correctly flag. Its one good idea — turn dispatch on this month — is A's point without A's discipline.

3. **All five missed:** the agents-as-users angle. The relevant capacity constraint isn't Oli tracking 23 tasks — it's whether stateless agents can recover context across sessions. A durable system of record may be justified by agent memory needs at task counts far below human-pain thresholds. Also unexamined: the build itself was cheap agent labor, so "months of scarce founder time" (B, E) may overstate the actual cost.

### Review 4

**1. Strongest: A.** It shares the council's diagnosis (overbuilt, unused) but converts it into a falsifiable protocol: dispatch one real task through the nearly-finished loop, and a kill-rule ("every task in Cockpit or Cockpit dies") with a one-week deadline. B, C, and E say "freeze and use markdown"; A alone notices the dispatch loop is one step from done and that running it once is the cheapest possible experiment. Its verdict is testable, not just rhetorical.

**2. Biggest blind spot: D.** Productizing an app with zero external users, no tests, Hobby hosting, and a spec admitting it "drifts from reality" multiplies scope for the one person the council agrees is overcommitted. "Category-defining story" is unfalsifiable; competitors (Linear agents, agent-native tools) are already shipping. D also never engages with the staleness evidence — the one fact everyone else built on.

**3. What all five missed:** The cost model. If agents built Cockpit, the sunk cost isn't "months of Oli's scarce resource" — build labor is cheap now; the real ongoing cost is *attention and maintenance*. That reframes B/E's indictment. Relatedly, nobody defined a success metric for the trial period: what measurable outcome (tasks dispatched, hours saved) would prove Cockpit necessary? Without that, "freeze for 60 days" just defers the same argument.

### Review 5

**1. Strongest: A.** It alone converts diagnosis into a falsifiable Monday plan: freeze, dispatch one real task through the existing engine, and a kill criterion ("still ~23 tasks Friday → markdown wins"). Unlike B/C/E, it doesn't waste the sunk build — it tests it. "Phase 2 and 3 are earned, not planned" is the operative principle.

**2. Biggest blind spot: D.** Pivoting an unused internal tool into a product stacks a second unvalidated bet on the first. There is zero demand evidence, no working demo (dispatch is off), and productizing multiplies the maintenance tax E correctly flags. D also dodges the actual question. Runner-up blind spot: B and E price the build in "months of your only scarce resource," but agents did much of the building — the real cost is Oli's attention, not construction hours, which weakens their ROI math.

**3. What all five missed:** Drift is medium-independent. A markdown list goes stale exactly like Cockpit unless updating is a *side effect of doing the work* — none proposed the fix: agents must write task state back automatically as they execute (Cockpit's events API already supports this; markdown wouldn't). Also unpriced: the forward-looking decision is operating cost, not sunk cost — keeping a frozen Cockpit is nearly free.

---

## Chairman's verdict

### Where the Council Agrees

Four of five advisors — Contrarian, First Principles, Outsider, Executor — converged independently on the same diagnosis, which makes it a high-confidence signal:

1. **The system is overbuilt for its inputs.** 23 tasks, 2 operators, a dispatch engine that has never dispatched anything. Vector search, budget governance, wakeup queues, and operator registries were built ahead of any demand that requires them.
2. **The spec indicts itself.** "In Progress for weeks" and "drifts from reality" is a usage failure, and the response was more infrastructure. Every advisor flagged this as the tell: the fix for a system not being used is never phase 3 of the system.
3. **The work has been circular.** The agents' largest project to date is the platform for coordinating agents. Byron Film and KORUS appear in the story mostly as names. Conviction (1) — "agents are the future" — is proven by agents doing revenue work, not by building the dispatcher.
4. **Freeze the roadmap.** No advisor, including the Expansionist, argued for proceeding with dispatch phases 2–3, governance queues, or UI rebuilds as planned. Future phases are earned by real usage, not scheduled.

### Where the Council Clashes

**Demolish vs. test what exists.** Contrarian, First Principles, and Outsider prescribe retreat to markdown-plus-review-ritual and a 60-day freeze — let demand pull infrastructure into existence. The Executor prescribes the opposite motion with the same diagnosis: the dispatch loop is one step from done, your Mac is the local host, so run one real task through it *this week* and let the result decide. Reasonable advisors disagree because they're pricing the sunk build differently: the demolition camp treats Cockpit as a temptation to keep polishing; the Executor treats it as a nearly-free experiment. Peer review broke this tie decisively — all five reviews named the Executor strongest, because a falsifiable one-week test dominates an unfalsifiable 60-day abstinence pledge.

**Tool vs. product.** The Expansionist alone argues Cockpit is an accidental prototype of an agent-native operating layer — the schema is the asset, and the real question is whether this is the next company. Every review named this the council's biggest blind spot: it hands a solo operator a third job while two businesses starve, with zero external users, no tests, and Hobby hosting. But the reviews salvaged its one operational insight, which happens to agree with the Executor: a working demo of auto-dispatched agent labor is worth more than the next three phases combined. Turn it on.

### Blind Spots the Council Caught

Peer review surfaced four things no individual advisor saw:

1. **The cost accounting was wrong.** Contrarian and First Principles priced Cockpit in "months of scarce founder time" — but agents did much of the building. The real cost is Oli's attention and the ongoing maintenance tax, and the forward-looking cost of *keeping a frozen Cockpit is nearly free*. This weakens the demolition case considerably. The subtler danger it exposes: agent labor makes building the wrong thing feel cheap.
2. **Drift is medium-independent.** The council's favorite alternative — a markdown list — goes stale exactly the way Cockpit did, because staleness is a review-ritual failure that follows Oli to any tool. The actual fix nobody proposed individually: task state must update as a *side effect of agents doing the work*. Cockpit's events API already supports this; markdown wouldn't. This is the strongest argument that exists *for* Cockpit, and it came from review, not from any advisor.
3. **Agents are the users, not Oli.** The "23 tasks fit on a napkin" framing assumes a human tracker. Stateless agents recovering context across sessions may justify a durable, queryable system of record at task counts far below human-pain thresholds. The bar for "necessary" is lower than four advisors assumed — but it applies to the system-of-record layer, not the orchestration layer. The council treated Cockpit as all-or-nothing; the review split it correctly: cheap record layer (keep), premature orchestration layer (prove or pause).
4. **No advisor defined a success metric.** "Freeze for 60 days" without one just defers the same argument. And Cockpit logs its own usage — the activity log can answer, with data, which 10% deserves to survive.

### The Recommendation

**Cockpit is neither necessary nor pure overkill — it is a justified core wrapped in premature infrastructure, and the verdict is decided by a test, not a debate.**

The bare minimum system for a solo operator betting on agentic work is three things: a task list agents can read and write via API, an append-only activity log agents update as a side effect of executing, and one working dispatch loop. Cockpit already contains all three. Everything else — priority engine, Notion sync, user tables, budgets for operators that don't exist, embeddings over 23 tasks — is inventory, not leverage. Keep it frozen; it costs nearly nothing to keep and nothing new gets built on top of it.

So: freeze the roadmap entirely (no phase 2 [of the remaining dispatch phases], no governance queues, no UI rebuilds), and run the Executor's experiment with the reviews' missing metric attached. For the next 30 days, every task flows through Cockpit *because agents write to it while doing real Byron Film / KORUS / consulting work* — not because Oli hand-tends it. Success metric: by day 30, (a) at least 10 real tasks dispatched end-to-end and (b) the activity log shows agents, not Oli, wrote the majority of task-state updates. Pass, and Cockpit has earned its next phase — the "drifts from reality" problem is structurally dead because updating became a side effect of execution. Fail, and the honest answer is that a markdown file plus Hermes was the bare minimum all along; keep the DB as an archive and walk away without guilt, because the sunk cost was mostly agent labor anyway.

The Expansionist's product fantasy is rejected as a plan but retained as a tiebreaker: if the loop works on real work, a demo exists and that door reopens later. It does not open before then.

### The One Thing to Do First

This week, pick one real revenue-adjacent deliverable — a Byron Film or KORUS task, not a Cockpit task — register it, run the dispatch cron by hand on your Mac, and let Hermes execute it end-to-end with its progress written back through the events API. One real task through the loop settles in a day what the council argued in five voices: it either proves the machine or exposes exactly which parts of it were never needed.
