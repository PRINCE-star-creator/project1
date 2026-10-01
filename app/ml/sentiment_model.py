"""TF-IDF + Linear SVM sentiment analysis model with proper train/test split."""
import re
import joblib
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.naive_bayes import MultinomialNB
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, classification_report
from .nlp_pipeline import preprocessor

LABELS=["Negative","Neutral","Positive"]

class SentimentModel:
    """
    Academic-grade sentiment model following the specification in §16-§18.
    
    Features:
    - TF-IDF vectorization with smoothed IDF
    - Linear SVM as primary classifier
    - Naive Bayes and Logistic Regression as baselines
    - Proper train/validation/test split with stratification
    - No train/test leakage
    - Model versioning and persistence
    """
    
    def __init__(self,model_path:Path=Path("./models/sentiment.joblib")):
        self.model_path=model_path
        self.model_path.parent.mkdir(parents=True,exist_ok=True)
        self.vectorizer=None
        self.classifier=None
        self.baseline_nb=None
        self.baseline_lr=None
        self.version="baseline-untrained"
        self.is_trained=False
        self.evaluation_metrics=None
        
        # Load existing model if available
        if self.model_path.exists():
            self.load()
    
    def preprocess_texts(self,texts:List[str])->List[str]:
        """Preprocess texts using the NLP pipeline."""
        return [preprocessor.preprocess(text)[0] for text in texts]
    
    def train(self,texts:List[str],labels:List[str],test_size:float=0.2,val_size:float=0.1):
        """
        Train the model with proper train/validation/test split as specified in §18.
        
        Splits:
        - 80% train
        - 10% validation  
        - 10% test
        
        Uses stratified split to maintain class distribution.
        """
        if len(texts)!=len(labels):
            raise ValueError("Number of texts and labels must match")
        
        # Preprocess all texts
        processed_texts=self.preprocess_texts(texts)
        
        # First split: train+val vs test (90% vs 10%)
        X_train_val, X_test, y_train_val, y_test=train_test_split(
            processed_texts, labels,
            test_size=test_size,
            stratify=labels,
            random_state=42
        )
        
        # Second split: train vs val (from the 90%, split into 80% and 10% of total)
        val_ratio=val_size/(1-test_size)
        X_train, X_val, y_train, y_val=train_test_split(
            X_train_val, y_train_val,
            test_size=val_ratio,
            stratify=y_train_val,
            random_state=42
        )
        
        # Fit TF-IDF ONLY on training data (no leakage per §16)
        self.vectorizer=TfidfVectorizer(
            ngram_range=(1,2),
            min_df=2,
            max_df=0.95,
            sublinear_tf=True,
            max_features=10000
        )
        
        X_train_tfidf=self.vectorizer.fit_transform(X_train)
        X_val_tfidf=self.vectorizer.transform(X_val)
        X_test_tfidf=self.vectorizer.transform(X_test)
        
        # Train Linear SVM with calibration (§17)
        self.classifier=CalibratedClassifierCV(
            LinearSVC(C=1.0, class_weight='balanced', random_state=42),
            cv=3,
            method='sigmoid'
        )
        self.classifier.fit(X_train_tfidf, y_train)
        
        # Train baseline models for comparison
        self.baseline_nb=MultinomialNB(alpha=1.0).fit(X_train_tfidf, y_train)
        self.baseline_lr=LogisticRegression(
            max_iter=1000,
            class_weight='balanced',
            random_state=42
        ).fit(X_train_tfidf, y_train)
        
        # Evaluate on test set
        y_pred=self.classifier.predict(X_test_tfidf)
        
        # Calculate metrics (§18)
        accuracy=accuracy_score(y_test, y_pred)
        precision, recall, f1, _=precision_recall_fscore_support(
            y_test, y_pred, average='weighted', zero_division=0
        )
        conf_matrix=confusion_matrix(y_test, y_pred).tolist()
        
        # Per-class metrics
        per_class_report=classification_report(y_test, y_pred, output_dict=True)
        
        self.evaluation_metrics={
            'accuracy':accuracy,
            'precision':precision,
            'recall':recall,
            'f1':f1,
            'confusion_matrix':conf_matrix,
            'per_class_metrics':per_class_report,
            'train_size':len(X_train),
            'val_size':len(X_val),
            'test_size':len(X_test)
        }
        
        self.is_trained=True
        self.version="svm-tfidf-v1"
        
        # Save model
        self.save()
        
        return self.evaluation_metrics
    
    def predict(self,text:str)->Tuple[str,Dict[str,float],float]:
        """
        Predict sentiment for a single review.
        
        Returns:
            Tuple of (predicted_label, probabilities, sentiment_score)
        """
        if not self.is_trained:
            # Fallback to rule-based if not trained
            return self._rule_based_predict(text)
        
        processed=preprocessor.preprocess(text)[0]
        X=self.vectorizer.transform([processed])
        
        # Get prediction and calibrated probabilities
        label=self.classifier.predict(X)[0]
        probs=self.classifier.predict_proba(X)[0]
        classes=list(self.classifier.classes_)
        
        # Calculate sentiment score (0.0 to 1.0)
        prob_dict={k:float(v) for k,v in zip(classes, probs)}
        score=self._calculate_sentiment_score(prob_dict)
        
        return label, prob_dict, score
    
    def _rule_based_predict(self,text:str)->Tuple[str,Dict[str,float],float]:
        """Fallback rule-based prediction when model is not trained."""
        from .mock_analysis import analyze
        result=analyze(text)
        return result['sentiment'], {'Negative':0.33,'Neutral':0.34,'Positive':0.33}, result.get('confidence',0.5)
    
    def _calculate_sentiment_score(self,prob_dict:Dict[str,float])->float:
        """Calculate normalized sentiment score from probabilities."""
        if 'Positive' in prob_dict and 'Negative' in prob_dict:
            return prob_dict.get('Positive',0.5)
        return 0.5
    
    def explain(self,text:str)->Dict[str,Any]:
        """
        Provide explanation of prediction (§20).
        
        Returns:
            Dictionary with preprocessing, TF-IDF features, model decision, etc.
        """
        cleaned,tokens,metadata=preprocessor.preprocess(text)
        
        if not self.is_trained:
            return {
                'cleaned_text':cleaned,
                'tokens':tokens,
                'metadata':metadata,
                'model_status':'untrained',
                'note':'Using rule-based fallback'
            }
        
        X=self.vectorizer.transform([cleaned])
        feature_names=self.vectorizer.get_feature_names_out()
        
        # Get top TF-IDF features
        tfidf_array=X.toarray()[0]
        top_indices=np.argsort(tfidf_array)[-10:][::-1]
        top_features=[
            {
                'feature':feature_names[i],
                'tfidf':float(tfidf_array[i])
            }
            for i in top_indices if tfidf_array[i] > 0
        ]
        
        # Get model decision scores
        decision_scores=self.classifier.decision_function(X)[0]
        probs=self.classifier.predict_proba(X)[0]
        classes=list(self.classifier.classes_)
        
        return {
            'cleaned_text':cleaned,
            'tokens':tokens,
            'metadata':metadata,
            'top_tfidf_features':top_features,
            'decision_scores':decision_scores.tolist(),
            'calibrated_probabilities':{k:float(v) for k,v in zip(classes, probs)},
            'predicted_class':classes[np.argmax(probs)],
            'model_version':self.version,
            'evaluation_metrics':self.evaluation_metrics
        }
    
    def save(self):
        """Save model to disk."""
        model_data={
            'vectorizer':self.vectorizer,
            'classifier':self.classifier,
            'baseline_nb':self.baseline_nb,
            'baseline_lr':self.baseline_lr,
            'version':self.version,
            'is_trained':self.is_trained,
            'evaluation_metrics':self.evaluation_metrics
        }
        joblib.dump(model_data, self.model_path)
    
    def load(self):
        """Load model from disk."""
        model_data=joblib.load(self.model_path)
        self.vectorizer=model_data['vectorizer']
        self.classifier=model_data['classifier']
        self.baseline_nb=model_data.get('baseline_nb')
        self.baseline_lr=model_data.get('baseline_lr')
        self.version=model_data['version']
        self.is_trained=model_data['is_trained']
        self.evaluation_metrics=model_data.get('evaluation_metrics')

# Global model instance
sentiment_model=SentimentModel()
