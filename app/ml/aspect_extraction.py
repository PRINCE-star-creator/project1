"""Aspect-based sentiment extraction using POS tagging and sentiment windows."""
from typing import List, Dict, Tuple, Any
import re
from .nlp_pipeline import preprocessor

# Aspect term aliases mapping
ASPECT_ALIASES={
    'battery':'Battery',
    'batteries':'Battery',
    'battery life':'Battery',
    'camera':'Camera',
    'cameras':'Camera',
    'display':'Display',
    'screen':'Display',
    'sound':'Sound Quality',
    'audio':'Sound Quality',
    'delivery':'Delivery',
    'shipping':'Delivery',
    'packaging':'Packaging',
    'comfort':'Comfort',
    'performance':'Performance',
    'speed':'Performance',
    'price':'Price',
    'value':'Value',
    'quality':'Quality',
    'build':'Build Quality',
    'design':'Design',
    'looks':'Design'
}

# Sentiment-bearing tokens
POSITIVE_TOKENS={
    'excellent','great','good','amazing','love','perfect','fast','clear',
    'comfortable','best','awesome','fantastic','wonderful','outstanding',
    'superb','brilliant','beautiful','impressive','solid','reliable'
}

NEGATIVE_TOKENS={
    'bad','terrible','poor','disappointing','slow','worst','hate','broken',
    'awful','drains','horrible','useless','annoying','frustrating','cheap',
    'flimsy','unreliable','difficult','complicated','buggy'
}

class AspectExtractor:
    """
    Aspect-based sentiment extraction as specified in §19.
    
    Algorithm:
    1. POS tagging / noun phrase candidates
    2. Normalize aspect terms
    3. Find nearby sentiment-bearing tokens within configurable window
    4. Score each aspect
    5. Aggregate aspect sentiment across reviews
    """
    
    def __init__(self,window_size:int=3):
        """
        Initialize aspect extractor.
        
        Args:
            window_size: Number of tokens to look before/after aspect for sentiment
        """
        self.window_size=window_size
    
    def extract_aspects(self,text:str)->List[Dict[str,Any]]:
        """
        Extract aspects and their sentiment from review text.
        
        Args:
            text: Raw review text
            
        Returns:
            List of aspect dictionaries with aspect, sentiment, and confidence
        """
        # Preprocess text
        cleaned,tokens,_=preprocessor.preprocess(text)
        
        aspects=[]
        
        # Find aspect candidates in tokens
        for i,token in enumerate(tokens):
            # Check if token matches an aspect alias
            if token.lower() in ASPECT_ALIASES:
                aspect_name=ASPECT_ALIASES[token.lower()]
                
                # Get sentiment window around the aspect
                window_start=max(0, i - self.window_size)
                window_end=min(len(tokens), i + self.window_size + 1)
                window=tokens[window_start:window_end]
                
                # Count positive and negative sentiment in window
                pos_count=sum(1 for t in window if t.lower() in POSITIVE_TOKENS)
                neg_count=sum(1 for t in window if t.lower() in NEGATIVE_TOKENS)
                
                # Determine sentiment
                if pos_count > neg_count:
                    sentiment='Positive'
                    confidence=min(0.99, 0.65 + 0.1 * (pos_count - neg_count))
                elif neg_count > pos_count:
                    sentiment='Negative'
                    confidence=min(0.99, 0.65 + 0.1 * (neg_count - pos_count))
                else:
                    sentiment='Neutral'
                    confidence=0.5
                
                aspects.append({
                    'aspect':aspect_name,
                    'sentiment':sentiment,
                    'confidence':round(confidence, 2),
                    'position':i,
                    'window_tokens':window
                })
        
        return aspects
    
    def aggregate_aspects(self,aspect_lists:List[List[Dict[str,Any]]])->Dict[str,Dict[str,Any]]:
        """
        Aggregate aspect sentiment across multiple reviews.
        
        Args:
            aspect_lists: List of aspect lists from individual reviews
            
        Returns:
            Dictionary mapping aspect names to aggregated sentiment data
        """
        aggregated={}
        
        for aspects in aspect_lists:
            for aspect_data in aspects:
                aspect_name=aspect_data['aspect']
                sentiment=aspect_data['sentiment']
                confidence=aspect_data['confidence']
                
                if aspect_name not in aggregated:
                    aggregated[aspect_name]={
                        'aspect':aspect_name,
                        'count':0,
                        'positive_count':0,
                        'negative_count':0,
                        'neutral_count':0,
                        'avg_confidence':0.0,
                        'dominant_sentiment':'Neutral'
                    }
                
                aggregated[aspect_name]['count']+=1
                aggregated[aspect_name]['positive_count']+=1 if sentiment=='Positive' else 0
                aggregated[aspect_name]['negative_count']+=1 if sentiment=='Negative' else 0
                aggregated[aspect_name]['neutral_count']+=1 if sentiment=='Neutral' else 0
                aggregated[aspect_name]['avg_confidence']+=confidence
        
        # Calculate averages and dominant sentiment
        for aspect_name, data in aggregated.items():
            if data['count']>0:
                data['avg_confidence']=round(data['avg_confidence']/data['count'], 2)
                
                # Determine dominant sentiment
                if data['positive_count']>=data['negative_count'] and data['positive_count']>=data['neutral_count']:
                    data['dominant_sentiment']='Positive'
                elif data['negative_count']>=data['positive_count'] and data['negative_count']>=data['neutral_count']:
                    data['dominant_sentiment']='Negative'
                else:
                    data['dominant_sentiment']='Neutral'
        
        return aggregated

# Global aspect extractor instance
aspect_extractor=AspectExtractor(window_size=3)
