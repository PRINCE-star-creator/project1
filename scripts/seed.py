import asyncio
from sqlalchemy import select
from app.db.session import Session, init_db
from app.db.models import AdminUser, Workspace, Product, Review
from app.core.config import settings
from app.core.security import hash_password
async def main():
    await init_db()
    async with Session() as db:
        admin=(await db.execute(select(AdminUser).where(AdminUser.username==settings.admin_username))).scalar_one_or_none()
        if not admin: db.add(AdminUser(username=settings.admin_username,password_hash=hash_password(settings.admin_password)))
        ws=(await db.execute(select(Workspace).where(Workspace.slug=='demo'))).scalar_one_or_none()
        if not ws: ws=Workspace(name='ReviewLens Demo Workspace',slug='demo'); db.add(ws); await db.flush()
        if not (await db.execute(select(Product).where(Product.workspace_id==ws.id))).scalars().first():
            products=[('AeroSound Pro Wireless Earbuds','AeroSound','Audio'),('Nova X Smartphone','Nova','Phones'),('Vertex 14 Laptop','Vertex','Laptops')]
            for n,b,c in products: db.add(Product(workspace_id=ws.id,name=n,brand=b,category=c,source_type='seed'))
            await db.flush()
        await db.commit(); print('Seeded ReviewLens demo workspace and admin account.')
if __name__=='__main__': asyncio.run(main())
