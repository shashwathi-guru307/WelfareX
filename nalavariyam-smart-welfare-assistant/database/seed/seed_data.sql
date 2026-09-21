-- ============================================================
-- Nalavariyam Smart Welfare Assistant — Seed Data (Phase 3)
-- ============================================================
-- Demo data for workers, registrations, and family members.
-- Welfare schemes are imported separately from the Excel file
-- via welfare_schemes_seed.sql (idempotent).
-- ============================================================

-- ============================================================
-- Welfare Boards — Full official TN directory
-- (Nature-of-work lists per board live in frontend/src/data/welfareBoards.ts)
-- ============================================================
INSERT OR IGNORE INTO welfare_boards (name, description, is_active) VALUES
('Tamil Nadu Construction Workers Welfare Board', 'Welfare board for construction workers across Tamil Nadu.', 1),
('Tamil Nadu Manual Workers Social Security and Welfare Board', 'Welfare board for manual/unorganised workers across sectors.', 1),
('Tamil Nadu Washermen Welfare Board', 'Welfare board for washermen (laundry workers).', 1),
('Tamil Nadu Hair Dressers Welfare Board', 'Welfare board for hair dressers and beauty parlour workers.', 1),
('Tamil Nadu Tailoring Workers Welfare Board', 'Welfare board for tailoring workers.', 1),
('Tamil Nadu Handicraft Workers Welfare Board', 'Welfare board for handicraft, sculpture and vessels workers.', 1),
('Tamil Nadu Palm Tree Workers Welfare Board', 'Welfare board for palm tree workers (neera tapping, tree climbing).', 1),
('Tamil Nadu Handloom Workers Welfare Board', 'Welfare board for handloom and handloom silk weaving workers.', 1),
('Tamil Nadu Power loom Weaving Workers Welfare Board', 'Welfare board for power loom weaving workers.', 1),
('Tamil Nadu Footwear and Leather Workers Welfare Board', 'Welfare board for footwear, leather goods and tannery workers.', 1),
('Tamil Nadu Artists Welfare Board', 'Welfare board for artists.', 1),
('Tamil Nadu Goldsmiths Welfare Board', 'Welfare board for goldsmiths and gold/silver manufacture workers.', 1),
('Tamil Nadu Pottery Workers Welfare Board', 'Welfare board for pottery workers.', 1),
('Tamil Nadu Domestic Workers Welfare Board', 'Welfare board for domestic workers.', 1),
('Tamil Nadu Street Vending and Shops and Establishments Workers Welfare Board', 'Welfare board for street vendors and shops & establishments workers.', 1),
('Tamil Nadu Cooking and Catering Workers Welfare Board', 'Welfare board for cooking and catering workers.', 1),
('Tamil Nadu Unorganised Drivers and Automobile Workshop Workers Welfare Board', 'Welfare board for unorganised drivers and automobile workshop workers.', 1),
('Tamil Nadu Beedi Workers Welfare Board', 'Welfare board for beedi rolling and tobacco industry workers.', 1),
('Tamil Nadu Fire and Match Workers Welfare Board', 'Welfare board for fire works and match industry workers.', 1);

-- NOTE: Phase 3 real welfare boards (TN Construction, TN Manual Workers, Drivers & Auto)
-- are created by welfare_schemes_seed.sql using INSERT OR IGNORE.

-- ============================================================
-- Workers (DEMO DATA — NOT REAL GOVERNMENT RECORDS)
-- ============================================================

