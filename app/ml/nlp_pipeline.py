"""Full NLP preprocessing pipeline with NLTK for sentiment analysis."""
import re
import string
from typing import List, Tuple, Dict, Any
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk import pos_tag

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords', quiet=True)

try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet', quiet=True)

try:
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    nltk.download('averaged_perceptron_tagger', quiet=True)

# Initialize NLTK components
STOP_WORDS=set(stopwords.words('english'))
LEMMATIZER=WordNetLemmatizer()

class NLPPreprocessor:
    """Complete NLP preprocessing pipeline as specified in the academic requirements."""
    
    def __init__(self, remove_negation:bool=False):
        """
        Initialize the preprocessor.
        
        Args:
            remove_negation: If True, removes negation words (not recommended per spec)
        """
        self.remove_negation=remove_negation
        self.negative_words={'not','no','never','none','nothing','nowhere','neither','nobody','noone'}
    
    def normalize_unicode(self,text:str)->str:
        """Unicode normalization."""
        return text.encode('utf-8',errors='ignore').decode('utf-8')
    
    def lowercase(self,text:str)->str:
        """Convert to lowercase."""
        return text.lower()
    
    def tokenize(self,text:str)->List[str]:
        """Tokenize with NLTK."""
        return word_tokenize(text)
    
    def handle_punctuation(self,tokens:List[str])->List[str]:
        """Handle punctuation - remove but preserve negation context."""
        cleaned=[]
        for token in tokens:
            # Keep negation words with apostrophes
            if token.lower() in self.negative_words or token.lower() in {"n't"}:
                cleaned.append(token)
            elif token not in string.punctuation:
                cleaned.append(token)
        return cleaned
    
    def remove_stopwords(self,tokens:List[str])->List[str]:
        """Remove stopwords while preserving negation."""
        if self.remove_negation:
            return [t for t in tokens if t.lower() not in STOP_WORDS]
        else:
            # Keep negation words even if they're in stopwords
            return [t for t in tokens if t.lower() not in STOP_WORDS or t.lower() in self.negative_words]
    
    def lemmatize(self,tokens:List[str])->List[str]:
        """Lemmatize tokens."""
        return [LEMMATIZER.lemmatize(t) for t in tokens]
    
    def preprocess(self,text:str)->Tuple[str,List[str],Dict[str,Any]]:
        """
        Complete preprocessing pipeline as specified in §15.
        
        Pipeline:
        Raw review text
        ↓ Unicode normalization
        ↓ Lowercase
        ↓ Tokenization with NLTK
        ↓ Noise/punctuation handling
        ↓ Stopword removal (preserving negation)
        ↓ Lemmatization
        ↓ Clean token sequence
        
        Returns:
            Tuple of (cleaned_text, tokens, metadata)
        """
        metadata={'original_length':len(text)}
        
        # Unicode normalization
        text=self.normalize_unicode(text)
        
        # Lowercase
        text=self.lowercase(text)
        metadata['lowercased']=text
        
        # Tokenization
        tokens=self.tokenize(text)
        metadata['token_count']=len(tokens)
        
        # Punctuation handling
        tokens=self.handle_punctuation(tokens)
        
        # Stopword removal (preserve negation)
        tokens=self.remove_stopwords(tokens)
        metadata['after_stopwords']=len(tokens)
        
        # Lemmatization
        tokens=self.lemmatize(tokens)
        
        # Clean token sequence
        cleaned_text=' '.join(tokens)
        metadata['final_length']=len(cleaned_text)
        
        return cleaned_text,tokens,metadata

# Singleton preprocessor instance
preprocessor=NLPPreprocessor(remove_negation=False)
