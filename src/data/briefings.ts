/* ══════════════════════════════════════════════════════════════════
   DECISION GOVERNANCE STRATEGIC INTELLIGENCE SERIES
   Decision Governance Briefing Map — All 20 Briefings
   ══════════════════════════════════════════════════════════════════ */

export type BriefingStatus = 'Published' | 'Scheduled' | 'Upcoming';

export interface Briefing {
  briefingNumber: number;
  title: string;
  phase: 1 | 2 | 3 | 4;
  phaseName: string;
  corePosition: string;
  estimatedReadTime: number;
  approximateWordCount: number;
  purpose: string;
  publicationDate: string;
  status: BriefingStatus;
  slug: string;
}

export interface Phase {
  number: 1 | 2 | 3 | 4;
  name: string;
  range: string;
  summary: string;
}

export const PHASES: Phase[] = [
  {
    number: 1,
    name: 'Category Establishment',
    range: 'Briefings 1 – 5',
    summary:
      'Establishes Decision Governance as a distinct organizational discipline — defining the Execution Gap, the structural void left by absent governance, and the role of the runtime authority principal.',
  },
  {
    number: 2,
    name: 'Operational Control Mechanics',
    range: 'Briefings 6 – 12',
    summary:
      'Specifies the operational architecture of Decision Governance: the three control points, scope containment, conformance validation, acknowledgment layers, governance velocity, and the failure modes that break these systems under load.',
  },
  {
    number: 3,
    name: 'Deployment Reality',
    range: 'Briefings 13 – 17',
    summary:
      'Addresses the conditions organizations encounter when deploying Decision Governance — organizational resistance, principal hierarchy conflicts, sector-specific constraints, vendor opacity, and scale degradation.',
  },
  {
    number: 4,
    name: 'Category Defense and Inevitability',
    range: 'Briefings 18 – 20',
    summary:
      'Positions runtime authority as structurally inevitable — driven by regulatory convergence, competitive pressure, and the compounding organizational risk created by AI systems operating without governance infrastructure.',
  },
];

