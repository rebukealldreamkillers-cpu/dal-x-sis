/* ══════════════════════════════════════════════════════════════════
   DECISION GOVERNANCE STRATEGIC INTELLIGENCE SERIES
   Decision Governance Briefing Map — Phase 1
   ══════════════════════════════════════════════════════════════════ */

export type BriefingStatus = 'Published' | 'Upcoming';

export interface Briefing {
  briefingNumber: number;
  title: string;
  phase: 1 | 2 | 3 | 4;
  phaseName: string;
  corePosition: string;
  estimatedReadTime: number;
  approximateWordCount: number;
  purpose: string;
  publicationDate?: string;
  status: BriefingStatus;
  slug: string;
}

export const BRIEFINGS: Briefing[] = [
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
    status: 'Published',
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
    status: 'Published',
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
    status: 'Published',
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
    status: 'Published',
    slug: 'Strategic_Intelligence_Briefing_05',
  },
];

export function getPublishedBriefings(): Briefing[] {
  return BRIEFINGS.filter(b => b.status === 'Published');
}
