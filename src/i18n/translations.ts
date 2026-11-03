export interface TranslationStrings {
  // Brand & Header
  appName: string;
  appArabicName: string;
  tagline: string;
  searchPlaceholder: string;
  publishAction: string;
  publishNeed: string;
  publishOffer: string;
  login: string;
  register: string;
  logout: string;
  myProfile: string;
  myDashboard: string;
  myPosts: string;
  myConversations: string;
  myNotifications: string;
  myFavorites: string;
  adminPanel: string;
  switchLanguage: string;
  installApp: string;
  installed: string;

  // Hero Section
  heroTitle: string;
  heroSubtitle: string;
  searchAction: string;
  chooseWilaya: string;
  allWilayas: string;
  allCategories: string;
  searchButton: string;
  browseAll: string;
  howItWorks: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;

  // Post Types
  needBadge: string;
  offerBadge: string;
  needDescription: string;
  offerDescription: string;
  needQuestion: string;
  offerAvailable: string;

  // Discovery & Search Filters
  discoveryTitle: string;
  discoverySubtitle: string;
  filterByType: string;
  filterByCategory: string;
  filterBySubcategory: string;
  filterByWilaya: string;
  filterByCommune: string;
  filterByStatus: string;
  filterFreeOnly: string;
  sortBy: string;
  sortNewest: string;
  sortOldest: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  activeFilters: string;
  clearFilters: string;
  resultsFound: string;
  noResultsTitle: string;
  noResultsDesc: string;
  loadMore: string;

  // Listing Details
  budget: string;
  price: string;
  freeItem: string;
  contactOwner: string;
  contactByChatOnly: string;
  contactByPhone: string;
  callSeller: string;
  whatsappContact: string;
  showPhonePublicly: string;
  showPhonePubliclyDesc: string;
  phoneHidden: string;
  lastConfirmed: string;
  postedOn: string;
  expiresOn: string;
  availability: string;
  statusAvailable: string;
  statusUnavailable: string;
  statusFulfilled: string;
  statusExpired: string;
  statusHidden: string;
  sharePost: string;
  reportPost: string;
  addToFavorites: string;
  removeFromFavorites: string;
  editPost: string;
  deletePost: string;
  markFulfilled: string;
  markUnavailable: string;
  confirmDeletePost: string;

  // Post Creation
  createPostTitle: string;
  postTypeSelection: string;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  categoryLabel: string;
  subcategoryLabel: string;
  wilayaLabel: string;
  communeLabel: string;
  priceOrBudgetLabel: string;
  isFreeCheckbox: string;
  imagesLabel: string;
  imagesHint: string;
  contactPrefLabel: string;
  submitPost: string;
  publishing: string;

  // Matching
  smartMatchTitle: string;
  smartMatchBadge: string;
  matchingNeedsFound: string;
  matchingOffersFound: string;
  matchScore: string;

  // Messaging
  messagesTitle: string;
  noConversations: string;
  startAConversation: string;
  typeMessagePlaceholder: string;
  sendMessage: string;
  readReceipt: string;
  unreadMessages: string;
  blockUser: string;
  unblockUser: string;
  reportConversation: string;
  userBlockedNotice: string;

  // Notifications
  notificationsTitle: string;
  markAllRead: string;
  clearNotifications: string;
  noNotifications: string;
  matchFoundTitle: string;
  newMessageTitle: string;

  // Dashboard & Profile
  dashboardTitle: string;
  overviewTab: string;
  needsTab: string;
  offersTab: string;
  favoritesTab: string;
  savedSearchesTab: string;
  settingsTab: string;
  editProfile: string;
  displayName: string;
  phoneLabel: string;
  preferredLanguage: string;
  saveChanges: string;
  savedSuccessfully: string;
  deleteAccount: string;
  confirmDeleteAccount: string;

  // Moderation & Admin
  adminTitle: string;
  adminSubtitle: string;
  statsTotalPosts: string;
  statsNeeds: string;
  statsOffers: string;
  statsUsers: string;
  statsReports: string;
  reportsQueue: string;
  userManagement: string;
  categoryManagement: string;
  locationValidationReport: string;
  auditLogs: string;
  actionHide: string;
  actionRestore: string;
  actionDelete: string;
  actionBanUser: string;
  actionUnbanUser: string;
  actionDismiss: string;
  adminAccessRestricted: string;

  // Safety & Reports
  reportTitle: string;
  reportReason: string;
  reportDetails: string;
  reportSubmit: string;
  fraud: string;
  fakeOffer: string;
  misleading: string;
  spam: string;
  harassment: string;
  inappropriate: string;
  expiredListing: string;
  reportSentSuccess: string;

  // Offline & PWA
  offlineTitle: string;
  offlineNotice: string;
  pwaInstallPromptTitle: string;
  pwaInstallPromptDesc: string;
  installNow: string;
  maybeLater: string;
}

