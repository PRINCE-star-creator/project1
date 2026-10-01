"""Provider adapter interface for marketplace integration."""
from typing import Protocol, List, Optional, Dict, Any
from pydantic import BaseModel

class Product(BaseModel):
    """Normalized product model."""
    internal_id: str
    provider: str
    external_id: str
    title: str
    brand: Optional[str]=None
    model: Optional[str]=None
    category: Optional[str]=None
    description: Optional[str]=None
    image_url: Optional[str]=None
    product_url: Optional[str]=None
    currency: str="USD"
    price: Optional[float]=None
    previous_price: Optional[float]=None
    availability: Optional[str]=None
    source_rating: Optional[float]=None
    source_review_count: Optional[int]=None
    source_metadata: Dict[str,Any]={}
    fetched_at: str

class Review(BaseModel):
    """Normalized review model."""
    id: str
    provider: str
    external_review_id: str
    product_id: str
    star_rating: Optional[int]=None
    title: Optional[str]=None
    review_text: str
    reviewer_display_name: Optional[str]=None
    review_date: Optional[str]=None
    verified_purchase: Optional[bool]=None
    helpful_votes: Optional[int]=None
    total_votes: Optional[int]=None
    source_url: Optional[str]=None
    raw_metadata: Dict[str,Any]={}
    fetched_at: str
    provider_version: str

class MarketplaceProvider(Protocol):
    """Provider adapter interface (§8)."""
    
    name: str
    
    async def search_products(
        self,
        query: str,
        category: Optional[str]=None,
        page: int=1,
        limit: int=24,
    ) -> List[Product]: ...
    
    async def get_product(self, external_id: str) -> Optional[Product]: ...
    
    async def get_reviews(
        self,
        external_id: str,
        page: int=1,
        limit: int=20,
    ) -> List[Review]: ...

class ProviderError(Exception):
    """Provider-specific error with safe messaging."""
    def __init__(self, provider_name: str, message: str, is_recoverable: bool=True):
        self.provider_name=provider_name
        self.message=message
        self.is_recoverable=is_recoverable
        super().__init__(f"{provider_name}: {message}")
