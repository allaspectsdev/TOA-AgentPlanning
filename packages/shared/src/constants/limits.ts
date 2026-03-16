// ---------------------------------------------------------------------------
// System Limits
// ---------------------------------------------------------------------------

/** Maximum number of nodes allowed in a single workflow. */
export const MAX_NODES_PER_WORKFLOW = 200;

/** Maximum number of edges allowed in a single workflow. */
export const MAX_EDGES_PER_WORKFLOW = 500;

/** Maximum wall-clock time (in minutes) for a single execution. */
export const MAX_EXECUTION_TIME_MINUTES = 60;

/** Maximum number of concurrent executions per organisation. */
export const MAX_CONCURRENT_EXECUTIONS_PER_ORG = 50;

/** Maximum number of concurrent executions per workflow. */
export const MAX_CONCURRENT_EXECUTIONS_PER_WORKFLOW = 10;

/** Maximum number of versions retained per workflow. */
export const MAX_VERSIONS_PER_WORKFLOW = 100;

/** Maximum depth for nested subflow invocations. */
export const MAX_SUBFLOW_DEPTH = 5;

/** Maximum number of retries for a single node execution. */
export const MAX_NODE_RETRIES = 5;

/** Maximum number of agents in a team node. */
export const MAX_AGENTS_PER_TEAM = 20;

/** Maximum rounds in a team deliberation pattern. */
export const MAX_TEAM_ROUNDS = 50;

/** Maximum size (in bytes) of a single execution input payload. */
export const MAX_EXECUTION_INPUT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Maximum size (in bytes) of a single step output. */
export const MAX_STEP_OUTPUT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Maximum number of workflow variables. */
export const MAX_WORKFLOW_VARIABLES = 100;

/** Maximum number of environments per workflow. */
export const MAX_ENVIRONMENTS_PER_WORKFLOW = 10;

/** Maximum number of tags per workflow. */
export const MAX_TAGS_PER_WORKFLOW = 20;

/** Maximum length for a single tag string. */
export const MAX_TAG_LENGTH = 50;

/** Maximum length for workflow name. */
export const MAX_WORKFLOW_NAME_LENGTH = 128;

/** Maximum length for workflow description. */
export const MAX_WORKFLOW_DESCRIPTION_LENGTH = 2000;

/** Maximum length for a node label. */
export const MAX_NODE_LABEL_LENGTH = 100;

/** Maximum length for an agent system prompt. */
export const MAX_SYSTEM_PROMPT_LENGTH = 100_000;

/** Gate timeout upper bound in minutes. */
export const MAX_GATE_TIMEOUT_MINUTES = 10_080; // 7 days

/** Default gate timeout in minutes. */
export const DEFAULT_GATE_TIMEOUT_MINUTES = 60;

/** Default temperature for new agent nodes. */
export const DEFAULT_AGENT_TEMPERATURE = 0.7;

/** Default max tokens for new agent nodes. */
export const DEFAULT_AGENT_MAX_TOKENS = 4096;

/** Maximum number of log entries retained per step. */
export const MAX_LOG_ENTRIES_PER_STEP = 1000;

/** Maximum number of workflows per project. */
export const MAX_WORKFLOWS_PER_PROJECT = 500;

/** Maximum number of projects per organisation. */
export const MAX_PROJECTS_PER_ORG = 100;