INSERT OR IGNORE INTO workers (full_name, father_husband_name, date_of_birth, gender, mobile_number, alternate_mobile, address, district, taluk, village_town, pincode, ration_card_number, nature_of_work, occupation, worker_category, board_id, education_level, marital_status, has_disability) VALUES
('Rajesh Kumar M', 'Muthusamy K', '1985-03-15', 'Male', '9876543210', '9876543299', '42, Thiruvalluvar Street, near bus stand', 'Chennai', 'Tondiarpet', 'Tondiarpet', '600081', 'TN01234567890', 'Building Construction', 'Mason', 'Mason', 1, 'Secondary', 'Married', 0),
('Lakshmi Devi S', 'Sundaram P', '1990-07-22', 'Female', '9876543211', NULL, '18, Ambedkar Nagar', 'Chennai', 'Ambattur', 'Ambattur', '600058', 'TN01234567891', 'Housekeeping', 'Domestic Worker', 'Domestic Worker', 2, 'Primary', 'Married', 0),
('Murugan K', 'Kandasamy R', '1978-11-05', 'Male', '9876543212', '9876543301', '7, Gandhi Road, near temple', 'Coimbatore', 'Coimbatore North', 'Gandhipuram', '641001', 'TN02234567890', 'Furniture Making', 'Carpenter', 'Carpenter', 1, 'Secondary', 'Married', 0),
('Priya R', 'Rajendran S', '1995-01-30', 'Female', '9876543213', NULL, '23, Nehru Street', 'Madurai', 'Madurai East', 'Anna Nagar', '625001', 'TN03234567890', 'Home Cleaning', 'Domestic Worker', 'Domestic Worker', 2, 'Higher Secondary', 'Single', 0),
('Senthil A', 'Arumugam T', '1982-09-12', 'Male', '9876543214', '9876543302', '56, Rajaji Nagar', 'Tiruchirappalli', 'Srirangam', 'Srirangam', '620001', 'TN04234567890', 'Wiring & Repairs', 'Electrician', 'Electrician', 1, 'Secondary', 'Married', 0),
('Kavitha B', 'Balasubramanian V', '1988-04-18', 'Female', '9876543215', NULL, '31, Valluvar Street', 'Salem', 'Salem West', 'Fairlands', '636001', 'TN05234567890', 'Beedi Rolling', 'Beedi Worker', 'Beedi Worker', 5, 'Primary', 'Married', 0),
('Anbazhagan P', 'Palaniappan G', '1975-12-25', 'Male', '9876543216', '9876543303', '89, Temple Road', 'Tirunelveli', 'Tirunelveli North', 'Palayamkottai', '627001', 'TN06234567890', 'General Labour', 'Construction Worker', 'Construction Worker', 1, 'Primary', 'Married', 0),
('Meena K', 'Krishnan S', '1992-06-08', 'Female', '9876543217', NULL, '12, Amma Street', 'Erode', 'Erode West', 'Erode', '638001', 'TN07234567890', 'Weaving', 'Handloom Worker', 'Handloom Worker', 4, 'Secondary', 'Married', 0),
('Balaji R', 'Ramanathan S', '1980-02-14', 'Male', '9876543218', '9876543304', '67, VP Nagar', 'Vellore', 'Vellore North', 'Vellore', '632001', 'TN08234567890', 'Pipe Fitting', 'Plumber', 'Plumber', 1, 'Secondary', 'Married', 0),
('Saranya M', 'Murugan D', '1993-08-20', 'Female', '9876543219', NULL, '45, CIT Colony', 'Chennai', 'Sholinganallur', 'Sholinganallur', '600119', 'TN01234567892', 'Cooking & Cleaning', 'Domestic Worker', 'Domestic Worker', 2, 'Higher Secondary', 'Single', 0),
('Venkatesh T', 'Thangamani K', '1970-05-30', 'Male', '9876543220', '9876543305', '23, VOC Street', 'Tiruppur', 'Tiruppur North', 'Avinashi Road', '641601', 'TN09234567890', 'Loom Operation', 'Textile Worker', 'Textile Worker', 4, 'Primary', 'Married', 0),
('Deepa S', 'Senthilkumar R', '1987-10-11', 'Female', '9876543221', NULL, '78, Periyar Nagar', 'Kancheepuram', 'Kancheepuram West', 'Kanchipuram', '631501', 'TN10234567890', 'Construction Help', 'Construction Helper', 'Construction Helper', 1, 'Primary', 'Married', 1),
('Ravi Prasad N', 'Narayanasamy P', '1983-07-03', 'Male', '9876543222', '9876543306', '34, Anna Salai', 'Thanjavur', 'Thanjavur North', 'Thanjavur', '613001', 'TN11234567890', 'Building Construction', 'Mason', 'Mason', 1, 'Secondary', 'Married', 0),
('Sumathi L', 'Lakshmanan V', '1991-12-16', 'Female', '9876543223', NULL, '56, Gandhi Maidam', 'Namakkal', 'Namakkal East', 'Namakkal', '637001', 'TN12234567890', 'Beedi Rolling', 'Beedi Worker', 'Beedi Worker', 5, 'Primary', 'Married', 0),
('Kumaravel G', 'Govindaraj M', '1979-08-28', 'Male', '9876543224', '9876543307', '91, Railway Station Road', 'Dindigul', 'Dindigul North', 'Dindigul', '624001', 'TN13234567890', 'General Labour', 'Construction Worker', 'Construction Worker', 1, 'Primary', 'Married', 0),
('Anitha V', 'Venkatesh R', '1994-03-22', 'Female', '9876543225', NULL, '15, Jayalalithaa Nagar', 'Krishnagiri', 'Krishnagiri East', 'Krishnagiri', '635001', 'TN14234567890', 'Housekeeping', 'Domestic Worker', 'Domestic Worker', 2, 'Secondary', 'Single', 0),
('Ganesh P', 'Palani R', '1986-01-09', 'Male', '9876543226', '9876543308', '28, VOC Nagar', 'Theni', 'Theni East', 'Theni', '625501', 'TN15234567890', 'Furniture Making', 'Carpenter', 'Carpenter', 1, 'Secondary', 'Married', 0),
('Revathi K', 'Krishnamoorthy S', '1989-05-14', 'Female', '9876543227', NULL, '63, Pudur Road', 'Virudhunagar', 'Virudhunagar North', 'Virudhunagar', '626001', 'TN16234567890', 'Weaving', 'Handloom Worker', 'Handloom Worker', 4, 'Primary', 'Married', 0),
('Mohamed Irfan S', 'Syed Ibrahim K', '1981-11-27', 'Male', '9876543228', '9876543309', '42, Patel Street', 'Ramanathapuram', 'Ramanathapuram East', 'Ramanathapuram', '623501', 'TN17234567890', 'General Labour', 'Construction Worker', 'Construction Worker', 1, 'Secondary', 'Married', 0),
('Nithya R', 'Rajendran V', '1996-02-18', 'Female', '9876543229', NULL, '77, SS Colony', 'Tuticorin', 'Tuticorin West', 'Tuticorin', '628001', 'TN18234567890', 'Cooking', 'Domestic Worker', 'Domestic Worker', 2, 'Higher Secondary', 'Single', 0);

