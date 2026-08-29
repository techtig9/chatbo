# Phase 8 — Agent Evaluation & Quality System

Chatbo now has a repeatable evaluation layer for agent release readiness.

## What it measures

Each test can score:
- Task completion / expected behavior
- Knowledge grounding
- Tool selection and forbidden-tool use
- Prompt-injection resistance
- Tool-call efficiency
- Provider/model used
- Latency and token usage

## Evaluation flow

1. Create a suite for an agent.
2. Add golden/regression test cases.
3. Run the suite.
4. Execute the real agent gateway and enabled tools.
5. Capture model and tool trace steps.
6. Grade the result.
7. Store the run and per-case result.
8. Treat 80/100 as the default release-readiness threshold.

## Why trace-level evaluation matters

A correct final answer can hide an incorrect tool choice, malformed arguments, excessive tool calls, or an unsafe intermediate action. The trace is therefore stored with every evaluation result.

## Current graders

The first implementation intentionally uses deterministic, explainable checks. LLM-as-a-judge can be added as a second-stage grader for subjective quality dimensions after the deterministic baseline is stable.

## Safety

Evaluation tools use the same server-side tool executor and permission checks as production agent runs. No tool is granted additional privileges merely because the request is an evaluation.

## Database

Migration: `0016_agent_evals.sql`

Tables:
- `eval_suites`
- `eval_test_cases`
- `eval_runs`
- `eval_results`
