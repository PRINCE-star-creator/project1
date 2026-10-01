import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import sys, os

# Add parent directory for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.ml.mock_analysis import analyze, VERSION
from app.core.config import settings

products_data = [
    {
        'name': 'AeroSound Pro Wireless Earbuds',
        'brand': 'AeroSound',
        'category': 'Audio',
        'image_url': 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('Battery is disappointing, but the sound quality is excellent and bass is powerful.', 4, 'Sarah J.'),
            ('Good sound but the battery drains quickly during conference calls.', 3, 'Michael K.'),
            ('Perfect fit for workouts and running. Noise cancellation is surprisingly good!', 5, 'Alex P.')
        ]
    },
    {
        'name': 'Nova X Smartphone',
        'brand': 'Nova',
        'category': 'Phones',
        'image_url': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('The camera is excellent and the display is bright and clear outdoors.', 5, 'David L.'),
            ('Fast charging and smooth 120Hz display. Best phone I have owned this year.', 5, 'Elena R.'),
            ('Great hardware but the camera software has occasional lag when switching modes.', 4, 'Kevin M.')
        ]
    },
    {
        'name': 'Vertex 14 Ultra Laptop',
        'brand': 'Vertex',
        'category': 'Laptops',
        'image_url': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('The laptop is fast and comfortable, but delivery was late by two days.', 4, 'James H.'),
            ('Battery life lasts all day for coding and spreadsheet tasks. Keyboard feel is stellar.', 5, 'Rachel W.'),
            ('Fans get slightly loud under heavy video rendering, but overall performance is top tier.', 4, 'Brian C.')
        ]
    },
    {
        'name': 'PulseFit Ultra Smartwatch',
        'brand': 'PulseFit',
        'category': 'Wearables',
        'image_url': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('Amazing battery life and fitness tracking accuracy. The AMOLED screen is vibrant outdoors!', 5, 'Chris B.'),
            ('Sleep tracking is very helpful, but the companion phone app sync could be faster.', 4, 'Jessica T.'),
            ('Comfortable strap and waterproof design. Perfect companion for my daily swim workouts.', 5, 'Marcus D.')
        ]
    },
    {
        'name': 'Zenith ANC Wireless Headphones',
        'brand': 'Zenith',
        'category': 'Audio',
        'image_url': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('Incredible noise cancellation and deep bass, very comfortable for long international flights.', 5, 'Daniel V.'),
            ('Soundstage is open and clear. Earcups are plush memory foam with zero fatigue.', 5, 'Emily S.'),
            ('Audio is superb, but the carry case is a bit bulky for daily commute.', 4, 'Andrew G.')
        ]
    },
    {
        'name': 'Lumina Alpha 4K Mirrorless Camera',
        'brand': 'Lumina',
        'category': 'Cameras',
        'image_url': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('Stunning 4K 60fps video quality with ultra-fast autofocus. Perfect for content creators.', 5, 'Nathalie B.'),
            ('Crisp colors and low-light performance is breathtaking. Highly recommend for portraits.', 5, 'Leo F.'),
            ('Menu system takes some getting used to, but the raw image quality is unbeatable.', 4, 'Patrick N.')
        ]
    },
    {
        'name': 'Apex Pro RGB Mechanical Keyboard',
        'brand': 'Apex',
        'category': 'Accessories',
        'image_url': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('Smooth tactile switches and stunning per-key RGB lighting. Typing on this is pure joy.', 5, 'Eric Z.'),
            ('Solid aluminum frame with great wrist rest. Hot-swappable PCB is a nice bonus.', 5, 'Hannah L.'),
            ('Keycaps feel premium. Software for macro keys could be slightly more intuitive.', 4, 'Sam K.')
        ]
    },
    {
        'name': 'ViewSonic Elite 34" Curved Monitor',
        'brand': 'ViewSonic',
        'category': 'Monitors',
        'image_url': 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('Immersive ultrawide curve with crisp 144Hz refresh rate. Multitasking workflow revolutionized!', 5, 'Tyler M.'),
            ('Great colors and high contrast. HDR performance is bright and vibrant.', 5, 'Oliver J.'),
            ('Stand takes up substantial desk space, but mount holes make it easy to arm-mount.', 4, 'Sophia H.')
        ]
    },
    {
        'name': 'SkyGlide Pro 4K Drone',
        'brand': 'SkyGlide',
        'category': 'Drones',
        'image_url': 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('Remarkable gimbal stabilization even in windy conditions. 30-minute flight time per battery.', 5, 'Lucas P.'),
            ('Obstacle sensors give peace of mind for beginners. 4K footage looks cinematic.', 5, 'Zoe C.'),
            ('Requires firmware update out of box, but once setup it flies like a dream.', 4, 'Ethan R.')
        ]
    },
    {
        'name': 'Aura Studio Podcast Microphone',
        'brand': 'Aura',
        'category': 'Audio',
        'image_url': 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('Rich broadcast vocal tone right out of the box with zero background hiss.', 5, 'Grace Y.'),
            ('Plug and play USB-C convenience with XLR option. Built-in pop filter works wonders.', 5, 'Noah W.'),
            ('Solid metal construction. Heavy enough to stay put on boom arm.', 4, 'Maya K.')
        ]
    },
    {
        'name': 'Titan Fold 5G Smartphone',
        'brand': 'Titan',
        'category': 'Phones',
        'image_url': 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('The folding hinge feels rock solid and crease is almost invisible in daily use.', 5, 'Victor B.'),
            ('Split-screen multitasking on the large inner display is an absolute game-changer.', 5, 'Chloe D.'),
            ('Battery is slightly taxed by dual screens, but charges back up in under 35 minutes.', 4, 'Aaron T.')
        ]
    },
    {
        'name': 'HyperBook OLED 16 Creator Laptop',
        'brand': 'HyperBook',
        'category': 'Laptops',
        'image_url': 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('The 4K OLED display has true blacks and 100% DCI-P3 color accuracy for photo editing.', 5, 'Amelia R.'),
            ('Lightning fast render times with the dedicated GPU. Slim and portable chassis.', 5, 'Liam N.'),
            ('Gets warm during heavy 3D workflows, but cooling pad resolves it easily.', 4, 'Sebastian G.')
        ]
    },
    {
        'name': 'OmniBot X8 Smart Robot Vacuum',
        'brand': 'OmniBot',
        'category': 'Smart Home',
        'image_url': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('LiDAR navigation maps our apartment flawlessly and avoids pet toys without getting stuck.', 5, 'Emma L.'),
            ('Self-emptying base is a blessing. Strong suction picked up dirt our upright missed.', 5, 'Benjamin E.'),
            ('Mopping pad needs weekly wash, but vacuuming capability is 10/10.', 4, 'Charlotte P.')
        ]
    },
    {
        'name': 'BaristaTouch Espresso Machine',
        'brand': 'Barista',
        'category': 'Kitchen',
        'image_url': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('Cafe quality lattes every morning in under two minutes! Microfoam wand is magical.', 5, 'Henry W.'),
            ('ThermoJet heating reaches extraction temperature in 3 seconds flat. Built like a tank.', 5, 'Olivia S.'),
            ('Requires regular descaling, but customer support provided free maintenance kits.', 4, 'Gabriel K.')
        ]
    },
    {
        'name': 'ErgoComfort Pro Mesh Office Chair',
        'brand': 'ErgoComfort',
        'category': 'Furniture',
        'image_url': 'https://images.unsplash.com/photo-1580481077195-c22e30f40822?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('Completely eliminated lower back pain after 8-hour workday. Breathable mesh is fantastic.', 5, 'Mason C.'),
            ('3D armrests and dynamic lumbar support adjust to every posture. Easy 15-minute assembly.', 5, 'Ava B.'),
            ('Headrest adjustment is slightly stiff initially, but chair comfort is outstanding.', 4, 'Logan M.')
        ]
    },
    {
        'name': 'SonicBeam Dolby Atmos Soundbar',
        'brand': 'SonicBeam',
        'category': 'Audio',
        'image_url': 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('Upfiring speakers bounce overhead audio for true movie theater immersion in our living room.', 5, 'Caleb R.'),
            ('Dialogue clarity is crystal clear even during chaotic action scenes. Wireless sub hits hard.', 5, 'Harper F.'),
            ('eARC setup was instantaneous with our OLED TV. Sleek low-profile design.', 5, 'Dylan S.')
        ]
    },
    {
        'name': 'Onyx Horizon Smart Audio Glasses',
        'brand': 'Onyx',
        'category': 'Wearables',
        'image_url': 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('Open-ear directional speakers let me hear music and podcasts while staying alert in the city.', 5, 'Julian A.'),
            ('Polarized UV lenses are high grade and frame looks like stylish designer eyewear.', 5, 'Evelyn T.'),
            ('Touch controls on temples are responsive. Microphone is very clear on calls.', 4, 'Levi V.')
        ]
    },
    {
        'name': 'GameSphere Pro Next-Gen Console',
        'brand': 'GameSphere',
        'category': 'Gaming',
        'image_url': 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('Instant NVMe game load times and smooth 4K 120fps gaming. Haptic controller feedback is insane!', 5, 'Brandon H.'),
            ('Whisper quiet fans even during intensive ray-tracing sessions. Fantastic game library.', 5, 'Riley D.'),
            ('Console size is substantial on media console, but gaming performance is peerless.', 5, 'Isaac N.')
        ]
    },
    {
        'name': 'PureAir True HEPA Smart Air Purifier',
        'brand': 'PureAir',
        'category': 'Smart Home',
        'image_url': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('Air quality sensor auto-adjusts fan speed. Noticeable relief from seasonal allergies within 24 hours.', 5, 'Samantha W.'),
            ('Sleep mode is whisper quiet and turns off display LEDs. Very low power consumption.', 5, 'Adam L.'),
            ('Filter replacement indicator is convenient. Mobile app graphs air particulate history.', 4, 'Layla J.')
        ]
    },
    {
        'name': 'EchoCanvas 10" Smart Touch Display',
        'brand': 'EchoCanvas',
        'category': 'Smart Home',
        'image_url': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600&auto=format&fit=crop&q=80',
        'reviews': [
            ('Central command center for all smart lights, security cameras, and family calendar.', 5, 'Justin G.'),
            ('Auto-framing camera for video calls keeps kids centered. Stereo speakers sound warm and full.', 5, 'Maya O.'),
            ('Ambient photo slideshow mode turns it into a gorgeous digital photo frame when idle.', 5, 'Nathan B.')
        ]
    }
]