-- ============================================================
-- Registrations (DEMO DATA)
-- ============================================================

INSERT OR IGNORE INTO registrations (worker_id, board_id, registration_number, registration_date, validity_date, renewal_date, status) VALUES
(1,  1, 'TN-CWB-2024-00001', '2022-01-15', '2026-01-15', '2025-01-15', 'Active'),
(2,  2, 'TN-DWB-2024-00001', '2021-06-20', '2025-12-20', '2024-06-20', 'Renewal Due'),
(3,  1, 'TN-CWB-2024-00002', '2020-03-10', '2024-03-10', '2023-03-10', 'Expired'),
(4,  2, 'TN-DWB-2024-00002', '2023-09-01', '2027-09-01', '2025-09-01', 'Active'),
(5,  1, 'TN-CWB-2024-00003', '2021-11-05', '2025-11-05', '2024-11-05', 'Expiring Soon'),
(6,  5, 'TN-BWB-2024-00001', '2022-08-18', '2026-08-18', '2025-08-18', 'Active'),
(7,  1, 'TN-CWB-2024-00004', '2019-04-12', '2023-04-12', '2022-04-12', 'Expired'),
(8,  4, 'TN-HWB-2024-00001', '2023-02-28', '2027-02-28', '2025-02-28', 'Active'),
(9,  1, 'TN-CWB-2024-00005', '2022-07-15', '2026-07-15', '2025-07-15', 'Active'),
(10, 2, 'TN-DWB-2024-00003', '2024-01-10', '2028-01-10', NULL, 'Active'),
(11, 4, 'TN-HWB-2024-00002', '2020-09-20', '2024-09-20', '2023-09-20', 'Expired'),
(12, 1, 'TN-CWB-2024-00006', '2023-05-01', '2025-09-01', NULL, 'Expiring Soon'),
(13, 1, 'TN-CWB-2024-00007', '2021-12-01', '2025-12-01', '2024-12-01', 'Renewal Due'),
(14, 5, 'TN-BWB-2024-00002', '2023-03-15', '2027-03-15', '2025-03-15', 'Active'),
(15, 1, 'TN-CWB-2024-00008', '2018-06-01', '2022-06-01', '2021-06-01', 'Expired'),
(16, 2, 'TN-DWB-2024-00004', '2024-06-01', '2028-06-01', NULL, 'Active'),
(17, 1, 'TN-CWB-2024-00009', '2022-10-10', '2026-10-10', '2025-10-10', 'Active'),
(18, 4, 'TN-HWB-2024-00003', '2021-04-01', '2025-10-01', '2024-10-01', 'Renewal Due'),
(19, 1, 'TN-CWB-2024-00010', '2023-01-20', '2027-01-20', NULL, 'Active'),
(20, 2, 'TN-DWB-2024-00005', '2024-03-01', '2028-03-01', NULL, 'Active');

