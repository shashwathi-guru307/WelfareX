-- ============================================================
-- Nalavariyam Smart Welfare Assistant — Scheme Seed Data (Phase 3)
-- Source: Excel spreadsheet — "these are the available schemes of nalavariyam"
-- ============================================================
-- This seed data is imported from the provided Excel file.
-- All amounts, qualifications, and board mappings are preserved exactly.
-- ============================================================

PRAGMA foreign_keys = ON;

-- ============================================================
-- 1. WELFARE BOARDS
-- ============================================================
-- Create/reuse the three boards from the Excel file.
-- Uses INSERT OR IGNORE to avoid duplicates on re-run.

INSERT OR IGNORE INTO welfare_boards (name, description, is_active) VALUES
('TN Construction Workers Welfare Board', 'Tamil Nadu Construction Workers Welfare Board — covers construction sector workers.', 1),
('TN Manual Workers Social Security Welfare Board', 'Tamil Nadu Manual Workers Social Security Welfare Board — covers manual/unorganised workers.', 1),
('Drivers & Automobile Workshop Workers Welfare Board', 'Drivers and Automobile Workshop Workers Welfare Board — covers drivers and automobile workshop workers.', 1);

-- ============================================================
-- 2. SCHEME CATEGORIES
-- ============================================================
-- Consolidated categories matching the 12 major scheme types.

INSERT OR IGNORE INTO scheme_categories (name, description, display_order, is_active) VALUES
('Education', 'Educational assistance for workers and their children at various levels.', 1, 1),
('Marriage', 'Marriage assistance for workers and their family members.', 2, 1),
('Maternity', 'Maternity assistance for registered female workers.', 3, 1),
('Health & Vision', 'Health-related benefits including spectacles/eyeglasses.', 4, 1),
('Pension', 'Monthly pension and family pension for eligible workers.', 5, 1),
('Accident & Death', 'Financial assistance for accidental death, disability, and natural death.', 6, 1),
('Funeral', 'Funeral expense assistance for nominees of deceased workers.', 7, 1),
('Housing', 'House construction assistance for eligible workers.', 8, 1),
('Women Empowerment', 'Financial aid schemes targeted at women workers.', 9, 1);

-- ============================================================
-- 3. WELFARE SCHEMES
-- ============================================================
-- The 12 major schemes from the Excel file.
-- Each has a stable scheme_code for idempotent imports.

-- Get board IDs for reference (used in scheme_benefits below)
-- Board 1: TN Construction Workers Welfare Board
-- Board 2: TN Manual Workers Social Security Welfare Board
-- Board 3: Drivers & Automobile Workshop Workers Welfare Board

-- Scheme 1: Education Assistance
INSERT OR IGNORE INTO welfare_schemes
    (scheme_code, name, category_id, description, benefit_description, eligibility_summary, qualification_text, claimant_type, is_active)
VALUES
    ('EDU_ASSIST', 'Education Assistance', 1,
     'Financial assistance for education of workers and their children at various levels from 6th standard to professional post-graduate.',
     'Board-specific financial assistance for education expenses.',
     'Children of registered workers studying at various education levels. Specific amounts vary by welfare board.',
     'Education assistance for workers children at various levels',
     'CHILD',
     1);

-- Scheme 2: Marriage Assistance
INSERT OR IGNORE INTO welfare_schemes
    (scheme_code, name, category_id, description, benefit_description, eligibility_summary, qualification_text, claimant_type, max_usage, is_active)
VALUES
    ('MARRIAGE', 'Marriage Assistance', 2,
     'Financial assistance for marriage of registered workers or their sons/daughters. Available maximum 2 times.',
     'Lump sum marriage assistance.',
     'For worker or son/daughter marriage. Maximum 2 times per eligible person.',
     'For worker or son/daughter marriage (Max 2 times)',
     'WORKER_OR_CHILD',
     2,
     1);

-- Scheme 3: Maternity Assistance
INSERT OR IGNORE INTO welfare_schemes
    (scheme_code, name, category_id, description, benefit_description, eligibility_summary, qualification_text, claimant_type, max_usage, is_active)
VALUES
    ('MATERNITY', 'Maternity Assistance', 3,
     'Financial assistance for registered female workers during pregnancy. Applicable for first 2 children only.',
     'Board-specific maternity benefit amount.',
     'Registered female workers only. First 2 children only.',
     'Registered female workers (First 2 children only)',
     'FEMALE_WORKER',
     2,
     1);

