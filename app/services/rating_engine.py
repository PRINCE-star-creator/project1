"""Transparent rating engine with weighted review formula and Bayesian smoothing."""
from typing import Dict, Any, Optional
from datetime import datetime, timezone, timedelta
import math

class RatingEngine:
    """
    Rating engine implementing the transparent formula from §22-§26.
    
    Formula (§23):
    Wᵢ = 0.55·S★ + 0.20·S_NLP + 0.10·Trust + 0.05·Helpfulness + 0.10·Recency
    
    Where:
    - S★ = normalized star rating (0-1)
    - S_NLP = normalized NLP sentiment score (0-1)
    - Trust = trust score (0-1)
    - Helpfulness = helpfulness ratio (0-1)
    - Recency = time decay factor (0-1)
    """
    
    def __init__(self,
                 star_weight:float=0.55,
                 nlp_weight:float=0.20,
                 trust_weight:float=0.10,
                 helpfulness_weight:float=0.05,
                 recency_weight:float=0.10,
                 recency_lambda:float=0.01,
                 smoothing_prior_strength:float=5.0,
                 smoothing_prior:float=0.75):
        """
        Initialize rating engine with configurable weights.
        
        Args:
            star_weight: Weight for star rating signal (default 0.55)
            nlp_weight: Weight for NLP sentiment signal (default 0.20)
            trust_weight: Weight for trust score (default 0.10)
            helpfulness_weight: Weight for helpfulness (default 0.05)
            recency_weight: Weight for recency decay (default 0.10)
            recency_lambda: Lambda for exponential decay (default 0.01)
            smoothing_prior_strength: Prior strength m for Bayesian smoothing (default 5.0)
            smoothing_prior: Global prior for Bayesian smoothing (default 0.75)
        """
        self.star_weight=star_weight
        self.nlp_weight=nlp_weight
        self.trust_weight=trust_weight
        self.helpfulness_weight=helpfulness_weight
        self.recency_weight=recency_weight
        self.recency_lambda=recency_lambda
        self.smoothing_prior_strength=smoothing_prior_strength
        self.smoothing_prior=smoothing_prior
    
    def normalize_star_rating(self,star_rating:Optional[int])->float:
        """
        Normalize star rating to [0,1] range (§22).
        
        Formula: S★ = (stars - 1) / 4
        """
        if star_rating is None:
            return 0.5  # Neutral default
        return max(0.0, min(1.0, (star_rating - 1) / 4))
    
    def normalize_sentiment_score(self,sentiment_label:str,sentiment_score:float)->float:
        """
        Normalize sentiment to [0,1] range (§22).
        
        Mapping:
        Negative = 0.0
        Neutral  = 0.5
        Positive = 1.0
        """
        if sentiment_label=='Positive':
            return min(1.0, max(0.0, sentiment_score))
        elif sentiment_label=='Negative':
            return max(0.0, min(1.0, sentiment_score))
        else:  # Neutral
            return 0.5
    
    def calculate_recency(self,review_date:Optional[datetime])->float:
        """
        Calculate recency decay factor (§22).
        
        Formula: recency = exp(-lambda × age_in_days)
        """
        if review_date is None:
            return 0.5  # Neutral default for unknown dates
        
        now=datetime.now(timezone.utc)
        age_days=(now - review_date).total_seconds() / 86400
        
        # Exponential decay
        recency=math.exp(-self.recency_lambda * age_days)
        return max(0.0, min(1.0, recency))
    
    def calculate_helpfulness(self,helpful_votes:int,total_votes:int)->float:
        """
        Calculate helpfulness ratio (§22).
        
        Formula: helpfulness = helpful_votes / max(total_votes, 1)
        """
        if total_votes is None or total_votes==0:
            return 0.5  # Neutral default
        return helpful_votes / max(total_votes, 1)
    
    def calculate_review_weight(self,review_data:Dict[str,Any])->Dict[str,Any]:
        """
        Calculate the review weight using the transparent formula (§23).
        
        Returns:
            Dictionary with all signal components and final weight
        """
        # Extract signals
        star_rating=review_data.get('star_rating')
        sentiment_label=review_data.get('sentiment','Neutral')
        sentiment_score=review_data.get('sentiment_score',0.5)
        trust_score=review_data.get('trust_score',0.8)
        helpful_votes=review_data.get('helpful_votes',0)
        total_votes=review_data.get('total_votes',0)
        review_date=review_data.get('review_date')
        
        # Normalize each signal to [0,1]
        s_star=self.normalize_star_rating(star_rating)
        s_nlp=self.normalize_sentiment_score(sentiment_label,sentiment_score)
        s_trust=max(0.0, min(1.0, trust_score))
        s_helpfulness=self.calculate_helpfulness(helpful_votes,total_votes)
        s_recency=self.calculate_recency(review_date)
        
        # Calculate weighted sum (§23)
        weight=(
            self.star_weight * s_star +
            self.nlp_weight * s_nlp +
            self.trust_weight * s_trust +
            self.helpfulness_weight * s_helpfulness +
            self.recency_weight * s_recency
        )
        
        # Convert back to 1-5 scale (§24)
        equivalent_rating=1 + 4 * weight
        
        return {
            'weight':round(weight, 3),
            'equivalent_rating':round(equivalent_rating, 2),
            'components':{
                'star_signal':round(s_star, 3),
                'nlp_signal':round(s_nlp, 3),
                'trust':round(s_trust, 3),
                'helpfulness':round(s_helpfulness, 3),
                'recency':round(s_recency, 3)
            },
            'raw_values':{
                'star_rating':star_rating,
                'sentiment_label':sentiment_label,
                'sentiment_score':round(sentiment_score, 3),
                'trust_score':round(trust_score, 3),
                'helpful_votes':helpful_votes,
                'total_votes':total_votes
            }
        }
    
    def calculate_product_rating(self,review_weights:List[Dict[str,Any]])->Dict[str,Any]:
        """
        Calculate weighted product rating (§24).
        
        Formula:
        PlatformRating = 1 + 4 × [ Σ(Qᵢ × Wᵢ) / Σ(Wᵢ) ]
        
        Where Qᵢ = Wᵢ (normalized review score = weight)
        """
        if not review_weights:
            return {
                'rating':None,
                'count':0,
                'message':'No reviews yet'
            }
        
        total_weight=sum(r['weight'] for r in review_weights)
        weighted_sum=sum(r['weight'] * r['weight'] for r in review_weights)
        
        if total_weight==0:
            return {
                'rating':None,
                'count':len(review_weights),
                'message':'No valid review weights'
            }
        
        # Calculate weighted average
        weighted_average=weighted_sum / total_weight
        platform_rating=1 + 4 * weighted_average
        
        return {
            'rating':round(platform_rating, 2),
            'count':len(review_weights),
            'total_weight':round(total_weight, 2),
            'weighted_average':round(weighted_average, 3)
        }
    
    def apply_bayesian_smoothing(self,observed_mean:float,review_count:int)->Dict[str,Any]:
        """
        Apply Bayesian smoothing (§25).
        
        Formula:
        SmoothedMean = (v / (v + m)) × observed_mean + (m / (v + m)) × global_prior
        
        Where:
        - v = effective weighted review volume
        - m = configurable prior strength
        - observed_mean = product weighted mean
        - global_prior = configurable baseline
        """
        if review_count==0:
            return {
                'smoothed_mean':self.smoothing_prior,
                'observed_mean':None,
                'effective_volume':0
            }
        
        v=review_count
        m=self.smoothing_prior_strength
        
        smoothing_factor=v / (v + m)
        prior_factor=m / (v + m)
        
        smoothed_mean=smoothing_factor * observed_mean + prior_factor * self.smoothing_prior
        
        # Convert back to 1-5 scale
        smoothed_rating=1 + 4 * smoothed_mean
        
        return {
            'smoothed_mean':round(smoothed_mean, 3),
            'smoothed_rating':round(smoothed_rating, 2),
            'observed_mean':round(observed_mean, 3),
            'effective_volume':v,
            'prior_strength':m,
            'global_prior':self.smoothing_prior
        }

# Global rating engine instance
rating_engine=RatingEngine()
