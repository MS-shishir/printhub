import { LinkItem, LinkCategoryMeta } from '../types/links';

const STORAGE_KEY = 'printhub_links_storage_v2';
const LEGACY_STORAGE_KEY = 'printhub_links_storage_v1';

export const DEFAULT_CATEGORIES: LinkCategoryMeta[] = [
  {
    id: 'nid',
    nameBn: 'জাতীয় পরিচয়পত্র ও ভোটার (NID)',
    nameEn: 'NID & Voter Services',
    icon: 'ShieldCheck',
    color: 'from-blue-500 to-indigo-600',
    description: 'NID সংশোধন, ভোটার কার্ড ডাউনলোড, রি-ইস্যু ও যাচাই'
  },
  {
    id: 'birth',
    nameBn: 'জন্ম ও মৃত্যু নিবন্ধন (BDRIS)',
    nameEn: 'Birth & Death Registration',
    icon: 'FileText',
    color: 'from-emerald-500 to-teal-600',
    description: 'নতুন জন্ম নিবন্ধন, মৃত্যু সনদ ও তথ্য সংশোধন'
  },
  {
    id: 'passport',
    nameBn: 'পাসপোর্ট ও ভিসা সেবা (Passport)',
    nameEn: 'Passport & Visa Services',
    icon: 'Globe',
    color: 'from-purple-500 to-indigo-600',
    description: 'ই-পাসপোর্ট আবেদন, চালান ফি ও ভারতীয় ভিসা পোর্টাল'
  },
  {
    id: 'land',
    nameBn: 'ভূমি, পর্চা ও নামজারি (Land)',
    nameEn: 'Land, Porcha & Mutation',
    icon: 'Landmark',
    color: 'from-amber-500 to-orange-600',
    description: 'ই-নামজারি, খতিয়ান, পর্চা, ভূমি উন্নয়ন কর ও ম্যাপ'
  },
  {
    id: 'education',
    nameBn: 'শিক্ষা, ভর্তি ও ফলাফল (Education)',
    nameEn: 'Education, Admission & Results',
    icon: 'BookOpen',
    color: 'from-sky-500 to-blue-600',
    description: 'বোর্ড রেজাল্ট, জাতীয় বিশ্ববিদ্যালয় ও উন্মুক্ত বিশ্ববিদ্যালয়'
  },
  {
    id: 'jobs',
    nameBn: 'চাকরি, পুলিশ ও ভাতা (Jobs & Govt)',
    nameEn: 'Jobs, Police & Govt Sheba',
    icon: 'Briefcase',
    color: 'from-rose-500 to-pink-600',
    description: 'সরকারি চাকরির আবেদন, পুলিশ ক্লিয়ারেন্স ও সামাজিক ভাতা'
  },
  {
    id: 'challan',
    nameBn: 'চালান ও বিল পেমেন্ট (Challan & Bills)',
    nameEn: 'Challan & Bill Payments',
    icon: 'CreditCard',
    color: 'from-violet-500 to-purple-600',
    description: 'এ-চালান, সোনালী ই-সেবা, বিদ্যুৎ, গ্যাস ও ট্যাক্স চালান'
  },
  {
    id: 'travel',
    nameBn: 'ট্রেন, বিমান ও বিআরটিএ (Travel)',
    nameEn: 'Travel, Railway & BRTA',
    icon: 'Car',
    color: 'from-teal-500 to-emerald-600',
    description: 'ট্রেন টিকিট, বিমান টিকিট, ড্রাইভিং লাইসেন্স ও বিআরটিএ'
  },
  {
    id: 'photo',
    nameBn: 'ফটো এডিটিং ও ডিজাইন (Photo)',
    nameEn: 'Photo Editing & Design',
    icon: 'Camera',
    color: 'from-pink-500 to-rose-600',
    description: 'ব্যাকগ্রাউন্ড রিমুভ, ফটো রিসাইজার, ক্যানভা ও বাংলা ফন্ট'
  },
  {
    id: 'tools',
    nameBn: 'ডকুমেন্ট ও আইটি টুলস (Tools)',
    nameEn: 'Document, PDF & IT Tools',
    icon: 'Wrench',
    color: 'from-cyan-500 to-teal-600',
    description: 'PDF টুলস, স্পিড টেস্ট, টাইপিং টেস্ট ও ক্লাউড ড্রাইভ'
  }
];

