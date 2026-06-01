# Agent and AI Identities

## Purpose
Design secure identity and access patterns for AI agents and LLM-based systems, applying least privilege, capability scoping, and trust chain controls.

---

## 1. LLM Agent Identity Model

### Core Principles
```
1. Distinct identity per agent
   - Each agent has its own identity (not shared credentials)
   - Agent identity is named and attributed (auditability)
   - Identity type: OAuth 2.0 client credentials or capability token

2. Agent identity separate from user identity
   - An agent acting on behalf of a user does NOT have the user's full permissions
   - Agent has its own scoped permission set
   - Explicit delegation required from user to agent

3. Non-human identity management applies
   - Treat agent credentials like service accounts
   - Rotate credentials; store in secrets manager; audit usage
   - No ambient authority: agent cannot use credentials it wasn't explicitly given

4. Agent identity visibility
   - System should be able to identify which agent made any given API call
   - Include agent_id in audit logs, not just user context
```

---

## 2. Capability Scoping (Least Privilege for Agents)

### Design Principles
```
Agent permission boundary = minimum set of tools/APIs needed for the defined task

Examples:
  Research agent:     read:web-search, read:documents     (no write permissions)
  Email drafting:     read:calendar, write:email-draft    (no send permission)
  Code agent:         read:repo, write:feature-branch     (no merge/deploy)
  Customer service:   read:customer-record, write:ticket  (no billing access)

Deny-by-default:
  - Start with no permissions
  - Add only what is needed for the specific task
  - Reject requests for permissions not in the defined capability set
  - Log and alert on permission requests outside defined scope
```

### Tool Call Allowlist Pattern
```python
# Example: agent capability enforcement
AGENT_ALLOWED_TOOLS = {
    "research_agent": ["web_search", "read_document", "summarise"],
    "code_agent": ["read_file", "write_file", "run_tests"],
    "email_agent": ["read_calendar", "draft_email"]
    # Note: send_email NOT in email_agent — requires human approval
}

def validate_tool_call(agent_id: str, tool_name: str) -> bool:
    allowed = AGENT_ALLOWED_TOOLS.get(agent_id, [])
    if tool_name not in allowed:
        log_security_event(f"Agent {agent_id} attempted disallowed tool: {tool_name}")
        raise PermissionError(f"Agent {agent_id} not permitted to use {tool_name}")
    return True
```

---

## 3. Trust Chain Design

### Human → Orchestrator → Sub-Agent
```
Trust hierarchy:
  Level 1: Human user (highest trust)
  Level 2: Orchestrator agent (delegated by human, bounded permissions)
  Level 3: Sub-agent (delegated by orchestrator, further bounded)

Principles:
  - Trust does NOT flow up the chain (sub-agent cannot gain orchestrator's permissions)
  - Delegation must be explicit (no inherited ambient authority)
  - Each level can only delegate a SUBSET of its own permissions
  - Permission scope shrinks at each delegation step

Example:
  Human has: read, write, admin
  Human delegates to Orchestrator: read, write (not admin)
  Orchestrator delegates to Sub-Agent: read (not write)
  Sub-Agent cannot request write or admin — even if a malicious prompt asks for it
```

### Capability Token Pattern
```python
# Short-lived scoped token for agent task
import jwt, datetime

def create_agent_capability_token(
    agent_id: str, 
    task_id: str,
    allowed_tools: list,
    duration_minutes: int = 60
) -> str:
    payload = {
        "sub": agent_id,
        "task_id": task_id,
        "capabilities": allowed_tools,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=duration_minutes),
        "iat": datetime.datetime.utcnow(),
        "jti": str(uuid.uuid4())   # unique token ID for revocation
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="RS256")

# Token validation on each tool call
def validate_agent_token(token: str, requested_tool: str) -> bool:
    claims = jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"])
    return requested_tool in claims["capabilities"]
```

---

## 4. Authentication Patterns for Agents

### OAuth 2.0 Client Credentials (Machine-to-Machine)
```
Use when: agent needs to call external APIs on its own behalf (not user-delegated)

Flow:
  POST /oauth/token
    grant_type=client_credentials
    client_id=<agent-client-id>
    client_secret=<stored in secrets manager>
    scope=<minimum required scope>
  
  Returns: access_token (short-lived, 15-60 minutes)

Token storage: in-memory only; never persisted to disk; refresh on expiry
```

---

## 5. Prompt Injection Defence

### Input Sanitisation
```python
# Detect and block common prompt injection patterns
INJECTION_PATTERNS = [
    r"ignore (previous|all) (instructions|context)",
    r"you are now",
    r"forget (everything|all|your instructions)",
    r"system:.*override",
    r"<system>",
    r"\[INST\]",
    r"do not follow",
]

def sanitise_user_input(input_text: str) -> str:
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, input_text, re.IGNORECASE):
            raise ValueError("Potential prompt injection detected")
    return input_text
```

### Instruction Hierarchy Enforcement
```
Principle: System prompt instructions override user instructions.
           User instructions override external content.

Implementation:
  1. System prompt: define what agent can/cannot do (non-negotiable)
  2. Validate: agent responses do not violate system constraints
  3. Boundary: agent should refuse requests that violate system prompt constraints
  4. Monitoring: log when agent refuses requests; pattern-detect repeated injection attempts
```

---

## 6. Agent Monitoring and Kill Switch

```python
# Agent action logging
def log_agent_action(agent_id: str, action: str, tool: str, result: str):
    log_entry = {
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "agent_id": agent_id,
        "action": action,
        "tool": tool,
        "result_preview": result[:100],   # truncate PII risk
        "session_id": current_session_id
    }
    audit_logger.info(json.dumps(log_entry))

# Kill switch implementation
AGENT_KILL_SWITCH = {}   # agent_id -> True (killed)

def check_kill_switch(agent_id: str):
    if AGENT_KILL_SWITCH.get(agent_id, False):
        raise AgentTerminatedError(f"Agent {agent_id} has been terminated")

# Anomaly detection triggers for kill switch:
# - Unexpected tool calls outside defined capability set
# - Requests for credentials not in scope
# - Data exfiltration patterns (large read operations)
# - Repeated prompt injection attempts from agent output
```