-- Scheme 4: Spectacles / Eyeglasses
INSERT OR IGNORE INTO welfare_schemes
    (scheme_code, name, category_id, description, benefit_description, eligibility_summary, qualification_text, claimant_type, is_active)
VALUES
    ('SPECTACLES', 'Spectacles / Eyeglasses', 4,
     'Financial assistance for purchase of spectacles / eyeglasses for registered workers.',
     'Board-specific amount for spectacles purchase.',
     'Registered workers requiring spectacles.',
     'Purchase of spectacles',
     'WORKER',
     1);

-- Scheme 5: Pension
INSERT OR IGNORE INTO welfare_schemes
    (scheme_code, name, category_id, description, benefit_description, eligibility_summary, qualification_text, claimant_type, is_active)
VALUES
    ('PENSION', 'Pension', 5,
     'Monthly pension for eligible retired workers and family pension for eligible family members of deceased workers.',
     'Monthly pension and family pension benefits.',
     'Monthly pension for eligible workers. Family pension for eligible family members.',
     'Monthly Pension / Family Pension',
     'WORKER',
     1);

-- Scheme 6: Accidental Death at Workplace
INSERT OR IGNORE INTO welfare_schemes
    (scheme_code, name, category_id, description, benefit_description, eligibility_summary, qualification_text, claimant_type, is_active)
VALUES
    ('ACC_DEATH_WP', 'Accidental Death at Workplace', 6,
     'Financial aid to nominee in case of accidental death at workplace of registered worker.',
     'Board-specific financial aid amount.',
     'Nominee/family of worker who died in workplace accident.',
     'Financial aid to nominee',
     'NOMINEE',
     1);

-- Scheme 7: Accidental Death
INSERT OR IGNORE INTO welfare_schemes
    (scheme_code, name, category_id, description, benefit_description, eligibility_summary, qualification_text, claimant_type, is_active)
VALUES
    ('ACC_DEATH', 'Accidental Death', 6,
     'Financial aid to nominee in case of accidental death of registered worker (non-workplace).',
     'Board-specific financial aid amount.',
     'Nominee/family of worker who died in accident.',
     'Financial aid to nominee',
     'NOMINEE',
     1);

-- Scheme 8: Accidental Disability
INSERT OR IGNORE INTO welfare_schemes
    (scheme_code, name, category_id, description, benefit_description, eligibility_summary, qualification_text, claimant_type, is_active)
VALUES
    ('ACC_DISABILITY', 'Accidental Disability', 6,
     'Permanent disability aid for registered workers who suffer accidental disability.',
     'Board-specific disability aid amount.',
     'Registered worker with permanent disability from accident.',
     'Permanent disability aid',
     'WORKER',
     1);

-- Scheme 9: Natural Death
INSERT OR IGNORE INTO welfare_schemes
    (scheme_code, name, category_id, description, benefit_description, eligibility_summary, qualification_text, claimant_type, is_active)
VALUES
    ('NAT_DEATH', 'Natural Death', 6,
     'Financial aid to nominee in case of natural death of registered worker.',
     'Board-specific financial aid amount.',
     'Nominee/family of worker who died of natural causes.',
     'Financial aid to nominee',
     'NOMINEE',
     1);

-- Scheme 10: Funeral Expenses
INSERT OR IGNORE INTO welfare_schemes
    (scheme_code, name, category_id, description, benefit_description, eligibility_summary, qualification_text, claimant_type, is_active)
VALUES
    ('FUNERAL', 'Funeral Expenses', 7,
     'Financial aid to nominee for funeral expenses of deceased registered worker.',
     'Board-specific funeral expense amount.',
     'Nominee/family of deceased registered worker.',
     'Financial aid to nominee',
     'NOMINEE',
     1);

-- Scheme 11: House Construction Assistance
INSERT OR IGNORE INTO welfare_schemes
    (scheme_code, name, category_id, description, benefit_description, eligibility_summary, qualification_text, claimant_type, is_active)
VALUES
    ('HOUSE', 'House Construction Assistance', 8,
     'Financial assistance to build a house for eligible registered workers.',
     'Board-specific housing assistance amount.',
     'Registered workers needing housing assistance.',
     'Assistance to build a house',
     'WORKER',
     1);