export const BRIEFINGS: Briefing[] = [
  // ── Phase 1: Category Establishment ────────────────────────────────

  {
    briefingNumber: 1,
    title: 'Why AI Governance Without Runtime Authority Is Incomplete.',
    phase: 1,
    phaseName: 'Category Establishment',
    corePosition:
      'The authority problem is the gap between knowing AI was used and proving the AI shaped decision path was permitted to move forward.',
    estimatedReadTime: 5,
    approximateWordCount: 930,
    purpose: 'Authority must exist before AI influenced work creates consequence.',
    publicationDate: '2026-05-11',
    status: 'Published',
    slug: 'Strategic_Intelligence_Briefing_01',
  },
  {
    briefingNumber: 2,
    title: 'Why Decision Governance Is the Missing Enterprise Category.',
    phase: 1,
    phaseName: 'Category Establishment',
    corePosition:
      'Decision Governance is the missing enterprise category because AI is no longer only a system to be managed. It is becoming a participant in consequential decision paths that require authority, traceability, escalation, and evidence before action moves forward.',
    estimatedReadTime: 4,
    approximateWordCount: 880,
    purpose: 'AI participation is outpacing named authority controls.',
    publicationDate: '2026-06-09',
    status: 'Scheduled',
    slug: 'Strategic_Intelligence_Briefing_02',
  },
  {
    briefingNumber: 3,
    title: 'DAL-X Is Not a Dashboard, Policy Tracker, or Checklist.',
    phase: 1,
    phaseName: 'Category Establishment',
    corePosition:
      'DAL-X is not a visibility surface, policy repository, or readiness checklist. It is the control layer required when AI influenced work needs authority, routing, evidence, and execution restraint before consequence is created.',
    estimatedReadTime: 5,
    approximateWordCount: 930,
    purpose: 'Decision Governance requires control before consequence.',
    publicationDate: '2026-06-23',
    status: 'Scheduled',
    slug: 'Strategic_Intelligence_Briefing_03',
  },
  {
    briefingNumber: 4,
    title: 'The Decision, Not the AI Agent, Must Become the Governed Object.',
    phase: 1,
    phaseName: 'Category Establishment',
    corePosition:
      'The AI agent is only a participant in the control problem. The decision is the governed object because the decision carries consequence, authority, evidence, and institutional accountability.',
    estimatedReadTime: 5,
    approximateWordCount: 1040,
    purpose: 'Consequence attaches to the decision path.',
    publicationDate: '2026-07-07',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_04',
  },
  {
    briefingNumber: 5,
    title: 'Why Enterprises Need a Control Layer Between AI Output and Execution.',
    phase: 1,
    phaseName: 'Category Establishment',
    corePosition:
      'The enterprise control gap sits between AI output and business execution. Output is not consequence until the organization allows it to move into action.',
    estimatedReadTime: 5,
    approximateWordCount: 1120,
    purpose: 'Output becomes control relevant when it starts moving toward action.',
    publicationDate: '2026-07-21',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_05',
  },

  // ── Phase 2: Operational Control Mechanics ──────────────────────────

  {
    briefingNumber: 6,
    title: 'Why Trigger Logic Is the Core of Real AI Governance.',
    phase: 2,
    phaseName: 'Operational Control Mechanics',
    corePosition:
      'Trigger logic is the mechanism that turns AI governance from policy intent into controlled execution.',
    estimatedReadTime: 4,
    approximateWordCount: 910,
    purpose: 'Governance becomes operational when control conditions can fire before action.',
    publicationDate: '2026-08-04',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_06',
  },
  {
    briefingNumber: 7,
    title: 'Why Human in the Loop Is Weak Without Authority Mapping.',
    phase: 2,
    phaseName: 'Operational Control Mechanics',
    corePosition:
      'Human oversight becomes enforceable control only when authority is mapped to the decision, the condition, and the consequence before action moves forward.',
    estimatedReadTime: 5,
    approximateWordCount: 970,
    purpose: 'Oversight becomes control only when authority is named, conditional, and provable.',
    publicationDate: '2026-08-18',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_07',
  },
  {
    briefingNumber: 8,
    title: 'Why AI Use Attestation Can Become a Control Event.',
    phase: 2,
    phaseName: 'Operational Control Mechanics',
    corePosition:
      'AI use attestation becomes a control event when the admission of AI participation changes risk, authority, escalation, review, or evidence before action moves forward.',
    estimatedReadTime: 5,
    approximateWordCount: 1030,
    purpose: 'AI use is not a footnote when it changes authority, risk, or evidence.',
    publicationDate: '2026-09-01',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_08',
  },
  {
    briefingNumber: 9,
    title: 'Why Override Logs Expose Control Stress.',
    phase: 2,
    phaseName: 'Operational Control Mechanics',
    corePosition:
      'Override logs expose control stress when they show where AI influenced work repeatedly pushes past mapped authority, escalation, review, or evidence requirements.',
    estimatedReadTime: 5,
    approximateWordCount: 1060,
    purpose: 'Overrides reveal where AI influenced work is pressing against authority.',
    publicationDate: '2026-09-15',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_09',
  },
  {
    briefingNumber: 10,
    title: 'Why Drift Is Not Only Model Drift. Authority Drift Is a Control Failure.',
    phase: 2,
    phaseName: 'Operational Control Mechanics',
    corePosition:
      'Model drift focuses on whether the AI system changes. Authority drift focuses on whether the decision path changes faster than the enterprise control model can govern it.',
    estimatedReadTime: 5,
    approximateWordCount: 1120,
    purpose: 'AI can change the decision path before the model visibly fails.',
    publicationDate: '2026-09-29',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_10',
  },
  {
    briefingNumber: 11,
    title: 'Why Audit Evidence Must Be Captured Before Action Moves Forward.',
    phase: 2,
    phaseName: 'Operational Control Mechanics',
    corePosition:
      'Audit evidence must be captured before action because a record created after consequence can explain what happened, but it cannot prove the decision path was authorized when control was still possible.',
    estimatedReadTime: 5,
    approximateWordCount: 1100,
    purpose: 'A record created after consequence is too late for real control.',
    publicationDate: '2026-10-13',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_11',
  },
  {
    briefingNumber: 12,
    title: 'Why Agent Registries Are Useful but Insufficient.',
    phase: 2,
    phaseName: 'Operational Control Mechanics',
    corePosition:
      'An agent registry can identify the machine actor, but Decision Governance has to control the decision path the agent enters, changes, or accelerates.',
    estimatedReadTime: 5,
    approximateWordCount: 1080,
    purpose: 'A registry identifies the agent. Governance must control the decision path.',
    publicationDate: '2026-10-27',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_12',
  },

  // ── Phase 3: Deployment Reality ─────────────────────────────────────

  {
    briefingNumber: 13,
    title: 'Why DAL-X Must Support Autonomous Agents and Human Led AI Assisted Workflows.',
    phase: 3,
    phaseName: 'Deployment Reality',
    corePosition:
      'Decision Governance has to cover both machine executed actions and human decisions shaped by AI because enterprise consequence can move through either path.',
    estimatedReadTime: 5,
    approximateWordCount: 1110,
    purpose: 'AI control cannot stop at agent execution. It has to reach AI-shaped human decisions.',
    publicationDate: '2026-11-10',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_13',
  },
  {
    briefingNumber: 14,
    title: 'Why Europe Sharpens the DAL-X Wedge Without Defining the Whole Company.',
    phase: 3,
    phaseName: 'Deployment Reality',
    corePosition:
      'Europe creates pressure around risk management, record keeping, and human oversight, but Jochanni Labs cannot allow the DAL-X thesis to collapse into regional compliance language.',
    estimatedReadTime: 5,
    approximateWordCount: 1040,
    purpose: 'Europe creates urgency. The category cannot be reduced to one jurisdiction.',
    publicationDate: '2026-11-24',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_14',
  },
  {
    briefingNumber: 15,
    title: 'Why the US Wedge Still Stands Without EU AI Act Pressure.',
    phase: 3,
    phaseName: 'Deployment Reality',
    corePosition:
      'The United States does not need an EU AI Act equivalent for Decision Governance to become necessary. US enterprises already carry model risk, supervision, operational risk, customer impact, board accountability, and technology governance pressure that exposes the same authority gap.',
    estimatedReadTime: 5,
    approximateWordCount: 1130,
    purpose: 'US enterprises already carry control pressure. Europe is not the only proof point.',
    publicationDate: '2026-12-08',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_15',
  },
  {
    briefingNumber: 16,
    title: 'Why Enterprise Configuration Is Mandatory for Authority Logic.',
    phase: 3,
    phaseName: 'Deployment Reality',
    corePosition:
      'Authority logic cannot be universal because every enterprise defines consequence, approval rights, escalation, override, and evidence through its own operating model.',
    estimatedReadTime: 6,
    approximateWordCount: 1170,
    purpose: 'Authority cannot be enforced from a generic rule set.',
    publicationDate: '2026-12-22',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_16',
  },
  {
    briefingNumber: 17,
    title: 'Why Readiness Gates Are Required Before AI Assisted Execution.',
    phase: 3,
    phaseName: 'Deployment Reality',
    corePosition:
      'AI assisted execution needs readiness gates because speed becomes exposure when work moves before scope, authority, controls, and evidence have been validated.',
    estimatedReadTime: 6,
    approximateWordCount: 1220,
    purpose: 'Execution should not outrun approved authority, scope, or evidence.',
    publicationDate: '2027-01-19',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_17',
  },

  // ── Phase 4: Category Defense and Inevitability ─────────────────────

  {
    briefingNumber: 18,
    title: 'Why Jochanni Labs Must Not Sound Like a Generic AI Governance Vendor.',
    phase: 4,
    phaseName: 'Category Defense and Inevitability',
    corePosition:
      'Jochanni Labs cannot sound like a generic AI governance vendor because the company is defining Decision Governance as an authority, consequence, and evidence category, not selling another policy or dashboard layer.',
    estimatedReadTime: 6,
    approximateWordCount: 1260,
    purpose: 'Category authorship cannot be reduced to vendor language.',
    publicationDate: '2027-02-16',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_18',
  },
  {
    briefingNumber: 19,
    title: 'Why the Market Has Checklists, Summaries, and Timelines, but Not Authority Infrastructure.',
    phase: 4,
    phaseName: 'Category Defense and Inevitability',
    corePosition:
      'The market has many artifacts that describe AI risk, but authority infrastructure is the missing operating layer that determines whether AI shaped work is allowed to move toward consequence.',
    estimatedReadTime: 6,
    approximateWordCount: 1190,
    purpose: 'Documentation can organize risk. Authority infrastructure governs movement.',
    publicationDate: '2027-03-16',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_19',
  },
  {
    briefingNumber: 20,
    title: 'Why Decision Governance Will Become Unavoidable as Agentic AI Enters Real Workflows.',
    phase: 4,
    phaseName: 'Category Defense and Inevitability',
    corePosition:
      'Agentic AI turns governance from a policy concern into an execution control problem because AI systems can move work closer to action before authority has been tested.',
    estimatedReadTime: 6,
    approximateWordCount: 1340,
    purpose: 'When AI starts acting inside workflows, authority has to move from policy into execution.',
    publicationDate: '2027-04-13',
    status: 'Upcoming',
    slug: 'Strategic_Intelligence_Briefing_20',
  },
];

export function getBriefingsByPhase(phase: 1 | 2 | 3 | 4): Briefing[] {
  return BRIEFINGS.filter(b => b.phase === phase);
}

export function getPhase(number: 1 | 2 | 3 | 4): Phase {
  return PHASES.find(p => p.number === number)!;
}

export function getPublishedBriefings(): Briefing[] {
  return BRIEFINGS.filter(b => b.status === 'Published');
}
