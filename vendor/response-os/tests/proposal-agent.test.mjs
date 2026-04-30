import assert from 'node:assert/strict';
import test from 'node:test';

import { MockProvider, ProposalAgent, createDefaultAppConfig } from '../dist/index.js';

test('ProposalAgent returns needs_user when goal is empty', async () => {
  const agent = new ProposalAgent({
    appConfig: createDefaultAppConfig('proposal-empty-goal'),
  });

  const result = await agent.propose({
    goal: '   ',
  });

  assert.equal(result.status, 'needs_user');
  assert.match(result.message, /goal or intake details/i);
});

test('ProposalAgent can run in ai mode for proposal refinement', async () => {
  const appConfig = createDefaultAppConfig('proposal-provider');
  const agent = new ProposalAgent({
    appConfig,
    provider: new MockProvider('Mock proposal response for review.'),
  });

  const result = await agent.propose({
    goal: 'Build a multi-step onboarding revamp and compare three rollout options with tradeoffs',
    audience: 'Product and engineering leadership',
    constraints: ['Delivery window is 4 weeks', 'No backend schema changes'],
    successCriteria: ['Increase activation by 15%', 'Reduce support tickets by 20%'],
    contextNotes: ['Current funnel drops at step 2', 'Mobile and web must ship together'],
    mode: 'ai',
  });

  assert.equal(result.status, 'ok');
  assert.match(result.message, /mock proposal response/i);
  assert.equal(result.data.agent.id, 'ProposalAgent');
  assert.equal(result.data.agent.goal, 'Build a multi-step onboarding revamp and compare three rollout options with tradeoffs');
  assert.equal(result.data.route.pipeline, 'proposal-ai');
  assert.ok(result.data.proposal);
});

test('ProposalAgent run() aliases propose()', async () => {
  const agent = new ProposalAgent({
    appConfig: createDefaultAppConfig('proposal-alias'),
  });

  const result = await agent.run({
    goal: 'Draft a concise partnership proposal',
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.data.agent.id, 'ProposalAgent');
  assert.equal(result.data.route.pipeline, 'proposal-deterministic');
  assert.equal(result.data.proposal.trade, 'renovation');
  assert.ok(result.data.proposal.export.markdown.includes('## Line Items'));
  assert.ok(result.data.proposal.export.markdown.includes('## Standard Exclusions'));
});

test('ProposalAgent applies explicit hvac profile details', async () => {
  const agent = new ProposalAgent({
    appConfig: createDefaultAppConfig('proposal-hvac'),
  });

  const result = await agent.propose({
    goal: 'Prepare HVAC replacement proposal for 12-unit building',
    intake: {
      trade: 'hvac',
      jobType: 'HVAC condenser replacement',
      units: 12,
      materials: ['Condenser', 'Thermostat'],
      specialConditions: ['Permit required'],
    },
  });

  assert.equal(result.status, 'ok');
  assert.equal(result.data.proposal.trade, 'hvac');
  assert.ok(result.data.proposal.riskLanguage.some((line) => /seers?|duct/i.test(line)));
  assert.ok(result.data.proposal.exclusions.length > 0);
});

test('ProposalAgent refine mode preserves legal guardrails', async () => {
  const agent = new ProposalAgent({
    appConfig: createDefaultAppConfig('proposal-refine'),
  });

  const generated = await agent.propose({
    goal: 'Draft renovation proposal',
    intake: {
      trade: 'renovation',
      jobType: 'Apartment bathroom renovation',
      squareFootage: 120,
    },
    mode: 'offline_generate',
  });

  const refined = await agent.propose({
    goal: 'Refine renovation proposal',
    mode: 'refine',
    refinementType: 'scope_tightening',
    draftProposal: generated.data.proposal_json,
  });

  assert.equal(refined.status, 'ok');
  assert.equal(refined.data.proposal_json.meta.sourceMode, 'refine');
  const legalText = [
    ...refined.data.proposal_json.exclusions,
    ...refined.data.proposal_json.assumptions,
    ...refined.data.proposal_json.warranty_terms,
  ].join(' ').toLowerCase();
  assert.match(legalText, /change order|permit|timeline|inspection|material/);
});

test('ProposalAgent translate mode updates target language and keeps clauses', async () => {
  const agent = new ProposalAgent({
    appConfig: createDefaultAppConfig('proposal-translate'),
  });

  const generated = await agent.propose({
    goal: 'Draft plumbing proposal',
    intake: {
      trade: 'plumbing',
      jobType: 'Plumbing fixture upgrade',
      units: 4,
    },
    mode: 'offline_generate',
  });

  const translated = await agent.propose({
    goal: 'Translate plumbing proposal',
    mode: 'translate',
    targetLanguage: 'es',
    draftProposal: generated.data.proposal_json,
  });

  assert.equal(translated.status, 'ok');
  assert.equal(translated.data.proposal_json.meta.language, 'es');
  const combined = [
    ...translated.data.proposal_json.exclusions,
    ...translated.data.proposal_json.assumptions,
    ...translated.data.proposal_json.warranty_terms,
  ].join(' ').toLowerCase();
  assert.match(combined, /permiso|change order|orden de cambio|cronograma|timeline/);
});

test('ProposalAgent qa mode returns missing-info checklist and risk flags', async () => {
  const agent = new ProposalAgent({
    appConfig: createDefaultAppConfig('proposal-qa'),
  });

  const draft = {
    meta: {
      tradeProfile: 'electrical',
      schemaVersion: '1.0.0',
      language: 'en',
      currency: 'USD',
      generatedAt: new Date().toISOString(),
      version: 1,
      sourceMode: 'offline_generate',
    },
    client: {
      name: '',
    },
    project: {
      title: 'Electrical project',
      jobType: '',
      summary: 'Electrical scope',
    },
    sections: [],
    line_items: [],
    allowances: [],
    exclusions: [],
    assumptions: [],
    timeline: {
      summary: '',
      phases: [],
    },
    payment_schedule: [],
    warranty_terms: [],
    signature_block: {
      contractor_label: '',
      client_label: '',
      date_label: 'Date',
    },
    warnings: [],
  };

  const qa = await agent.propose({
    goal: 'Run qa',
    mode: 'qa',
    draftProposal: draft,
    intake: {
      trade: 'electrical',
      jobType: '',
    },
  });

  assert.equal(qa.status, 'ok');
  assert.ok(Array.isArray(qa.data.proposal_json.missing_info_checklist));
  assert.ok(qa.data.proposal_json.missing_info_checklist.length > 0);
  assert.ok(qa.data.qa_report.riskFlags.length > 0);
});