-- Scheme 12: Women Auto Purchase
INSERT OR IGNORE INTO welfare_schemes
    (scheme_code, name, category_id, description, benefit_description, eligibility_summary, qualification_text, claimant_type, is_active)
VALUES
    ('WOMEN_AUTO', 'Women Auto Purchase', 9,
     'Financial aid for registered women workers purchasing an auto-rickshaw.',
     'Board-specific financial aid for auto purchase.',
     'Registered female workers purchasing auto-rickshaw.',
     'Financial aid for women buying auto',
     'FEMALE_WORKER',
     1);

-- ============================================================
-- 4. QUALIFICATION VARIANTS (Education Assistance — 16 rows)
-- ============================================================
-- Each row from the Excel file under Education Assistance.

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 1, '6th to 9th Standard (Every academic year)', '6th-9th', 'Regular', 'CHILD',
       'Education assistance for children studying in 6th to 9th standard, applicable every academic year.'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 2, '10th Standard (Female children only)', '10th', 'Female Children', 'DAUGHTER',
       'Education assistance for female children studying in 10th standard.'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 3, '11th Standard (Female children only)', '11th', 'Female Children', 'DAUGHTER',
       'Education assistance for female children studying in 11th standard.'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 4, '12th Standard (Female children only)', '12th', 'Female Children', 'DAUGHTER',
       'Education assistance for female children studying in 12th standard.'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 5, '10th Standard Pass', '10th', 'Pass', 'CHILD',
       'Education assistance for children who have passed 10th standard.'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 6, '12th Standard Pass', '12th', 'Pass', 'CHILD',
       'Education assistance for children who have passed 12th standard.'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 7, 'Undergraduate Degree (Regular)', 'UG', 'Regular', 'CHILD',
       'Education assistance for children pursuing undergraduate degree (regular).'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 8, 'Undergraduate Degree (Hostel)', 'UG', 'Hostel', 'CHILD',
       'Education assistance for children pursuing undergraduate degree staying in hostel.'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 9, 'Post Graduate Degree (Regular)', 'PG', 'Regular', 'CHILD',
       'Education assistance for children pursuing post graduate degree (regular).'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 10, 'Post Graduate Degree (Hostel)', 'PG', 'Hostel', 'CHILD',
       'Education assistance for children pursuing post graduate degree staying in hostel.'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 11, 'Professional Degree (Law, Engg, Med, Vet Regular)', 'Professional Degree', 'Regular', 'CHILD',
       'Education assistance for children pursuing professional degree (Law, Engineering, Medicine, Veterinary - regular).'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 12, 'Professional Degree (Hostel)', 'Professional Degree', 'Hostel', 'CHILD',
       'Education assistance for children pursuing professional degree staying in hostel.'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 13, 'Professional Post Graduate (Regular)', 'Professional PG', 'Regular', 'CHILD',
       'Education assistance for children pursuing professional post graduate degree (regular).'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 14, 'Professional Post Graduate (Hostel)', 'Professional PG', 'Hostel', 'CHILD',
       'Education assistance for children pursuing professional post graduate degree staying in hostel.'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 15, 'ITI / Polytechnic Course (Regular)', 'ITI/Polytechnic', 'Regular', 'CHILD',
       'Education assistance for children pursuing ITI or Polytechnic course (regular).'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 16, 'ITI / Polytechnic Course (Hostel)', 'ITI/Polytechnic', 'Hostel', 'CHILD',
       'Education assistance for children pursuing ITI or Polytechnic course staying in hostel.'
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

-- ============================================================
-- 5. PENSION QUALIFICATION VARIANTS
-- ============================================================

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 1, 'Monthly Pension', NULL, NULL, 'WORKER',
       'Monthly pension for eligible retired registered workers.'
FROM welfare_schemes ws WHERE ws.scheme_code = 'PENSION';

INSERT OR IGNORE INTO scheme_qualifications
    (scheme_id, sort_order, qualification_text, education_level, education_type, claimant_type, description)
SELECT ws.id, 2, 'Family Pension', NULL, NULL, 'FAMILY_MEMBER',
       'Monthly pension for eligible family members of deceased registered workers.'
FROM welfare_schemes ws WHERE ws.scheme_code = 'PENSION';

