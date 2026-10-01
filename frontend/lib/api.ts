export const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:8001';

export function token(){return typeof window!=='undefined'?localStorage.getItem('reviewlens_token'):null}

export async function api(path:string,init:RequestInit={}){
  const headers=new Headers(init.headers);
  const bodyIsForm=init.body instanceof FormData;
  if(!bodyIsForm && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
  const t=token();
  if(t) headers.set('Authorization',`Bearer ${t}`);

  const response=await fetch(`${API}${path}`,{...init,headers});
  const contentType=response.headers.get('content-type')||'';

  if(!response.ok){
    let detail='Request failed';
    try{
      const payload=await response.json();
      detail=payload.detail || payload.message || detail;
    }catch{
      try{
        const text=await response.text();
        if(text) detail=text;
      }catch{}
    }
    throw new Error(detail);
  }

  const text=await response.text();
  if(!text) return null;
  if(contentType.includes('text/csv')) return text;
  try{return JSON.parse(text);}catch{return text;}
}
