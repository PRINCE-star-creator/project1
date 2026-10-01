from fastapi import FastAPI, Depends, HTTPException, Header, UploadFile, File, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field, HttpUrl
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from typing import Any
from .core.config import settings
from .core.security import create_token, verify_password, hash_password, decode_token
from .ml.real_analysis import analyze, VERSION
from .ml.rating_algorithms import calculate_sentiment_adjusted_rating, calculate_wilson_score_interval
from .services.student_validation import validator
import csv, io, json, re, hashlib, asyncio

app=FastAPI(title='Ecommerce Review Intelligence Dashboard',version='2.0.0')
app.add_middleware(CORSMiddleware,allow_origins=[settings.frontend_origin,'http://localhost:3000'],allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
client=AsyncIOMotorClient(settings.mongo_url)
db=client[settings.mongo_db]

class AdminLogin(BaseModel): username:str; password:str
class StudentLogin(BaseModel): student_id:str
class ProductCreate(BaseModel): name:str=Field(min_length=2,max_length=300); brand:str|None=None; category:str|None=None; description:str|None=None; source_url:str|None=None; image_url:str|None=None
class URLConnector(BaseModel): url:HttpUrl
class PromptCompare(BaseModel): prompt_version:str
class ReviewCreate(BaseModel): product_id:str; review_text:str=Field(min_length=2,max_length=2000); star_rating:int=Field(default=5,ge=1,le=5); author:str|None=None

def now(): return datetime.now(timezone.utc)
def auth(authorization:str|None=Header(None)):
    if not authorization or not authorization.startswith('Bearer '): raise HTTPException(401,'Authentication required')
    try:
        p=decode_token(authorization[7:])
        if p.get('role')!='admin': raise HTTPException(403,'Admin access required')
        return p
    except HTTPException: raise
    except Exception: raise HTTPException(401,'Invalid session')

def auth_any(authorization:str|None=Header(None)):
    if not authorization or not authorization.startswith('Bearer '): raise HTTPException(401,'Authentication required')
    try:
        p=decode_token(authorization[7:])
        return p
    except HTTPException: raise
    except Exception: raise HTTPException(401,'Invalid session')

def oid(x): return str(x)

def serialize_doc(x):
    if x is None: return None
    from bson import ObjectId
    if isinstance(x, ObjectId):
        return str(x)
    if isinstance(x, dict):
        return {str(k): serialize_doc(v) for k, v in x.items()}
    if isinstance(x, list):
        return [serialize_doc(i) for i in x]
    return x

def product_out(x): return serialize_doc(x)
def review_out(x): return serialize_doc(x)
def job_out(x): return serialize_doc(x)

@app.on_event('startup')
async def startup():
    await db.admin_users.create_index('username',unique=True)
    await db.products.create_index([('workspace_id',1),('created_at',-1)])
    await db.reviews.create_index([('workspace_id',1),('created_at',-1)])
    await db.analysis_jobs.create_index([('workspace_id',1),('created_at',-1)])
    await db.analysis_runs.create_index([('review_id',1),('created_at',-1)])
    admin_user = await db.admin_users.find_one({'username':settings.admin_username})
    if not admin_user:
        await db.admin_users.insert_one({'username':settings.admin_username,'password_hash':hash_password(settings.admin_password),'role':'admin','created_at':now()})
    else:
        if not verify_password(settings.admin_password, admin_user.get('password_hash', '')):
            await db.admin_users.update_one({'_id': admin_user['_id']}, {'$set': {'password_hash': hash_password(settings.admin_password)}})
    if not await db.workspaces.find_one({'slug':'demo'}):
        await db.workspaces.insert_one({'name':'ReviewLens Demo Workspace','slug':'demo','created_at':now()})
    if await db.products.count_documents({'workspace_id':'demo'})==0:
        products=[
          {'workspace_id':'demo','name':'AeroSound Pro Wireless Earbuds','brand':'AeroSound','category':'Audio','source_type':'demo','image_url':'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=400&fit=crop&q=80'},
          {'workspace_id':'demo','name':'Nova X Smartphone','brand':'Nova','category':'Phones','source_type':'demo','image_url':'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop&q=80'},
          {'workspace_id':'demo','name':'Vertex 14 Laptop','brand':'Vertex','category':'Laptops','source_type':'demo','image_url':'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop&q=80'}]
        await db.products.insert_many([{**p,'created_at':now()} for p in products])
    if await db.reviews.count_documents({'workspace_id':'demo'})==0:
        demo_products=[x async for x in db.products.find({'workspace_id':'demo'}).sort('created_at',1).limit(3)]
        samples=[
          (0,'Battery is disappointing, but the sound quality is excellent.',3),
          (1,'The camera is excellent and the display is bright and clear.',5),
          (2,'The laptop is fast and comfortable, but delivery was late.',4),
          (0,'Good sound but the battery drains quickly.',3),
        ]
        for pi,text,stars in samples:
            if pi < len(demo_products):
                await db.reviews.insert_one({'workspace_id':'demo','product_id':demo_products[pi]['_id'],'review_text':text,'star_rating':stars,'source_type':'demo-seed','language':'en','status':'pending','created_at':now()})
    if await db.prompt_versions.count_documents({})==0:
        await db.prompt_versions.insert_one({'version':settings.prompt_version,'description':'Deterministic summary prompt contract for MVP','status':'active','created_at':now()})
    if await db.model_versions.count_documents({})==0:
        await db.model_versions.insert_one({'version':settings.model_version,'provider':'mock','model':'deterministic-rule-engine','status':'active','created_at':now()})

@app.get('/health')
async def health(): return {'status':'ok','database':'mongodb','analysis_version':VERSION,'mode':'deterministic-mock'}

@app.post('/api/v1/auth/admin-login')
async def admin_login(body:AdminLogin):
    u=await db.admin_users.find_one({'username':body.username})
    if body.username==settings.admin_username and body.password==settings.admin_password:
        if not u:
            r=await db.admin_users.insert_one({'username':settings.admin_username,'password_hash':hash_password(settings.admin_password),'role':'admin','created_at':now()})
            uid=str(r.inserted_id)
        else:
            uid=str(u['_id'])
            if not verify_password(body.password, u.get('password_hash', '')):
                await db.admin_users.update_one({'_id': u['_id']}, {'$set': {'password_hash': hash_password(settings.admin_password)}})
        return {'access_token':create_token(uid,'admin'),'role':'admin','workspace':'demo'}
    if not u or not verify_password(body.password,u.get('password_hash','')):
        raise HTTPException(401,'Invalid admin credentials')
    return {'access_token':create_token(str(u['_id']),'admin'),'role':'admin','workspace':'demo'}

@app.post('/api/v1/auth/student-login')
async def student_login(body:StudentLogin):
    # Validate student roll number algorithmically without dataset dependency
    is_valid,message=validator.validate(body.student_id)
    if not is_valid:
        raise HTTPException(401,message)
    canonical_id=validator.get_canonical_id(body.student_id) or body.student_id.strip().upper()
    return {'access_token':create_token(canonical_id,'student',student_id=canonical_id),'role':'student','student_id':canonical_id}

@app.get('/api/v1/auth/me')
async def me(p=Depends(auth)): return p

@app.get('/api/v1/students/validate/{student_id}')
async def validate_student(student_id:str):
    """Public endpoint to check student roll number validation via algorithm"""
    is_valid,message,meta=validator.validate_algorithm(student_id)
    return {'valid':is_valid,'message':message,'canonical_id':validator.get_canonical_id(student_id) if is_valid else None,'details':meta}

@app.get('/api/v1/admin/dashboard')
async def dashboard(p=Depends(auth)):
    ws='demo'; products=await db.products.count_documents({'workspace_id':ws}); reviews=await db.reviews.count_documents({'workspace_id':ws}); analyzed=await db.reviews.count_documents({'workspace_id':ws,'status':'complete'}); failed=await db.reviews.count_documents({'workspace_id':ws,'status':'failed'}); low=await db.reviews.count_documents({'workspace_id':ws,'confidence':{'$lt':.65}}); jobs=await db.analysis_jobs.count_documents({'workspace_id':ws})
    sentiments={s:await db.reviews.count_documents({'workspace_id':ws,'sentiment':s}) for s in ['Positive','Neutral','Negative']}
    themes=[]
    cur=db.reviews.find({'workspace_id':ws,'themes':{'$exists':True}},{'themes':1})
    async for r in cur:
        for x in r.get('themes', []):
            if isinstance(x, dict) and x.get('theme'):
                themes.append(x.get('theme'))
            elif isinstance(x, str) and x.strip():
                themes.append(x.strip())
    from collections import Counter
    top=Counter(themes).most_common(8)
    return {'workspace':'ReviewLens Demo Workspace','products':products,'reviews':reviews,'analyzed':analyzed,'pending':reviews-analyzed-failed,'failed':failed,'low_confidence':low,'jobs':jobs,'sentiments':sentiments,'top_themes':top,'data_freshness':'Demo data / upload-driven','analysis_version':VERSION,'prompt_version':settings.prompt_version,'model_version':settings.model_version}

@app.get('/api/v1/admin/products')
async def products(p=Depends(auth)):
    return [product_out(x) async for x in db.products.find({'workspace_id':'demo'}).sort('created_at',-1)]
@app.post('/api/v1/admin/products')
async def create_product(body:ProductCreate,p=Depends(auth)):
    doc={'workspace_id':'demo',**body.model_dump(),'source_type':'manual','created_at':now()}; r=await db.products.insert_one(doc); doc['_id']=r.inserted_id; return product_out(doc)

async def parse_upload(file:UploadFile):
    raw=await file.read()
    if len(raw)>settings.max_upload_mb*1024*1024: raise HTTPException(413,f'File exceeds {settings.max_upload_mb} MB limit')
    try:
        if (file.filename or '').lower().endswith('.json'):
            obj=json.loads(raw.decode('utf-8-sig')); records=obj if isinstance(obj,list) else obj.get('reviews',[])
        else: records=list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
    except Exception as e: raise HTTPException(400,f'Could not parse file: {e}')
    return raw,records

@app.post('/api/v1/admin/import')
async def import_reviews(file:UploadFile=File(...),p=Depends(auth)):
    raw,records=await parse_upload(file); digest=hashlib.sha256(raw).hexdigest();
    rawdoc={'workspace_id':'demo','kind':'upload','filename':file.filename,'content_type':file.content_type,'sha256':digest,'byte_count':len(raw),'payload':raw.decode('utf-8','replace'),'immutable':True,'created_at':now()}
    ri=await db.raw_inputs.insert_one(rawdoc); imported=0; skipped=0; duplicates=0
    for row in records:
        text=str(row.get('review_text') or row.get('text') or row.get('review') or '').strip(); pname=str(row.get('product_name') or row.get('product') or 'Imported Product').strip()
        if not text: skipped+=1; continue
        prod=await db.products.find_one({'workspace_id':'demo','name':pname})
        if not prod:
            ins=await db.products.insert_one({'workspace_id':'demo','name':pname,'brand':row.get('brand'),'category':row.get('category'),'source_url':row.get('product_url'),'source_type':'upload','created_at':now()}); prod={'_id':ins.inserted_id,'name':pname}
        external_id=row.get('review_id') or row.get('id'); dup_query={'workspace_id':'demo','product_id':prod['_id'],'review_text':text}
        if external_id: dup_query={'workspace_id':'demo','product_id':prod['_id'],'external_id':external_id}
        if await db.reviews.find_one(dup_query): duplicates+=1; continue
        stars=row.get('star_rating') or row.get('rating') or row.get('stars');
        try: stars=int(float(stars)) if stars not in (None,'') else None
        except: stars=None
        incomplete=not stars or len(text)<20
        await db.reviews.insert_one({'workspace_id':'demo','product_id':prod['_id'],'raw_input_id':ri.inserted_id,'external_id':external_id,'title':row.get('title'),'review_text':text,'star_rating':stars,'author':row.get('author') or row.get('reviewer'),'review_date':row.get('review_date') or row.get('date'),'source_url':row.get('source_url') or row.get('review_url'),'source_type':'upload','language':'en','quality_flags':['incomplete'] if incomplete else [],'status':'pending','created_at':now()}); imported+=1
    await db.raw_inputs.update_one({'_id':ri.inserted_id},{'$set':{'record_count':len(records),'imported':imported,'skipped':skipped,'duplicates':duplicates}})
    return {'raw_input_id':oid(ri.inserted_id),'imported':imported,'skipped':skipped,'duplicates':duplicates,'preview':records[:10]}

@app.post('/api/v1/admin/connect-url')
async def connect_url(body:URLConnector,p=Depends(auth)):
    url=str(body.url)
    # Approved connector boundary: URL is recorded, never scraped in this MVP.
    raw={'workspace_id':'demo','kind':'approved_url','url':url,'connector':'simulated-approved-source','immutable':True,'created_at':now()}; rr=await db.raw_inputs.insert_one(raw)
    pr=await db.products.insert_one({'workspace_id':'demo','name':'URL Connector Preview','source_url':url,'source_type':'approved-url-simulated','created_at':now()})
    await db.reviews.insert_one({'workspace_id':'demo','product_id':pr.inserted_id,'raw_input_id':rr.inserted_id,'review_text':'Simulated connector review: the experience is clear and easy to use.','star_rating':4,'source_url':url,'source_type':'approved-url-simulated','language':'en','status':'pending','created_at':now()})
    return {'status':'accepted','mode':'simulated','message':'URL recorded; no unrestricted scraping or external fetch was performed.','raw_input_id':oid(rr.inserted_id)}

async def process_job(job_id):
    job=await db.analysis_jobs.find_one({'_id':job_id});
    if not job:return
    await db.analysis_jobs.update_one({'_id':job_id},{'$set':{'status':'running','started_at':now()}})
    q={'workspace_id':'demo','status':{'$in':['pending','retrying']}}
    total=await db.reviews.count_documents(q); done=0; errors=0
    touched_products = set()
    async for r in db.reviews.find(q):
        try:
            await asyncio.sleep(.01)
            result=analyze(r['review_text'], star_rating=r.get('star_rating'))
            run={'workspace_id':'demo','review_id':r['_id'],'version':VERSION,'prompt_version':settings.prompt_version,'model_version':settings.model_version,'input_snapshot':{'text':r['review_text'],'rating':r.get('star_rating')},'preprocessing':result['trace'],'classification':{'sentiment':result['sentiment'],'confidence':result['confidence']},'themes':result['themes'],'citations':result['citations'],'created_at':now()}
            ar=await db.analysis_runs.insert_one(run)
            await db.reviews.update_one({'_id':r['_id']},{'$set':{'status':'complete','sentiment':result['sentiment'],'confidence':result['confidence'],'compound':result.get('compound',0.0),'themes':result['themes'],'citations':result['citations'],'analysis_run_id':ar.inserted_id,'analysis_version':VERSION,'prompt_version':settings.prompt_version,'model_version':settings.model_version,'quality_flags':result.get('quality_flags',r.get('quality_flags',[]))}})
            if r.get('product_id'): touched_products.add(r['product_id'])
            done+=1
            await db.analysis_jobs.update_one({'_id':job_id},{'$set':{'processed_count':done,'progress':round(done/max(total,1),3)}})
        except Exception as e:
            errors+=1; await db.reviews.update_one({'_id':r['_id']},{'$set':{'status':'failed','error':str(e)}})
    for pid in touched_products:
        try: await update_product_stats(pid)
        except Exception: pass
    status='complete' if errors==0 else ('partially complete' if done else 'failed')
    await db.analysis_jobs.update_one({'_id':job_id},{'$set':{'status':status,'processed_count':done,'failed_count':errors,'finished_at':now()}})

@app.post('/api/v1/admin/jobs')
async def create_job(background:BackgroundTasks,p=Depends(auth)):
    pending=await db.reviews.count_documents({'workspace_id':'demo','status':{'$in':['pending','retrying']}})
    if not pending:
        await db.reviews.update_many({'workspace_id':'demo'},{'$set':{'status':'pending'}})
        pending=await db.reviews.count_documents({'workspace_id':'demo'})
        if not pending: raise HTTPException(400,'No reviews found in workspace to analyze')
    doc={'workspace_id':'demo','kind':'review-analysis','status':'queued','input_count':pending,'processed_count':0,'failed_count':0,'version':VERSION,'prompt_version':settings.prompt_version,'model_version':settings.model_version,'created_at':now()}; r=await db.analysis_jobs.insert_one(doc); doc['_id']=r.inserted_id; background.add_task(process_job,r.inserted_id); return job_out(doc)
@app.get('/api/v1/admin/jobs')
async def jobs(p=Depends(auth)):
    return [job_out(x) async for x in db.analysis_jobs.find({'workspace_id':'demo'}).sort('created_at',-1).limit(50)]
@app.post('/api/v1/admin/jobs/{job_id}/retry')
async def retry_job(job_id:str,background:BackgroundTasks,p=Depends(auth)):
    from bson import ObjectId
    await db.reviews.update_many({'workspace_id':'demo','status':'failed'},{'$set':{'status':'retrying'}})
    try: oidv=ObjectId(job_id)
    except: raise HTTPException(400,'Invalid job id')
    return await create_job(background,p)

async def update_product_stats(product_id):
    from bson import ObjectId
    try: pid = ObjectId(product_id)
    except: pid = product_id
    revs = await db.reviews.find({'$or': [{'product_id': pid}, {'product_id': str(pid)}]}).to_list(1000)
    ratings = [float(r.get('star_rating')) for r in revs if r.get('star_rating') is not None]
    compounds = [
        float(r.get('compound', r.get('confidence', 0.8) * (1.0 if r.get('sentiment') == 'Positive' else (-1.0 if r.get('sentiment') == 'Negative' else 0.0))))
        for r in revs
    ]
    rating_calc = calculate_sentiment_adjusted_rating(ratings, sentiment_compounds=compounds)
    pos_count = sum(1 for r in revs if r.get('sentiment') == 'Positive')
    wilson_calc = calculate_wilson_score_interval(pos_count, len(revs))
    await db.products.update_one({'_id': pid}, {'$set': {
        'rating': rating_calc['rating'],
        'review_count': len(revs),
        'sentiment_positive_pct': wilson_calc['positive_pct'],
        'rating_bayesian': rating_calc['bayesian_rating'],
        'rating_raw_avg': rating_calc['raw_star_average'],
        'rating_distribution': rating_calc['distribution'],
        'wilson_lower_pct': wilson_calc['wilson_lower_pct']
    }})
    updated_prod = await db.products.find_one({'_id': pid})
    return product_out(updated_prod)

@app.post('/api/v1/admin/reviews')
async def create_admin_review(body:ReviewCreate,p=Depends(auth)):
    from bson import ObjectId
    try: pid=ObjectId(body.product_id)
    except: raise HTTPException(400,'Invalid product id')
    prod=await db.products.find_one({'_id':pid,'workspace_id':'demo'})
    if not prod: raise HTTPException(404,'Product not found')
    analysis_res=analyze(body.review_text, star_rating=body.star_rating)
    doc={'workspace_id':'demo','product_id':pid,'review_text':body.review_text,'star_rating':body.star_rating,'author':body.author or 'Verified Admin Buyer','source_type':'manual-entry','language':'en','status':'complete','sentiment':analysis_res['sentiment'],'confidence':analysis_res['confidence'],'compound':analysis_res.get('compound',0.0),'themes':analysis_res['themes'],'citations':analysis_res['citations'],'quality_flags':analysis_res.get('quality_flags',[]),'analysis_version':VERSION,'prompt_version':settings.prompt_version,'model_version':settings.model_version,'created_at':now()}
    r=await db.reviews.insert_one(doc)
    doc['_id']=r.inserted_id
    updated_prod=await update_product_stats(pid)
    out=review_out(doc)
    return {**out, 'product': updated_prod}

@app.post('/api/v1/student/reviews')
async def create_student_review(body:ReviewCreate,p=Depends(auth_any)):
    from bson import ObjectId
    try: pid=ObjectId(body.product_id)
    except: raise HTTPException(400,'Invalid product id')
    prod=await db.products.find_one({'_id':pid,'workspace_id':'demo'})
    if not prod: raise HTTPException(404,'Product not found')
    analysis_res=analyze(body.review_text, star_rating=body.star_rating)
    author_name=body.author or (p.get('student_id') if isinstance(p,dict) and p.get('student_id') else 'Student Reviewer')
    doc={'workspace_id':'demo','product_id':pid,'review_text':body.review_text,'star_rating':body.star_rating,'author':author_name,'source_type':'student-entry','language':'en','status':'complete','sentiment':analysis_res['sentiment'],'confidence':analysis_res['confidence'],'compound':analysis_res.get('compound',0.0),'themes':analysis_res['themes'],'citations':analysis_res['citations'],'quality_flags':analysis_res.get('quality_flags',[]),'analysis_version':VERSION,'prompt_version':settings.prompt_version,'model_version':settings.model_version,'created_at':now()}
    r=await db.reviews.insert_one(doc)
    doc['_id']=r.inserted_id
    updated_prod=await update_product_stats(pid)
    out=review_out(doc)
    return {**out, 'product': updated_prod}


@app.get('/api/v1/admin/reviews')
async def reviews(q:str='',sentiment:str|None=None,status:str|None=None,limit:int=500,p=Depends(auth)):
    f={'workspace_id':'demo'}
    if q:f['$or']=[{'review_text':{'$regex':q,'$options':'i'}},{'author':{'$regex':q,'$options':'i'}}]
    if sentiment:f['sentiment']=sentiment
    if status:f['status']=status
    return [review_out(x) async for x in db.reviews.find(f).sort('created_at',-1).limit(min(limit,1000))]
@app.get('/api/v1/admin/reviews/{review_id}/trace')
async def review_trace(review_id:str,p=Depends(auth)):
    from bson import ObjectId
    from .ml.explainability import compute_explainability
    try:r=await db.reviews.find_one({'_id':ObjectId(review_id),'workspace_id':'demo'})
    except: r=None
    if not r:raise HTTPException(404,'Review not found')
    run=await db.analysis_runs.find_one({'_id':r.get('analysis_run_id')}) if r.get('analysis_run_id') else None
    text = r.get('review_text', '')
    rating = r.get('star_rating', 5)
    sentiment = r.get('sentiment', 'Positive')
    confidence = r.get('confidence', 0.85)
    exp = compute_explainability(text, star_rating=rating, sentiment=sentiment, confidence=confidence)
    return {
        'review':review_out(r),
        'analysis_run':review_out(run) if run else None,
        'trace':(run or {}).get('preprocessing',{}),
        'evidence':(run or {}).get('citations',[]),
        'tf_idf':exp['tf_idf'],
        'metrics':exp['metrics'],
        'vector_sector':exp['vector_sector'],
        'rating_impact':exp['rating_impact']
    }


@app.get('/api/v1/admin/products/{product_id}/dashboard')
async def product_dashboard(product_id:str,p=Depends(auth)):
    from bson import ObjectId
    try:pid=ObjectId(product_id)
    except:raise HTTPException(400,'Invalid product id')
    product=await db.products.find_one({'_id':pid,'workspace_id':'demo'})
    if not product:raise HTTPException(404,'Product not found')
    rs=[x async for x in db.reviews.find({'product_id':pid}).sort('created_at',-1)]
    sentiments={s:sum(1 for r in rs if r.get('sentiment')==s) for s in ['Positive','Neutral','Negative']}
    ratings=[r['star_rating'] for r in rs if r.get('star_rating')]
    summary='No analysis yet.' if not rs or not any(r.get('sentiment') for r in rs) else ('Reviews show mostly positive signals with recurring themes worth monitoring.' if sentiments['Positive']>=sentiments['Negative'] else 'Reviews show meaningful negative signals requiring investigation.')
    citations=[{'review_id':oid(r['_id']),'quote':r['review_text'][:180]} for r in rs if r.get('sentiment')][:5]
    return {
        'product': product_out(product),
        'review_count': len(rs),
        'freshness': max([r.get('created_at') for r in rs], default=None),
        'rating': product.get('rating', round(sum(ratings)/len(ratings), 1) if ratings else 4.2),
        'rating_bayesian': product.get('rating_bayesian'),
        'rating_raw_avg': product.get('rating_raw_avg'),
        'rating_distribution': product.get('rating_distribution', {}),
        'wilson_lower_pct': product.get('wilson_lower_pct'),
        'sentiments': sentiments,
        'summary': summary,
        'citations': citations,
        'low_confidence': sum(1 for r in rs if r.get('confidence', 1) < .65),
        'before_after': {'previous_count': max(0, len(rs) - 1), 'current_count': len(rs)},
        'recent_reviews': [review_out(r) for r in rs[:25]]
    }

@app.get('/api/v1/student/products/{product_id}/dashboard')
async def student_product_dashboard(product_id:str,p=Depends(auth_any)):
    return await product_dashboard(product_id,p)

@app.get('/api/v1/admin/prompts')
async def prompts(p=Depends(auth)): return [x async for x in db.prompt_versions.find({}).sort('created_at',-1)]
@app.get('/api/v1/admin/models')
async def models(p=Depends(auth)): return [x async for x in db.model_versions.find({}).sort('created_at',-1)]
@app.post('/api/v1/admin/prompt-comparison')
async def prompt_compare(body:PromptCompare,p=Depends(auth)):
    if not await db.prompt_versions.find_one({'version':body.prompt_version}): raise HTTPException(404,'Prompt version not found')
    runs=[x async for x in db.analysis_runs.find({'workspace_id':'demo','prompt_version':body.prompt_version}).limit(100)]
    return {'prompt_version':body.prompt_version,'runs':len(runs),'note':'Comparison is deterministic in the MVP; prompt versions are audit metadata until a configured LLM provider is enabled.'}

@app.get('/api/v1/admin/export/reviews.csv')
async def export_csv(p=Depends(auth)):
    rows=[x async for x in db.reviews.find({'workspace_id':'demo'}).sort('created_at',1)]; out=io.StringIO(); w=csv.writer(out); w.writerow(['id','product_id','review_text','rating','language','sentiment','confidence','themes','status','source','analysis_version','prompt_version','model_version'])
    for r in rows:w.writerow([oid(r['_id']),oid(r['product_id']),r.get('review_text',''),r.get('star_rating'),r.get('language'),r.get('sentiment'),r.get('confidence'),json.dumps(r.get('themes',[])),r.get('status'),r.get('source_type'),r.get('analysis_version'),r.get('prompt_version'),r.get('model_version')])
    return Response(out.getvalue(),media_type='text/csv',headers={'Content-Disposition':'attachment; filename=reviewlens-analysis.csv'})
@app.get('/api/v1/admin/export/reviews.json')
async def export_json(p=Depends(auth)):
    rows=[review_out(x) async for x in db.reviews.find({'workspace_id':'demo'}).sort('created_at',1)]; return rows

# Student endpoints (read-only access)
@app.get('/api/v1/student/products')
async def student_products(p=Depends(auth_any)):
    return [product_out(x) async for x in db.products.find({'workspace_id':'demo'}).sort('created_at',-1)]

@app.get('/api/v1/student/reviews')
async def student_reviews(product_id:str|None=None,limit:int=100,p=Depends(auth_any)):
    f={'workspace_id':'demo'}
    if product_id:
        from bson import ObjectId
        try: f['product_id']=ObjectId(product_id)
        except: f['product_id']=product_id
    return [review_out(x) async for x in db.reviews.find(f).sort('created_at',-1).limit(min(limit,500))]

