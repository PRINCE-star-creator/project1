"""Demo provider for testing without real API credentials."""
from typing import List, Optional
from datetime import datetime, timezone
from .base import MarketplaceProvider, Product, Review, ProviderError

class DemoProvider:
    """Demo provider that returns mock data for testing."""
    
    name="demo"
    
    def __init__(self):
        self.demo_products=[
            {
                'external_id':'demo001',
                'title':'Wireless Earbuds Pro',
                'brand':'SoundTech',
                'category':'Audio',
                'price':49.99,
                'source_rating':4.2,
                'source_review_count':1234,
                'image_url':'https://via.placeholder.com/300x300'
            },
            {
                'external_id':'demo002',
                'title':'Smartphone X',
                'brand':'TechCorp',
                'category':'Phones',
                'price':699.99,
                'source_rating':4.5,
                'source_review_count':5678,
                'image_url':'https://via.placeholder.com/300x300'
            },
            {
                'external_id':'demo003',
                'title':'Laptop Pro 15',
                'brand':'ComputeMax',
                'category':'Laptops',
                'price':1299.99,
                'source_rating':4.3,
                'source_review_count':2345,
                'image_url':'https://via.placeholder.com/300x300'
            }
        ]
    
    async def search_products(
        self,
        query: str,
        category: Optional[str]=None,
        page: int=1,
        limit: int=24,
    ) -> List[Product]:
        """Search demo products."""
        now=datetime.now(timezone.utc).isoformat()
        
        filtered=self.demo_products
        if query:
            query_lower=query.lower()
            filtered=[p for p in filtered if query_lower in p['title'].lower()]
        if category:
            filtered=[p for p in filtered if p.get('category')==category]
        
        return [
            Product(
                internal_id=f"demo_{p['external_id']}",
                provider=self.name,
                external_id=p['external_id'],
                title=p['title'],
                brand=p.get('brand'),
                category=p.get('category'),
                price=p.get('price'),
                source_rating=p.get('source_rating'),
                source_review_count=p.get('source_review_count'),
                image_url=p.get('image_url'),
                product_url=f"https://demo.example.com/product/{p['external_id']}",
                currency='USD',
                source_metadata={'demo':True},
                fetched_at=now
            )
            for p in filtered[:limit]
        ]
    
    async def get_product(self, external_id: str) -> Optional[Product]:
        """Get single demo product."""
        for p in self.demo_products:
            if p['external_id']==external_id:
                now=datetime.now(timezone.utc).isoformat()
                return Product(
                    internal_id=f"demo_{p['external_id']}",
                    provider=self.name,
                    external_id=p['external_id'],
                    title=p['title'],
                    brand=p.get('brand'),
                    category=p.get('category'),
                    price=p.get('price'),
                    source_rating=p.get('source_rating'),
                    source_review_count=p.get('source_review_count'),
                    image_url=p.get('image_url'),
                    product_url=f"https://demo.example.com/product/{p['external_id']}",
                    currency='USD',
                    source_metadata={'demo':True},
                    fetched_at=now
                )
        return None
    
    async def get_reviews(
        self,
        external_id: str,
        page: int=1,
        limit: int=20,
    ) -> List[Review]:
        """Get demo reviews for a product."""
        now=datetime.now(timezone.utc).isoformat()
        
        demo_reviews=[
            {
                'external_review_id':'r001',
                'star_rating':5,
                'title':'Excellent product',
                'review_text':'The sound quality is amazing and the battery lasts all day.',
                'reviewer_display_name':'Satisfied Customer',
                'verified_purchase':True,
                'helpful_votes':45,
                'total_votes':50
            },
            {
                'external_review_id':'r002',
                'star_rating':3,
                'title':'Good but issues',
                'review_text':'The camera is excellent but the battery drains quickly.',
                'reviewer_display_name':'Mixed Reviewer',
                'verified_purchase':True,
                'helpful_votes':12,
                'total_votes':15
            },
            {
                'external_review_id':'r003',
                'star_rating':2,
                'title':'Disappointed',
                'review_text':'Poor quality and the build feels cheap.',
                'reviewer_display_name':'Unhappy Customer',
                'verified_purchase':False,
                'helpful_votes':3,
                'total_votes':8
            }
        ]
        
        return [
            Review(
                id=f"{external_id}_{r['external_review_id']}",
                provider=self.name,
                external_review_id=r['external_review_id'],
                product_id=external_id,
                star_rating=r['star_rating'],
                title=r['title'],
                review_text=r['review_text'],
                reviewer_display_name=r['reviewer_display_name'],
                verified_purchase=r['verified_purchase'],
                helpful_votes=r['helpful_votes'],
                total_votes=r['total_votes'],
                source_url=f"https://demo.example.com/review/{r['external_review_id']}",
                raw_metadata={'demo':True},
                fetched_at=now,
                provider_version='1.0'
            )
            for r in demo_reviews[:limit]
        ]