-- ============================================================
-- 6. BOARD-SPECIFIC BENEFITS
-- ============================================================
-- Imported exactly from the Excel file.
-- '-' in Excel = is_available = 0 (not listed / not available).

-- ---- Education Assistance: 16 qualification variants × 3 boards = 48 benefit rows ----

-- Board 1 = TN Construction Workers Welfare Board
-- Board 2 = TN Manual Workers Social Security Welfare Board
-- Board 3 = Drivers & Automobile Workshop Workers Welfare Board

-- 6th to 9th Standard (Every academic year): Construction=1000, Manual=1000, Drivers=1000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 1,000', 1000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '6th to 9th Standard (Every academic year)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 1,000', 1000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '6th to 9th Standard (Every academic year)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 1,000', 1000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '6th to 9th Standard (Every academic year)';

-- 10th Standard (Female children only): Construction=2400, Manual=1000, Drivers=1000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 2,400', 2400, 'one-time', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '10th Standard (Female children only)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 1,000', 1000, 'one-time', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '10th Standard (Female children only)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 1,000', 1000, 'one-time', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '10th Standard (Female children only)';

-- 11th Standard (Female children only): Construction=3000, Manual=1000, Drivers=3000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 3,000', 3000, 'one-time', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '11th Standard (Female children only)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 1,000', 1000, 'one-time', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '11th Standard (Female children only)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 3,000', 3000, 'one-time', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '11th Standard (Female children only)';

-- 12th Standard (Female children only): Construction=3000, Manual=1500, Drivers=1500
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 3,000', 3000, 'one-time', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '12th Standard (Female children only)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 1,500', 1500, 'one-time', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '12th Standard (Female children only)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 1,500', 1500, 'one-time', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '12th Standard (Female children only)';

-- 10th Standard Pass: Construction=2400, Manual=1000, Drivers=1000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 2,400', 2400, 'one-time', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '10th Standard Pass';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 1,000', 1000, 'one-time', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '10th Standard Pass';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 1,000', 1000, 'one-time', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '10th Standard Pass';

-- 12th Standard Pass: Construction=3000, Manual=1500, Drivers=1500
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 3,000', 3000, 'one-time', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '12th Standard Pass';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 1,500', 1500, 'one-time', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '12th Standard Pass';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 1,500', 1500, 'one-time', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = '12th Standard Pass';

-- Undergraduate Degree (Regular): Construction=4000, Manual=4000, Drivers=4000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 4,000', 4000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Undergraduate Degree (Regular)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 4,000', 4000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Undergraduate Degree (Regular)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 4,000', 4000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Undergraduate Degree (Regular)';

-- Undergraduate Degree (Hostel): Construction=6000, Manual=5000, Drivers=6000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 6,000', 6000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Undergraduate Degree (Hostel)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 5,000', 5000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Undergraduate Degree (Hostel)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 6,000', 6000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Undergraduate Degree (Hostel)';

-- Post Graduate Degree (Regular): Construction=4000, Manual=4000, Drivers=4000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 4,000', 4000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Post Graduate Degree (Regular)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 4,000', 4000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Post Graduate Degree (Regular)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 4,000', 4000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Post Graduate Degree (Regular)';

-- Post Graduate Degree (Hostel): Construction=6000, Manual=5000, Drivers=6000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 6,000', 6000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Post Graduate Degree (Hostel)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 5,000', 5000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Post Graduate Degree (Hostel)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 6,000', 6000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Post Graduate Degree (Hostel)';

-- Professional Degree (Law, Engg, Med, Vet Regular): Construction=4000, Manual=4000, Drivers=4000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 4,000', 4000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Professional Degree (Law, Engg, Med, Vet Regular)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 4,000', 4000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Professional Degree (Law, Engg, Med, Vet Regular)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 4,000', 4000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Professional Degree (Law, Engg, Med, Vet Regular)';

-- Professional Degree (Hostel): Construction=6000, Manual=6000, Drivers=6000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 6,000', 6000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Professional Degree (Hostel)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 6,000', 6000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Professional Degree (Hostel)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 6,000', 6000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Professional Degree (Hostel)';

-- Professional Post Graduate (Regular): Construction=6000, Manual=6000, Drivers=6000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 6,000', 6000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Professional Post Graduate (Regular)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 6,000', 6000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Professional Post Graduate (Regular)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 6,000', 6000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Professional Post Graduate (Regular)';

