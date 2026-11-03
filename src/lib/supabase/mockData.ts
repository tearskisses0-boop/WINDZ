import { Post, UserProfile, ContentReport, AppNotification } from '../../types';

export const INITIAL_DEMO_USERS: UserProfile[] = [
  {
    id: 'user-admin',
    email: 'admin@windz.dz',
    display_name: 'إدارة المنصة (المشرف الوطني)',
    phone: '0550000000',
    wilaya_id: 16, // Alger
    commune_name: 'الجزائر الوسطى',
    preferred_language: 'ar',
    role: 'admin',
    is_verified: true,
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'user-karim',
    email: 'karim.dz@gmail.com',
    display_name: 'كريم بلحاج',
    phone: '0661122334',
    wilaya_id: 16, // Alger
    commune_name: 'باب الزوار',
    preferred_language: 'ar',
    role: 'user',
    is_verified: true,
    created_at: '2026-02-10T11:20:00Z',
  },
  {
    id: 'user-amina',
    email: 'amina.setif@gmail.com',
    display_name: 'أمينة منصوري',
    phone: '0772334455',
    wilaya_id: 19, // Sétif
    commune_name: 'سطيف',
    preferred_language: 'ar',
    role: 'user',
    is_verified: true,
    created_at: '2026-02-14T09:15:00Z',
  },
  {
    id: 'user-mehdi',
    email: 'mehdi.oran@yahoo.fr',
    display_name: 'مهدي وهراني',
    phone: '0555998877',
    wilaya_id: 31, // Oran
    commune_name: 'بئر الجير',
    preferred_language: 'fr',
    role: 'user',
    is_verified: false,
    created_at: '2026-02-18T14:40:00Z',
  },
  {
    id: 'user-farid',
    email: 'farid.tech@outlook.com',
    display_name: 'فريد قسنطيني',
    phone: '0664556677',
    wilaya_id: 25, // Constantine
    commune_name: 'علي منجلي',
    preferred_language: 'ar',
    role: 'user',
    is_verified: true,
    created_at: '2026-02-20T16:00:00Z',
  }
];

