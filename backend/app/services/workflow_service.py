"""Workflow execution simulation service."""
import logging
import random
import time
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.models import Action, WorkflowExecution, AuditLog

logger = logging.getLogger("actionos")


INTEGRATION_SIMULATIONS = {
    "jira": {
        "name": "Jira",
        "action": "Create Task",
        "success_message": "Jira task created in project APEX-{ticket}",
        "fields": ["summary", "assignee", "priority", "due_date"],
    },
    "slack": {
        "name": "Slack",
        "action": "Send Notification",
        "success_message": "Slack notification sent to #{channel}",
        "fields": ["channel", "message", "mention"],
    },
    "crm": {
        "name": "Salesforce CRM",
        "action": "Update Record",
        "success_message": "CRM account record updated — ref #{ref}",
        "fields": ["account_id", "status", "notes"],
    },
    "email": {
        "name": "Email",
        "action": "Send Notification",
        "success_message": "Email notification sent to {owner}",
        "fields": ["to", "subject", "body"],
    },
}


def simulate_execution(action_id: int, db: Session) -> list[dict]:
    """
    Simulate workflow execution for an approved action.
    Returns list of execution results.
    """
    action = db.query(Action).filter(Action.id == action_id).first()
    if not action:
        raise ValueError(f"Action {action_id} not found")

    if action.status != "approved":
        raise ValueError(f"Action must be approved before execution (current status: {action.status})")

    executions = []
    
    # Determine which integrations to run based on action type
    integrations = _select_integrations(action)

    for integration_key in integrations:
        config = INTEGRATION_SIMULATIONS.get(integration_key, {})
        
        # Simulate processing delay
        time.sleep(0.1)
        
        # Generate simulated result
        ticket_num = random.randint(1000, 9999)
        ref_num = f"SIM-{random.randint(10000, 99999)}"
        channel = _get_channel(action)
        
        success_msg = config.get("success_message", "Simulated execution completed").format(
            ticket=ticket_num,
            channel=channel,
            ref=ref_num,
            owner=action.owner or "team",
        )

        exec_record = WorkflowExecution(
            action_id=action_id,
            integration=integration_key,
            status="simulated",
            result_message=success_msg,
            simulation_note="⚠ Prototype Integration — Simulated Execution (not connected to live systems)",
        )
        db.add(exec_record)
        
        executions.append({
            "integration": integration_key,
            "integration_name": config.get("name", integration_key),
            "action": config.get("action", "Execute"),
            "status": "simulated",
            "message": success_msg,
            "simulation_note": "Prototype Integration — Simulated",
            "timestamp": datetime.utcnow().isoformat(),
        })

    # Update action status
    action.status = "executed"
    action.executed_at = datetime.utcnow()

    # Audit log
    log = AuditLog(
        operation=f"Workflow executed (simulated): {action.title[:80]}",
        source_type="HUMAN",
        workspace_id=action.workspace_id,
        analysis_id=action.analysis_id,
        entity_type="action",
        entity_id=action_id,
        approval_status="executed",
        result=f"{len(executions)} integrations simulated",
    )
    db.add(log)
    db.commit()

    logger.info(f"[Action {action_id}] Simulated execution: {len(executions)} integrations")
    return executions


def _select_integrations(action: Action) -> list[str]:
    """Select appropriate integrations based on action content."""
    title_lower = action.title.lower()
    owner_lower = (action.owner or "").lower()
    integrations = ["jira"]  # Always create task

    if any(word in title_lower for word in ["notify", "communicate", "inform", "contact", "email", "send"]):
        integrations.append("email")
    
    if any(word in owner_lower for word in ["procurement", "finance", "operations", "product", "engineering"]):
        integrations.append("slack")
    
    if any(word in title_lower for word in ["customer", "crm", "account", "client"]):
        integrations.append("crm")

    if len(integrations) == 1:
        integrations.append("slack")

    return integrations


def _get_channel(action: Action) -> str:
    """Get Slack channel based on action owner/team."""
    owner = (action.owner or "").lower()
    mapping = {
        "engineering": "engineering-apex",
        "procurement": "procurement-team",
        "finance": "finance-ops",
        "operations": "ops-governance",
        "product": "product-team",
        "qa": "qa-team",
    }
    for key, channel in mapping.items():
        if key in owner:
            return channel
    return "general-ops"