-- Professional Post Graduate (Hostel): Construction=8000, Manual=8000, Drivers=8000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 8,000', 8000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Professional Post Graduate (Hostel)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 8,000', 8000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Professional Post Graduate (Hostel)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 8,000', 8000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'Professional Post Graduate (Hostel)';

-- ITI / Polytechnic Course (Regular): Construction=3000, Manual=1000, Drivers=3000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 3,000', 3000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'ITI / Polytechnic Course (Regular)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 1,000', 1000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'ITI / Polytechnic Course (Regular)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 3,000', 3000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'ITI / Polytechnic Course (Regular)';

-- ITI / Polytechnic Course (Hostel): Construction=4000, Manual=1200, Drivers=4000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 4,000', 4000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'ITI / Polytechnic Course (Hostel)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 1,200', 1200, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'ITI / Polytechnic Course (Hostel)';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 4,000', 4000, 'per year', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.qualification_text = 'ITI / Polytechnic Course (Hostel)';

-- ---- Marriage Assistance ----
-- All three boards: Rs. 20,000 (Male & Female)
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, NULL, 'Rs. 20,000 (Male & Female)', 20000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'MARRIAGE';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, NULL, 'Rs. 20,000 (Male & Female)', 20000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'MARRIAGE';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, NULL, 'Rs. 20,000 (Male & Female)', 20000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'MARRIAGE';

-- ---- Maternity Assistance ----
-- All three boards: Rs. 18,000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, NULL, 'Rs. 18,000', 18000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'MATERNITY';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, NULL, 'Rs. 18,000', 18000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'MATERNITY';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, NULL, 'Rs. 18,000', 18000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'MATERNITY';

-- ---- Spectacles / Eyeglasses ----
-- All three boards: Rs. 500
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, NULL, 'Rs. 500', 500, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'SPECTACLES';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, NULL, 'Rs. 500', 500, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'SPECTACLES';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, NULL, 'Rs. 500', 500, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'SPECTACLES';

-- ---- Pension: Monthly Pension ----
-- Construction=1200, Manual=1200/month, Drivers=1200/month
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 1,200', 1200, 'per month', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'PENSION' AND sq.qualification_text = 'Monthly Pension';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, 'Rs. 1,200 / month', 1200, 'per month', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'PENSION' AND sq.qualification_text = 'Monthly Pension';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, 'Rs. 1,200 / month', 1200, 'per month', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'PENSION' AND sq.qualification_text = 'Monthly Pension';

-- ---- Pension: Family Pension ----
-- Construction=500/month, Manual=-, Drivers=-
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, sq.id, 'Rs. 500 / month', 500, 'per month', 1
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'PENSION' AND sq.qualification_text = 'Family Pension';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, sq.id, NULL, NULL, NULL, 0
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'PENSION' AND sq.qualification_text = 'Family Pension';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, sq.id, NULL, NULL, NULL, 0
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'PENSION' AND sq.qualification_text = 'Family Pension';

-- ---- Accidental Death at Workplace ----
-- Construction=800000, Manual=-, Drivers=-
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, NULL, 'Rs. 8,00,000', 800000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DEATH_WP';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, NULL, NULL, NULL, NULL, 0
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DEATH_WP';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, NULL, NULL, NULL, NULL, 0
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DEATH_WP';

-- ---- Accidental Death ----
-- Construction=100000, Manual=125000, Drivers=200000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, NULL, 'Rs. 1,00,000', 100000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DEATH';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, NULL, 'Rs. 1,25,000', 125000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DEATH';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, NULL, 'Rs. 2,00,000', 200000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DEATH';

-- ---- Accidental Disability ----
-- All three boards: Rs. 1,00,000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, NULL, 'Rs. 1,00,000', 100000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DISABILITY';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, NULL, 'Rs. 1,00,000', 100000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DISABILITY';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, NULL, 'Rs. 1,00,000', 100000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DISABILITY';

-- ---- Natural Death ----
-- Construction=50000, Manual=30000, Drivers=50000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, NULL, 'Rs. 50,000', 50000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'NAT_DEATH';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, NULL, 'Rs. 30,000', 30000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'NAT_DEATH';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, NULL, 'Rs. 50,000', 50000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'NAT_DEATH';