export const INITIAL_DEMO_POSTS: Post[] = [
  // 1. NEED: Auto Spare Part (Adrar / Alger)
  {
    id: 'post-need-1',
    user_id: 'user-karim',
    user: {
      id: 'user-karim',
      display_name: 'كريم بلحاج',
      wilaya_id: 16,
    },
    title: 'أبحث عن رأس محرك أصلي (Culasse) لسيارة بيجو 206 بنزين 1.4',
    description: 'السلام عليكم، أبحث عن كيلاس أصلي بوان كاط 1.4 بنزين يكون في حالة جيدة وبدون تلحيم. متواجد في الجزائر العاصمة وأستطيع التنقل للولايات المجاورة (البليدة، بومرداس).',
    post_type: 'NEED',
    category_id: 'cat-products',
    subcategory_id: 'sub-auto-parts',
    wilaya_id: 16,
    commune_id: '1610',
    commune_name: 'باب الزوار',
    images: [
      'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80'
    ],
    budget_max: 35000,
    is_free: false,
    availability_status: 'available',
    contact_preference: 'chat_only',
    condition: 'مستعمل بحالة جيدة',
    last_confirmed_at: '2026-11-01T10:00:00Z',
    expires_at: '2026-12-01T10:00:00Z',
    views_count: 84,
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
  },
  // 2. OFFER: Auto Spare Parts (Alger) -> MATCHES Post 1!
  {
    id: 'post-offer-1',
    user_id: 'user-mehdi',
    user: {
      id: 'user-mehdi',
      display_name: 'مهدي وهراني',
      wilaya_id: 16,
    },
    title: 'متوفر قطع غيار محرك بيجو 206 و 207 (Culasse + Bloc) مستورد بحالة ممتازة',
    description: 'متوفر قطع غيار محرك بيجو مستوردة من فرنسا بدون مشاكل، كيلاس 1.4 و 1.1 بنزين تم فحصها وضغطها مع الضمان. متواجد بالقبة وبلفيل بالحراش.',
    post_type: 'OFFER',
    category_id: 'cat-products',
    subcategory_id: 'sub-auto-parts',
    wilaya_id: 16,
    commune_id: '1608',
    commune_name: 'الحراش',
    images: [
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80'
    ],
    price: 32000,
    is_free: false,
    availability_status: 'available',
    contact_preference: 'phone_allowed',
    condition: 'مستورد أصلي',
    last_confirmed_at: '2026-11-02T14:30:00Z',
    expires_at: '2026-12-02T14:30:00Z',
    views_count: 142,
    created_at: '2026-11-02T14:30:00Z',
    updated_at: '2026-11-02T14:30:00Z',
  },
  // 3. OFFER: Community Help / Free Lending of medical wheelchair & oxygen (Setif)
  {
    id: 'post-offer-2',
    user_id: 'user-amina',
    user: {
      id: 'user-amina',
      display_name: 'أمينة منصوري',
      wilaya_id: 19,
    },
    title: 'كرسي متحرك وجهاز توليد الأكسجين متاح للإعارة المجانية لوجه الله في سطيف',
    description: 'مبادرة خيرية عائلية: لدينا كرسي متحرك بحالة ممتازة وجهاز مكثف أوكسجين 5 لتر متاح مجاناً لأي مريض أو محتاج في سطيف أو ضواحيها. يرجى التنسيق معنا لإرجاعه بعد الشفاء لإفادة آخرين.',
    post_type: 'OFFER',
    category_id: 'cat-community-help',
    subcategory_id: 'sub-borrow',
    wilaya_id: 19,
    commune_id: '1901',
    commune_name: 'سطيف',
    images: [
      'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=800&q=80'
    ],
    is_free: true,
    availability_status: 'available',
    contact_preference: 'chat_only',
    last_confirmed_at: '2026-11-02T08:00:00Z',
    expires_at: '2026-12-15T08:00:00Z',
    views_count: 230,
    created_at: '2026-11-02T08:00:00Z',
    updated_at: '2026-11-02T08:00:00Z',
  },
  // 4. NEED: Community Help (Setif)
  {
    id: 'post-need-2',
    user_id: 'user-farid',
    user: {
      id: 'user-farid',
      display_name: 'فريد قسنطيني',
      wilaya_id: 19,
    },
    title: 'نبحث عن إعارة كرسي متحرك لكبير في السن بعد عملية جراحية',
    description: 'نبحث عن إعارة مؤقتة لكرسي متحرك لمدة أسبوعين لجدنا بعد عملية في العظام بمدينة سطيف أو العلمة. جزاكم الله خيراً.',
    post_type: 'NEED',
    category_id: 'cat-community-help',
    subcategory_id: 'sub-borrow',
    wilaya_id: 19,
    commune_id: '1901',
    commune_name: 'سطيف',
    images: [],
    is_free: true,
    availability_status: 'available',
    contact_preference: 'chat_only',
    last_confirmed_at: '2026-11-02T11:00:00Z',
    expires_at: '2026-11-20T11:00:00Z',
    views_count: 67,
    created_at: '2026-11-02T11:00:00Z',
    updated_at: '2026-11-02T11:00:00Z',
  },
  // 5. OFFER: Services (Oran)
  {
    id: 'post-offer-3',
    user_id: 'user-mehdi',
    user: {
      id: 'user-mehdi',
      display_name: 'مهدي وهراني',
      wilaya_id: 31,
    },
    title: 'خدمات سحب ونجدة المركبات (ديباناج 24/24) وهران وعين الترك ومسرغين',
    description: 'شاحنة سحب ونجدة مجهزة لنقل السيارات المعطلة والحوادث في كامل ولاية وهران وعلى الطريق السيار شرق غرب. أسعار معقولة وتدخل سريع ومضمون.',
    post_type: 'OFFER',
    category_id: 'cat-services',
    subcategory_id: 'sub-transport',
    wilaya_id: 31,
    commune_id: '3101',
    commune_name: 'وهران',
    images: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'
    ],
    price: 3000,
    is_free: false,
    availability_status: 'available',
    contact_preference: 'phone_allowed',
    last_confirmed_at: '2026-11-02T18:00:00Z',
    expires_at: '2026-12-30T18:00:00Z',
    views_count: 310,
    created_at: '2026-10-25T18:00:00Z',
    updated_at: '2026-11-02T18:00:00Z',
  },
  // 6. NEED: Services (Oran)
  {
    id: 'post-need-3',
    user_id: 'user-karim',
    user: {
      id: 'user-karim',
      display_name: 'كريم بلحاج',
      wilaya_id: 31,
    },
    title: 'أبحث عن ديباناج لنقل سيارة من السانية إلى حي بئر الجير بوهران',
    description: 'سيارة توقفت بسبب عطل كهربائي، أحتاج شاحنة سحب لنقلها لمسافة 12 كلم في أقرب وقت اليوم.',
    post_type: 'NEED',
    category_id: 'cat-services',
    subcategory_id: 'sub-transport',
    wilaya_id: 31,
    commune_id: '3102',
    commune_name: 'السانية',
    images: [],
    budget_max: 3000,
    is_free: false,
    availability_status: 'available',
    contact_preference: 'chat_only',
    last_confirmed_at: '2026-11-02T19:00:00Z',
    expires_at: '2026-11-05T19:00:00Z',
    views_count: 53,
    created_at: '2026-11-02T19:00:00Z',
    updated_at: '2026-11-02T19:00:00Z',
  },
  // 7. OFFER: Opportunities (Constantine)
  {
    id: 'post-offer-4',
    user_id: 'user-farid',
    user: {
      id: 'user-farid',
      display_name: 'فريد قسنطيني',
      wilaya_id: 25,
    },
    title: 'ورشة عمل مجانية: أساسيات صيانة الهواتف الذكية وبرمجة الأردوينو للشباب',
    description: 'تنظم جمعية الابتكار التقني بقسنطينة دورة تطبيقية مجانية لمدة 3 أيام لتعلم صيانة اللوحات الإلكترونية وتطوير الأنظمة المدمجة. المقاعد محدودة والتسجيل مجاني للجميع.',
    post_type: 'OFFER',
    category_id: 'cat-opportunities',
    subcategory_id: 'sub-workshops',
    wilaya_id: 25,
    commune_id: '2503',
    commune_name: 'علي منجلي',
    images: [
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
    ],
    is_free: true,
    availability_status: 'available',
    contact_preference: 'chat_only',
    last_confirmed_at: '2026-11-01T12:00:00Z',
    expires_at: '2026-11-25T12:00:00Z',
    views_count: 189,
    created_at: '2026-11-01T12:00:00Z',
    updated_at: '2026-11-01T12:00:00Z',
  },
  // 8. OFFER: Places (Constantine)
  {
    id: 'post-offer-5',
    user_id: 'user-farid',
    user: {
      id: 'user-farid',
      display_name: 'فريد قسنطيني',
      wilaya_id: 25,
    },
    title: 'فضاء مطالعة وعمل مشترك هادئ للطلبة والباحثين بوسط قسنطينة',
    description: 'مساحة مجهزة بإنترنت ألياف بصرية عالي السرعة، طابعات، وغرف اجتماعات للمشاريع والتحضير للامتحانات والمسابقات، مفتوح يومياً من 8 صباحاً إلى 8 مساءً.',
    post_type: 'OFFER',
    category_id: 'cat-places',
    subcategory_id: 'sub-workspaces',
    wilaya_id: 25,
    commune_id: '2501',
    commune_name: 'قسنطينة',
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'
    ],
    price: 300,
    is_free: false,
    availability_status: 'available',
    contact_preference: 'chat_only',
    last_confirmed_at: '2026-10-30T10:00:00Z',
    expires_at: '2026-12-30T10:00:00Z',
    views_count: 245,
    created_at: '2026-10-30T10:00:00Z',
    updated_at: '2026-10-30T10:00:00Z',
  }
];

