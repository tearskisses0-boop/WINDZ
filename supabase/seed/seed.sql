-- =========================================================================
-- WIN DZ Seed Data: 5 Core Categories & Default Setup
-- =========================================================================

INSERT INTO public.categories (id, code, name_ar, name_fr, name_en, icon, color, sort_order)
VALUES 
    ('cat-products', 'products', 'المنتجات وقطع الغيار', 'Produits & Pièces détachées', 'Products & Spare Parts', 'Package', '#0284c7', 1),
    ('cat-services', 'services', 'الخدمات المهنية والمحلية', 'Services Professionnels & Locaux', 'Professional & Local Services', 'Wrench', '#0d9488', 2),
    ('cat-opportunities', 'opportunities', 'الفرص والتكوين المهني', 'Opportunités & Formation', 'Opportunities & Training', 'GraduationCap', '#6366f1', 3),
    ('cat-places', 'places', 'الأماكن والمرافق والمحلات', 'Lieux, Commerces & Infrastructures', 'Places, Shops & Facilities', 'MapPin', '#e11d48', 4),
    ('cat-community-help', 'community_help', 'المساعدة المجتمعية والتضامن', 'Entraide Communautaire & Solidarité', 'Community Assistance & Solidarity', 'HeartHandshake', '#16a34a', 5)
ON CONFLICT (id) DO NOTHING;
