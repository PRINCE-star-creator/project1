"""
Real-world eCommerce Rating Algorithms
Implements:
1. Empirical Bayesian Smoothed Rating (IMDb / Amazon ranking algorithm)
2. Sentiment-Calibrated Blended Rating (protects against star-text dissonance & review bombing)
3. Wilson Score Confidence Interval (statistical lower-bound for customer satisfaction %)
"""
import math
from typing import List, Dict, Any, Optional

CATALOG_GLOBAL_PRIOR = 4.2
MIN_PRIOR_WEIGHT = 3.0

def calculate_bayesian_rating(
    ratings: List[float],
    min_prior: float = MIN_PRIOR_WEIGHT,
    prior_mean: float = CATALOG_GLOBAL_PRIOR
) -> float:
    """
    Computes Empirical Bayesian Average:
    R_adj = (v * R_mean + m * C) / (v + m)
    where:
    - v = number of reviews
    - R_mean = arithmetic average rating
    - m = minimum weight threshold (smoothing factor)
    - C = global catalog mean rating
    """
    if not ratings:
        return prior_mean
    v = len(ratings)
    r_mean = sum(ratings) / v
    bayes_val = (v * r_mean + min_prior * prior_mean) / (v + min_prior)
    return round(bayes_val, 1)

def calculate_sentiment_adjusted_rating(
    star_ratings: List[float],
    sentiment_compounds: Optional[List[float]] = None,
    min_prior: float = MIN_PRIOR_WEIGHT,
    prior_mean: float = CATALOG_GLOBAL_PRIOR
) -> Dict[str, Any]:
    """
    Computes comprehensive production rating metrics:
    - Raw arithmetic average
    - Bayesian smoothed average
    - NLP Sentiment-implied star rating (from VADER compound scores)
    - Blended production score (80% Bayesian star + 20% NLP consensus)
    - Full 5-star distribution breakdown
    """
    if not star_ratings:
        return {
            'rating': prior_mean,
            'raw_star_average': prior_mean,
            'bayesian_rating': prior_mean,
            'sentiment_star_average': prior_mean,
            'review_count': 0,
            'distribution': {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        }

    v = len(star_ratings)
    raw_star_avg = sum(star_ratings) / v
    bayes_val = (v * raw_star_avg + min_prior * prior_mean) / (v + min_prior)

    # Convert sentiment compound scores (-1.0 to +1.0) into star scale (1.0 to 5.0)
    # Formula: Star = 1.0 + 4.0 * ((compound + 1.0) / 2.0)
    if sentiment_compounds and len(sentiment_compounds) > 0:
        sentiment_stars = [
            1.0 + 4.0 * ((max(-1.0, min(1.0, c)) + 1.0) / 2.0)
            for c in sentiment_compounds
        ]
        sentiment_star_avg = sum(sentiment_stars) / len(sentiment_stars)
        # Weighted blend: 80% Bayesian Stars + 20% NLP Sentiment Consensus
        blended = (0.80 * bayes_val) + (0.20 * sentiment_star_avg)
    else:
        sentiment_star_avg = bayes_val
        blended = bayes_val

    final_rating = round(min(5.0, max(1.0, blended)), 1)

    # 5-star distribution with string keys for MongoDB BSON compatibility
    dist = {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}
    for r in star_ratings:
        int_star = str(int(round(r)))
        if int_star in dist:
            dist[int_star] += 1

    return {
        'rating': final_rating,
        'raw_star_average': round(raw_star_avg, 2),
        'bayesian_rating': round(bayes_val, 2),
        'sentiment_star_average': round(sentiment_star_avg, 2),
        'review_count': v,
        'distribution': dist
    }

def calculate_wilson_score_interval(
    positive_count: int,
    total_count: int,
    confidence_z: float = 1.96
) -> Dict[str, Any]:
    """
    Wilson Score Interval for binomial proportion (positive reviews / total reviews).
    Used in production (e.g. Reddit, Amazon, Yelp) to provide a statistically sound
    estimate of the true underlying customer satisfaction percentage.
    """
    if total_count <= 0:
        return {
            'positive_pct': 80,
            'wilson_lower_pct': 70.0,
            'wilson_upper_pct': 90.0,
            'is_statistically_significant': False
        }

    p = positive_count / total_count
    z = confidence_z
    z2 = z * z
    n = total_count

    denominator = 1.0 + (z2 / n)
    center = p + (z2 / (2.0 * n))
    spread = z * math.sqrt((p * (1.0 - p) + (z2 / (4.0 * n))) / n)

    lower_bound = max(0.0, (center - spread) / denominator)
    upper_bound = min(1.0, (center + spread) / denominator)

    raw_pct = round(p * 100)
    lower_pct = round(lower_bound * 100, 1)
    upper_pct = round(upper_bound * 100, 1)

    return {
        'positive_pct': raw_pct,
        'wilson_lower_pct': lower_pct,
        'wilson_upper_pct': upper_pct,
        'is_statistically_significant': total_count >= 5
    }
