# web-scraping-assignment

## Overview
A Bun-based data scraping and transformation pipeline to fetch and convert issue data from Apache Jira (HADOOP, SPARK, KAFKA projects) to a structured JSONL dataset for LLM training.

## Architecture
- **Scraper**: Progresses over issues project-by-project, paginating and resuming from last successful fetch using a local state file (`data/state.json`).
- **Data Fetching**: Uses the Jira REST API (`/search`) with retries and rate limit handling.
- **Transformation**: Converts raw issues/comments into JSONL, with all requested metadata and a derived summarization entry per issue.
- **Persistence**: Output written as one JSONL file per project.

## Setup & Usage
To install dependencies:
```bash
bun install
```
To run:
```bash
bun run index.ts
```

## Fault Tolerance, Edge Cases & Optimization
- **Resumability**: Automatically resumes using the state file if interrupted.
- **Rate Limiting**: Explicitly detects HTTP 429, waits for `Retry-After` (or defaults to 10 seconds), and retries.
- **Retries**: All transient errors and 5xx responses are retried up to 5 times using exponential backoff.
- **Malformed/empty data**: Skips/logs corrupted issues or comments.
- **Network Faults**: Handles timeouts and network issues gracefully.

## Edge Cases Handled
- Intermittent API failure (retry)
- Rate limits (pause/retry)
- Missing or malformed fields in Jira objects

## Potential Improvements
- More advanced exponential backoff or dynamic retry delays
- Configurable project/field selection
- Add more derived LLM tasks in transformation
- Tests and CI integration

## Contributors & Licenses
- Please contact maintainers listed in repository for questions/changes.

This project was created with `bun init` in bun v1.3.1. [Bun](https://bun.com) is a fast JS runtime.
