// ---------------------------------------------------------------------------
// Condition Runner — evaluates condition nodes
// ---------------------------------------------------------------------------

import type { ConditionNode } from '@toa/shared';
import type { ExecutionContext } from './context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConditionRunnerResult {
  /** The output port ID that should be activated. */
  activePortId: string;
  /** The label of the matched condition (if any). */
  matchedLabel: string;
  /** All evaluated conditions with their boolean results. */
  evaluations: Array<{
    conditionId: string;
    label: string;
    expression: string;
    result: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// Expression Evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluate a condition expression against the provided data context.
 *
 * Supports:
 * - Simple comparisons: `value == "foo"`, `count > 10`
 * - Logical operators: `&&`, `||`, `!`
 * - Property access: `data.field`, `input.name`
 * - String methods: `text.includes("word")`
 * - Truthiness checks: `value` (checks for truthy)
 *
 * The expression is evaluated in a restricted scope where `data` contains
 * the resolved inputs for the condition node.
 */
function evaluateExpression(
  expression: string,
  data: Record<string, unknown>,
): boolean {
  try {
    // Build a function that has access to all data keys as local variables
    const keys = Object.keys(data);
    const values = Object.values(data);

    // Also provide common helpers
    const fn = new Function(
      ...keys,
      'data',
      `"use strict";
      try {
        return Boolean(${expression});
      } catch (e) {
        return false;
      }`,
    );

    return Boolean(fn(...values, data));
  } catch {
    // If the expression can't be compiled, return false
    return false;
  }
}

// ---------------------------------------------------------------------------
// If/Else Evaluator
// ---------------------------------------------------------------------------

function evaluateIfElse(
  node: ConditionNode,
  inputs: Record<string, unknown>,
): ConditionRunnerResult {
  const conditions = node.data.conditions ?? [];
  const evaluations: ConditionRunnerResult['evaluations'] = [];

  for (const condition of conditions) {
    const result = evaluateExpression(condition.expression, inputs);
    evaluations.push({
      conditionId: condition.id,
      label: condition.label,
      expression: condition.expression,
      result,
    });

    if (result) {
      return {
        activePortId: condition.outputPortId,
        matchedLabel: condition.label,
        evaluations,
      };
    }
  }

  // No condition matched — use default port
  const defaultPortId = node.data.defaultOutputPortId ?? 'false';
  return {
    activePortId: defaultPortId,
    matchedLabel: 'default',
    evaluations,
  };
}

// ---------------------------------------------------------------------------
// Switch Evaluator
// ---------------------------------------------------------------------------

function evaluateSwitch(
  node: ConditionNode,
  inputs: Record<string, unknown>,
): ConditionRunnerResult {
  const conditions = node.data.conditions ?? [];
  const evaluations: ConditionRunnerResult['evaluations'] = [];

  // In switch mode, each condition's expression is compared for equality
  // against the "switchValue" in the inputs, or evaluated as a standalone expression.
  for (const condition of conditions) {
    const result = evaluateExpression(condition.expression, inputs);
    evaluations.push({
      conditionId: condition.id,
      label: condition.label,
      expression: condition.expression,
      result,
    });

    if (result) {
      return {
        activePortId: condition.outputPortId,
        matchedLabel: condition.label,
        evaluations,
      };
    }
  }

  const defaultPortId = node.data.defaultOutputPortId ?? 'default';
  return {
    activePortId: defaultPortId,
    matchedLabel: 'default',
    evaluations,
  };
}

// ---------------------------------------------------------------------------
// LLM Router Evaluator
// ---------------------------------------------------------------------------

/**
 * LLM-based routing uses the Anthropic API to classify input.
 * For now this is a stub that picks the first option.
 * In production, this would call the API with the routing prompt.
 */
async function evaluateLlmRouter(
  node: ConditionNode,
  inputs: Record<string, unknown>,
): Promise<ConditionRunnerResult> {
  const config = node.data.llmRouterConfig;
  if (!config) {
    throw new Error(
      `LLM router condition "${node.id}" is missing llmRouterConfig.`,
    );
  }

  // Build a simple heuristic: check if the input text contains keywords
  // matching any option's label or description. This is a stub — the real
  // implementation would call an LLM.
  const inputText = JSON.stringify(inputs).toLowerCase();

  for (const option of config.options) {
    const keywords = [
      option.label.toLowerCase(),
      option.description.toLowerCase(),
    ];
    const matches = keywords.some((kw) => inputText.includes(kw));
    if (matches) {
      return {
        activePortId: option.outputPortId,
        matchedLabel: option.label,
        evaluations: config.options.map((o) => ({
          conditionId: o.outputPortId,
          label: o.label,
          expression: `LLM route: ${o.description}`,
          result: o.outputPortId === option.outputPortId,
        })),
      };
    }
  }

  // Default to first option if no keyword match
  const fallback = config.options[0]!;
  return {
    activePortId: fallback.outputPortId,
    matchedLabel: fallback.label,
    evaluations: config.options.map((o) => ({
      conditionId: o.outputPortId,
      label: o.label,
      expression: `LLM route: ${o.description}`,
      result: o.outputPortId === fallback.outputPortId,
    })),
  };
}

// ---------------------------------------------------------------------------
// Main Dispatcher
// ---------------------------------------------------------------------------

/**
 * Evaluate a condition node and determine which output port to activate.
 *
 * Routes based on `conditionType`:
 * - `if_else` — evaluates conditions top-to-bottom, activates first truthy
 * - `switch` — similar to if_else but semantically a switch statement
 * - `llm_router` — uses LLM to classify input to an output port
 */
export async function runConditionNode(
  node: ConditionNode,
  context: ExecutionContext,
): Promise<ConditionRunnerResult> {
  const inputs = context.getInputsFor(node.id);

  switch (node.data.conditionType) {
    case 'if_else':
      return evaluateIfElse(node, inputs);

    case 'switch':
      return evaluateSwitch(node, inputs);

    case 'llm_router':
      return evaluateLlmRouter(node, inputs);

    default:
      throw new Error(
        `Unknown condition type "${node.data.conditionType}" on node "${node.id}".`,
      );
  }
}
