-- ============================================================
-- LoopShare Mock Data — Chicago Loop Marketplace
-- ============================================================

-- ─── BUILDINGS (21 from Chicago Energy Benchmarking dataset) ─
INSERT INTO buildings (name, address, neighborhood, floors, total_desks, amenities, latitude, longitude, image_url) VALUES
('8 S. Michigan LLC',                        '8 S. Michigan Ave, Chicago, IL 60603',       'The Loop',   40, 180,  'WiFi,Coffee,Conference Rooms,Historic Architecture',                       41.8818,   -87.6244, 'https://images1.loopnet.com/i2/7McE6pHTU9Tg6-wcEOkej7aW_dk78kY8RJ5NZrpDIOQ/112/image.jpg'),
('122 Property LLC',                         '122 S. Michigan Ave, Chicago, IL 60604',     'The Loop',   45, 500,  'WiFi,Coffee,Conference Rooms,Cafeteria,Historic Architecture',              41.8804,   -87.6243, 'https://images.squarespace-cdn.com/content/v1/6283efbaa08a8045daae6950/b07b0705-7580-4f93-a1f8-38ea7a291b1f/122-S-Michigan-Ave-Chicago-IL-Building-Photo-1-LargeHighDefinition-2.jpg'),
('55 West Wacker Drive',                     '55 W Wacker Dr, Chicago, IL 60601',          'The Loop',   41, 275,  'WiFi,Coffee,Conference Rooms,River View,Gym',                               41.8826,   -87.6296, 'https://images1.loopnet.com/i2/Nch-ztLlRBcVlbpKQr1cuz0NQ87shR9ye61hHdrrhyg/112/image.jpg'),
('Michigan - 180 Property LLC',              '180 N Michigan Ave, Chicago, IL 60601',      'The Loop',   28, 230,  'WiFi,Coffee,Conference Rooms,Lake View',                                    41.8869,   -87.6244, 'https://images1.loopnet.com/i2/6RcPrtd2zgVq0OmOnz4AWv2ZHx69x1UntoOCRvMICLU/110/image.jpg'),
('One North Franklin (PNC Center)',          '1 N Franklin St, Chicago, IL 60606',         'The Loop',   48, 700,  'WiFi,Coffee,Conference Rooms,Gym,Security Desk',                            41.8820,   -87.6352, 'https://res.cloudinary.com/marketsphere/image/upload/c_fill,h_600,w_1200/eyde47t57nuhzmeesgqt.jpg'),
('135 S LaSalle Property LLC',               '135 S LaSalle St, Chicago, IL 60603',        'The Loop',   45, 300,  'WiFi,Coffee,Conference Rooms,Historic Architecture,Security',               41.8786,   -87.6321, 'https://chicagoyimby.com/wp-content/uploads/2022/12/LaSalle-Street-02.png'),
('11 East Adams LLC',                        '11 E Adams St, Chicago, IL 60603',           'The Loop',   30, 160,  'WiFi,Coffee,Conference Rooms',                                              41.8793,   -87.6275, 'https://images1.showcase.com/i2/2YqLxWUybhmz0naDWRGOQlpIKUDTQwqyG-jKH2U_b14/115/image.jpg'),
('191 North Wacker',                         '191 N Wacker Dr, Chicago, IL 60606',         'West Loop',  37, 775,  'WiFi,Coffee,Conference Rooms,Gym,River View',                               41.8877,   -87.6365, 'https://s3.amazonaws.com/transwestern-property/Images/7862db6e-51c1-ea11-a812-000d3a5b3f21_t.jpg'),
('77 West Wacker Drive',                     '77 W Wacker Dr, Chicago, IL 60601',          'The Loop',   50, 600,  'WiFi,Coffee,Conference Rooms,River View,Gym',                               41.8833,   -87.6362, 'https://costar.brightspotcdn.com/dims4/default/72e2db2/2147483647/strip/true/crop/1240x826+0+0/resize/1240x826!/quality/100/?url=http%3A%2F%2Fcostar-brightspot.s3.us-east-1.amazonaws.com%2F18%2Fb7%2F55b5d3ac41df95aa3aedd87c124a%2F77-w.%20Wacker.jpg'),
('One East Wacker',                          '1 E Wacker Dr, Chicago, IL 60601',           'The Loop',   40, 800,  'WiFi,Coffee,Conference Rooms,Lake View',                                    41.8878,   -87.6258, 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800'),
('105 W Madison',                            '105 W Madison St, Chicago, IL 60602',        'The Loop',   25, 140,  'WiFi,Coffee,Conference Rooms',                                              41.8818,   -87.6295, 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800'),
('101 North Wacker',                         '101 N Wacker Dr, Chicago, IL 60606',         'West Loop',  50, 670,  'WiFi,Coffee,Conference Rooms,Gym,River View',                               41.8861,   -87.6371, 'https://images.unsplash.com/photo-1564300097476-4fd057df00e0?w=800'),
('The National (125 S. Clark Street)',       '125 S Clark St, Chicago, IL 60603',          'The Loop',   21, 580,  'WiFi,Coffee,Conference Rooms,Historic Architecture',                       41.8796,   -87.6311, 'https://images.unsplash.com/photo-1708938886488-70cd00056a11?w=800'),
('The Monadnock Building',                   '53 W Jackson Blvd, Chicago, IL 60604',       'The Loop',   16, 495,  'WiFi,Coffee,Conference Rooms,Historic Architecture',                       41.8782,   -87.6304, 'https://images.unsplash.com/photo-1462826303086-329426d1aef5?w=800'),
('The Garland Building Office Condominium',  '111 N Wabash Ave, Chicago, IL 60602',        'The Loop',   25, 260,  'WiFi,Coffee,Conference Rooms',                                              41.8833,   -87.6264, 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'),
('65 E Wacker Place',                        '65 E Wacker Pl, Chicago, IL 60601',          'The Loop',   24, 250,  'WiFi,Coffee,Conference Rooms,Lake View',                                    41.8878,   -87.6248, 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800'),
('55 West Monroe',                           '55 W Monroe St, Chicago, IL 60603',          'The Loop',   44, 895,  'WiFi,Coffee,Conference Rooms,Gym',                                          41.8806,   -87.6296, 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800'),
('10 South LaSalle Street',                  '10 S LaSalle St, Chicago, IL 60603',         'The Loop',   36, 870,  'WiFi,Coffee,Conference Rooms,Security Desk',                                41.8808,   -87.6321, 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800'),
('209 West Jackson',                         '209 W Jackson Blvd, Chicago, IL 60606',      'The Loop',   20, 165,  'WiFi,Coffee,Conference Rooms',                                              41.87695,  -87.634048, 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800'),
('111 West Washington',                      '111 W Washington St, Chicago, IL 60602',     'The Loop',   35, 600,  'WiFi,Coffee,Conference Rooms,Gym,Security Desk',                            41.884596, -87.628795, 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800'),
('35 East Wacker Drive',                     '35 E Wacker Dr, Chicago, IL 60601',          'The Loop',   40, 620,  'WiFi,Coffee,Conference Rooms,Lake View,Historic Architecture',              41.880845, -87.628591, 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800');

-- ─── HOSTS (8 corporations with empty desks) ────────────────
INSERT INTO hosts (company_name, industry, contact_name, contact_email, contact_phone, building_id, employee_count, description) VALUES
('Kirkland & Ellis LLP',       'Legal',           'Margaret Chen',     'mchen@kirkland.example.com',     '312-555-0101', 5,  1800, 'Global law firm with excess capacity on non-court days.'),
('Northern Trust Corp',        'Financial Services','David Okoro',      'dokoro@ntrust.example.com',      '312-555-0102', 12, 5000, 'Asset management firm with 30% vacancy post-hybrid shift.'),
('Morningstar Inc',            'Financial Data',   'Lisa Patel',        'lpatel@morningstar.example.com', '312-555-0103', 9,  4500, 'Investment research firm; employees work from home Mon/Fri.'),
('Kraft Heinz Co',             'Food & Beverage',  'James Williams',    'jwilliams@kraftheinz.example.com','312-555-0104', 17, 2000, 'CPG giant with underused downtown HQ space.'),
('TransUnion',                 'Data & Analytics', 'Sarah Johnson',     'sjohnson@transunion.example.com','312-555-0105', 8,  3000, 'Credit bureau with flexible seating policy.'),
('Holland & Knight LLP',       'Legal',           'Robert Martinez',   'rmartinez@hklaw.example.com',    '312-555-0106', 18, 1200, 'National law firm offering desks Tu-Th.'),
('Hyatt Hotels Corp',          'Hospitality',     'Angela Brooks',     'abrooks@hyatt.example.com',      '312-555-0107', 10, 3500, 'Hotel HQ with 2 open floors after restructuring.'),
('Conagra Brands',             'Food & Beverage', 'Michael Torres',    'mtorres@conagra.example.com',    '312-555-0108', 2,  1500, 'CPG company with significant vacancy in Michigan Ave offices.');

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
(1, 5,  'TUESDAY,WEDNESDAY,THURSDAY',               40,  75.00, 30, true,  'Premium desks at One North Franklin with skyline views. Standing desks available.'),
(1, 5,  'MONDAY,FRIDAY',                             25,  55.00, 25, true,  'One North Franklin lower floor — quieter, good for focused work.'),
(2, 12, 'MONDAY,FRIDAY',                             50,  60.00, 35, true,  'Open plan section at 101 North Wacker. River views.'),
(3, 9,  'MONDAY,FRIDAY',                             30,  50.00, 22, true,  'Morningstar empty desks on remote days at 77 West Wacker. Full amenities.'),
(4, 17, 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',  20,  45.00, 15, true,  'Kraft Heinz spare floor at 55 West Monroe — all week availability.'),
(5, 8,  'MONDAY,WEDNESDAY,FRIDAY',                   35,  55.00, 20, true,  'TransUnion flex seats with dual monitors at 191 North Wacker.'),
(6, 18, 'TUESDAY,WEDNESDAY,THURSDAY',                18,  65.00, 18, true,  'Holland & Knight private office pods at 10 South LaSalle, mid-week only.'),
(7, 10, 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',  60,  40.00, 15, true,  'Hyatt HQ open floor at One East Wacker — great for large startup teams.'),
(7, 10, 'WEDNESDAY,THURSDAY,FRIDAY',                 30,  35.00, 20, true,  'Hyatt second available floor at One East Wacker. Budget-friendly.'),
(8, 2,  'TUESDAY,WEDNESDAY,THURSDAY,FRIDAY',         45,  50.00,  5, true,  '122 S. Michigan — modern space with historic architecture and cafeteria.');

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
