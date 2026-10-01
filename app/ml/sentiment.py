from pathlib import Path
import re, joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix

LABELS=["Negative","Neutral","Positive"]
POS={"excellent","great","good","amazing","love","perfect","fast","clear","comfortable","best"}
NEG={"bad","terrible","poor","disappointing","slow","worst","hate","broken","awful","drains"}

def preprocess(text):
    text=text.lower(); text=re.sub(r"[^a-z0-9\s']"," ",text); return re.sub(r"\s+"," ",text).strip()

class SentimentService:
    def __init__(self,path="./models/sentiment.joblib"):
        self.path=Path(path); self.model=None; self.version="baseline-untrained"
        if self.path.exists(): self.model=joblib.load(self.path); self.version="svm-tfidf-v1"
    def train(self,texts,labels):
        xtr,xt,ytr,yt=train_test_split(texts,labels,test_size=.2,stratify=labels,random_state=42)
        vec=TfidfVectorizer(ngram_range=(1,2),min_df=1,sublinear_tf=True)
        X=vec.fit_transform(map(preprocess,xtr)); Xt=vec.transform(map(preprocess,xt))
        clf=CalibratedClassifierCV(LinearSVC(),cv=3).fit(X,ytr)
        pred=clf.predict(Xt); p,r,f,_=precision_recall_fscore_support(yt,pred,average="weighted",zero_division=0)
        self.model={"vectorizer":vec,"classifier":clf}; self.version="svm-tfidf-v1"; self.path.parent.mkdir(parents=True,exist_ok=True); joblib.dump(self.model,self.path)
        return {"accuracy":accuracy_score(yt,pred),"precision":p,"recall":r,"f1":f,"confusion_matrix":confusion_matrix(yt,pred).tolist(),"version":self.version}
    def predict(self,text):
        if self.model:
            X=self.model["vectorizer"].transform([preprocess(text)]); c=self.model["classifier"]; label=c.predict(X)[0]; probs=c.predict_proba(X)[0]; classes=list(c.classes_); d={k:float(v) for k,v in zip(classes,probs)}; score=float(sum((i/(len(classes)-1))*d.get(k,0) for i,k in enumerate(sorted(classes)))) if classes else .5; return label,d,score
        toks=set(preprocess(text).split()); pos=len(toks&POS); neg=len(toks&NEG); label="Positive" if pos>neg else "Negative" if neg>pos else "Neutral"; score=1.0 if label=="Positive" else 0.0 if label=="Negative" else .5; return label,{"Negative":float(label=="Negative"),"Neutral":float(label=="Neutral"),"Positive":float(label=="Positive")},score
    def explain(self,text):
        cleaned=preprocess(text); tokens=cleaned.split(); aspects=[]
        aliases={"battery":"Battery","camera":"Camera","display":"Display","screen":"Display","sound":"Sound quality","audio":"Sound quality","delivery":"Delivery","packaging":"Packaging","comfort":"Comfort","performance":"Performance"}
        for i,t in enumerate(tokens):
            if t in aliases:
                window=tokens[max(0,i-3):i+4]; pos=sum(x in POS for x in window); neg=sum(x in NEG for x in window); lab="Positive" if pos>neg else "Negative" if neg>pos else "Neutral"; aspects.append({"aspect":aliases[t],"sentiment":lab,"confidence":round(min(0.99,0.65+0.1*abs(pos-neg)),2)})
        return cleaned,tokens,aspects