export const INITIAL_CURATED_LINKS: LinkItem[] = [
  // ─── ১. জাতীয় পরিচয়পত্র ও ভোটার সেবা (NID) ────────────────────────────────
  {
    id: 'nid-1',
    title: 'জাতীয় পরিচয়পত্র তথ্য সংশোধন',
    url: 'https://services.nidw.gov.bd',
    category: 'nid',
    badge: 'GOVT',
    description: 'ভোটার আইডি কার্ডের নাম, জন্ম তারিখ বা অন্যান্য ভুল সংশোধন আবেদন',
    tags: ['nid', 'correction', 'voter', 'election', 'shongshodhon'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 1000,
    updatedAt: Date.now() - 1000,
  },
  {
    id: 'nid-2',
    title: 'পরিচয় ভেরিফিকেশন (Porichoy)',
    url: 'https://porichoy.gov.bd',
    category: 'nid',
    badge: 'POPULAR',
    description: 'জাতীয় পরিচয়পত্র তথ্য অটোমেটিক ও রিয়েলটাইম ভেরিফাই করার পোর্টাল',
    tags: ['porichoy', 'nid', 'verify', 'kyc'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 2000,
    updatedAt: Date.now() - 2000,
  },
  {
    id: 'nid-3',
    title: 'ভোটার স্লিপ দিয়ে ভোটার আইডি কার্ড',
    url: 'https://services.nidw.gov.bd',
    category: 'nid',
    badge: 'VIP',
    description: 'নতুন ভোটারদের স্লিপ নম্বর ও জন্ম তারিখ দিয়ে অনলাইন NID কার্ড ডাউনলোড',
    tags: ['nid', 'slip', 'download', 'voter'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 3000,
    updatedAt: Date.now() - 3000,
  },
  {
    id: 'nid-4',
    title: 'ভোটার তালিকা ভেরিফাই করার সফটওয়্যার',
    url: 'https://services.nidw.gov.bd',
    category: 'nid',
    badge: 'FAST',
    description: 'ভোটার তালিকায় নাম ও ভোটার নম্বর আছে কিনা যাচাই করুন',
    tags: ['voter', 'list', 'verify', 'nid'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 4000,
    updatedAt: Date.now() - 4000,
  },
  {
    id: 'nid-5',
    title: 'ভোটার তথ্য জানার এসএমএস পদ্ধতি',
    url: 'https://services.nidw.gov.bd',
    category: 'nid',
    badge: 'FREE',
    description: 'মোবাইল থেকে 105 এ এসএমএস পাঠিয়ে ভোটার নম্বর বের করার নিয়ম',
    tags: ['sms', '105', 'voter', 'number'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 5000,
    updatedAt: Date.now() - 5000,
  },
  {
    id: 'nid-6',
    title: 'ভোটার আইডি কার্ড সংশোধন আবেদন',
    url: 'https://services.nidw.gov.bd/nid-pub/claim-account',
    category: 'nid',
    badge: 'GOVT',
    description: 'অনলাইনে একাউন্ট রেজিস্টার করে NID কার্ড সংশোধনের ফি ও আবেদন',
    tags: ['nid', 'account', 'claim', 'apply'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 6000,
    updatedAt: Date.now() - 6000,
  },
  {
    id: 'nid-7',
    title: 'ভোটার নাম্বার বের করার নিয়ম',
    url: 'https://services.nidw.gov.bd',
    category: 'nid',
    badge: 'FAST',
    description: 'জাতীয় পরিচয়পত্র নম্বর বা স্লিপ দিয়ে ভোটার সিরিয়াল বের করুন',
    tags: ['voter', 'serial', 'number'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 7000,
    updatedAt: Date.now() - 7000,
  },
  {
    id: 'nid-8',
    title: 'ভোটার স্থানান্তর আবেদন',
    url: 'https://services.nidw.gov.bd',
    category: 'nid',
    badge: 'GOVT',
    description: 'এক এলাকা থেকে অন্য এলাকায় ভোটার এলাকা পরিবর্তনের আবেদন',
    tags: ['voter', 'transfer', 'sthanantor'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 8000,
    updatedAt: Date.now() - 8000,
  },
  {
    id: 'nid-9',
    title: 'ভোটার তথ্য হালনাগাদ',
    url: 'https://services.nidw.gov.bd',
    category: 'nid',
    badge: 'GOVT',
    description: 'ভোটার তালিকার তথ্য আপডেট ও রিভাইজ করার পোর্টাল',
    tags: ['voter', 'update', 'halnagad'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 9000,
    updatedAt: Date.now() - 9000,
  },
  {
    id: 'nid-10',
    title: 'জাতীয় পরিচয়পত্র পুনঃমুদ্রণ (Reissue)',
    url: 'https://services.nidw.gov.bd',
    category: 'nid',
    badge: 'POPULAR',
    description: 'হারিয়ে যাওয়া বা নষ্ট হওয়া NID কার্ড পুনরায় তোলার আবেদন',
    tags: ['nid', 'reissue', 'lost', 'print'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 10000,
    updatedAt: Date.now() - 10000,
  },
  {
    id: 'nid-11',
    title: 'ডুপ্লিকেট ভোটার আইডি কার্ড ডাউনলোড',
    url: 'https://services.nidw.gov.bd',
    category: 'nid',
    badge: 'FAST',
    description: 'অনলাইন কপি বা ডুপ্লিকেট NID ডাউনলোড পোর্টাল',
    tags: ['nid', 'duplicate', 'download'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 11000,
    updatedAt: Date.now() - 11000,
  },

  // ─── ২. জন্ম ও মৃত্যু নিবন্ধন (BDRIS) ──────────────────────────────────────
  {
    id: 'birth-1',
    title: 'জন্ম নিবন্ধন চেক (Birth Check)',
    url: 'https://everify.bdris.gov.bd',
    category: 'birth',
    badge: 'FREE',
    description: '১৭ ডিজিটের জন্ম নিবন্ধন নম্বর ও জন্ম তারিখ দিয়ে তথ্য যাচাই',
    tags: ['birth', 'check', 'verify', 'jonmo'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 12000,
    updatedAt: Date.now() - 12000,
  },
  {
    id: 'birth-2',
    title: 'জন্ম ও মৃত্যু নিবন্ধন পোর্টাল (BDRIS)',
    url: 'https://bdris.gov.bd',
    category: 'birth',
    badge: 'GOVT',
    description: 'বাংলাদেশ সরকারের কেন্দ্রীয় জন্ম ও মৃত্যু নিবন্ধন সেবা বাতায়ন',
    tags: ['bdris', 'birth', 'death', 'jonmo'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 13000,
    updatedAt: Date.now() - 13000,
  },
  {
    id: 'birth-3',
    title: 'জন্ম সনদ সংশোধন আবেদন',
    url: 'https://bdris.gov.bd/br/correction',
    category: 'birth',
    badge: 'GOVT',
    description: 'জন্ম সনদের নাম, পিতামাতার নাম বা তথ্য সংশোধনের অনলাইন আবেদন',
    tags: ['birth', 'correction', 'shongshodhon'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 14000,
    updatedAt: Date.now() - 14000,
  },
  {
    id: 'birth-4',
    title: 'নতুন জন্ম নিবন্ধন আবেদন',
    url: 'https://bdris.gov.bd/br/application',
    category: 'birth',
    badge: 'FREE',
    description: 'অনলাইনে নতুন জন্ম সনদের জন্য সরাসরি আবেদন ফরম পূরণ',
    tags: ['birth', 'new', 'application', 'apply'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 15000,
    updatedAt: Date.now() - 15000,
  },
  {
    id: 'birth-5',
    title: 'মৃত্যু নিবন্ধন আবেদন',
    url: 'https://bdris.gov.bd/dr/application',
    category: 'birth',
    badge: 'FREE',
    description: 'অনলাইনে মৃত্যু সনদের জন্য আবেদন ফরম পূরণ ও সাবমিট',
    tags: ['death', 'mrittu', 'registration', 'apply'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 16000,
    updatedAt: Date.now() - 16000,
  },
  {
    id: 'birth-6',
    title: 'অনলাইন জন্ম নিবন্ধন যাচাই (everify)',
    url: 'https://everify.bdris.gov.bd',
    category: 'birth',
    badge: 'FAST',
    description: 'কাস্টমারের জন্ম নিবন্ধন প্রিন্ট বা কিউআর কোড যাচাই করার লিঙ্ক',
    tags: ['everify', 'birth', 'qr', 'print'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 17000,
    updatedAt: Date.now() - 17000,
  },

  // ─── ৩. পাসপোর্ট ও ভিসা সেবা (Passport & Visa) ──────────────────────────────
  {
    id: 'pp-1',
    title: 'বাংলাদেশ ই-পাসপোর্ট পোর্টাল (e-Passport)',
    url: 'https://www.epassport.gov.bd',
    category: 'passport',
    badge: 'GOVT',
    description: 'অনলাইনে ই-পাসপোর্ট আবেদন, স্লিপ প্রিন্ট ও অফিসিয়াল নির্দেশনা',
    tags: ['passport', 'epassport', 'apply', 'bangladesh'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 18000,
    updatedAt: Date.now() - 18000,
  },
  {
    id: 'pp-2',
    title: 'পাসপোর্ট আবেদন (Online Apply)',
    url: 'https://www.epassport.gov.bd/onboarding',
    category: 'passport',
    badge: 'POPULAR',
    description: 'নতুন পাসপোর্টের সরাসরি স্টেপ-বাই-স্টেপ অনলাইন আবেদন',
    tags: ['passport', 'apply', 'onboarding'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 19000,
    updatedAt: Date.now() - 19000,
  },
  {
    id: 'pp-3',
    title: 'পাসপোর্ট ফি পেমেন্ট চালান (A-Challan)',
    url: 'https://www.epassport.gov.bd/instructions/passport-fees',
    category: 'passport',
    badge: 'FAST',
    description: '৪৮ পৃষ্ঠা ও ৬৪ পৃষ্ঠার পাসপোর্ট ফি সরকারি চালান কোড ও তালিকা',
    tags: ['passport', 'fees', 'challan', 'payment'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 20000,
    updatedAt: Date.now() - 20000,
  },
  {
    id: 'pp-4',
    title: 'পাসপোর্ট অ্যাপ্লিকেশন স্ট্যাটাস ট্র্যাকার',
    url: 'https://www.epassport.gov.bd/authorization/application-status',
    category: 'passport',
    badge: 'FREE',
    description: 'ডেলিভারি স্লিপ নম্বর দিয়ে পাসপোর্ট রেডি হয়েছে কিনা চেক করুন',
    tags: ['passport', 'status', 'track', 'delivery'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 21000,
    updatedAt: Date.now() - 21000,
  },
  {
    id: 'pp-5',
    title: 'পাসপোর্ট সংশোধন ও রি-ইস্যু',
    url: 'https://www.epassport.gov.bd',
    category: 'passport',
    badge: 'GOVT',
    description: 'মেয়াদোত্তীর্ণ বা হারানো পাসপোর্টের পুনঃইস্যু আবেদন পোর্টাল',
    tags: ['passport', 'reissue', 'renew', 'correction'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 22000,
    updatedAt: Date.now() - 22000,
  },
  {
    id: 'pp-6',
    title: 'পাসপোর্ট ভেরিফিকেশন',
    url: 'https://www.epassport.gov.bd',
    category: 'passport',
    badge: 'FAST',
    description: 'পাসপোর্টের সঠিকতা ও পুলিশ ভেরিফিকেশন স্ট্যাটাস যাচাই',
    tags: ['passport', 'verification', 'police'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 23000,
    updatedAt: Date.now() - 23000,
  },
  {
    id: 'pp-7',
    title: 'ভারতীয় ভিসা আবেদন ও ই-টোকেন (IVAC)',
    url: 'https://ivacbd.com',
    category: 'passport',
    badge: 'VIP',
    description: 'ইন্ডিয়ান ভিসা এপ্লিকেশন সেন্টার (IVAC) স্লট বুকিং ও ই-টোকেন',
    tags: ['indian', 'visa', 'ivac', 'token', 'appointment'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 24000,
    updatedAt: Date.now() - 24000,
  },
  {
    id: 'pp-8',
    title: 'ইন্ডিয়ান ভিসা আবেদন ফরম (Online Form)',
    url: 'https://indianvisaonline.gov.in',
    category: 'passport',
    badge: 'FREE',
    description: 'ভারত সরকারের অফিসিয়াল অনলাইন ভিসা আবেদন ফরম পূরণ',
    tags: ['indian', 'visa', 'form', 'apply'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 25000,
    updatedAt: Date.now() - 25000,
  },
  {
    id: 'pp-9',
    title: 'ইন্ডিয়ান ভিসা ট্র্যাকিং (IVAC Status)',
    url: 'https://ivacbd.com/Track-Application',
    category: 'passport',
    badge: 'FAST',
    description: 'পাসপোর্ট ডেলিভারির জন্য তৈরি হয়েছে কিনা অনলাইনে ট্র্যাক করুন',
    tags: ['ivac', 'track', 'visa', 'status'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 26000,
    updatedAt: Date.now() - 26000,
  },
  {
    id: 'pp-10',
    title: 'ভিসা চেক (সকল দেশ VFS Global)',
    url: 'https://www.vfsglobal.com',
    category: 'passport',
    badge: 'FREE',
    description: 'দুবাই, কাতার, মালয়েশিয়া, ইউকে ও ইউরোপের ভিসা স্ট্যাটাস চেক',
    tags: ['visa', 'vfs', 'dubai', 'malaysia', 'check'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 27000,
    updatedAt: Date.now() - 27000,
  },
  {
    id: 'pp-11',
    title: 'হজ্ব ও ওমরাহ নিবন্ধন পোর্টাল',
    url: 'https://hajj.gov.bd',
    category: 'passport',
    badge: 'GOVT',
    description: 'ধর্ম বিষয়ক মন্ত্রণালয়ের সরকারি ও বেসরকারি হজ্ব/ওমরাহ নিবন্ধন',
    tags: ['hajj', 'omrah', 'pilgrim', 'registration'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 28000,
    updatedAt: Date.now() - 28000,
  },
  {
    id: 'pp-12',
    title: 'বিএমইটি ম্যানপাওয়ার ও স্মার্ট কার্ড (Ami Probashi)',
    url: 'https://bmet.gov.bd',
    category: 'passport',
    badge: 'GOVT',
    description: 'প্রবাসী কর্মীদের বিএমইটি স্মার্ট কার্ড যাচাই ও জনশক্তি নিবন্ধন',
    tags: ['bmet', 'smartcard', 'manpower', 'probashi'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 29000,
    updatedAt: Date.now() - 29000,
  },

  // ─── ৪. ভূমি, পর্চা ও নামজারি (Land & Mutation) ─────────────────────────────
  {
    id: 'land-1',
    title: 'নামজারী বা খারিজ আবেদন (Mutation)',
    url: 'https://mutation.land.gov.bd',
    category: 'land',
    badge: 'GOVT',
    description: 'অনলাইনে ই-নামজারী আবেদন, ট্র্যাকিং ও ডিসিআর ফি পেমেন্ট',
    tags: ['mutation', 'namjari', 'khariz', 'land', 'dcr'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 30000,
    updatedAt: Date.now() - 30000,
  },
  {
    id: 'land-2',
    title: 'ভূমি উন্নয়ন কর (LD Tax)',
    url: 'https://ldtax.gov.bd',
    category: 'land',
    badge: 'GOVT',
    description: 'অনলাইনে জমির খাজনা ও ভূমি উন্নয়ন কর প্রদান ও দাখিলা রশিদ প্রিন্ট',
    tags: ['ldtax', 'khajna', 'dakhila', 'land', 'tax'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 31000,
    updatedAt: Date.now() - 31000,
  },
  {
    id: 'land-3',
    title: 'খতিয়ান বা পর্চা চেক (ePorcha)',
    url: 'https://eporcha.gov.bd',
    category: 'land',
    badge: 'POPULAR',
    description: 'CS, SA, RS, BS ও সিটি জরিপের খতিয়ান অনুসন্ধান ও আবেদন',
    tags: ['khatian', 'porcha', 'eporcha', 'rs', 'cs', 'bs'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 32000,
    updatedAt: Date.now() - 32000,
  },
  {
    id: 'land-4',
    title: 'ভুমি সংক্রান্ত সেবা পোর্টাল (Minland)',
    url: 'https://minland.gov.bd',
    category: 'land',
    badge: 'FREE',
    description: 'ভূমি মন্ত্রণালয়ের সকল নাগরিক সেবা, আইন ও পরিপত্রের সংগ্রহ',
    tags: ['minland', 'land', 'portal', 'laws'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 33000,
    updatedAt: Date.now() - 33000,
  },
  {
    id: 'land-5',
    title: 'ভূমি উন্নয়ন কর ক্যালকুলেটর ও রশিদ',
    url: 'https://ldtax.gov.bd',
    category: 'land',
    badge: 'FAST',
    description: 'জমির পরিমাণ অনুযায়ী কত টাকা কর আসবে তা হিসাব ও যাচাই',
    tags: ['ldtax', 'calculator', 'roshid'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 34000,
    updatedAt: Date.now() - 34000,
  },
  {
    id: 'land-6',
    title: 'ভূমি রেকর্ড ও জরিপ অধিদপ্তর (DLRS)',
    url: 'https://dlrs.gov.bd',
    category: 'land',
    badge: 'GOVT',
    description: 'ডিজিটাল জরিপ রেকর্ড ও জেলাওয়ারি ভূমি রেকর্ড তথ্য',
    tags: ['dlrs', 'survey', 'record'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 35000,
    updatedAt: Date.now() - 35000,
  },
  {
    id: 'land-7',
    title: 'ভূমি সংক্রান্ত মামলা ও আপিল পোর্টাল',
    url: 'https://land.gov.bd',
    category: 'land',
    badge: 'GOVT',
    description: 'ভূমি আপিল বোর্ড ও ল্যান্ড ট্রাইব্যুনাল মামলার অবস্থা',
    tags: ['land', 'appeal', 'case', 'court'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 36000,
    updatedAt: Date.now() - 36000,
  },
  {
    id: 'land-8',
    title: 'ভূমি মৌজা ম্যাপ ও নকশা প্রিন্ট',
    url: 'https://eporcha.gov.bd',
    category: 'land',
    badge: 'VIP',
    description: 'মৌজা ম্যাপের সার্টিফাইড কপির আবেদন ও অনলাইনে ম্যাপ দর্শন',
    tags: ['mouza', 'map', 'noksha', 'eporcha'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 37000,
    updatedAt: Date.now() - 37000,
  },

  // ─── ৫. শিক্ষা, ভর্তি ও ফলাফল (Education & Admission) ────────────────────────
  {
    id: 'edu-1',
    title: 'SSC ও HSC পরীক্ষার ফলাফল মার্কশীট সহ',
    url: 'https://eboardresults.com',
    category: 'education',
    badge: 'FAST',
    description: 'JSC, SSC, HSC ও সমমানের বোর্ড পরীক্ষার বিস্তারিত মার্কশিট রেজাল্ট',
    tags: ['result', 'ssc', 'hsc', 'board', 'marksheet', 'eboard'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 38000,
    updatedAt: Date.now() - 38000,
  },
  {
    id: 'edu-2',
    title: 'জাতীয় বিশ্ববিদ্যালয়ের ভর্তি (NU Admission)',
    url: 'https://app1.nu.edu.bd',
    category: 'education',
    badge: 'POPULAR',
    description: 'অনার্স, ডিগ্রি, মাস্টার্স ও প্রফেশনাল কোর্সের অনলাইন ভর্তি ফরম পূরণ',
    tags: ['nu', 'admission', 'honours', 'degree', 'masters'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 39000,
    updatedAt: Date.now() - 39000,
  },
  {
    id: 'edu-3',
    title: 'জাতীয় বিশ্ববিদ্যালয় রেজাল্ট (NU Results)',
    url: 'https://www.nu.ac.bd/results',
    category: 'education',
    badge: 'FAST',
    description: 'অনার্স সকল বর্ষ ও ডিগ্রি পরীক্ষার রেজাল্ট ও গ্রেডিং পয়েন্ট',
    tags: ['nu', 'result', 'honours', 'gpa'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 40000,
    updatedAt: Date.now() - 40000,
  },
  {
    id: 'edu-4',
    title: 'জাতীয় বিশ্ববিদ্যালয় মার্কশিট ও ট্রান্সক্রিপ্ট',
    url: 'https://www.nu.ac.bd',
    category: 'education',
    badge: 'VIP',
    description: 'অরিজিনাল ট্রান্সক্রিপ্ট, সাময়িক সনদ ও নম্বরপত্রের অনলাইন আবেদন',
    tags: ['nu', 'transcript', 'marksheet', 'certificate'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 41000,
    updatedAt: Date.now() - 41000,
  },
  {
    id: 'edu-5',
    title: 'জাতীয় বিশ্ববিদ্যালয়ের পরীক্ষার রুটিন ও ফরম ফিলাপ',
    url: 'https://www.nu.ac.bd',
    category: 'education',
    badge: 'FREE',
    description: 'অনার্স ও ডিগ্রি পরীক্ষার সময়সূচি ও সোনালী সেবার মাধ্যমে ফরম ফিলাপ',
    tags: ['nu', 'routine', 'formfillup'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 42000,
    updatedAt: Date.now() - 42000,
  },
  {
    id: 'edu-6',
    title: 'জাতীয় বিশ্ববিদ্যালয় সনদ সংশোধন',
    url: 'https://www.nu.ac.bd',
    category: 'education',
    badge: 'GOVT',
    description: 'নাম বা তথ্য সংশোধনের জন্য অনলাইনে ই-সার্ভিস আবেদন',
    tags: ['nu', 'correction', 'shongshodhon'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 43000,
    updatedAt: Date.now() - 43000,
  },
  {
    id: 'edu-7',
    title: 'উন্মুক্ত বিশ্ববিদ্যালয় ভর্তি আবেদন (BOU OSAPS)',
    url: 'https://osapsnew.bou.ac.bd',
    category: 'education',
    badge: 'POPULAR',
    description: 'বাউবি এসএসসি, এইচএসসি, বিএ/বিএসএস ও মাস্টার্স অনলাইন ভর্তি',
    tags: ['bou', 'osaps', 'open', 'university', 'admission'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 44000,
    updatedAt: Date.now() - 44000,
  },
  {
    id: 'edu-8',
    title: 'উন্মুক্ত বিশ্ববিদ্যালয় রেজাল্ট (BOU Result)',
    url: 'https://www.bou.ac.bd/result',
    category: 'education',
    badge: 'FAST',
    description: 'উন্মুক্ত বিশ্ববিদ্যালয়ের সকল প্রোগ্রামের সেমিস্টার ফলাফল',
    tags: ['bou', 'result', 'exam'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 45000,
    updatedAt: Date.now() - 45000,
  },
  {
    id: 'edu-9',
    title: 'উন্মুক্ত বিশ্ববিদ্যালয় সংশোধনী ও স্কুল ভর্তি',
    url: 'https://www.bou.ac.bd',
    category: 'education',
    badge: 'GOVT',
    description: 'সার্টিফিকেট সংশোধন, নাম পরিবর্তন ও ওপেন স্কুল রুটিন',
    tags: ['bou', 'school', 'correction'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 46000,
    updatedAt: Date.now() - 46000,
  },
  {
    id: 'edu-10',
    title: 'কারিগরি শিক্ষা বোর্ড ফলাফল (BTEB Results)',
    url: 'http://btebresult.gov.bd',
    category: 'education',
    badge: 'FAST',
    description: 'পলিটেকনিক ডিপ্লোমা ইন ইঞ্জিনিয়ারিং ও টেক্সটাইল রেজাল্ট',
    tags: ['bteb', 'polytechnic', 'diploma', 'result'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 47000,
    updatedAt: Date.now() - 47000,
  },
  {
    id: 'edu-11',
    title: 'পলিটেকনিক ফরম ফিলাপ ও এডমিট কার্ড',
    url: 'http://www.bteb.gov.bd',
    category: 'education',
    badge: 'GOVT',
    description: 'কারিগরি শিক্ষা বোর্ডের সেমিস্টার ফরম পূরণ ও প্রবেশপত্র ডাউনলোড',
    tags: ['bteb', 'formfillup', 'admit'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 48000,
    updatedAt: Date.now() - 48000,
  },
  {
    id: 'edu-12',
    title: 'কারিগরি শিক্ষা বোর্ডের সনদ সংশোধন',
    url: 'http://www.bteb.gov.bd',
    category: 'education',
    badge: 'GOVT',
    description: 'ডিপ্লোমা সার্টিফিকেটের ভুল সংশোধন ও ডুপ্লিকেট সনদ আবেদন',
    tags: ['bteb', 'certificate', 'correction'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 49000,
    updatedAt: Date.now() - 49000,
  },
  {
    id: 'edu-13',
    title: 'প্রাথমিক শিক্ষা সমাপনী রেজাল্ট (DPE)',
    url: 'https://dpe.gov.bd',
    category: 'education',
    badge: 'FREE',
    description: 'প্রাথমিক সমাপনী ও ইবতেদায়ী পরীক্ষার ফলাফল ও বৃত্তি তালিকা',
    tags: ['dpe', 'primary', 'result'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 50000,
    updatedAt: Date.now() - 50000,
  },
  {
    id: 'edu-14',
    title: 'মাদ্রাসা শিক্ষা বোর্ড ফলাফল (BMEB)',
    url: 'http://bmeb.ebmeb.gov.bd',
    category: 'education',
    badge: 'FAST',
    description: 'দাখিল ও আলিম পরীক্ষার ফলাফল ও রেজিস্ট্রেশন বাতায়ন',
    tags: ['madrasah', 'dakhil', 'alim', 'result'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 51000,
    updatedAt: Date.now() - 51000,
  },
  {
    id: 'edu-15',
    title: 'ঢাকা শিক্ষা বোর্ড ই-সেবা ও সনদ সংশোধন',
    url: 'https://dhakaeducationboard.gov.bd',
    category: 'education',
    badge: 'GOVT',
    description: 'নাম ও বয়স সংশোধন, ডুপ্লিকেট সার্টিফিকেট ও কলেজ ট্রান্সফার (TC)',
    tags: ['dhaka', 'board', 'eservice', 'tc'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 52000,
    updatedAt: Date.now() - 52000,
  },
  {
    id: 'edu-16',
    title: 'বিএসসি ইঞ্জিনিয়ারিং গুচ্ছ ভর্তি (CKRUET)',
    url: 'https://ckruet.ac.bd',
    category: 'education',
    badge: 'POPULAR',
    description: 'চুয়েট, কুয়েট ও রুয়েট সমন্বিত প্রকৌশল ভর্তি পরীক্ষার পোর্টাল',
    tags: ['ckruet', 'cuet', 'kuet', 'ruet', 'admission'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 53000,
    updatedAt: Date.now() - 53000,
  },

  // ─── ৬. চাকরি, পুলিশ ও ভাতা (Jobs & Govt) ──────────────────────────────────
  {
    id: 'job-1',
    title: 'সরকারি চাকরির আবেদন (Teletalk All Jobs)',
    url: 'https://alljobs.teletalk.com.bd',
    category: 'jobs',
    badge: 'POPULAR',
    description: 'সকল সরকারি চাকরির অনলাইন আবেদন ও ফি পেমেন্ট সার্কুলার পোর্টাল',
    tags: ['jobs', 'teletalk', 'circular', 'apply', 'chittagong', 'dhaka'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 54000,
    updatedAt: Date.now() - 54000,
  },
  {
    id: 'job-2',
    title: 'বিসিএস আবেদন পোর্টাল (BPSC Teletalk)',
    url: 'https://bpsc.teletalk.com.bd',
    category: 'jobs',
    badge: 'GOVT',
    description: 'বাংলাদেশ সরকারি কর্ম কমিশন (BPSC) ও বিসিএস পরীক্ষার অনলাইন আবেদন',
    tags: ['bcs', 'bpsc', 'teletalk', 'cadre'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 55000,
    updatedAt: Date.now() - 55000,
  },
  {
    id: 'job-3',
    title: 'প্রাথমিক শিক্ষক নিয়োগ আবেদন (DPE Teletalk)',
    url: 'https://dpe.teletalk.com.bd',
    category: 'jobs',
    badge: 'POPULAR',
    description: 'সরকারি প্রাথমিক বিদ্যালয়ের সহকারী শিক্ষক নিয়োগ আবেদন ও এডমিট',
    tags: ['dpe', 'primary', 'teacher', 'teletalk'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 56000,
    updatedAt: Date.now() - 56000,
  },
  {
    id: 'job-4',
    title: 'সরকারি চাকরি প্রবেশপত্র ডাউনলোড (Admit Card)',
    url: 'https://alljobs.teletalk.com.bd',
    category: 'jobs',
    badge: 'FAST',
    description: 'User ID ও Password দিয়ে চাকরির পরীক্ষার এডমিট কার্ড প্রিন্ট',
    tags: ['admit', 'card', 'teletalk', 'download'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 57000,
    updatedAt: Date.now() - 57000,
  },
  {
    id: 'job-5',
    title: 'পুলিশ ক্লিয়ারেন্স আবেদন (Police Clearance)',
    url: 'https://pcc.police.gov.bd/ords/r/pcc/pcc/home',
    category: 'jobs',
    badge: 'GOVT',
    description: 'বিদেশ গমন বা পাসপোর্টের জন্য পুলিশ ক্লিয়ারেন্স সার্টিফিকেটের অনলাইন আবেদন',
    tags: ['police', 'clearance', 'pcc', 'passport'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 58000,
    updatedAt: Date.now() - 58000,
  },
  {
    id: 'job-6',
    title: 'সাইবার ক্রাইম অনলাইন রিপোর্ট (Police)',
    url: 'https://police.gov.bd',
    category: 'jobs',
    badge: 'FREE',
    description: 'অনলাইনে প্রতারণা, ফেসবুক হ্যাকিং বা সাইবার অপরাধের অভিযোগ',
    tags: ['cyber', 'police', 'report', 'crime'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 59000,
    updatedAt: Date.now() - 59000,
  },
  {
    id: 'job-7',
    title: 'সুপ্রিম কোর্টের মামলা মোশন ও কজলিস্ট',
    url: 'https://supremecourt.gov.bd',
    category: 'jobs',
    badge: 'GOVT',
    description: 'বাংলাদেশ সুপ্রিম কোর্টের দৈনিক কার্যতালিকা ও মামলার ফলাফল',
    tags: ['court', 'supremecourt', 'causelist', 'case'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 60000,
    updatedAt: Date.now() - 60000,
  },
  {
    id: 'job-8',
    title: 'মুক্তিযোদ্ধা ভাতা চেক ও আবেদন (MIS)',
    url: 'https://mis.molwa.gov.bd',
    category: 'jobs',
    badge: 'GOVT',
    description: 'মুক্তিযুদ্ধ বিষয়ক মন্ত্রণালয়ের ভাতাভোগী তালিকা ও সনদ যাচাই',
    tags: ['muktidjoddha', 'bhata', 'mis', 'molwa'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 61000,
    updatedAt: Date.now() - 61000,
  },
  {
    id: 'job-9',
    title: 'প্রতিবন্ধী ও বয়স্ক ভাতা আবেদন (Subidha)',
    url: 'https://bhata.gov.bd',
    category: 'jobs',
    badge: 'FREE',
    description: 'সমাজসেবা অধিদপ্তরের সামাজিক নিরাপত্তা বেষ্টনীর অনলাইন ভাতা আবেদন',
    tags: ['bhata', 'social', 'oldage', 'disability'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 62000,
    updatedAt: Date.now() - 62000,
  },
  {
    id: 'job-10',
    title: 'খাদ্য বান্ধব কর্মসূচি আবেদন (DG Food)',
    url: 'https://dgfood.gov.bd',
    category: 'jobs',
    badge: 'GOVT',
    description: 'খাদ্য অধিদপ্তর রেশন কার্ড ও চাল সহায়তা তালিকা আবেদন',
    tags: ['food', 'ration', 'dgfood'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 63000,
    updatedAt: Date.now() - 63000,
  },
  {
    id: 'job-11',
    title: 'ই-ট্রেড লাইসেন্স আবেদন (e-Trade License)',
    url: 'https://etradelicense.gov.bd',
    category: 'jobs',
    badge: 'GOVT',
    description: 'অনলাইনে নতুন ব্যবসার ট্রেড লাইসেন্স আবেদন ও নবায়ন',
    tags: ['trade', 'license', 'business', 'city'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 64000,
    updatedAt: Date.now() - 64000,
  },
  {
    id: 'job-12',
    title: 'কৃষি ও যুব ঋণ আবেদন ও তথ্য বাতায়ন',
    url: 'https://krishi.gov.bd',
    category: 'jobs',
    badge: 'FREE',
    description: 'কৃষি সম্প্রসারণ অধিদপ্তর ও যুব উন্নয়ন অধিদপ্তরের প্রশিক্ষণ তথ্য',
    tags: ['krishi', 'youth', 'training', 'loan'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 65000,
    updatedAt: Date.now() - 65000,
  },
  {
    id: 'job-13',
    title: 'টিকা কার্ড ডাউনলোড (সুরক্ষা Surokkha)',
    url: 'https://smarthealthbd.dghs.gov.bd/epi-card-download',
    category: 'jobs',
    badge: 'FAST',
    description: 'করোনা ও অন্যান্য সরকারি ভ্যাকসিন সার্টিফিকেট ও টিকা কার্ড প্রিন্ট',
    tags: ['surokkha', 'vaccine', 'card', 'covid'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 66000,
    updatedAt: Date.now() - 66000,
  },

  // ─── ৭. চালান ও বিল পেমেন্ট (Challan & Bills) ───────────────────────────────
  {
    id: 'pay-1',
    title: 'সরকারি অটোমেটেড চালান পেমেন্ট (A-Challan)',
    url: 'https://achalan.gov.bd',
    category: 'challan',
    badge: 'VIP',
    description: 'পাসপোর্ট, এনআইডি, ড্রাইভিং লাইসেন্স ও সরকারি ট্রেজারি চালান প্রদান',
    tags: ['achalan', 'challan', 'treasury', 'sonali', 'bkash'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 67000,
    updatedAt: Date.now() - 67000,
  },
  {
    id: 'pay-2',
    title: 'সোনালী ই-সেবা চালান পোর্টাল (Sonali e-Sheba)',
    url: 'https://sblesheba.sonalibank.com.bd',
    category: 'challan',
    badge: 'POPULAR',
    description: 'সোনালী ব্যাংক এ-চালান, বিশ্ববিদ্যালয় ফি ও বোর্ড চালান পরিশোধ',
    tags: ['sonali', 'esheba', 'challan', 'bank'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 68000,
    updatedAt: Date.now() - 68000,
  },
  {
    id: 'pay-3',
    title: 'সোনালী ব্যাংকে চালানের টাকা প্রদান ও একাউন্ট',
    url: 'https://www.sonalibank.com.bd',
    category: 'challan',
    badge: 'FAST',
    description: 'সোনালী ব্যাংক অনলাইন ব্যাংকিং, ই-ওয়ালেট ও সরকারি লেনদেন',
    tags: ['sonali', 'bank', 'online', 'account'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 69000,
    updatedAt: Date.now() - 69000,
  },
  {
    id: 'pay-4',
    title: 'রূপালী ব্যাংকে চালান পেমেন্ট',
    url: 'https://rupalibank.com.bd',
    category: 'challan',
    badge: 'GOVT',
    description: 'রূপালী ব্যাংকের মাধ্যমে সরকারি বিল ও চালান জমা দেওয়ার পোর্টাল',
    tags: ['rupali', 'bank', 'challan'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 70000,
    updatedAt: Date.now() - 70000,
  },
  {
    id: 'pay-5',
    title: 'পল্লী বিদ্যুৎ বিল চেক ও নতুন সংযোগ (REB)',
    url: 'http://rebpbs.org',
    category: 'challan',
    badge: 'FAST',
    description: 'পল্লী বিদ্যুৎ সমিতি মিটার বিল চেক, নতুন সংযোগ আবেদন ও পেমেন্ট',
    tags: ['reb', 'palli', 'bidyut', 'electricity', 'meter'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 71000,
    updatedAt: Date.now() - 71000,
  },
  {
    id: 'pay-6',
    title: 'বিদ্যুৎ বিল পরিশোধ ও ক্যালকুলেটর (DESCO / DPDC)',
    url: 'https://dpdc.org.bd',
    category: 'challan',
    badge: 'FREE',
    description: 'ডেসকো, ডিপিডিসি ও নেসকো প্রিপেইড/পোস্টপেইড বিদ্যুৎ বিল ও টোকেন',
    tags: ['desco', 'dpdc', 'electricity', 'prepaid', 'token'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 72000,
    updatedAt: Date.now() - 72000,
  },
  {
    id: 'pay-7',
    title: 'গ্যাস বিল পরিশোধ ও চেক (Titas Gas)',
    url: 'https://titasgas.org.bd',
    category: 'challan',
    badge: 'FREE',
    description: 'তিতাস গ্যাস, জালালাবাদ ও বাখরাবাদ গ্যাস বিল ট্র্যাকিং',
    tags: ['gas', 'titas', 'bill'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 73000,
    updatedAt: Date.now() - 73000,
  },
  {
    id: 'pay-8',
    title: 'জাতীয় রাজস্ব বোর্ড (NBR e-TIN ও ট্যাক্স রিটার্ন)',
    url: 'https://incometax.gov.bd',
    category: 'challan',
    badge: 'GOVT',
    description: 'অনলাইন ই-টিন সার্টিফিকেট তৈরি ও বাৎসরিক আয়কর রিটার্ন দাখিল',
    tags: ['tin', 'tax', 'nbr', 'income', 'return'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 74000,
    updatedAt: Date.now() - 74000,
  },
  {
    id: 'pay-9',
    title: 'কাস্টমস ভ্যাট ও ট্যাক্স প্রদান (NBR e-VAT)',
    url: 'https://etaxnbr.gov.bd',
    category: 'challan',
    badge: 'GOVT',
    description: 'ব্যবসায়িক ভ্যাট চালান ও ট্যাক্স চালান জমাদানের পোর্টাল',
    tags: ['vat', 'customs', 'nbr', 'tax'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 75000,
    updatedAt: Date.now() - 75000,
  },
  {
    id: 'pay-10',
    title: 'বাংলাদেশ ডাক বিভাগ ও ডাক জীবন বীমা (PLI)',
    url: 'https://postoffice.gov.bd',
    category: 'challan',
    badge: 'FREE',
    description: 'রেজিস্ট্রি চিঠি, পার্সেল ট্র্যাকিং ও পোস্টাল ইন্স্যুরেন্স সেবা',
    tags: ['post', 'postoffice', 'pli', 'parcel'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 76000,
    updatedAt: Date.now() - 76000,
  },

  // ─── ৮. ট্রেন, বিমান ও বিআরটিএ (Travel & Tickets) ───────────────────────────
  {
    id: 'trv-1',
    title: 'বাংলাদেশ রেলওয়ে ট্রেনের টিকিট বুকিং (e-Ticket)',
    url: 'https://eticket.railway.gov.bd',
    category: 'travel',
    badge: 'POPULAR',
    description: 'অনলাইনে ট্রেনের সিট বুকিং, টিকিট ক্রয় ও প্রিন্ট পোর্টাল',
    tags: ['train', 'railway', 'ticket', 'seat', 'booking', 'eticket'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 77000,
    updatedAt: Date.now() - 77000,
  },
  {
    id: 'trv-2',
    title: 'ট্রেনের টিকিট বাতিল ও অনলাইন রিফান্ড',
    url: 'https://eticket.railway.gov.bd',
    category: 'travel',
    badge: 'FAST',
    description: 'অনলাইনে কেনা টিকিট বাতিল করে বিকাশ বা ব্যাংকে রিফান্ড পাওয়ার পদ্ধতি',
    tags: ['train', 'refund', 'cancel'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 78000,
    updatedAt: Date.now() - 78000,
  },
  {
    id: 'trv-3',
    title: 'বিমান বাংলাদেশ এয়ারলাইন্স টিকিট বুকিং',
    url: 'https://www.biman-airlines.com',
    category: 'travel',
    badge: 'POPULAR',
    description: 'অভ্যন্তরীণ ও আন্তর্জাতিক বিমানের ফ্লাইট শিডিউল ও টিকিট বুকিং',
    tags: ['flight', 'biman', 'airlines', 'ticket'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 79000,
    updatedAt: Date.now() - 79000,
  },
  {
    id: 'trv-4',
    title: 'বিআরটিএ সেবা বাতায়ন (BRTA BSP)',
    url: 'https://bsp.brta.gov.bd',
    category: 'travel',
    badge: 'GOVT',
    description: 'লার্নার ড্রাইভিং লাইসেন্স, স্মার্টকার্ড লাইসেন্স ও ট্যাক্স টোকেন',
    tags: ['brta', 'bsp', 'driving', 'license', 'token'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 80000,
    updatedAt: Date.now() - 80000,
  },
  {
    id: 'trv-5',
    title: 'ড্রাইভিং লাইসেন্স আবেদন ও ফি পেমেন্ট',
    url: 'https://bsp.brta.gov.bd',
    category: 'travel',
    badge: 'POPULAR',
    description: 'অনলাইনে মেডিকেল সার্টিফিকেট ও লার্নার লাইসেন্স আবেদন ফরম',
    tags: ['brta', 'learner', 'license', 'apply'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 81000,
    updatedAt: Date.now() - 81000,
  },
  {
    id: 'trv-6',
    title: 'ড্রাইভিং লাইসেন্স পরীক্ষার রেজাল্ট ও ট্র্যাকিং',
    url: 'https://brta.gov.bd',
    category: 'travel',
    badge: 'FAST',
    description: 'লিখিত, মৌখিক ও প্র্যাকটিকাল পরীক্ষার ফলাফল এবং লাইসেন্স ডেলিভারি চেক',
    tags: ['brta', 'result', 'status', 'test'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 82000,
    updatedAt: Date.now() - 82000,
  },
  {
    id: 'trv-7',
    title: 'গাড়ি রেজিস্ট্রেশন ও মালিকানা পরিবর্তন',
    url: 'https://bsp.brta.gov.bd',
    category: 'travel',
    badge: 'GOVT',
    description: 'মোটরসাইকেল ও গাড়ির মালিকানা বদল ও ডিজিটাল নম্বর প্লেট',
    tags: ['vehicle', 'registration', 'bike', 'car'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 83000,
    updatedAt: Date.now() - 83000,
  },

  // ─── ৯. ফটো এডিটিং ও ডিজাইন (Photo & Design) ──────────────────────────────
  {
    id: 'pho-1',
    title: 'Remove.bg (ব্যাকগ্রাউন্ড রিমুভার)',
    url: 'https://www.remove.bg',
    category: 'photo',
    badge: 'FAST',
    description: '১-ক্লিকে যেকোনো ছবির ব্যাকগ্রাউন্ড স্বয়ংক্রিয়ভাবে রিমুভ করুন',
    tags: ['bg-remove', 'photo', 'cutout', 'transparent'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 84000,
    updatedAt: Date.now() - 84000,
  },
  {
    id: 'pho-2',
    title: 'Canva (গ্রাফিক ডিজাইন ও ব্যানার)',
    url: 'https://www.canva.com',
    category: 'photo',
    badge: 'POPULAR',
    description: 'ভিজিটিং কার্ড, ব্যানার, পোস্টার ও সার্টিফিকেট ডিজাইন মেকার',
    tags: ['design', 'poster', 'card', 'banner', 'canva'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 85000,
    updatedAt: Date.now() - 85000,
  },
  {
    id: 'pho-3',
    title: 'Photopea (অনলাইন ফটোশপ)',
    url: 'https://www.photopea.com',
    category: 'photo',
    badge: 'FREE',
    description: 'ব্রাউজারেই সম্পূর্ণ ফটোশপের মতো PSD ফাইল ও ছবি এডিটিং',
    tags: ['photoshop', 'psd', 'editor', 'layers'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 86000,
    updatedAt: Date.now() - 86000,
  },
  {
    id: 'pho-4',
    title: 'ক্লিয়ার ভিউ / VanceAI Photo Enhancer',
    url: 'https://vanceai.com',
    category: 'photo',
    badge: 'VIP',
    description: 'পুরোনো বা ঘোলা ছবি হাই-রেজোলিউশন ও ক্লিয়ার করার AI টুল',
    tags: ['ai', 'enhance', 'upscale', 'clarity', 'face'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 87000,
    updatedAt: Date.now() - 87000,
  },
  {
    id: 'pho-5',
    title: 'TinyPNG (ইমেজ সাইজ কমান)',
    url: 'https://tinypng.com',
    category: 'photo',
    badge: 'FAST',
    description: 'ছবির মান নিখুঁত রেখে ফাইল সাইজ (MB থেকে KB) ছোট করুন',
    tags: ['compress', 'resize', 'optimize', 'png', 'jpg'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 88000,
    updatedAt: Date.now() - 88000,
  },
  {
    id: 'pho-6',
    title: 'PSD Coverter to JPG (অনলাইন কনভার্টার)',
    url: 'https://www.photopea.com',
    category: 'photo',
    badge: 'FREE',
    description: 'ফটোশপ পিএসডি ফাইল সরাসরি জেপিজি বা পিএনজিতে রূপান্তর',
    tags: ['psd', 'jpg', 'converter', 'export'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 89000,
    updatedAt: Date.now() - 89000,
  },
  {
    id: 'pho-7',
    title: 'ফটো রিসাইজার ও ক্রপ টুল (ReduceImages)',
    url: 'https://www.reduceimages.com',
    category: 'photo',
    badge: 'FREE',
    description: 'অনলাইনে ছবির পিক্সেল (যেমন ৩০০x৩০০ বা ১০০ KB) নির্দিষ্ট করা',
    tags: ['resizer', 'crop', 'pixel', 'dimensions'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 90000,
    updatedAt: Date.now() - 90000,
  },
  {
    id: 'pho-8',
    title: 'বাংলা ফন্ট ডাউনলোড (লিপিঘর Lipighor)',
    url: 'https://lipighor.com',
    category: 'photo',
    badge: 'POPULAR',
    description: 'ব্যানার ও পোস্টার ডিজাইনের জন্য সেরা স্টাইলিশ বাংলা ফন্ট',
    tags: ['fonts', 'bangla', 'lipighor', 'typography'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 91000,
    updatedAt: Date.now() - 91000,
  },

  // ─── ১০. ডকুমেন্ট ও আইটি টুলস (Tools & IT) ─────────────────────────────────
  {
    id: 'tool-1',
    title: 'iLovePDF (অল-ইন-ওয়ান PDF টুল)',
    url: 'https://www.ilovepdf.com',
    category: 'tools',
    badge: 'FAST',
    description: 'PDF মার্জ, স্প্লিট, কম্প্রেস, ওয়ার্ড থেকে PDF ও আনলক টুল',
    tags: ['pdf', 'merge', 'split', 'compress', 'convert'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 92000,
    updatedAt: Date.now() - 92000,
  },
  {
    id: 'tool-2',
    title: 'SmallPDF (PDF কনভার্টার)',
    url: 'https://smallpdf.com',
    category: 'tools',
    badge: 'POPULAR',
    description: 'PDF ফাইল সহজে এডিট ও মাইক্রোসফট ওয়ার্ডে রূপান্তর করার সেরা টুল',
    tags: ['pdf', 'word', 'excel', 'converter'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 93000,
    updatedAt: Date.now() - 93000,
  },
  {
    id: 'tool-3',
    title: 'Google Translate (অনুবাদ)',
    url: 'https://translate.google.com',
    category: 'tools',
    badge: 'FREE',
    description: 'যেকোনো ইংরেজি ডকুমেন্ট বা বাক্য বাংলায় নিখুঁত অনুবাদ করুন',
    tags: ['translate', 'bangla', 'english', 'language'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 94000,
    updatedAt: Date.now() - 94000,
  },
  {
    id: 'tool-4',
    title: 'Online OCR (ছবি থেকে লেখা বের করা)',
    url: 'https://www.onlineocr.net',
    category: 'tools',
    badge: 'FREE',
    description: 'স্ক্যান করা ছবি বা ডকুমেন্ট থেকে সরাসরি টেক্সট ওয়ার্ডে কনভার্ট',
    tags: ['ocr', 'text', 'extract', 'scan'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 95000,
    updatedAt: Date.now() - 95000,
  },
  {
    id: 'tool-5',
    title: 'Novoresume (পেশাদার CV মেকার)',
    url: 'https://novoresume.com',
    category: 'tools',
    badge: 'FREE',
    description: 'কাস্টমারদের জন্য সুন্দর আধুনিক বায়োডাটা / রেজুমে তৈরি করুন',
    tags: ['cv', 'resume', 'job', 'biodata'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 96000,
    updatedAt: Date.now() - 96000,
  },
  {
    id: 'tool-6',
    title: 'Fast.com (ইন্টারনেট স্পিড টেস্ট)',
    url: 'https://fast.com',
    category: 'tools',
    badge: 'FAST',
    description: 'দোকানের ইন্টারনেটের আসল ডাউনলোড ও আপলোড স্পিড দেখুন',
    tags: ['speed', 'internet', 'bandwidth', 'wifi'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 97000,
    updatedAt: Date.now() - 97000,
  },
  {
    id: 'tool-7',
    title: 'Speedtest by Ookla',
    url: 'https://www.speedtest.net',
    category: 'tools',
    badge: 'FREE',
    description: 'পিং, জিটার ও ব্যান্ডউইথ নিখুঁতভাবে পরীক্ষা করুন',
    tags: ['speed', 'ping', 'isp', 'ookla'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 98000,
    updatedAt: Date.now() - 98000,
  },
  {
    id: 'tool-8',
    title: '10FastFingers (টাইপিং স্পিড টেস্ট)',
    url: 'https://10fastfingers.com',
    category: 'tools',
    badge: 'FREE',
    description: 'বাংলা ও ইংরেজি টাইপিং গতি পরীক্ষা ও অনুশীলন করুন',
    tags: ['typing', 'practice', 'wpm', 'speed'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 99000,
    updatedAt: Date.now() - 99000,
  },
  {
    id: 'tool-9',
    title: 'Google Drive (ক্লাউড স্টোরেজ)',
    url: 'https://drive.google.com',
    category: 'tools',
    badge: 'POPULAR',
    description: 'কাস্টমারের ফাইল ও দোকানের ডেটা নিরাপদে ক্লাউডে ব্যাকআপ রাখুন',
    tags: ['drive', 'cloud', 'backup', 'storage'],
    isFavorite: true,
    clicksCount: 0,
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000,
  },
  {
    id: 'tool-10',
    title: 'WeTransfer (বড় ফাইল পাঠানো)',
    url: 'https://wetransfer.com',
    category: 'tools',
    badge: 'FREE',
    description: 'ইমেইলে না যাওয়া ২GB পর্যন্ত বড় ফাইল বা ভিডিও সহজে পাঠান',
    tags: ['transfer', 'share', 'files', 'upload'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 101000,
    updatedAt: Date.now() - 101000,
  },
  {
    id: 'tool-11',
    title: 'QR Code Generator (অনলাইন QR কোড)',
    url: 'https://www.qr-code-generator.com',
    category: 'tools',
    badge: 'FREE',
    description: 'বিকাশ, নগদ, ওয়েবসাইট বা তথ্যের জন্য সুন্দর QR কোড বানান',
    tags: ['qr', 'qrcode', 'scan', 'bkash', 'nagad'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 102000,
    updatedAt: Date.now() - 102000,
  },
  {
    id: 'tool-12',
    title: 'Barcode Generator (অনলাইন বারকোড)',
    url: 'https://barcode.tec-it.com',
    category: 'tools',
    badge: 'FREE',
    description: 'প্রোডাক্ট লেবেল ও চালানের জন্য ফ্রি বারকোড তৈরি করুন',
    tags: ['barcode', 'code128', 'ean', 'label'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 103000,
    updatedAt: Date.now() - 103000,
  },
  {
    id: 'tool-13',
    title: 'Time.is (সঠিক সময় ও তারিখ)',
    url: 'https://time.is/Dhaka',
    category: 'tools',
    badge: 'FREE',
    description: 'বাংলাদেশ ও যেকোনো দেশের সেকেন্ডসহ নিখুঁত সময় যাচাই করুন',
    tags: ['time', 'clock', 'date', 'dhaka'],
    isFavorite: false,
    clicksCount: 0,
    createdAt: Date.now() - 104000,
    updatedAt: Date.now() - 104000,
  }
];

class LinkService {
  /**
   * Load all links from persistent storage, initializing with curated defaults.
   * Auto-migrates from v1 to v2 so all 90+ links appear automatically!
   */
  public getAllLinks(): LinkItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // If v1 exists, merge user created links with the expanded v2 curated links
        const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyStored) {
          try {
            const legacyParsed: LinkItem[] = JSON.parse(legacyStored);
            const defaultUrls = new Set(INITIAL_CURATED_LINKS.map(l => l.url.toLowerCase()));
            const userAdded = legacyParsed.filter(l => !defaultUrls.has(l.url.toLowerCase()));
            const combined = [...userAdded, ...INITIAL_CURATED_LINKS];
            this.saveAllLinks(combined);
            return combined;
          } catch {
            // fallback
          }
        }

        // Fresh install: save all curated links
        this.saveAllLinks(INITIAL_CURATED_LINKS);
        return [...INITIAL_CURATED_LINKS];
      }

      const parsed: LinkItem[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }

      this.saveAllLinks(INITIAL_CURATED_LINKS);
      return [...INITIAL_CURATED_LINKS];
    } catch (err) {
      console.warn('[LinkService] Failed to load links from localStorage:', err);
      return [...INITIAL_CURATED_LINKS];
    }
  }

  /**
   * Save all links to persistent storage.
   */
  private saveAllLinks(links: LinkItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('printhub:links-updated', { detail: links }));
      }
    } catch (err) {
      console.error('[LinkService] Failed to save links to localStorage:', err);
    }
  }

  /**
   * Add a new link item.
   */
  public addLink(link: Omit<LinkItem, 'id' | 'createdAt' | 'updatedAt' | 'clicksCount'>): LinkItem {
    const links = this.getAllLinks();
    const formattedUrl = this.normalizeUrl(link.url);

    const newLink: LinkItem = {
      ...link,
      id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      url: formattedUrl,
      clicksCount: 0,
      badge: link.badge || 'NEW',
      isFavorite: link.isFavorite ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [newLink, ...links];
    this.saveAllLinks(updated);
    return newLink;
  }

  /**
   * Update an existing link item.
   */
  public updateLink(id: string, updates: Partial<Omit<LinkItem, 'id' | 'createdAt'>>): LinkItem | null {
    const links = this.getAllLinks();
    const index = links.findIndex(l => l.id === id);
    if (index === -1) return null;

    const current = links[index];
    const formattedUrl = updates.url ? this.normalizeUrl(updates.url) : current.url;

    const updatedItem: LinkItem = {
      ...current,
      ...updates,
      url: formattedUrl,
      updatedAt: Date.now(),
    };

    links[index] = updatedItem;
    this.saveAllLinks(links);
    return updatedItem;
  }

  /**
   * Delete a link item by ID.
   */
  public deleteLink(id: string): boolean {
    const links = this.getAllLinks();
    const filtered = links.filter(l => l.id !== id);
    if (filtered.length === links.length) return false;
    this.saveAllLinks(filtered);
    return true;
  }

  /**
   * Toggle favorite / pinned status for a link.
   */
  public toggleFavorite(id: string): boolean {
    const links = this.getAllLinks();
    const item = links.find(l => l.id === id);
    if (!item) return false;
    item.isFavorite = !item.isFavorite;
    item.updatedAt = Date.now();
    this.saveAllLinks(links);
    return item.isFavorite;
  }

  /**
   * Track click count for popularity ranking.
   */
  public trackClick(id: string): void {
    const links = this.getAllLinks();
    const item = links.find(l => l.id === id);
    if (item) {
      item.clicksCount = (item.clicksCount || 0) + 1;
      this.saveAllLinks(links);
    }
  }

  /**
   * Reset all links back to factory default curated list.
   */
  public resetToDefault(): LinkItem[] {
    this.saveAllLinks(INITIAL_CURATED_LINKS);
    return [...INITIAL_CURATED_LINKS];
  }

  /**
   * Export all links as a downloadable JSON backup.
   */
  public exportLinksJSON(): void {
    const links = this.getAllLinks();
    const dataStr = JSON.stringify(links, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PrintHub_Links_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import links from a JSON string or parsed array.
   */
  public importLinksJSON(jsonString: string, mode: 'merge' | 'replace' = 'merge'): { success: boolean; count: number; error?: string } {
    try {
      const imported = JSON.parse(jsonString);
      if (!Array.isArray(imported)) {
        return { success: false, count: 0, error: 'Invalid file format: must be an array of links.' };
      }

      const validLinks: LinkItem[] = imported.filter(item => item && item.title && item.url).map(item => ({
        id: item.id || `link-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title: String(item.title).trim(),
        url: this.normalizeUrl(String(item.url)),
        category: item.category || 'tools',
        badge: item.badge || undefined,
        description: item.description || '',
        tags: Array.isArray(item.tags) ? item.tags : [],
        isFavorite: Boolean(item.isFavorite),
        clicksCount: Number(item.clicksCount) || 0,
        createdAt: Number(item.createdAt) || Date.now(),
        updatedAt: Date.now(),
      }));

      if (validLinks.length === 0) {
        return { success: false, count: 0, error: 'No valid link records found in file.' };
      }

      if (mode === 'replace') {
        this.saveAllLinks(validLinks);
        return { success: true, count: validLinks.length };
      } else {
        const currentLinks = this.getAllLinks();
        const existingUrls = new Set(currentLinks.map(l => l.url.toLowerCase()));
        const newUniqueLinks = validLinks.filter(l => !existingUrls.has(l.url.toLowerCase()));
        const merged = [...newUniqueLinks, ...currentLinks];
        this.saveAllLinks(merged);
        return { success: true, count: newUniqueLinks.length };
      }
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || 'Failed to parse JSON file' };
    }
  }

  /**
   * Helper to normalize URL (ensure http/https prefix).
   */
  public normalizeUrl(url: string): string {
    let trimmed = url.trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = `https://${trimmed}`;
    }
    return trimmed;
  }

  /**
   * Helper to extract domain from URL for badges / favicons.
   */
  public getDomain(url: string): string {
    try {
      const parsed = new URL(this.normalizeUrl(url));
      return parsed.hostname.replace(/^www\./i, '');
    } catch {
      return url;
    }
  }

  /**
   * Open the link in default browser.
   */
  public openLink(url: string, id?: string): void {
    if (id) {
      this.trackClick(id);
    }
    const cleanUrl = this.normalizeUrl(url);
    if (!cleanUrl) return;

    window.open(cleanUrl, '_blank', 'noopener,noreferrer');
  }
}

export const linkService = new LinkService();