-- ============================================================
-- Family Members (DEMO DATA)
-- ============================================================

INSERT OR IGNORE INTO family_members (worker_id, name, relationship, date_of_birth, gender, education_level, is_dependent, is_employed) VALUES
(1, 'Kavitha R', 'Spouse', '1988-05-20', 'Female', 'Primary', 1, 0),
(1, 'Dharun R', 'Son', '2012-08-15', 'Male', 'Secondary', 1, 0),
(1, 'Keerthana R', 'Daughter', '2015-03-10', 'Female', 'Primary', 1, 0),
(2, 'Sundaram P', 'Spouse', '1987-11-10', 'Male', 'Secondary', 1, 1),
(2, 'Sathvik S', 'Son', '2014-06-22', 'Male', 'Primary', 1, 0),
(3, 'Sumathi M', 'Spouse', '1982-04-15', 'Female', 'Primary', 1, 0),
(3, 'Karthik M', 'Son', '2005-09-12', 'Male', 'Higher Secondary', 1, 0),
(3, 'Divya M', 'Daughter', '2008-01-25', 'Female', 'Secondary', 1, 0),
(3, 'Pradeep M', 'Son', '2011-07-08', 'Male', 'Primary', 1, 0),
(4, 'Rajendran S', 'Father', '1965-03-18', 'Male', 'Primary', 0, 1),
(5, 'Meenakshi A', 'Spouse', '1985-12-03', 'Female', 'Secondary', 1, 0),
(5, 'Abinaya A', 'Daughter', '2010-11-20', 'Female', 'Secondary', 1, 0),
(5, 'Vignesh A', 'Son', '2014-04-15', 'Male', 'Primary', 1, 0),
(6, 'Balasubramanian V', 'Spouse', '1985-09-28', 'Male', 'Primary', 1, 1),
(6, 'Harini B', 'Daughter', '2013-02-14', 'Female', 'Secondary', 1, 0),
(7, 'Lakshmi P', 'Spouse', '1980-06-12', 'Female', 'No Formal Education', 1, 0),
(7, 'Suriya P', 'Son', '2003-12-05', 'Male', 'Higher Secondary', 1, 0),
(7, 'Kavipriya P', 'Daughter', '2007-08-22', 'Female', 'Secondary', 1, 0),
(8, 'Krishnan S', 'Spouse', '1990-01-15', 'Male', 'Secondary', 1, 1),
(8, 'Aditya K', 'Son', '2016-05-30', 'Male', 'Primary', 1, 0),
(9, 'Priyadharshini R', 'Spouse', '1983-07-22', 'Female', 'Higher Secondary', 1, 0),
(9, 'Sanjay R', 'Son', '2008-03-18', 'Male', 'Secondary', 1, 0),
(9, 'Nandhini R', 'Daughter', '2012-09-05', 'Female', 'Primary', 1, 0),
(10, 'Murugan D', 'Father', '1968-04-10', 'Male', 'Primary', 1, 0),
(13, 'Sumithra N', 'Spouse', '1986-09-12', 'Female', 'Secondary', 1, 0),
(13, 'Adhavan N', 'Son', '2011-01-28', 'Male', 'Secondary', 1, 0),
(13, 'Logeshwari N', 'Daughter', '2014-06-15', 'Female', 'Primary', 1, 0),
(17, 'Revathi P', 'Spouse', '1989-03-20', 'Female', 'Primary', 1, 0),
(17, 'Dhinesh P', 'Son', '2015-10-08', 'Male', 'Primary', 1, 0),
(19, 'Fathima B', 'Spouse', '1984-06-25', 'Female', 'Secondary', 1, 0),
(19, 'Ayesha S', 'Daughter', '2006-02-14', 'Female', 'Higher Secondary', 1, 0),
(19, 'Mohamed S', 'Son', '2009-08-30', 'Male', 'Secondary', 1, 0),
(19, 'Zainab S', 'Daughter', '2013-04-12', 'Female', 'Primary', 1, 0);