async def seed():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['reviewlens']
    
    # Clean up existing demo products to avoid duplicates and re-seed cleanly
    await db.products.delete_many({'workspace_id': 'demo'})
    await db.reviews.delete_many({'workspace_id': 'demo'})
    
    now = datetime.now(timezone.utc)
    print(f"Seeding {len(products_data)} products...")
    
    total_reviews = 0
    for p_info in products_data:
        prod_doc = {
            'workspace_id': 'demo',
            'name': p_info['name'],
            'brand': p_info['brand'],
            'category': p_info['category'],
            'image_url': p_info['image_url'],
            'source_type': 'catalog',
            'created_at': now
        }
        res = await db.products.insert_one(prod_doc)
        pid = res.inserted_id
        
        for review_text, stars, author in p_info['reviews']:
            analysis_res = analyze(review_text)
            rev_doc = {
                'workspace_id': 'demo',
                'product_id': pid,
                'review_text': review_text,
                'star_rating': stars,
                'author': author,
                'source_type': 'demo-seed',
                'language': 'en',
                'status': 'complete',
                'sentiment': analysis_res['sentiment'],
                'confidence': analysis_res['confidence'],
                'themes': analysis_res['themes'],
                'citations': analysis_res['citations'],
                'analysis_version': VERSION,
                'prompt_version': settings.prompt_version,
                'model_version': settings.model_version,
                'created_at': now
            }
            await db.reviews.insert_one(rev_doc)
            total_reviews += 1
            
    print(f"Successfully seeded {len(products_data)} products and {total_reviews} analyzed reviews!")

if __name__ == '__main__':
    asyncio.run(seed())
