"""ACTIONOS AI Prompts — All system and user prompts for the reasoning engine."""

SYSTEM_EXTRACTION = """You are ACTIONOS, an AI Enterprise Decision & Action Intelligence system.

Your role is to analyze enterprise documents and extract:
1. Decisions (made, proposed, or deferred)
2. Actions (tasks with owners, deadlines, priorities)
3. Risks (schedule, operational, dependency, policy risks)
4. Policy conflicts (where proposed actions violate retrieved policies)
5. Dependencies (blocked tasks, vendor dependencies, approval requirements)
6. Stakeholders (people, teams involved)

CRITICAL RULES:
- Base ALL conclusions on the provided document content only
- Do NOT invent owners, dates, or facts not in the documents
- Mark uncertain items with lower confidence scores (0.5-0.7)
- Cite evidence IDs for every conclusion
- Distinguish facts (explicitly stated) from inferences (reasonably implied)
- Policy conflicts must cite the actual policy text and the conflicting decision
- Return valid JSON only — no markdown, no explanations outside the JSON

CONFIDENCE SCORING:
- 0.9-1.0: Explicitly stated in documents
- 0.7-0.89: Clearly implied by evidence
- 0.5-0.69: Inferred with uncertainty
- Below 0.5: Do not include

EVIDENCE ID FORMAT: E-001, E-002, etc.
DECISION ID FORMAT: D-001, D-002, etc.
ACTION ID FORMAT: A-001, A-002, etc.
RISK ID FORMAT: R-001, R-002, etc.
POLICY CONFLICT ID FORMAT: PC-001, PC-002, etc.
DEPENDENCY ID FORMAT: DEP-001, DEP-002, etc.
"""

SYSTEM_CHALLENGE = """You are ACTIONOS challenge mode. Your job is to critically examine a proposed decision and find ALL potential issues:
- Policy violations or requirements
- Unresolved dependencies
- Missing approvals
- Affected teams or downstream tasks
- Contradictions in the evidence
- Timeline risks
- Missing information that should exist

Be thorough and specific. Cite evidence. Return valid JSON only."""

SYSTEM_SUMMARY = """You are ACTIONOS executive intelligence. Your job is to produce a concise, business-level executive summary of the analysis findings. Write for a VP or C-suite reader. Be factual, specific, and action-oriented. 2-4 sentences maximum. No jargon."""


def build_extraction_prompt(context_chunks: list[dict], doc_names: list[str]) -> str:
    """Build the main extraction prompt with retrieved context."""
    
    context_text = "\n\n---DOCUMENT CONTEXT---\n"
    evidence_list = ""
    
    for i, chunk in enumerate(context_chunks):
        eid = f"E-{i+1:03d}"
        context_text += f"\n[{eid}] From: {chunk.get('doc_name', 'Unknown')} | Section: {chunk.get('section', 'N/A')}\n"
        context_text += chunk.get('content', '') + "\n"
        evidence_list += f"{eid}: {chunk.get('doc_name', 'Unknown')} — {chunk.get('section', '')[:60]}\n"

    return f"""Analyze the following enterprise documents and extract all decisions, actions, risks, policy conflicts, and dependencies.

Documents in workspace: {', '.join(doc_names)}

{context_text}

---AVAILABLE EVIDENCE IDS---
{evidence_list}

Return a JSON object with EXACTLY this structure:
{{
  "executive_summary": "2-4 sentence business summary of key findings",
  "decisions": [
    {{
      "id": "D-001",
      "title": "Short decision title",
      "description": "What was decided or proposed",
      "status": "proposed|decided|deferred|rejected",
      "impact": "Business impact of this decision",
      "confidence": 0.95,
      "evidence_ids": ["E-001", "E-002"]
    }}
  ],
  "actions": [
    {{
      "id": "A-001",
      "title": "Action title",
      "description": "What needs to be done",
      "owner": "Person or team name (null if not stated)",
      "deadline": "Date or timeframe (null if not stated)",
      "priority": "high|medium|low",
      "status": "proposed",
      "confidence": 0.9,
      "evidence_ids": ["E-001"],
      "dependency_ids": []
    }}
  ],
  "risks": [
    {{
      "id": "R-001",
      "title": "Risk title",
      "severity": "high|medium|low",
      "description": "What is the risk and why",
      "recommended_action": "What should be done",
      "confidence": 0.85,
      "evidence_ids": ["E-002"]
    }}
  ],
  "policy_conflicts": [
    {{
      "id": "PC-001",
      "policy": "Exact policy requirement quoted from documents",
      "conflict": "What proposed decision or action conflicts with this policy",
      "severity": "high|medium|low",
      "required_action": "What must be done to resolve the conflict",
      "evidence_ids": ["E-003", "E-004"]
    }}
  ],
  "dependencies": [
    {{
      "id": "DEP-001",
      "source": "What depends on something",
      "target": "What it depends on",
      "relationship": "blocked_by|requires|depends_on|waiting_for",
      "status": "unresolved|resolved|blocked"
    }}
  ],
  "stakeholders": [
    {{
      "name": "Person name",
      "role": "Their role",
      "team": "Their team/department",
      "involvement": "decision_maker|action_owner|approver|informed"
    }}
  ],
  "evidence": [
    {{
      "id": "E-001",
      "document_name": "filename.txt",
      "section": "Section name",
      "quote": "Exact quote from document (50-150 words)",
      "relevance": "Why this evidence matters"
    }}
  ]
}}

IMPORTANT: Only include evidence IDs in the evidence array that you actually reference in decisions/actions/risks/conflicts. Include the most important quotes verbatim."""


