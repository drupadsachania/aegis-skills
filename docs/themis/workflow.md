# Workflow

Themis runs one workflow definition, `THEMIS_WORKFLOW` in `@aegis-skills/themis-core`, in both modes. It has seven steps.

## Steps

| Step | Kind | What happens |
|---|---|---|
| `validate` | deterministic | Cleans the task (control characters removed, at most 4000 characters, no long base64 blocks, no `<script` or `javascript:`) and checks the context (at most 20 environments and 20 attack-surface tags). |
| `decompose` | reasoning | Plans the task as sub-tasks, each assigned to one Aegis skill. Unknown skills are dropped, at most 8 sub-tasks are kept, and dependency cycles are broken. |
| `schedule` | deterministic | Works out which sub-tasks are ready, given their dependencies. |
| `fanout` | reasoning | Runs the ready sub-tasks and returns findings with a confidence of high, medium or low. |
| `guardrail` | reasoning | Gives each result a verdict: `PASS`, `FLAG` or `BLOCK`. A result containing a secret is always `BLOCK`, whatever verdict is given, and an unknown verdict counts as `BLOCK`. |
| `synthesise` | reasoning | Writes the report from the results that were not blocked. |
| `audit` | deterministic | Completes the run once a report exists. |

Deterministic steps are plain code and behave the same in both modes. Reasoning steps are done by your assistant (plugin) or by the configured model (standalone).

## Transitions and guards

| From | To | Guard checked before entering the next step |
|---|---|---|
| `validate` | `decompose` | The task is not empty after validation. |
| `decompose` | `schedule` | The plan has at most 8 sub-tasks. |
| `schedule` | `fanout` | At least one sub-task is ready. Chosen while sub-tasks are ready to dispatch. |
| `schedule` | `guardrail` | Every sub-task has finished. Chosen when nothing is left to dispatch. |
| `fanout` | `schedule` | The plan has at most 8 sub-tasks, so dependent sub-tasks run in later rounds. |
| `guardrail` | `synthesise` | Every result has a guardrail verdict. |
| `synthesise` | `audit` | A report exists. |
| `audit` | end | The run completes. |

If a guard fails, the run ends as `failed` with the reason. If a reasoning step's output has the wrong shape, the call is rejected and the run is unchanged, so the step can be retried.

## Run states

A run is `running`, `awaiting_approval`, `completed` or `failed`. The standalone app sets `awaiting_approval` while a tool action waits for a human, and the run resumes when the last pending approval is decided.

## One definition, two runtimes

The plugin runs the definition directly: it executes the deterministic steps itself and hands your assistant the prompt for each reasoning step. The standalone app maps each step onto a LangGraph node, so the graph is built from the same definition.
