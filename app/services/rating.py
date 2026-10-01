from math import exp
WEIGHTS={"star":.55,"nlp":.20,"trust":.10,"helpfulness":.05,"recency":.10}
def review_weight(stars,nlp,trust=.8,helpfulness=.5,age_days=0):
    s=(stars-1)/4; recency=exp(-.01*age_days); return WEIGHTS['star']*s+WEIGHTS['nlp']*nlp+WEIGHTS['trust']*trust+WEIGHTS['helpfulness']*helpfulness+WEIGHTS['recency']*recency
def smoothed(observed,v,m=5,prior=.75): return (v/(v+m))*observed+(m/(v+m))*prior
def aggregate(reviews,source_rating=None):
    if not reviews: return source_rating
    vals=[]; ws=[]
    for r in reviews:
        w=review_weight(r['stars'],r['nlp'],r.get('trust',.8),r.get('helpfulness',.5),r.get('age_days',0)); vals.append(w); ws.append(w)
    raw=1+4*(sum(v*w for v,w in zip(vals,ws))/sum(ws)); return 1+4*smoothed((raw-1)/4,sum(ws))