export const INITIAL_DEMO_REPORTS: ContentReport[] = [
  {
    id: 'rep-1',
    reporter_id: 'user-amina',
    reporter_name: 'أمينة منصوري',
    post_id: 'post-offer-1',
    reason: 'expired',
    details: 'قمت بالاستفسار وصاحب الإعلان ذكر أنه باع إحدى القطع، يرجى تحديث الإعلان أو تأكيد القطع المتبقية.',
    status: 'pending',
    created_at: '2026-11-02T15:00:00Z'
  }
];

export const INITIAL_DEMO_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    user_id: 'user-karim',
    type: 'match_found',
    title: 'وجدنا عرضاً يطابق طلبك لقطع غيار بيجو!',
    body: 'قام مهدي وهراني بنشر عرض لقطع غيار محرك بيجو في ولاية الجزائر العاصمة.',
    related_post_id: 'post-offer-1',
    is_read: false,
    created_at: '2026-11-02T14:31:00Z'
  },
  {
    id: 'notif-2',
    user_id: 'user-farid',
    type: 'match_found',
    title: 'عرض مساعدة مجتمعية يطابق طلبك في سطيف!',
    body: 'أمينة منصوري عرضت كرسي متحرك للإعارة المجانية بسطيف.',
    related_post_id: 'post-offer-2',
    is_read: false,
    created_at: '2026-11-02T11:05:00Z'
  }
];