-- ---- Funeral Expenses ----
-- Construction=500000, Manual=5000, Drivers=5000
-- NOTE: Construction board amount (Rs. 5,00,000) is significantly higher than other boards.
-- This value is preserved exactly as per the Excel source. Flagged for manual verification.
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, NULL, 'Rs. 5,00,000', 500000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'FUNERAL';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, NULL, 'Rs. 5,000', 5000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'FUNERAL';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, NULL, 'Rs. 5,000', 5000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'FUNERAL';

-- ---- House Construction Assistance ----
-- Construction=500000, Manual=-, Drivers=-
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, NULL, 'Rs. 5,00,000', 500000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'HOUSE';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, NULL, NULL, NULL, NULL, 0
FROM welfare_schemes ws WHERE ws.scheme_code = 'HOUSE';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, NULL, NULL, NULL, NULL, 0
FROM welfare_schemes ws WHERE ws.scheme_code = 'HOUSE';

-- ---- Women Auto Purchase ----
-- Construction=-, Manual=-, Drivers=100000
INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 1, NULL, NULL, NULL, NULL, 0
FROM welfare_schemes ws WHERE ws.scheme_code = 'WOMEN_AUTO';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 2, NULL, NULL, NULL, NULL, 0
FROM welfare_schemes ws WHERE ws.scheme_code = 'WOMEN_AUTO';

INSERT OR IGNORE INTO scheme_benefits (scheme_id, board_id, qualification_id, amount, amount_numeric, amount_unit, is_available)
SELECT ws.id, 3, NULL, 'Rs. 1,00,000', 100000, 'one-time', 1
FROM welfare_schemes ws WHERE ws.scheme_code = 'WOMEN_AUTO';

-- ============================================================
-- 7. STRUCTURED ELIGIBILITY RULES
-- ============================================================

-- Education Assistance: general rules
INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'registration_required', 'registration', '=', 'true', 'boolean', 'Worker must be registered with a welfare board.', 100
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'claimant_type', 'claimant', '=', 'CHILD', 'string', 'Benefit applies to children of registered workers.', 90
FROM welfare_schemes ws WHERE ws.scheme_code = 'EDU_ASSIST';

-- Education Assistance: female children only variants (10th, 11th, 12th Standard - Female children only)
INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, sq.id, 'gender', 'claimant_gender', '=', 'Female', 'string', 'Only female children are eligible for this education level.', 80
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.education_type = 'Female Children';

-- Education Assistance: hostel variants
INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, sq.id, 'accommodation_type', 'accommodation', '=', 'Hostel', 'string', 'Student must be staying in hostel accommodation.', 70
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'EDU_ASSIST' AND sq.education_type = 'Hostel';

-- Marriage Assistance rules
INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'registration_required', 'registration', '=', 'true', 'boolean', 'Worker must be registered with a welfare board.', 100
FROM welfare_schemes ws WHERE ws.scheme_code = 'MARRIAGE';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'claimant_type', 'claimant', 'in', 'WORKER,SON,DAUGHTER', 'json', 'Marriage assistance for worker or son/daughter.', 90
FROM welfare_schemes ws WHERE ws.scheme_code = 'MARRIAGE';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'max_children', 'max_usage', '<=', '2', 'number', 'Maximum 2 times per eligible person.', 80
FROM welfare_schemes ws WHERE ws.scheme_code = 'MARRIAGE';

-- Maternity Assistance rules
INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'registration_required', 'registration', '=', 'true', 'boolean', 'Worker must be registered with a welfare board.', 100
FROM welfare_schemes ws WHERE ws.scheme_code = 'MATERNITY';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'gender', 'gender', '=', 'Female', 'string', 'Only registered female workers are eligible.', 90
FROM welfare_schemes ws WHERE ws.scheme_code = 'MATERNITY';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'max_children', 'max_children', '<=', '2', 'number', 'Applicable for first 2 children only.', 80
FROM welfare_schemes ws WHERE ws.scheme_code = 'MATERNITY';

-- Spectacles / Eyeglasses rules
INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'registration_required', 'registration', '=', 'true', 'boolean', 'Worker must be registered with a welfare board.', 100
FROM welfare_schemes ws WHERE ws.scheme_code = 'SPECTACLES';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'claimant_type', 'claimant', '=', 'WORKER', 'string', 'Benefit is for the registered worker.', 90
FROM welfare_schemes ws WHERE ws.scheme_code = 'SPECTACLES';

