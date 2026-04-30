# Token Cost Analysis Across Claude Models

Based on 243 captures from 143+ sites. Token counts from ViewGraph experiments.

**Last updated:** 2026-04-29 | **Pricing source:** Anthropic API (April 2026)

## Model Pricing (Output Tokens)

| Model | Input $/M | Output $/M | Use Case |
|---|---|---|---|
| Claude 3.5 Sonnet (legacy) | $3.00 | $15.00 | Legacy coding agent baseline |
| Claude Sonnet 4.6 | $3.00 | $15.00 | Current recommended for coding |
| Claude Opus 4.6 | $5.00 | $25.00 | Complex reasoning, multi-step |
| Claude Opus 4.7 | $5.00 | $25.00 | Latest flagship, 87.6% SWE-bench |
| Claude Haiku 4.5 | $1.00 | $5.00 | Speed tier, simple tasks |

## Cost Per 10-Step Task

A "task" = 10-step bug fix: capture page, read annotations, find source, fix code, re-capture, verify. Token counts measured from 243 real captures.

| Mode | Tokens | Sonnet 4.6 ($15/M out) | Opus 4.6 ($25/M out) | Opus 4.7 ($25/M out) | Haiku 4.5 ($5/M out) |
|---|---|---|---|---|---|
| **v2 full captures** | ~1,000,000 | **$15.00** | **$25.00** | **$25.00** | **$5.00** |
| **v3 smart mode** | ~32,000 | **$0.48** | **$0.80** | **$0.80** | **$0.16** |
| **v3 interactive-only** | ~4,000 | **$0.06** | **$0.10** | **$0.10** | **$0.02** |
| **v3 receipt only** | ~250 | **$0.004** | **$0.006** | **$0.006** | **$0.001** |

## Monthly Cost (50 tasks/day, 30 days)

| Mode | Sonnet 4.6 | Opus 4.6 | Opus 4.7 | Haiku 4.5 |
|---|---|---|---|---|
| **v2 full captures** | $22,500 | $37,500 | $37,500 | $7,500 |
| **v3 smart mode** | $720 | $1,200 | $1,200 | $240 |
| **v3 interactive-only** | $90 | $150 | $150 | $30 |
| **Monthly savings (v2 → v3 smart)** | **$21,780** | **$36,300** | **$36,300** | **$7,260** |

## Savings Percentage

| Transition | Savings |
|---|---|
| v2 → v3 smart mode | **97%** (all models) |
| v2 → v3 interactive-only | **99.6%** (all models) |
| v2 → v3 receipt | **99.97%** (all models) |

The percentage savings are model-independent - they depend on token count reduction, not pricing. ViewGraph v3 saves 97% regardless of which model you use.

## The Real Impact: Opus Becomes Affordable

Without ViewGraph v3, using Opus 4.7 (the best coding model) for UI bug fixes costs $37,500/month. With v3 smart mode, it costs $1,200/month. **ViewGraph makes the best model economically viable for UI work.**

| Scenario | Without ViewGraph | With ViewGraph v3 |
|---|---|---|
| Opus 4.7, 50 tasks/day | $37,500/month | $1,200/month |
| Sonnet 4.6, 50 tasks/day | $22,500/month | $720/month |
| Haiku 4.5, 50 tasks/day | $7,500/month | $240/month |

## Methodology

- **Token counts:** Measured from 243 captures across 143+ sites (4 projects + 3 bulk experiment sets)
- **10-step task:** 1 full capture (25K compact) + 9 delta receipts (200 each) + targeted reads (5K total) = ~32K tokens
- **v2 baseline:** 100K tokens per full capture × 10 steps = ~1M tokens
- **Pricing:** Anthropic API output pricing as of April 2026. Input tokens are cheaper but output dominates agent workflows (agent generates fixes, not just reads).
- **50 tasks/day:** Conservative estimate for a team of 3-5 developers using AI agents for UI work.
