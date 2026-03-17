# packages/shared-types

TypeScript domain type definitions shared across all services and packages. The single source of truth for the system's data model.

**This package contains no runtime code** — only type declarations. It compiles to `.d.ts` files with no JavaScript output.

## Contents

| Module | Types defined |
|---|---|
| Channel types | `Channel`, `MessageDirection`, `ChannelMessage` |
| Customer & lead | `Customer`, `LeadStatus`, `LeadQualification`, `ProjectType` |
| Conversation | `ConversationContext`, `ConversationTurn` |
| Agent | `AgentToolName`, `AgentToolCall` |
| Events | `EventType`, `DomainEvent<T>` |
| Workflow | `WorkflowTrigger`, `FollowUpTask` |
| API | `ApiResponse<T>` |

## Usage

```typescript
import type { Customer, ConversationContext, DomainEvent } from '@dsa/shared-types';
```

## Change policy

Changes to types in this package are **breaking changes** for any service that uses them. The TypeScript compiler will surface all affected call sites when you make a change — fix all of them before merging. Do not add `// @ts-ignore` to suppress type errors caused by a type change.
