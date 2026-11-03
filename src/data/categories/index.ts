import { Category } from '../../types';

export const PLATFORM_CATEGORIES: Category[] = [
  {
    id: 'cat-products',
    code: 'products',
    name_ar: 'المنتجات وقطع الغيار',
    name_fr: 'Produits & Pièces détachées',
    name_en: 'Products & Spare Parts',
    description_ar: 'إلكترونيات، قطع غيار سيارات وآلات، أجهزة كمبيوتر، أثاث، كتب، أدوات ومعدات',
    description_fr: 'Électronique, pièces auto & machines, informatique, mobilier, livres, outillage',
    description_en: 'Electronics, automotive & machine spare parts, computers, furniture, books, tools & equipment',
    icon: 'Package',
    color: '#0284c7', // Sky / blue
    subcategories: [
      { id: 'sub-auto-parts', name_ar: 'قطع غيار سيارات ومركبات', name_fr: 'Pièces auto & véhicules', name_en: 'Vehicle & Auto Spare Parts' },
      { id: 'sub-electronics', name_ar: 'إلكترونيات وهواتف وأجهزة', name_fr: 'Électronique & téléphones', name_en: 'Electronics & Phones' },
      { id: 'sub-computers', name_ar: 'حواسيب ومعدات شبكات', name_fr: 'Informatique & réseaux', name_en: 'Computers & Network Equipment' },
      { id: 'sub-tools', name_ar: 'أدوات صناعية وعتاد حرفيين', name_fr: 'Outillage professionnel', name_en: 'Professional & Workshop Tools' },
      { id: 'sub-books', name_ar: 'كتب ومراجع دراسية وعلمية', name_fr: 'Livres & manuels scolaires', name_en: 'Books & Educational References' },
      { id: 'sub-home', name_ar: 'أثاث ومستلزمات منزلية', name_fr: 'Mobilier & maison', name_en: 'Furniture & Household' },
      { id: 'sub-materials', name_ar: 'مواد أولية وتجهيزات فلاحية', name_fr: 'Matières premières & agriculture', name_en: 'Raw Materials & Agriculture' }
    ]
  },
  {
    id: 'cat-services',
    code: 'services',
    name_ar: 'الخدمات المهنية والمحلية',
    name_fr: 'Services Professionnels & Locaux',
    name_en: 'Professional & Local Services',
    description_ar: 'تصليح وصيانة، نقل وسحب، خدمات قانونية وهندسية، تدريس ودعم مدرسي، برمجة وتصميم',
    description_fr: 'Réparation, maintenance, transport, dépannage, cours particuliers, tech & design',
    description_en: 'Repair, maintenance, towing & transport, tutoring, tech & professional services',
    icon: 'Wrench',
    color: '#0d9488', // Teal
    subcategories: [
      { id: 'sub-repair', name_ar: 'تصليح أجهزة وميكانيك وترصيص', name_fr: 'Réparation & plomberie / mécanique', name_en: 'Repair, Mechanics & Plumbing' },
      { id: 'sub-transport', name_ar: 'نقل البضائع وسحب المركبات (ديباناج)', name_fr: 'Transport de marchandises & dépannage', name_en: 'Freight Transport & Towing' },
      { id: 'sub-tutoring', name_ar: 'دروس دعم وتدريب لغات ومواد جامعية', name_fr: 'Soutien scolaire & langues', name_en: 'Academic Tutoring & Languages' },
      { id: 'sub-tech', name_ar: 'برمجة وتصميم وصيانة معلوماتية', name_fr: 'Développement & infographie', name_en: 'Software, Graphic Design & IT' },
      { id: 'sub-consulting', name_ar: 'استشارات قانونية ومحاسبية وتوثيق', name_fr: 'Conseil juridique & comptabilité', name_en: 'Legal, Accounting & Notary' },
      { id: 'sub-crafts', name_ar: 'بناء ودهان ونجارة وأشغال عامة', name_fr: 'Bâtiment, peinture & menuiserie', name_en: 'Masonry, Painting & Carpentry' }
    ]
  },
  {
    id: 'cat-opportunities',
    code: 'opportunities',
    name_ar: 'الفرص والتكوين المهني',
    name_fr: 'Opportunités & Formation',
    name_en: 'Opportunities & Training',
    description_ar: 'دورات تكوينية، ورشات عمل، فرص تطوع، عروض عمل وتدريب معتمدة',
    description_fr: 'Formations professionnelles, ateliers, bénévolat, stages et opportunités d\'emploi',
    description_en: 'Vocational training, workshops, volunteering, internships and verified jobs',
    icon: 'GraduationCap',
    color: '#6366f1', // Indigo
    subcategories: [
      { id: 'sub-training', name_ar: 'دورات تدريبية وتأهيل مهني', name_fr: 'Formations certifiantes', name_en: 'Certified Professional Training' },
      { id: 'sub-workshops', name_ar: 'ورشات تطبيقية وملتقيات تقنية', name_fr: 'Ateliers pratiques & séminaires', name_en: 'Hands-on Workshops & Tech Seminars' },
      { id: 'sub-jobs', name_ar: 'فرص عمل وتربصات ميدانية', name_fr: 'Offres d\'emploi & stages', name_en: 'Job Vacancies & Internships' },
      { id: 'sub-volunteering', name_ar: 'مبادرات تطوعية وتنموية', name_fr: 'Initiatives de bénévolat', name_en: 'Volunteering & Community Initiatives' }
    ]
  },
  {
    id: 'cat-places',
    code: 'places',
    name_ar: 'الأماكن والمرافق والمحلات',
    name_fr: 'Lieux, Commerces & Infrastructures',
    name_en: 'Places, Shops & Facilities',
    description_ar: 'محلات نادرة، ورشات متخصصة، مكاتب إدارية، صيدليات حراسة، فضاءات عمل مشتركة',
    description_fr: 'Commerces spécialisés, ateliers, services publics, pharmacies de garde, coworking',
    description_en: 'Specialized shops, workshops, public facilities, on-call pharmacies, coworking spaces',
    icon: 'MapPin',
    color: '#e11d48', // Rose / Red
    subcategories: [
      { id: 'sub-specialty-shops', name_ar: 'محلات متخصصة وتجار الجملة', name_fr: 'Commerces spécialisés & grossistes', name_en: 'Specialty Retail & Wholesalers' },
      { id: 'sub-workspaces', name_ar: 'فضاءات عمل مشتركة ومكتبات للمطالعة', name_fr: 'Espaces de coworking & bibliothèques', name_en: 'Coworking Spaces & Study Libraries' },
      { id: 'sub-medical-places', name_ar: 'مخابر تحاليل وعيادات وصيدليات حراسة', name_fr: 'Laboratoires & pharmacies de garde', name_en: 'Laboratories, Clinics & Pharmacies' },
      { id: 'sub-public-facilities', name_ar: 'مرافق ومراكز إدارية وخدمية', name_fr: 'Services publics & centres d\'accueil', name_en: 'Public Services & Administrative Centers' }
    ]
  },
  {
    id: 'cat-community-help',
    code: 'community_help',
    name_ar: 'المساعدة المجتمعية والتضامن',
    name_fr: 'Entraide Communautaire & Solidarité',
    name_en: 'Community Assistance & Solidarity',
    description_ar: 'استعارة أدوات، تبادل كتب ومعدات، هبات وأشياء مجانية، مساعدات بين الجيران ونداءات دم',
    description_fr: 'Prêt d\'outils, échange, dons d\'objets, solidarité de quartier et dons de sang',
    description_en: 'Tool borrowing, item swapping, free donations, neighborhood mutual aid & blood calls',
    icon: 'HeartHandshake',
    color: '#16a34a', // Emerald
    subcategories: [
      { id: 'sub-borrow', name_ar: 'إعارة واستعارة معدات وأجهزة', name_fr: 'Prêt et emprunt d\'outillage', name_en: 'Lending & Borrowing Tools/Equipment' },
      { id: 'sub-donation', name_ar: 'تبرع وهبات بأغراض ومستلزمات صالحة', name_fr: 'Dons d\'objets & fournitures', name_en: 'Item Donations & Free Supplies' },
      { id: 'sub-blood-aid', name_ar: 'نداءات تضامنية ومساعدة في الحالات العاجلة', name_fr: 'Appels urgents & entraide solidaire', name_en: 'Emergency Mutual Aid & Community Calls' },
      { id: 'sub-barter', name_ar: 'تبادل أغراض وخدمات بدون مال', name_fr: 'Troc d\'objets & services sans argent', name_en: 'Direct Barter & Cashless Exchange' }
    ]
  }
];

export const getCategoryById = (id: string): Category | undefined => {
  return PLATFORM_CATEGORIES.find(c => c.id === id || c.code === id);
};

export const getCategoryName = (category: Category | undefined, lang: string = 'ar'): string => {
  if (!category) return '';
  if (lang === 'fr') return category.name_fr;
  if (lang === 'en') return category.name_en;
  return category.name_ar;
};
