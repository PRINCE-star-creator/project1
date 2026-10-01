# Rating Engine

Default review weight:

`W = 0.55*Star + 0.20*NLP + 0.10*Trust + 0.05*Helpfulness + 0.10*Recency`

`Star = (stars - 1) / 4`

`Recency = exp(-lambda * age_days)` with configurable lambda.

The implementation then aggregates normalized review signals and applies Bayesian prior smoothing with `m=5` and normalized prior `0.75`. This is an application-specific transparent formula, not a replication of any retailer's private algorithm.
