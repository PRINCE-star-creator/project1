"""Review trust/quality signals layer for explainable quality scoring."""
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
import re

class TrustSignals:
    """
    Trust/quality signals layer as specified in §27.
    
    Implements explainable quality signals with reason codes.
    Never classifies a review as fake based on sentiment alone.
    """
    
    def __init__(self,
                 duplicate_threshold:float=0.85,
                 velocity_threshold:int=5,
                 velocity_window_hours:int=24):
        """
        Initialize trust signals service.
        
        Args:
            duplicate_threshold: Similarity threshold for duplicate detection (default 0.85)
            velocity_threshold: Max reviews per hour before flagging (default 5)
            velocity_window_hours: Time window for velocity check (default 24 hours)
        """
        self.duplicate_threshold=duplicate_threshold
        self.velocity_threshold=velocity_threshold
        self.velocity_window_hours=velocity_window_hours
    
    def calculate_text_similarity(self,text1:str,text2:str)->float:
        """
        Calculate text similarity using simple Jaccard similarity.
        
        Returns:
            Similarity score between 0 and 1
        """
        if not text1 or not text2:
            return 0.0
        
        # Tokenize and normalize
        tokens1=set(re.findall(r'\w+', text1.lower()))
        tokens2=set(re.findall(r'\w+', text2.lower()))
        
        if not tokens1 or not tokens2:
            return 0.0
        
        # Jaccard similarity
        intersection=len(tokens1 & tokens2)
        union=len(tokens1 | tokens2)
        
        return intersection / union if union > 0 else 0.0
    
    def detect_duplicate_text(self,review_text:str,existing_reviews:List[Dict[str,Any]])->bool:
        """
        Detect if review text is duplicate of existing reviews.
        
        Returns:
            True if duplicate detected, False otherwise
        """
        for existing in existing_reviews:
            existing_text=existing.get('review_text','')
            similarity=self.calculate_text_similarity(review_text, existing_text)
            if similarity >= self.duplicate_threshold:
                return True
        return False
    
    def detect_high_velocity(self,student_id:str,review_count:int,first_review_time:Optional[datetime])->bool:
        """
        Detect unusually high review velocity.
        
        Returns:
            True if velocity is suspicious, False otherwise
        """
        if first_review_time is None:
            return False
        
        time_since_first=datetime.now(timezone.utc) - first_review_time
        hours=time_since_first.total_seconds() / 3600
        
        if hours < self.velocity_window_hours and review_count > self.velocity_threshold:
            return True
        
        return False
    
    def detect_star_text_mismatch(self,star_rating:int,sentiment_label:str)->bool:
        """
        Detect potential mismatch between star rating and text sentiment.
        
        Returns:
            True if suspicious mismatch detected, False otherwise
        """
        # This is a heuristic, not definitive proof of fraud
        if star_rating >= 4 and sentiment_label == 'Negative':
            return True
        if star_rating <= 2 and sentiment_label == 'Positive':
            return True
        
        return False
    
    def detect_repeated_phrases(self,text:str)->bool:
        """
        Detect if review contains repeated phrases (potential spam).
        
        Returns:
            True if repeated phrases detected, False otherwise
        """
        # Simple check: if any word appears more than 30% of total words
        words=re.findall(r'\w+', text.lower())
        if not words:
            return False
        
        word_counts={}
        for word in words:
            word_counts[word]=word_counts.get(word,0)+1
        
        total_words=len(words)
        for count in word_counts.values():
            if count / total_words > 0.3:
                return True
        
        return False
    
    def calculate_trust_score(self,review_data:Dict[str,Any],existing_reviews:List[Dict[str,Any]]=None)->Dict[str,Any]:
        """
        Calculate overall trust score with reason codes.
        
        Returns:
            Dictionary with trust score (0-1) and reason codes
        """
        if existing_reviews is None:
            existing_reviews=[]
        
        reasons=[]
        trust_score=1.0
        
        # Check for duplicate text
        if self.detect_duplicate_text(review_data.get('review_text',''), existing_reviews):
            reasons.append('duplicate_text')
            trust_score -= 0.4
        
        # Check for repeated phrases
        if self.detect_repeated_phrases(review_data.get('review_text','')):
            reasons.append('repeated_phrases')
            trust_score -= 0.2
        
        # Check star/text mismatch
        if self.detect_star_text_mismatch(
            review_data.get('star_rating',3),
            review_data.get('sentiment','Neutral')
        ):
            reasons.append('star_text_mismatch')
            trust_score -= 0.15
        
        # Check provider verification
        if review_data.get('verified_purchase', False):
            reasons.append('provider_verified')
            trust_score += 0.1
        
        # Check review length (very short reviews are less trustworthy)
        review_text=review_data.get('review_text','')
        if len(review_text) < 20:
            reasons.append('short_review')
            trust_score -= 0.1
        
        # Normalize trust score to [0,1]
        trust_score=max(0.0, min(1.0, trust_score))
        
        # Add normal behavior reason if no issues
        if not reasons:
            reasons.append('normal_behavior')
        
        return {
            'trust_score':round(trust_score, 2),
            'reasons':reasons,
            'is_suspicious':trust_score < 0.5
        }

# Global trust signals instance
trust_signals=TrustSignals()
