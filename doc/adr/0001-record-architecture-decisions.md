# 1. Record Architecture Decisions

## Status

Accepted

## Context

We need to record the architectural decisions made on this project so that future contributors (and our future selves) can understand the reasoning behind the system's design.

## Decision

We will use Architecture Decision Records, as described by [Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

Each significant architectural decision will be captured in a short markdown file in `doc/adr/`, numbered sequentially.

## Consequences

- Developers must write an ADR for each significant architectural decision.
- ADRs are immutable once accepted — superseded decisions get a new ADR that references the old one.
- The `doc/adr/` directory serves as a lightweight architecture knowledge base.