export const translations: Record<'ar' | 'fr' | 'en', TranslationStrings> = {
  ar: {
    // Brand & Header
    appName: 'WIN DZ',
    appArabicName: 'وين نلقاها؟',
    tagline: 'ابحث، اكتشف، وتواصل',
    searchPlaceholder: 'ما الذي تبحث عنه اليوم؟ (مثال: قطعة غيار، دكتور، تصليح، استعارة عتاد...)',
    publishAction: 'نشر إعلان جديد',
    publishNeed: 'أبحث عن شيء (طلب)',
    publishOffer: 'أعرض شيئاً (عرض متاح)',
    login: 'تسجيل الدخول',
    register: 'إنشاء حساب جديد',
    logout: 'تسجيل الخروج',
    myProfile: 'ملفي الشخصي',
    myDashboard: 'لوحة التحكم',
    myPosts: 'إعلاناتي وطلباتي',
    myConversations: 'المحادثات',
    myNotifications: 'الإشعارات',
    myFavorites: 'المفضلة',
    adminPanel: 'لوحة الإدارة الآمنة',
    switchLanguage: 'تغيير اللغة',
    installApp: 'تثبيت التطبيق PWA',
    installed: 'تم التثبيت',

    // Hero Section
    heroTitle: 'وين نلقاها في الجزائر؟',
    heroSubtitle: 'المنصة الوطنية الأولى لمساعدة المواطنين في العثور على المنتجات، قطع الغيار، الخدمات، الأماكن والفرص بدون وسيط وبشكل مجاني 100%.',
    searchAction: 'ابحث الآن',
    chooseWilaya: 'اختر الولاية',
    allWilayas: 'كل الولايات (69 ولاية)',
    allCategories: 'جميع الأقسام والتصنيفات',
    searchButton: 'بحث فوري',
    browseAll: 'تصفح كافة الطلبات والعروض',
    howItWorks: 'كيف تعمل منصة WIN DZ؟',
    step1Title: '1. انشر طلبك أو عرضك',
    step1Desc: 'حدد بدقة ما تبحث عنه أو ما تقدمه، واختر ولايتك وبلديتك بدون أي مقابل.',
    step2Title: '2. مطابقة ذكية ودقيقة',
    step2Desc: 'يقوم نظام المطابقة بربط الباحثين بأصحاب العروض والعتاد في نفس المنطقة الجغرافية.',
    step3Title: '3. تواصل مباشر وآمن',
    step3Desc: 'تواصل مباشرة عبر الرسائل الداخلية للمنصة دون كشف رقمك أو تفاصيلك الخاصة.',

    // Post Types
    needBadge: 'طلب (أبحث عنه)',
    offerBadge: 'عرض (متوفر لدي)',
    needDescription: 'مواطن أو حرفي يبحث عن هذه السلعة أو الخدمة',
    offerDescription: 'سلعة أو خدمة أو مساعدة متوفرة وجاهزة للمشاركة',
    needQuestion: 'من يوفر هذا الطلب؟',
    offerAvailable: 'متوفر حالياً',

    // Discovery & Search Filters
    discoveryTitle: 'استكشاف الطلبات والعروض في الجزائر',
    discoverySubtitle: 'تصفح كل ما يبحث عنه أو يقدمه المواطنون عبر كامل التراب الوطني',
    filterByType: 'نوع الإعلان',
    filterByCategory: 'القسم الرئيسي',
    filterBySubcategory: 'التصنيف الفرعي',
    filterByWilaya: 'الولاية',
    filterByCommune: 'البلدية',
    filterByStatus: 'الحالة',
    filterFreeOnly: 'مجاني فقط / مساعدة وتطوع',
    sortBy: 'الترتيب حسب',
    sortNewest: 'الأحدث نشراً',
    sortOldest: 'الأقدم نشراً',
    sortPriceAsc: 'السعر: من الأقل للأعلى',
    sortPriceDesc: 'السعر: من الأعلى للأقل',
    activeFilters: 'الفلاتر النشطة',
    clearFilters: 'مسح كافة الفلاتر',
    resultsFound: 'إعلان متوفر',
    noResultsTitle: 'لم نجد أي إعلان يطابق بحثك',
    noResultsDesc: 'جرب توسيع نطاق البحث أو تغيير الكلمات الدلالية أو الولاية، أو كن أول من ينشر طلباً أو عرضاً!',
    loadMore: 'عرض المزيد من النتائج',

    // Listing Details
    budget: 'الميزانية التقريبية',
    price: 'السعر المقترح',
    freeItem: 'مجاناً / تطوع ومساعدة',
    contactOwner: 'تواصل مع صاحب الإعلان',
    contactByChatOnly: 'التواصل متاح عبر الرسائل الداخلية فقط للحفاظ على الخصوصية',
    contactByPhone: 'صاحب الإعلان يتيح التواصل الهاتفي أيضاً',
    callSeller: 'اتصال',
    whatsappContact: 'تواصل عبر واتساب',
    showPhonePublicly: 'إظهار رقم هاتفي للعامة',
    showPhonePubliclyDesc: 'عند تفعيل هذا الخيار، سيتمكن الزوار من الاتصال بك مباشرة أو التواصل معك عبر واتساب.',
    phoneHidden: 'رقم الهاتف غير معلن',
    lastConfirmed: 'آخر تأكيد للتوفر',
    postedOn: 'تاريخ النشر',
    expiresOn: 'تاريخ انتهاء الصلاحية',
    availability: 'حالة التوفر',
    statusAvailable: 'متاح ومتوفر حالياً',
    statusUnavailable: 'غير متاح حالياً',
    statusFulfilled: 'تمت تلبية الطلب بنجاح',
    statusExpired: 'منتهي الصلاحية',
    statusHidden: 'مخفي من قبل الإدارة',
    sharePost: 'مشاركة الإعلان',
    reportPost: 'الإبلاغ عن الإعلان',
    addToFavorites: 'إضافة للمفضلة',
    removeFromFavorites: 'إزالة من المفضلة',
    editPost: 'تعديل الإعلان',
    deletePost: 'حذف الإعلان',
    markFulfilled: 'تحديد كـ "تمت التلبية"',
    markUnavailable: 'تحديد كـ "غير متاح"',
    confirmDeletePost: 'هل أنت متأكد من رغبتك في حذف هذا الإعلان نهائياً؟',

    // Post Creation
    createPostTitle: 'نشر إعلان جديد على WIN DZ',
    postTypeSelection: 'ما نوع هذا الإعلان؟',
    titleLabel: 'عنوان واضح ومختصر',
    titlePlaceholder: 'مثال: أبحث عن كارت ميموار حاسوب قديم DDR3 في وهران / متوفر عتاد ترصيص للإعارة',
    descriptionLabel: 'التفاصيل والشرح الكامل',
    descriptionPlaceholder: 'صف السلعة، الموديل، الحالة، الشروط أو ما تحتاجه بدقة لتسهيل العثور عليه...',
    categoryLabel: 'القسم الرئيسي',
    subcategoryLabel: 'التصنيف الفرعي',
    wilayaLabel: 'الولاية المعنية',
    communeLabel: 'البلدية',
    priceOrBudgetLabel: 'السعر أو الميزانية التقديرية (د.ج - اختياري)',
    isFreeCheckbox: 'هذا الإعلان مجاني 100% (إعارة، هبة، مساعدة، أو تطوع)',
    imagesLabel: 'صور توضيحية (اختياري)',
    imagesHint: 'يمكنك إرفاق حتى 4 صور بصيغ آمنة (JPG، PNG، WebP)، الحد الأقصى 2 ميغابايت لكل صورة.',
    contactPrefLabel: 'طريقة التواصل المفضلة',
    submitPost: 'نشر الإعلان الآن',
    publishing: 'جاري النشر والتحقق...',

    // Matching
    smartMatchTitle: 'نظام المطابقة الذكي المحلي',
    smartMatchBadge: 'تطابق محلي',
    matchingNeedsFound: 'وجدنا طلبات تبحث عن عتادك أو خدمتك!',
    matchingOffersFound: 'وجدنا عروضاً تطابق ما تبحث عنه!',
    matchScore: 'نسبة التطابق',

    // Messaging
    messagesTitle: 'الرسائل والمحادثات الداخلية',
    noConversations: 'لا توجد محادثات حتى الآن',
    startAConversation: 'ابدأ محادثة مع صاحب الإعلان للاستفسار أو التنسيق',
    typeMessagePlaceholder: 'اكتب رسالتك هنا بكل احترام ومسؤولية...',
    sendMessage: 'إرسال الرسالة',
    readReceipt: 'تمت القراءة',
    unreadMessages: 'رسائل غير مقروءة',
    blockUser: 'حظر هذا المستخدم',
    unblockUser: 'إلغاء الحظر',
    reportConversation: 'الإبلاغ عن المحادثة',
    userBlockedNotice: 'هذا المستخدم محظور ولا يمكنك مراسلته.',

    // Notifications
    notificationsTitle: 'الإشعارات والتنبيهات',
    markAllRead: 'تحديد الكل كمقروء',
    clearNotifications: 'مسح الإشعارات',
    noNotifications: 'لا توجد إشعارات جديدة حالياً',
    matchFoundTitle: 'تم العثور على تطابق جديد!',
    newMessageTitle: 'رسالة جديدة في محادثتك',

    // Dashboard & Profile
    dashboardTitle: 'لوحة التحكم الشخصية',
    overviewTab: 'نظرة عامة',
    needsTab: 'طلباتي (أبحث عنها)',
    offersTab: 'عروضي (متوفرة لدي)',
    favoritesTab: 'الإعلانات المحفوظة',
    savedSearchesTab: 'عمليات البحث المحفوظة',
    settingsTab: 'إعدادات الحساب',
    editProfile: 'تعديل الملف الشخصي',
    displayName: 'اسم العرض',
    phoneLabel: 'رقم الهاتف (سري، يظهر فقط باختيارك)',
    preferredLanguage: 'اللغة المفضلة للواجهة',
    saveChanges: 'حفظ التغييرات',
    savedSuccessfully: 'تم حفظ التغييرات بنجاح',
    deleteAccount: 'حذف الحساب نهائياً',
    confirmDeleteAccount: 'تحذير: سيتم حذف حسابك وكافة إعلاناتك ورسائلك نهائياً. هل أنت متأكد؟',

    // Moderation & Admin
    adminTitle: 'منطقة الإدارة الآمنة (WIN DZ Admin)',
    adminSubtitle: 'مراقبة المحتوى، تدقيق البلاغات، وإدارة المنصة الوطنية',
    statsTotalPosts: 'إجمالي الإعلانات',
    statsNeeds: 'طلبات المواطنين (Need)',
    statsOffers: 'العروض المتوفرة (Offer)',
    statsUsers: 'المستخدمون المسجلون',
    statsReports: 'البلاغات المعلقة',
    reportsQueue: 'قائمة مراجعة البلاغات',
    userManagement: 'إدارة المستخدمين والحسابات',
    categoryManagement: 'إدارة الأقسام والتصنيفات',
    locationValidationReport: 'تقرير تدقيق ومطابقة الولايات والبلديات (69 ولاية)',
    auditLogs: 'سجل العمليات الإدارية (Audit Log)',
    actionHide: 'إخفاء الإعلان',
    actionRestore: 'استعادة الإعلان',
    actionDelete: 'حذف نهائي',
    actionBanUser: 'تعليق حساب المستخدم',
    actionUnbanUser: 'استرجاع الحساب',
    actionDismiss: 'تجاهل البلاغ',
    adminAccessRestricted: 'تنبيه أمني: يتطلب هذا القسم صلاحيات إدارية موثقة.',

    // Safety & Reports
    reportTitle: 'الإبلاغ عن محتوى غير لائق أو مخالف',
    reportReason: 'سبب البلاغ',
    reportDetails: 'تفاصيل إضافية لتسهيل مراجعة فريق الإشراف',
    reportSubmit: 'إرسال البلاغ فوراً',
    fraud: 'احتيال أو طلب معلومات سرية',
    fakeOffer: 'عرض غير حقيقي أو غير موجود',
    misleading: 'معلومات مضللة أو كاذبة',
    spam: 'إعلان مكرر أو سبام',
    harassment: 'مضايقة أو إساءة في التعامل',
    inappropriate: 'محتوى غير لائق ومخالف للقوانين',
    expiredListing: 'الإعلان قديم أو منتهي ولم يعد متوفراً',
    reportSentSuccess: 'شكراً لمساهمتك في حماية مجتمع WIN DZ. تمت إحالة البلاغ للمراجعة الفورية.',

    // Offline & PWA
    offlineTitle: 'أنت غير متصل بالإنترنت',
    offlineNotice: 'يعمل تطبيق WIN DZ بوضع الأوفلاين للبيانات المخزنة مؤقتاً. للبحث الحي والمراسلة يرجى إعادة الاتصال بالشبكة.',
    pwaInstallPromptTitle: 'تثبيت تطبيق WIN DZ على جهازك',
    pwaInstallPromptDesc: 'تمتع بتجربة تصفح سريعة بدون شريط المتصفح وتنبيهات فورية عند العثور على ما تبحث عنه.',
    installNow: 'تثبيت التطبيق الآن',
    maybeLater: 'لاحقاً'
  },
  fr: {
    appName: 'WIN DZ',
    appArabicName: 'وين نلقاها؟',
    tagline: 'Cherchez, Découvrez, Connectez.',
    searchPlaceholder: 'Que cherchez-vous aujourd\'hui ? (pièce auto, médecin, dépannage, matériel...)',
    publishAction: 'Publier une annonce',
    publishNeed: 'Je cherche (Demande)',
    publishOffer: 'Je propose (Offre disponible)',
    login: 'Connexion',
    register: 'Créer un compte',
    logout: 'Déconnexion',
    myProfile: 'Mon Profil',
    myDashboard: 'Tableau de bord',
    myPosts: 'Mes annonces',
    myConversations: 'Messagerie',
    myNotifications: 'Notifications',
    myFavorites: 'Favoris',
    adminPanel: 'Administration sécurisée',
    switchLanguage: 'Changer la langue',
    installApp: 'Installer l\'application PWA',
    installed: 'Installé',

    heroTitle: 'Où le trouver en Algérie ?',
    heroSubtitle: 'La plateforme citoyenne nationale pour trouver des produits, pièces détachées, services, lieux et entraide sans intermédiaire et 100% gratuite.',
    searchAction: 'Rechercher',
    chooseWilaya: 'Sélectionner la Wilaya',
    allWilayas: 'Toutes les wilayas (69 wilayas)',
    allCategories: 'Toutes les catégories',
    searchButton: 'Recherche instantanée',
    browseAll: 'Explorer toutes les annonces',
    howItWorks: 'Comment fonctionne WIN DZ ?',
    step1Title: '1. Publiez votre besoin ou offre',
    step1Desc: 'Décrivez précisément ce que vous recherchez ou proposez, dans votre wilaya et commune.',
    step2Title: '2. Mise en relation intelligente',
    step2Desc: 'Notre moteur fait correspondre automatiquement les besoins et les offres dans votre zone.',
    step3Title: '3. Contact direct et sécurisé',
    step3Desc: 'Échangez via la messagerie interne confidentielle sans divulguer vos coordonnées privées.',

    needBadge: 'Demande (Je cherche)',
    offerBadge: 'Offre (Disponible)',
    needDescription: 'Citoyen ou artisan recherchant cet article ou service',
    offerDescription: 'Article, service ou aide immédiatement disponible',
    needQuestion: 'Qui peut fournir ceci ?',
    offerAvailable: 'Disponible actuellement',

    discoveryTitle: 'Découverte des annonces en Algérie',
    discoverySubtitle: 'Consultez les demandes et offres publiées sur l\'ensemble du territoire national',
    filterByType: 'Type d\'annonce',
    filterByCategory: 'Catégorie principale',
    filterBySubcategory: 'Sous-catégorie',
    filterByWilaya: 'Wilaya',
    filterByCommune: 'Commune',
    filterByStatus: 'Statut',
    filterFreeOnly: 'Gratuit uniquement / Entraide',
    sortBy: 'Trier par',
    sortNewest: 'Plus récentes',
    sortOldest: 'Plus anciennes',
    sortPriceAsc: 'Prix croissant',
    sortPriceDesc: 'Prix décroissant',
    activeFilters: 'Filtres actifs',
    clearFilters: 'Réinitialiser les filtres',
    resultsFound: 'annonces trouvées',
    noResultsTitle: 'Aucune annonce trouvée',
    noResultsDesc: 'Essayez d\'élargir votre recherche, de changer de wilaya ou soyez le premier à publier !',
    loadMore: 'Afficher plus de résultats',

    budget: 'Budget indicatif',
    price: 'Prix proposé',
    freeItem: 'Gratuit / Solidarité',
    contactOwner: 'Contacter l\'annonceur',
    contactByChatOnly: 'Contact exclusivement via messagerie interne pour préserver la vie privée',
    contactByPhone: 'L\'annonceur accepte également les appels téléphoniques',
    callSeller: 'Appeler',
    whatsappContact: 'Contacter sur WhatsApp',
    showPhonePublicly: 'Afficher mon numéro publiquement',
    showPhonePubliclyDesc: 'En activant cette option, les visiteurs pourront vous appeler directement ou vous contacter sur WhatsApp.',
    phoneHidden: 'Numéro non disponible',
    lastConfirmed: 'Dernière confirmation',
    postedOn: 'Date de publication',
    expiresOn: 'Date d\'expiration',
    availability: 'Disponibilité',
    statusAvailable: 'Actuellement disponible',
    statusUnavailable: 'Indisponible pour le moment',
    statusFulfilled: 'Demande satisfaite',
    statusExpired: 'Expiré',
    statusHidden: 'Masqué par la modération',
    sharePost: 'Partager l\'annonce',
    reportPost: 'Signaler l\'annonce',
    addToFavorites: 'Ajouter aux favoris',
    removeFromFavorites: 'Retirer des favoris',
    editPost: 'Modifier l\'annonce',
    deletePost: 'Supprimer l\'annonce',
    markFulfilled: 'Marquer comme satisfaite',
    markUnavailable: 'Marquer comme indisponible',
    confirmDeletePost: 'Êtes-vous sûr de vouloir supprimer définitivement cette annonce ?',

    createPostTitle: 'Publier sur WIN DZ',
    postTypeSelection: 'Quel est le type de cette annonce ?',
    titleLabel: 'Titre clair et concis',
    titlePlaceholder: 'Ex: Recherche barrette mémoire DDR3 à Oran / Outillage de plomberie à prêter',
    descriptionLabel: 'Description détaillée',
    descriptionPlaceholder: 'Précisez l\'état, le modèle, vos disponibilités ou vos exigences pour faciliter la trouvaille...',
    categoryLabel: 'Catégorie principale',
    subcategoryLabel: 'Sous-catégorie',
    wilayaLabel: 'Wilaya concernée',
    communeLabel: 'Commune',
    priceOrBudgetLabel: 'Prix ou budget estimé (DZD - facultatif)',
    isFreeCheckbox: 'Cette annonce est 100% gratuite (prêt, don, entraide, bénévolat)',
    imagesLabel: 'Photos descriptives (optionnel)',
    imagesHint: 'Jusqu\'à 4 photos aux formats JPG, PNG, WebP (max 2 Mo par image).',
    contactPrefLabel: 'Préférence de contact',
    submitPost: 'Publier l\'annonce maintenant',
    publishing: 'Publication en cours...',

    smartMatchTitle: 'Moteur de rapprochement local',
    smartMatchBadge: 'Correspondance locale',
    matchingNeedsFound: 'Des citoyens recherchent ce que vous proposez !',
    matchingOffersFound: 'Des offres correspondent à ce que vous cherchez !',
    matchScore: 'Indice de correspondance',

    messagesTitle: 'Messagerie interne privée',
    noConversations: 'Aucune conversation pour l\'instant',
    startAConversation: 'Envoyez un message à l\'annonceur pour échanger et convenir d\'un rendez-vous',
    typeMessagePlaceholder: 'Écrivez votre message avec respect et courtoisie...',
    sendMessage: 'Envoyer',
    readReceipt: 'Lu',
    unreadMessages: 'Messages non lus',
    blockUser: 'Bloquer cet utilisateur',
    unblockUser: 'Débloquer',
    reportConversation: 'Signaler la conversation',
    userBlockedNotice: 'Cet utilisateur est bloqué.',

    notificationsTitle: 'Notifications et alertes',
    markAllRead: 'Tout marquer comme lu',
    clearNotifications: 'Effacer l\'historique',
    noNotifications: 'Aucune nouvelle notification',
    matchFoundTitle: 'Nouvelle correspondance trouvée !',
    newMessageTitle: 'Nouveau message reçu',

    dashboardTitle: 'Tableau de bord personnel',
    overviewTab: 'Aperçu',
    needsTab: 'Mes demandes (Besoin)',
    offersTab: 'Mes offres (Disponible)',
    favoritesTab: 'Annonces enregistrées',
    savedSearchesTab: 'Recherches sauvegardées',
    settingsTab: 'Paramètres du compte',
    editProfile: 'Modifier mon profil',
    displayName: 'Nom d\'affichage',
    phoneLabel: 'Numéro de téléphone (confidentiel)',
    preferredLanguage: 'Langue de l\'interface',
    saveChanges: 'Enregistrer les modifications',
    savedSuccessfully: 'Modifications enregistrées avec succès',
    deleteAccount: 'Supprimer mon compte',
    confirmDeleteAccount: 'Attention : toutes vos données, annonces et messages seront définitivement supprimés. Confirmer ?',

    adminTitle: 'Administration sécurisée WIN DZ',
    adminSubtitle: 'Modération, vérification des signalements et gouvernance de la plateforme',
    statsTotalPosts: 'Total Annonces',
    statsNeeds: 'Demandes (Need)',
    statsOffers: 'Offres (Offer)',
    statsUsers: 'Utilisateurs inscrits',
    statsReports: 'Signalements en attente',
    reportsQueue: 'File de modération',
    userManagement: 'Gestion des utilisateurs',
    categoryManagement: 'Gestion des catégories',
    locationValidationReport: 'Rapport de validation des 69 Wilayas & Communes',
    auditLogs: 'Journal des actions administratives',
    actionHide: 'Masquer l\'annonce',
    actionRestore: 'Restaurer',
    actionDelete: 'Suppression définitive',
    actionBanUser: 'Suspendre le compte',
    actionUnbanUser: 'Rétablir le compte',
    actionDismiss: 'Rejeter le signalement',
    adminAccessRestricted: 'Accès réservé aux administrateurs autorisés.',

    reportTitle: 'Signaler un contenu inapproprié ou abusif',
    reportReason: 'Motif du signalement',
    reportDetails: 'Détails complémentaires pour l\'équipe de modération',
    reportSubmit: 'Transmettre le signalement',
    fraud: 'Fraude ou tentative d\'escroquerie',
    fakeOffer: 'Annonce mensongère ou inexistante',
    misleading: 'Informations trompeuses',
    spam: 'Spam ou annonces répétitives',
    harassment: 'Harcèlement ou propos offensants',
    inappropriate: 'Contenu non conforme à la loi',
    expiredListing: 'Annonce périmée ou indisponible',
    reportSentSuccess: 'Merci pour votre vigilance citoyenne. Le signalement a été transmis.',

    offlineTitle: 'Mode hors-ligne actif',
    offlineNotice: 'Vous consultez le contenu mis en cache. Une connexion Internet est requise pour la recherche en direct et la messagerie.',
    pwaInstallPromptTitle: 'Installer WIN DZ sur votre appareil',
    pwaInstallPromptDesc: 'Accédez rapidement à la plateforme et recevez des alertes instantanées dès qu\'une offre correspond à votre recherche.',
    installNow: 'Installer maintenant',
    maybeLater: 'Plus tard'
  },
  en: {
    appName: 'WIN DZ',
    appArabicName: 'وين نلقاها؟',
    tagline: 'Search, Discover, Connect.',
    searchPlaceholder: 'What are you looking for today? (e.g. car spare part, doctor, repair, borrow tools...)',
    publishAction: 'Post a Listing',
    publishNeed: 'I Need Something (Request)',
    publishOffer: 'I Have Something (Available Offer)',
    login: 'Sign In',
    register: 'Create Account',
    logout: 'Sign Out',
    myProfile: 'My Profile',
    myDashboard: 'User Dashboard',
    myPosts: 'My Listings',
    myConversations: 'Messages',
    myNotifications: 'Notifications',
    myFavorites: 'Saved Favorites',
    adminPanel: 'Secure Admin',
    switchLanguage: 'Language',
    installApp: 'Install PWA App',
    installed: 'Installed',

    heroTitle: 'Where to find it in Algeria?',
    heroSubtitle: 'The national citizen discovery network helping Algerians locate products, spare parts, services, places and mutual aid with zero intermediaries and 100% free.',
    searchAction: 'Search Now',
    chooseWilaya: 'Select Wilaya',
    allWilayas: 'All Wilayas (69 Wilayas)',
    allCategories: 'All Categories',
    searchButton: 'Instant Search',
    browseAll: 'Browse All Requests & Offers',
    howItWorks: 'How WIN DZ Works',
    step1Title: '1. Post Your Need or Offer',
    step1Desc: 'Clearly specify what you need or what you have available in your wilaya and commune.',
    step2Title: '2. Smart Proximity Matching',
    step2Desc: 'Our local matching engine automatically links citizens needing items with those who can provide them.',
    step3Title: '3. Direct Safe Messaging',
    step3Desc: 'Communicate directly through our built-in private messaging without exposing personal phone numbers.',

    needBadge: 'Need (Request)',
    offerBadge: 'Offer (Available)',
    needDescription: 'Citizen or craftsman looking for this item or service',
    offerDescription: 'Item, service or aid readily available to share or provide',
    needQuestion: 'Who can provide this?',
    offerAvailable: 'Currently Available',

    discoveryTitle: 'Explore Requests & Offers across Algeria',
    discoverySubtitle: 'Browse what citizens are looking for and offering nationwide',
    filterByType: 'Listing Type',
    filterByCategory: 'Primary Category',
    filterBySubcategory: 'Subcategory',
    filterByWilaya: 'Wilaya',
    filterByCommune: 'Commune',
    filterByStatus: 'Status',
    filterFreeOnly: 'Free Only / Solidarity',
    sortBy: 'Sort By',
    sortNewest: 'Newest First',
    sortOldest: 'Oldest First',
    sortPriceAsc: 'Price: Low to High',
    sortPriceDesc: 'Price: High to Low',
    activeFilters: 'Active Filters',
    clearFilters: 'Clear All Filters',
    resultsFound: 'listings found',
    noResultsTitle: 'No listings match your criteria',
    noResultsDesc: 'Try broadening your search terms, changing the wilaya, or be the first to post a need or offer!',
    loadMore: 'Load More Results',

    budget: 'Approximate Budget',
    price: 'Proposed Price',
    freeItem: 'Free / Community Aid',
    contactOwner: 'Contact Poster',
    contactByChatOnly: 'Communication is strictly via internal chat to protect user privacy',
    contactByPhone: 'Poster also allows direct phone calls',
    callSeller: 'Call',
    whatsappContact: 'Contact via WhatsApp',
    showPhonePublicly: 'Show my phone number publicly',
    showPhonePubliclyDesc: 'Enabling this option allows visitors to call you directly or contact you on WhatsApp.',
    phoneHidden: 'Phone number hidden',
    lastConfirmed: 'Last confirmed',
    postedOn: 'Posted on',
    expiresOn: 'Expires on',
    availability: 'Availability',
    statusAvailable: 'Currently Available',
    statusUnavailable: 'Currently Unavailable',
    statusFulfilled: 'Fulfilled',
    statusExpired: 'Expired',
    statusHidden: 'Hidden by moderation',
    sharePost: 'Share Listing',
    reportPost: 'Report Listing',
    addToFavorites: 'Add to Favorites',
    removeFromFavorites: 'Remove from Favorites',
    editPost: 'Edit Listing',
    deletePost: 'Delete Listing',
    markFulfilled: 'Mark as Fulfilled',
    markUnavailable: 'Mark as Unavailable',
    confirmDeletePost: 'Are you sure you want to permanently delete this listing?',

    createPostTitle: 'Post on WIN DZ',
    postTypeSelection: 'What type of listing is this?',
    titleLabel: 'Clear and concise title',
    titlePlaceholder: 'e.g. Looking for desktop DDR3 RAM in Oran / Plumbing kit available to borrow',
    descriptionLabel: 'Full Details & Description',
    descriptionPlaceholder: 'Describe the condition, exact specs, time constraints or requirements...',
    categoryLabel: 'Primary Category',
    subcategoryLabel: 'Subcategory',
    wilayaLabel: 'Wilaya',
    communeLabel: 'Commune',
    priceOrBudgetLabel: 'Price or Budget estimate (DZD - optional)',
    isFreeCheckbox: 'This listing is 100% free (borrowing, donation, volunteering, mutual aid)',
    imagesLabel: 'Photos (Optional)',
    imagesHint: 'Up to 4 images in safe JPG, PNG, or WebP formats (max 2MB per photo).',
    contactPrefLabel: 'Contact Preference',
    submitPost: 'Publish Listing Now',
    publishing: 'Publishing...',

    smartMatchTitle: 'Local Proximity Matcher',
    smartMatchBadge: 'Local Match',
    matchingNeedsFound: 'Citizens are looking for what you offer!',
    matchingOffersFound: 'Offers matching your need were found!',
    matchScore: 'Match Score',

    messagesTitle: 'Private Internal Messages',
    noConversations: 'No conversations yet',
    startAConversation: 'Start a conversation with the poster to coordinate and arrange details',
    typeMessagePlaceholder: 'Type your message with respect and clarity...',
    sendMessage: 'Send',
    readReceipt: 'Read',
    unreadMessages: 'Unread messages',
    blockUser: 'Block User',
    unblockUser: 'Unblock',
    reportConversation: 'Report Conversation',
    userBlockedNotice: 'This user is blocked.',

    notificationsTitle: 'Notifications & Alerts',
    markAllRead: 'Mark All as Read',
    clearNotifications: 'Clear Notifications',
    noNotifications: 'No notifications at this moment',
    matchFoundTitle: 'New Match Found!',
    newMessageTitle: 'New message received',

    dashboardTitle: 'Personal Dashboard',
    overviewTab: 'Overview',
    needsTab: 'My Needs (Requests)',
    offersTab: 'My Offers (Available)',
    favoritesTab: 'Saved Listings',
    savedSearchesTab: 'Saved Searches',
    settingsTab: 'Account Settings',
    editProfile: 'Edit Profile',
    displayName: 'Display Name',
    phoneLabel: 'Phone number (Private)',
    preferredLanguage: 'Interface Language',
    saveChanges: 'Save Changes',
    savedSuccessfully: 'Changes saved successfully',
    deleteAccount: 'Delete Account',
    confirmDeleteAccount: 'Warning: All your listings, messages, and profile data will be permanently wiped. Confirm?',

    adminTitle: 'Secure Admin Portal (WIN DZ)',
    adminSubtitle: 'Content moderation, report verification, and national platform governance',
    statsTotalPosts: 'Total Listings',
    statsNeeds: 'Citizen Needs',
    statsOffers: 'Available Offers',
    statsUsers: 'Registered Users',
    statsReports: 'Pending Reports',
    reportsQueue: 'Moderation Queue',
    userManagement: 'User Management',
    categoryManagement: 'Category Management',
    locationValidationReport: 'Location System Integrity Report (69 Wilayas)',
    auditLogs: 'Administrative Audit Log',
    actionHide: 'Hide Listing',
    actionRestore: 'Restore Listing',
    actionDelete: 'Delete Permanently',
    actionBanUser: 'Suspend User',
    actionUnbanUser: 'Restore User',
    actionDismiss: 'Dismiss Report',
    adminAccessRestricted: 'Security Notice: This portal requires verified administrator authorization.',

    reportTitle: 'Report Violating or Inappropriate Content',
    reportReason: 'Report Reason',
    reportDetails: 'Additional details to assist moderation',
    reportSubmit: 'Submit Report',
    fraud: 'Fraud or phishing attempt',
    fakeOffer: 'Fake or non-existent offer',
    misleading: 'Misleading or false information',
    spam: 'Spam or duplicated listing',
    harassment: 'Harassment or abusive behavior',
    inappropriate: 'Inappropriate or illegal content',
    expiredListing: 'Expired or unavailable listing',
    reportSentSuccess: 'Thank you for helping keep the WIN DZ community safe. Report submitted for review.',

    offlineTitle: 'Offline Mode Active',
    offlineNotice: 'You are viewing cached content. An active internet connection is required for live search and messaging.',
    pwaInstallPromptTitle: 'Install WIN DZ on Your Device',
    pwaInstallPromptDesc: 'Enjoy fast app-like performance without browser bars and receive immediate notifications when matches appear.',
    installNow: 'Install App Now',
    maybeLater: 'Maybe Later'
  }
};
