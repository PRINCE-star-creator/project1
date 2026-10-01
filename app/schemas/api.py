from pydantic import BaseModel, Field, HttpUrl
class AdminLogin(BaseModel): username:str; password:str
class ProductCreate(BaseModel): name:str=Field(min_length=2,max_length=300); brand:str|None=None; category:str|None=None; description:str|None=None; source_url:str|None=None
class URLConnector(BaseModel): url:str
class JobCreate(BaseModel): product_id:int|None=None