-- ============================================================
-- Education Records (DEMO DATA)
-- ============================================================

INSERT OR IGNORE INTO education_records (worker_id, family_member_id, education_level, course, institution, board_university, year_of_study, is_currently_studying, percentage_cgpa) VALUES
(1, 2, 'Secondary', NULL, 'Government Higher Secondary School, Tondiarpet', 'State Board', '10th', 1, '78%'),
(1, 3, 'Primary', NULL, 'Municipal Primary School, Tondiarpet', 'State Board', '7th', 1, '82%'),
(3, 7, 'Higher Secondary', 'Science Stream', 'Government Hr. Sec. School, Coimbatore', 'State Board', '12th', 1, '85%'),
(3, 8, 'Secondary', NULL, 'Government Hr. Sec. School, Coimbatore', 'State Board', '10th', 1, '79%'),
(3, 9, 'Primary', NULL, 'Municipal Primary School, Coimbatore', 'State Board', '5th', 1, '88%'),
(5, 12, 'Secondary', NULL, 'Government Girls Hr. Sec. School, Srirangam', 'State Board', '10th', 1, '81%'),
(5, 13, 'Primary', NULL, 'Panchayat Union Primary School, Srirangam', 'State Board', '6th', 1, '76%'),
(6, 15, 'Secondary', NULL, 'Government Hr. Sec. School, Salem', 'State Board', '9th', 1, '74%'),
(7, 17, 'Higher Secondary', 'Commerce Stream', 'Government Hr. Sec. School, Palayamkottai', 'State Board', '12th', 0, '72%'),
(7, 18, 'Secondary', NULL, 'Government Hr. Sec. School, Palayamkottai', 'State Board', '10th', 1, '77%'),
(9, 22, 'Secondary', NULL, 'Government Hr. Sec. School, Vellore', 'State Board', '10th', 1, '83%'),
(9, 23, 'Primary', NULL, 'Municipal Primary School, Vellore', 'State Board', '6th', 1, '80%'),
(13, 26, 'Secondary', NULL, 'Government Hr. Sec. School, Thanjavur', 'State Board', '9th', 1, '75%'),
(13, 27, 'Primary', NULL, 'Panchayat Union Primary School, Thanjavur', 'State Board', '5th', 1, '85%'),
(19, 31, 'Higher Secondary', 'Science Stream', 'Government Hr. Sec. School, Ramanathapuram', 'State Board', '12th', 0, '88%'),
(19, 32, 'Secondary', NULL, 'Government Hr. Sec. School, Ramanathapuram', 'State Board', '10th', 1, '80%'),
(19, 33, 'Primary', NULL, 'Municipal Primary School, Ramanathapuram', 'State Board', '6th', 1, '78%');
