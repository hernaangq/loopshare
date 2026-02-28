-- ============================================================
-- LoopShare Mock Data — Chicago Loop Marketplace
-- ============================================================

-- ─── BUILDINGS (12 real Chicago Loop addresses) ─────────────
INSERT INTO buildings (name, address, neighborhood, floors, total_desks, amenities, latitude, longitude, image_url) VALUES
('Willis Tower',              '233 S Wacker Dr, Chicago, IL 60606',       'The Loop',    110, 500, 'WiFi,Coffee,Parking,Conference Rooms,Gym,Rooftop Lounge',           41.8789, -87.6359, 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800'),
('Aon Center',                '200 E Randolph St, Chicago, IL 60601',     'The Loop',     83, 350, 'WiFi,Coffee,Conference Rooms,Cafeteria,Mail Service',                41.8853, -87.6217, 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800'),
('Chase Tower',               '21 S Clark St, Chicago, IL 60603',         'The Loop',     60, 280, 'WiFi,Coffee,Parking,Conference Rooms,Security Desk',                 41.8810, -87.6309, 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800'),
('One Prudential Plaza',      '130 E Randolph St, Chicago, IL 60601',     'The Loop',     41, 200, 'WiFi,Coffee,Conference Rooms,Cafeteria',                             41.8847, -87.6239, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'),
('The Rookery',               '209 S LaSalle St, Chicago, IL 60604',      'The Loop',     12,  60, 'WiFi,Coffee,Historic Architecture,Conference Rooms',                 41.8794, -87.6323, 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800'),
('Merchandise Mart',          '222 W Merchandise Mart Plaza, Chicago, IL 60654', 'River North', 25, 400, 'WiFi,Coffee,Parking,Conference Rooms,Cafeteria,Event Space',   41.8885, -87.6354, 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800'),
('311 South Wacker',          '311 S Wacker Dr, Chicago, IL 60606',       'The Loop',     65, 300, 'WiFi,Coffee,Parking,Conference Rooms,Gym',                           41.8776, -87.6363, 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800'),
('One Illinois Center',       '111 E Wacker Dr, Chicago, IL 60601',       'The Loop',     31, 150, 'WiFi,Coffee,Conference Rooms,Lake View',                             41.8870, -87.6240, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'),
('20 N Wacker',               '20 N Wacker Dr, Chicago, IL 60606',        'West Loop',    30, 180, 'WiFi,Coffee,Conference Rooms,Phone Booths,Bike Storage',             41.8825, -87.6374, 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800'),
('30 N LaSalle',              '30 N LaSalle St, Chicago, IL 60602',       'The Loop',     44, 250, 'WiFi,Coffee,Conference Rooms,Parking,Security',                      41.8822, -87.6325, 'https://images.unsplash.com/photo-1462826303086-329426d1aef5?w=800'),
('125 S Clark',               '125 S Clark St, Chicago, IL 60603',        'The Loop',     20, 100, 'WiFi,Coffee,Conference Rooms',                                       41.8798, -87.6311, 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800'),
('Old Post Office',           '433 W Van Buren St, Chicago, IL 60607',    'West Loop',    11, 450, 'WiFi,Coffee,Parking,Conference Rooms,Rooftop Deck,Gym,Food Hall',   41.8762, -87.6389, 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800');

-- ─── HOSTS (8 corporations with empty desks) ────────────────
INSERT INTO hosts (company_name, industry, contact_name, contact_email, contact_phone, building_id, employee_count, description) VALUES
('Kirkland & Ellis LLP',       'Legal',           'Margaret Chen',     'mchen@kirkland.example.com',     '312-555-0101', 1,  1800, 'Global law firm with excess capacity on non-court days.'),
('Northern Trust Corp',        'Financial Services','David Okoro',      'dokoro@ntrust.example.com',      '312-555-0102', 2,  5000, 'Asset management firm with 30% vacancy post-hybrid shift.'),
('Morningstar Inc',            'Financial Data',   'Lisa Patel',        'lpatel@morningstar.example.com', '312-555-0103', 3,  4500, 'Investment research firm; employees work from home Mon/Fri.'),
('Kraft Heinz Co',             'Food & Beverage',  'James Williams',    'jwilliams@kraftheinz.example.com','312-555-0104', 4,  2000, 'CPG giant with underused downtown HQ space.'),
('TransUnion',                 'Data & Analytics', 'Sarah Johnson',     'sjohnson@transunion.example.com','312-555-0105', 7,  3000, 'Credit bureau with flexible seating policy.'),
('Holland & Knight LLP',       'Legal',           'Robert Martinez',   'rmartinez@hklaw.example.com',    '312-555-0106', 10, 1200, 'National law firm offering desks Tu-Th.'),
('Hyatt Hotels Corp',          'Hospitality',     'Angela Brooks',     'abrooks@hyatt.example.com',      '312-555-0107', 6,  3500, 'Hotel HQ with 2 open floors after restructuring.'),
('Conagra Brands',             'Food & Beverage', 'Michael Torres',    'mtorres@conagra.example.com',    '312-555-0108', 12, 1500, 'CPG company in the Old Post Office with significant vacancy.');

-- ─── STARTUPS (10 Chicago startups needing space) ───────────
INSERT INTO startups (company_name, industry, contact_name, contact_email, contact_phone, team_size, days_needed, desks_needed, description) VALUES
('Rheaply',         'Sustainability Tech', 'Garry Cooper',    'garry@rheaply.example.com',      '312-555-0201', 25,  'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY', 10, 'Resource exchange platform reducing corporate waste.'),
('Hallow',          'Wellness / Faith',    'Alex Jones',      'alex@hallow.example.com',         '312-555-0202', 40,  'MONDAY,TUESDAY,WEDNESDAY,THURSDAY',        15, 'Prayer and meditation app, fastest-growing in category.'),
('SpotHero',        'Parking Tech',        'Mark Lawrence',   'mark@spothero.example.com',       '312-555-0203', 60,  'MONDAY,WEDNESDAY,FRIDAY',                  20, 'Digital parking marketplace — hybrid team needs flex space.'),
('Braviant Holdings','Fintech',            'Amid Hashemi',    'amid@braviant.example.com',       '312-555-0204', 30,  'TUESDAY,WEDNESDAY,THURSDAY',               12, 'AI-driven consumer lending platform.'),
('Tempus AI',       'Biotech / AI',        'Eric Lefkofsky',  'eric@tempus.example.com',         '312-555-0205', 15,  'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY', 8,  'Precision medicine company leveraging clinical data.'),
('Pangea',          'Fintech',             'Oscar Garcia',    'oscar@pangea.example.com',        '312-555-0206', 12,  'MONDAY,WEDNESDAY',                         5,  'International money-transfer app for immigrant families.'),
('NowPow',          'Health Tech',         'Stacy Lindau',    'stacy@nowpow.example.com',        '312-555-0207', 20,  'TUESDAY,THURSDAY',                         8,  'Community health referral platform (acquired by Unite Us).'),
('Cameo',           'Entertainment Tech',  'Steven Galanis',  'steven@cameo.example.com',        '312-555-0208', 35,  'MONDAY,TUESDAY,WEDNESDAY',                 14, 'Celebrity video shout-out marketplace.'),
('Lorem',           'Logistics',           'Priya Sharma',    'priya@lorem.example.com',         '312-555-0209', 8,   'THURSDAY,FRIDAY',                          4,  'Last-mile delivery optimization for Loop restaurants.'),
('UrbanBound',      'HR Tech',             'Jeff Ellman',     'jeff@urbanbound.example.com',     '312-555-0210', 18,  'MONDAY,TUESDAY,WEDNESDAY,THURSDAY',        7,  'Relocation technology platform for employer mobility.');

-- ─── LISTINGS (hosts offering desks) ────────────────────────
INSERT INTO listings (host_id, building_id, days_available, desks_available, price_per_desk_per_day, floor_number, active, description) VALUES
(1, 1,  'TUESDAY,WEDNESDAY,THURSDAY',               40,  75.00, 55, true,  'Premium desks in Willis Tower with skyline views. Standing desks available.'),
(1, 1,  'MONDAY,FRIDAY',                             25,  55.00, 50, true,  'Willis Tower lower floor — quieter, good for focused work.'),
(2, 2,  'MONDAY,FRIDAY',                             50,  60.00, 35, true,  'Open plan section at Aon Center. Lake Michigan views.'),
(3, 3,  'MONDAY,FRIDAY',                             30,  50.00, 22, true,  'Morningstar empty desks on remote days. Full amenities.'),
(4, 4,  'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',  20,  45.00, 15, true,  'Kraft Heinz spare floor — all week availability.'),
(5, 7,  'MONDAY,WEDNESDAY,FRIDAY',                   35,  55.00, 30, true,  'TransUnion flex seats with dual monitors.'),
(6, 10, 'TUESDAY,WEDNESDAY,THURSDAY',                18,  65.00, 20, true,  'Holland & Knight private office pods, mid-week only.'),
(7, 6,  'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',  60,  40.00,  8, true,  'Hyatt HQ open floor — great for large startup teams.'),
(7, 6,  'WEDNESDAY,THURSDAY,FRIDAY',                 30,  35.00,  9, true,  'Hyatt second available floor. Budget-friendly.'),
(8, 12, 'TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',         45,  50.00,  5, true,  'Old Post Office — modern space with rooftop access.');

-- ─── BOOKINGS (sample reservations) ─────────────────────────
INSERT INTO bookings (listing_id, startup_id, booking_date, desks_booked, total_price, status) VALUES
(1,  1,  '2026-03-03', 10,  750.00, 'CONFIRMED'),
(3,  3,  '2026-03-02', 15,  900.00, 'CONFIRMED'),
(4,  5,  '2026-03-04',  8,  400.00, 'CONFIRMED'),
(5,  2,  '2026-03-03', 15,  675.00, 'PENDING'),
(8,  8,  '2026-03-05', 14,  560.00, 'PENDING'),
(6,  6,  '2026-03-04',  5,  275.00, 'CONFIRMED'),
(10, 4,  '2026-03-06', 12,  600.00, 'PENDING'),
(2,  9,  '2026-03-07',  4,  220.00, 'CONFIRMED');
