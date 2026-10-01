"""Train the explainable TF-IDF + calibrated Linear SVM model from CSV.
CSV columns: text,label where label is Negative/Neutral/Positive."""
import asyncio,csv,sys
from app.ml.sentiment import SentimentService
from app.core.config import settings
p=sys.argv[1] if len(sys.argv)>1 else 'data/reviews.csv'
texts=[];labels=[]
with open(p,encoding='utf-8') as f:
 for r in csv.DictReader(f):
  if r.get('text') and r.get('label') in {'Negative','Neutral','Positive'}: texts.append(r['text']);labels.append(r['label'])
if len(set(labels))<3 or len(labels)<15: raise SystemExit('Need at least 15 labeled rows covering all three classes.')
print(SentimentService(settings.model_path).train(texts,labels))