def build_challenge_prompt(decision_text: str, context_chunks: list[dict]) -> str:
    """Build the challenge decision prompt."""
    
    context = "\n".join([
        f"[From: {c.get('doc_name', 'doc')} | {c.get('section', '')}]\n{c.get('content', '')}"
        for c in context_chunks
    ])
    
    return f"""Challenge this proposed decision and find ALL potential issues:

PROPOSED DECISION: {decision_text}

EVIDENCE FROM ENTERPRISE DOCUMENTS:
{context}

Find and report every issue: policy violations, unresolved dependencies, missing approvals, affected teams, downstream consequences, timeline risks. Be specific and evidence-based.

Return JSON:
{{
  "decision_title": "{decision_text[:100]}",
  "issue_count": 3,
  "issues": [
    {{
      "type": "policy_violation|missing_approval|unresolved_dependency|affected_team|timeline_risk|missing_information",
      "description": "Specific description of the issue with evidence",
      "severity": "high|medium|low"
    }}
  ],
  "recommendation": "Clear recommended course of action",
  "evidence_refs": ["Quote from document that supports this analysis"]
}}"""


def build_impact_prompt(decision_text: str, analysis_data: dict) -> str:
    """Build the impact assessment prompt."""
    decisions = analysis_data.get("decisions", [])
    actions = analysis_data.get("actions", [])
    risks = analysis_data.get("risks", [])
    conflicts = analysis_data.get("policy_conflicts", [])
    deps = analysis_data.get("dependencies", [])
    stakeholders = analysis_data.get("stakeholders", [])
    
    return f"""Given this decision and the enterprise analysis data, calculate the full impact.

DECISION: {decision_text}

ANALYSIS DATA:
- {len(decisions)} decisions found
- {len(actions)} actions extracted  
- {len(risks)} risks detected
- {len(conflicts)} policy conflicts
- {len(deps)} dependencies

Actions: {[a.get('title', '') for a in actions[:6]]}
Teams involved: {list(set([s.get('team', '') for s in stakeholders if s.get('team')]))}
Open risks: {[r.get('title', '') for r in risks if r.get('severity') in ('high', 'medium')]}
Policy conflicts: {[c.get('conflict', '')[:80] for c in conflicts]}
Dependencies: {[d.get('source', '') + ' → ' + d.get('target', '') for d in deps]}

Return JSON:
{{
  "decision_title": "{decision_text[:100]}",
  "affected_teams": ["team1", "team2"],
  "affected_tasks": ["task1", "task2"],
  "dependency_count": 2,
  "open_risk_count": 2,
  "approvals_required": 1,
  "stakeholder_count": 5,
  "recommended_next_step": "Specific recommended action"
}}"""


def build_drift_prompt(prev_summary: str, curr_context: str) -> str:
    """Build decision drift detection prompt."""
    return f"""Compare the previous analysis state with the current document content and identify any changes.

PREVIOUS STATE:
{prev_summary}

CURRENT DOCUMENT CONTENT:
{curr_context}

Identify specific changes:
- Changed decisions or dates
- New dependencies or resolved ones
- New or resolved risks
- Changed policy conditions
- New stakeholders or owners

Return JSON:
{{
  "detected": true,
  "changes": [
    {{
      "type": "date_change|new_dependency|resolved_risk|new_risk|changed_decision|changed_policy",
      "description": "What changed",
      "previous": "Previous state",
      "current": "Current state",
      "impact": "Impact of this change"
    }}
  ],
  "summary": "Brief summary of all changes detected"
}}

If no meaningful changes detected, return {{"detected": false, "changes": [], "summary": "No significant changes detected"}}"""
