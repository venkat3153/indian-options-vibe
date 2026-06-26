# July Manual Live-Test v1 Status

## Version Purpose

This version is for personal July testing only.

The system is a decision-support and discipline tool. It does not place orders.

## Execution Rule

- Manual Dhan execution only
- No auto orders
- No MCP order execution
- 1 lot options or 1 stock quantity only
- Final Live Permission must be ALLOWED before manual execution

## Main Daily Flow

1. Workflow Home
2. Dhan Readiness
3. Daily Startup
4. Stocks Research
5. Stock Detail Final Live Permission
6. Live Test Log
7. Daily Close

## Hard Blocks

Do not execute if any of these are blocked:

- Dhan Readiness
- Rules Gate
- Discipline Lock
- Daily Risk Budget
- Final Live Permission
- 1:2 RR room
- Live test daily limit

## Current Mode

July Mode Active:

- Manual Dhan Controlled Live Test
- 1 lot / 1 quantity
- Auto order disabled
- Permission required

## What is intentionally NOT enabled

- No auto trading
- No Dhan order placement
- No MCP execution
- No multi-lot testing
- No scaling
- No live capital increase

## Next Phase After July Testing

Only after collecting real data:

- Dhan read-only sync improvement
- Supabase persistence for live logs
- MCP read-only assistant connection
- Better reporting
- Possible controlled automation later, only after proof