-- Pension rules
INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'registration_required', 'registration', '=', 'true', 'boolean', 'Worker must be registered with a welfare board.', 100
FROM welfare_schemes ws WHERE ws.scheme_code = 'PENSION';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'claimant_type', 'claimant', '=', 'WORKER', 'string', 'Monthly pension is for the eligible worker. Family pension for family members.', 90
FROM welfare_schemes ws WHERE ws.scheme_code = 'PENSION';

-- Family Pension specific rules
INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, sq.id, 'claimant_type', 'claimant', '=', 'FAMILY_MEMBER', 'string', 'Family pension is for eligible family members of deceased worker.', 80
FROM welfare_schemes ws, scheme_qualifications sq
WHERE ws.scheme_code = 'PENSION' AND sq.qualification_text = 'Family Pension';

-- Accidental Death at Workplace rules
INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'registration_required', 'registration', '=', 'true', 'boolean', 'Worker must be registered with a welfare board.', 100
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DEATH_WP';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'claimant_type', 'claimant', '=', 'NOMINEE', 'string', 'Financial aid to nominee of deceased worker.', 90
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DEATH_WP';

-- Accidental Death rules
INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'registration_required', 'registration', '=', 'true', 'boolean', 'Worker must be registered with a welfare board.', 100
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DEATH';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'claimant_type', 'claimant', '=', 'NOMINEE', 'string', 'Financial aid to nominee of deceased worker.', 90
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DEATH';

-- Accidental Disability rules
INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'registration_required', 'registration', '=', 'true', 'boolean', 'Worker must be registered with a welfare board.', 100
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DISABILITY';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'claimant_type', 'claimant', '=', 'WORKER', 'string', 'Disability aid is for the registered worker.', 90
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DISABILITY';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'has_disability', 'has_disability', '=', '1', 'boolean', 'Worker must have permanent disability.', 80
FROM welfare_schemes ws WHERE ws.scheme_code = 'ACC_DISABILITY';

-- Natural Death rules
INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'registration_required', 'registration', '=', 'true', 'boolean', 'Worker must be registered with a welfare board.', 100
FROM welfare_schemes ws WHERE ws.scheme_code = 'NAT_DEATH';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'claimant_type', 'claimant', '=', 'NOMINEE', 'string', 'Financial aid to nominee of deceased worker.', 90
FROM welfare_schemes ws WHERE ws.scheme_code = 'NAT_DEATH';

-- Funeral Expenses rules
INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'registration_required', 'registration', '=', 'true', 'boolean', 'Worker must be registered with a welfare board.', 100
FROM welfare_schemes ws WHERE ws.scheme_code = 'FUNERAL';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'claimant_type', 'claimant', '=', 'NOMINEE', 'string', 'Financial aid to nominee for funeral expenses.', 90
FROM welfare_schemes ws WHERE ws.scheme_code = 'FUNERAL';

-- House Construction Assistance rules
INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'registration_required', 'registration', '=', 'true', 'boolean', 'Worker must be registered with a welfare board.', 100
FROM welfare_schemes ws WHERE ws.scheme_code = 'HOUSE';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'claimant_type', 'claimant', '=', 'WORKER', 'string', 'Housing assistance is for the registered worker.', 90
FROM welfare_schemes ws WHERE ws.scheme_code = 'HOUSE';

-- Women Auto Purchase rules
INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'registration_required', 'registration', '=', 'true', 'boolean', 'Worker must be registered with a welfare board.', 100
FROM welfare_schemes ws WHERE ws.scheme_code = 'WOMEN_AUTO';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'gender', 'gender', '=', 'Female', 'string', 'Only registered female workers are eligible for auto purchase assistance.', 90
FROM welfare_schemes ws WHERE ws.scheme_code = 'WOMEN_AUTO';

INSERT OR IGNORE INTO scheme_rules (scheme_id, qualification_id, rule_type, field, operator, value, value_type, description, priority)
SELECT ws.id, NULL, 'claimant_type', 'claimant', '=', 'FEMALE_WORKER', 'string', 'Benefit is for female registered workers.', 80
FROM welfare_schemes ws WHERE ws.scheme_code = 'WOMEN_AUTO';
