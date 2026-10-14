/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// ============================================================================
// Demo Data Seeder — builds a RICH, REALISTIC dataset that exercises EVERY
// feature of the app. Runs AFTER seedUsers.js (which creates the base users,
// companies, canned responses, KB starters and tickets 0016-0025).
//
//   node seedDemo.js
//
// Coverage map (what this seed enables you to test):
//   • Users: admin/agent/user roles, suspended login block, unverified email
//     banner/gate, job details (jobTitle/department/phone), notification prefs
//   • Companies: active + inactive (Costa), phones/notes
//   • Tickets (25): every status x priority combo, all 5 categories, all 7
//     products, assigned + unassigned (agent queue), team routing
//     (Network/Hardware/Software), email-sourced ticket, Arabic + English
//     content, Arabic tags, adminNote (staff-only), rich audit history
//     (incl. a REOPENED ticket), spread over 10 days (dashboard charts)
//   • SLA states: healthy / breaching-soon (3 tickets) / breached (2 tickets)
//   • CSAT: ratings 5,5,4,4,4,3,3,2 + resolved-unrated + closed-unrated
//   • Comments: public conversations, agent INTERNAL notes, an EDITED comment
//   • Attachments: real files on disk (PNG screenshots + error log .txt)
//     streamed through the authenticated endpoint (image preview + download)
//   • KB: 6 new articles (AR+EN, draft included) + view/helpful stats on all
//   • Canned responses: +4 (AR + EN)
//   • Notifications: unread badges for every role, read + unread mix
//   • Counter synced so UI-created tickets continue at TKT-2026-0041+
//
// Idempotent: safe to re-run — tickets are upserted by number, comments for
// demo tickets are rebuilt, notifications/tickets/companies are skip-if-exists.
// ============================================================================

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const User = require("./models/User");
const Ticket = require("./models/Ticket");
const Company = require("./models/Company");
const CannedResponse = require("./models/CannedResponse");
const KBArticle = require("./models/KBArticle");
const Comment = require("./models/Comment");
const Notification = require("./models/Notification");
const Counter = require("./models/Counter");
const { slugify } = require("./controller/kbController");
const slaPolicyService = require("./services/slaPolicyService");
const env = require("./config/env");

const NOW = Date.now();

// ---------------------------------------------------------------------------
// 1. USERS — new demo users + enrichment for existing seeded users
// ---------------------------------------------------------------------------
const DEMO_PASSWORD = "Demo@1234";

const newUsers = [
  { name: "Nour Sabry", email: "nour.sabry@example.com", role: "agent", team: "Software",
    jobTitle: "Support Engineer", department: "Technical Support", phone: "+20 100 555 0141" },
  { name: "Tarek Mostafa", email: "tarek.mostafa@example.com", role: "agent", team: "Network",
    jobTitle: "Network Engineer", department: "Technical Support", phone: "+20 100 555 0142" },
  { name: "Mona Adel", email: "mona.adel@example.com", role: "user",
    jobTitle: "Cashier Supervisor", department: "Operations", phone: "+20 122 555 0151",
    notificationPrefs: { ticketCreated: true, ticketAssigned: false, ticketStatusChanged: true, ticketCommented: true, slaBreaching: true } },
  { name: "Hossam Ali", email: "hossam.ali@example.com", role: "user",
    jobTitle: "Store Manager", department: "Operations", phone: "+20 122 555 0152" },
  // UNVERIFIED email — proves the verify-email banner + (optionally) the gate
  { name: "Dina Hassan", email: "dina.hassan@example.com", role: "user",
    jobTitle: "Accountant", department: "Finance", unverified: true },
  // SUSPENDED — proves the suspended-login block; his historical ticket stays
  // visible to staff (data-retention realism)
  { name: "Samir Fathi", email: "samir.suspended@example.com", role: "user", suspended: true },
];

const userEnrichment = {
  "agent.laila@example.com": { jobTitle: "Senior Support Engineer", department: "Technical Support", phone: "+20 100 555 0101" },
  "agent.karim@example.com": { jobTitle: "Hardware Specialist", department: "Technical Support", phone: "+20 100 555 0102" },
  "omar.khaled@example.com": { jobTitle: "Branch Cashier", department: "Operations", phone: "+20 122 555 0103",
    notificationPrefs: { ticketCreated: true, ticketAssigned: true, ticketStatusChanged: true, ticketCommented: false, slaBreaching: true } },
  "ahmed.hassan@example.com": { jobTitle: "Inventory Clerk", department: "Operations" },
  "sara.mohamed@example.com": { jobTitle: "CRM Specialist", department: "Marketing" },
};

// ---------------------------------------------------------------------------
// 2. COMPANIES — new + enrichment for existing
// ---------------------------------------------------------------------------
const newCompanies = [
  { name: "Papa John's", contactName: "Area Manager", email: "area@papajohns.example.com",
    phone: "+20 2 3456 7890", notes: "14 branches across Cairo & Giza. E-Invoice rollout in progress.", active: true },
  { name: "Hardee's", contactName: "Regional IT", email: "it@hardees.example.com",
    phone: "+20 2 3456 7891", notes: "Breakfast peak 8-11 AM — schedule terminal maintenance after 11:30.", active: true },
  { name: "Costa Coffee", contactName: "Franchise Owner", email: "owner@costa.example.com",
    phone: "+20 2 3456 7892", notes: "Contract paused — 2 branches closed for renovation.", active: false },
];

const companyEnrichment = {
  "KFC": { phone: "+20 2 2345 6789", notes: "Flagship account since 2023 — 22 branches." },
  "Subway": { phone: "+20 2 2345 6790" },
  "Starbucks": { phone: "+20 2 2345 6791" },
};

// ---------------------------------------------------------------------------
// 3. CANNED RESPONSES — +4 (bilingual)
// ---------------------------------------------------------------------------
const newCannedResponses = [
  { title: "POS password reset (on-site steps)", category: "software",
    content: "On the POS login screen press Ctrl+Alt+R, enter the supervisor PIN, then set the new cashier PIN twice. The change applies immediately — no restart needed. If the supervisor PIN is also lost, reply with the branch name and we will reset it centrally within 15 minutes." },
  { title: "إعادة تعيين كلمة مرور الكاشير", category: "access",
    content: "يمكن لمدير الفرع إعادة تعيين كلمة مرور الكاشير من شاشة تسجيل الدخول عبر خيار «نسيت كلمة المرور؟». في حال تعذر الوصول لبريد المدير، أرسل لنا اسم الفرع ورقم الكاشير وسنقوم بإعادة التعيين مركزيًا خلال ربع ساعة." },
  { title: "Network switch port checklist", category: "network",
    content: "Before dispatching a technician: (1) note the switch ID and port number from the ticket, (2) ask the branch to try a known-good cable and port, (3) check the switch dashboard for the port's error counters. If the port is flapping, move the terminal to a spare port and log the change on the ticket." },
  { title: "شكرًا على تقييمك", category: "general",
    content: "شكرًا لك على تقييمك وملاحظاتك. نعمل باستمرار على تحسين جودة الدعم، ويسعدنا تواصلك معنا في أي وقت." },
];

// ---------------------------------------------------------------------------
// 4. KB ARTICLES — 6 new (incl. 1 DRAFT for admin-only view) + stats for the
//    5 seeded starters. Counts are seeded WITHOUT voter ledger entries, so
//    every fresh user can still cast the first vote (count keeps climbing).
// ---------------------------------------------------------------------------
const newKbArticles = [
  {
    title: "دليل استخدام نظام نقاط البيع POS",
    excerpt: "شرح كامل لشاشات الكاشير: بدء الوردية، البيع السريع، المرتجعات، وإغلاق الدرج.",
    content: "نظام نقاط البيع مصمم ليعمل بأقل عدد من النقرات خلال ذروة العمل. لبدء الوردية ادخل ببطاقتك أو بمعرفك ثم اضغط «بدء وردية»، وسيُفتح الدرج تلقائيًا للتسليم والاستلام. في شاشة البيع السريع اضغط على صورة الصنف مباشرة لإضافته للفاتورة، واضغط مطولًا لتعديل الكمية أو حذف الصنف. للمرتجعات اضغط «مرتجع» من القائمة الجانبية ثم امسح باركود الفاتورة الأصلية أو أدخل رقمها يدويًا، ولا تنسَ اختيار سبب الإرجاع لأنه يظهر في تقارير الفرع اليومية. عند إغلاق الوردية يطالبك النظام بجرد الدرج؛ أدخل المبلغ الفعلي وسيحسب الفرق تلقائيًا، وإن تجاوز الفرق الحد المسموح فستُنشأ ملاحظة لمدير الفرع تلقائيًا. في حال توقف أي شاشة عن الاستجابة جرّب التحديث بمفتاح F5 أولًا، فإن لم يُفد أعد تشغيل التطبيق من أيقونة سطح المكتب — بيانات الوردية محفوظة لحظيًا ولا تُفقد بإعادة التشغيل.",
    category: "software", tags: ["pos", "كاشير", "وردية"],
    published: true, viewCount: 128, helpfulCount: 14, notHelpfulCount: 1, authorKey: "admin",
  },
  {
    title: "خطوات إعداد الفاتورة الإلكترونية لأول مرة",
    excerpt: "تفعيل الفاتورة الإلكترونية لفرع جديد خلال خمس خطوات، من التسجيل الضريبي حتى أول فاتورة.",
    content: "إعداد الفاتورة الإلكترونية لفرع جديد يستغرق عادة أقل من ساعة بشرط اكتمال المستندات. أولًا تأكد من تفعيل خدمة الفاتورة على الحساب الضريبي للشركة عبر بوابة مصلحة الضرائب، فبدونها لن تقبل المنصة أي طلب ربط. ثانيًا أرسل لفريق الدعم رقم السجل الضريبي للفرع واسمه القانوني كما هو مسجل، وأي اختلاف في حرف واحد يوقف الربط. ثالثًا سيتولى الفريق إنشاء شهادة التوقيع الإلكتروني للفرع وتسليمك ملف التفعيل. رابعًا من شاشة الإعدادات في نظام نقاط البيع اختر «الفاتورة الإلكترونية» ثم امسح باركود ملف التفعيل المرسل إليك. خامسًا اطبع فاتورة تجريبية بقيمة جنيه واحد للتأكد من ظهور رمز الاستجابة السريعة والتوقيع. إن ظهرت رسالة «السجل غير مطابق» فراجع الخطوة الثانية؛ أما رسالة «الشهادة منتهية» فتعني أن شهادة التوقيع تجاوزت ثلاث سنوات ويجب تجديدها.",
    category: "software", tags: ["فاتورة", "ضريبة", "إعداد"],
    published: true, viewCount: 86, helpfulCount: 9, notHelpfulCount: 0, authorKey: "nour",
  },
  {
    title: "Wi-Fi Keeps Disconnecting",
    excerpt: "Fix intermittent Wi-Fi drops on POS terminals: channel overlap, adapter power saving, and AP firmware.",
    content: "Intermittent Wi-Fi drops are almost always caused by one of three things. First, channel overlap: in malls several access networks broadcast on the same 2.4 GHz channel, so ask IT to survey the branch and lock your access point to a clean channel (1, 6, or 11) instead of auto. Second, adapter power saving: Windows turns the Wi-Fi adapter into a low-power state during idle periods, and some budget adapters fail to wake reliably — open Device Manager, find the adapter's Power Management tab, and uncheck \"Allow the computer to turn off this device\". Third, outdated access-point firmware: old firmware on crowded networks leaks memory until radios reset themselves; schedule a firmware update after branch hours. To diagnose which case you have, note the exact times of three consecutive drops and compare them with the access point's event log — a matching restart entry confirms the firmware case. If drops persist after all three fixes, open a network ticket mentioning the branch, terminal ID, and the drop timestamps you collected.",
    category: "network", tags: ["wifi", "disconnect", "pos"],
    published: true, viewCount: 210, helpfulCount: 31, notHelpfulCount: 3, authorKey: "admin",
  },
  {
    title: "Requesting New Hardware",
    excerpt: "How to request replacement hardware — what to include so the ticket clears approval in one round.",
    content: "Hardware requests are approved fastest when the ticket answers the reviewer's questions in advance. Include: (1) the exact device and model you are requesting, or write \"equivalent\" if you don't have a preference; (2) the reason — replacement of a failed unit (attach the error photo) versus a new position; (3) the branch name and the terminal or desk it will serve; (4) the business impact of not having it, one sentence is enough. Requests for a failed unit are auto-approved during business hours once the error evidence is attached. New-position requests need your area manager's approval, so add their email in the ticket so the approval request reaches them directly. All hardware ships with next-business-day delivery inside Greater Cairo and 48 hours elsewhere. When the device arrives, reply on the same ticket with a photo of it installed — that closes the loop and starts the 12-month warranty clock.",
    category: "hardware", tags: ["hardware", "request", "warranty"],
    published: true, viewCount: 54, helpfulCount: 6, notHelpfulCount: 2, authorKey: "nour",
  },
  {
    title: "فهم أولويات التذاكر واتفاقية مستوى الخدمة",
    excerpt: "ماذا تعني الأولويات الأربع، وما مهلة الاستجابة المحددة لكل منها، ومتى تتجاوز التذكرة الاتفاقية.",
    content: "نظام الأولويات مبني على أثر المشكلة على تشغيل الفرع لا على حدة الوصف. الأولوية المنخفضة تعني مشكلة لا تعيق البيع اليومي مثل طلب استفسار أو تحسين شكلي، ومهلتها 72 ساعة. الأولوية المتوسطة تعني خللًا يوجد حل بديل يدويًا له، مثل توقف تقرير جانبي ما دام البيع يعمل من شاشة أخرى، ومهلتها 48 ساعة. الأولوية العالية تعني توقف جزئيًا يؤثر على الخدمة مثل تعطل قارئ البطاقات مع وجود كاشير بديل، ومهلتها 24 ساعة. الأولوية العاجلة تعني توقفًا كاملًا عن البيع في الفرع، ومهلتها 4 ساعات فقط. تبدأ المهلة من لحظة إنشاء التذكرة لا من لحظة تعيينها، ولذلك تُرفع أولوية أي تذكرة تنتظر في الطابور دون تعيين تلقائيًا في تقرير المشرف. عند قرب انتهاء المهلة بساعة واحدة يرسل النظام تنبيهًا للفريق المختص، وعند تجاوزها تُعلَّم التذكرة باللون الأحمر وتُحسب ضمن نسبة الالتزام في لوحة المتابعة. إن شعرت أن أولوية تذكرتك خاطئة فاذكر في تعليق واحد أثر المشكلة على المبيعات وسيُعاد التقييم خلال ربع ساعة.",
    category: "other", tags: ["sla", "أولويات", "سياسة"],
    published: true, viewCount: 175, helpfulCount: 22, notHelpfulCount: 0, authorKey: "admin",
  },
  {
    // DRAFT — admin sees it in the KB management list; regular users never do
    title: "مسودة: دليل الترقية للإصدار 4.2 من نظام المخزون",
    excerpt: "مسودة داخلية — لم تُنشر بعد.",
    content: "هذه مسودة داخلية لخطوات ترقية نظام إدارة المخزون إلى الإصدار 4.2. خطوات الترقية: نسخة احتياطية كاملة، إيقاف المزامنة، تشغيل حزمة الترقية على الخادم الرئيسي ثم الخوادم الفرعية، إعادة تشغيل خدمة المزامنة، والتحقق من تطبيق أرصدة الأصناف. سيُكمل الدليل قبل الإصدار الرسمي المقرر الربع القادم، وتُحجب الصفحة عن الفروع حتى اعتماد إدارة العمليات النهائي.",
    category: "software", tags: ["ترقية", "مخزون", "مسودة"],
    published: false, viewCount: 0, helpfulCount: 0, notHelpfulCount: 0, authorKey: "admin",
  },
];

// Stats back-fill for the 5 seeded starter articles (keyed by TITLE —
// slug is computed at runtime with the same slugify the app uses)
const kbStatsEnrichment = {
  "كيفية إعادة تعيين كلمة المرور": { viewCount: 95, helpfulCount: 12, notHelpfulCount: 1 },
  "حل مشاكل الاتصال بالشبكة": { viewCount: 140, helpfulCount: 18, notHelpfulCount: 2 },
  "طلب صلاحيات جديدة على الأنظمة": { viewCount: 60, helpfulCount: 7, notHelpfulCount: 0 },
  "Printer Troubleshooting Guide": { viewCount: 210, helpfulCount: 26, notHelpfulCount: 3 },
  "Email Setup on Mobile": { viewCount: 78, helpfulCount: 9, notHelpfulCount: 1 },
};

// ---------------------------------------------------------------------------
// 5. TICKETS — 25 total. Specs 0016-0025 ENRICH the seedUsers tickets (same
// employee/company/product, plus subject/history/SLA/CSAT/comments); specs
// 0026-0040 are new. All times are offsets from "now" so SLA states stay
// correct whenever the seed runs.
//
// Spec fields:
//   history: [action, byRole, offsetMin(from create), extra?]  (byRole:
//   "user"=creator, "agent"=assignee, "admin"=jameel admin)
//   comments: [{by, afterMin, text, internal?, editedAfterMin?}]
//   csat: {rating, comment, afterMin} | "unratedResolved" | "unratedClosed"
//   slaBreached: true → overdue marker (due date is derived from policy)
// ---------------------------------------------------------------------------
const M = 60e3; // one minute
const H = 60 * M; // one hour
const D = 24 * H; // one day

const ticketSpecs = [
  // ---- ENRICH the 10 seedUsers tickets -----------------------------------
  {
    num: "TKT-2026-0016", employee: "Andrew Ehab", company: "Pizza Hut", product: "E-Receipt",
    subject: "Email receipt template misaligned on mobile screens",
    description: "Email receipt template alignment broken on mobile screens. Customers report the receipt layout shifts to the left and the barcode image does not load on small screens.",
    category: "software", priority: "low", status: "closed", assignee: "agent.laila@example.com",
    createdAgo: 9 * D, firstResponseMin: 25, resolveMin: 1440, closeMin: 1620,
    history: [["created", "user", 0], ["assigned", "admin", 12], ["status_changed", "agent", 40, { field: "status", oldValue: "open", newValue: "in-progress" }], ["commented", "user", 50], ["status_changed", "agent", 1440, { field: "status", oldValue: "in-progress", newValue: "resolved" }], ["status_changed", "user", 1620, { field: "status", oldValue: "resolved", newValue: "closed" }], ["csat_rated", "user", 1700]],
    comments: [
      { by: "user", afterMin: 50, text: "القالب بيظهر مكسور على الموبايل بعد آخر تحديث — جربنا على آيفيف وأندرويد ونفس المشكلة." },
      { by: "agent", afterMin: 80, text: "شكرًا على التوضيح. رصدنا المشكلة في قالب البريد وسيصل تحديث للفروع خلال ساعات." },
    ],
    csat: { rating: 2, comment: "للأسف المشكلة عادت بعد يومين، والدعم استغرق وقتًا طويلاً في الرد.", afterMin: 1700 },
  },
  {
    num: "TKT-2026-0017", employee: "Andrew Ehab", company: "Burger King", product: "E-Invoice",
    subject: "Portal session expires during invoice upload",
    description: "Portal session expires prematurely during invoice upload — after about two minutes the upload aborts and returns the user to the login screen, losing all entered data.",
    category: "access", priority: "medium", status: "resolved", assignee: "nour.sabry@example.com",
    createdAgo: 5 * D, firstResponseMin: 55, resolveMin: 2880,
    history: [["created", "user", 0], ["assigned", "admin", 30], ["status_changed", "agent", 60, { field: "status", oldValue: "open", newValue: "in-progress" }], ["commented", "agent", 2880], ["status_changed", "agent", 2885, { field: "status", oldValue: "in-progress", newValue: "resolved" }]],
    comments: [
      { by: "agent", afterMin: 70, text: "Internal: session TTL is 15 min globally — this account uploads in ~20 min batches. Proposing per-account override.", internal: true },
      { by: "agent", afterMin: 2880, text: "تم تعديل مهلة الجلسة على مستوى الحساب لتتناسب مع حجم ملفات الرفع. جرّب رفع الفواتير الآن وأخبرنا بالنتيجة." },
    ],
    csat: "unratedResolved", // resolved but never rated — CSAT prompt test
  },
  {
    num: "TKT-2026-0018", employee: "Andrew Ehab", company: "KFC", product: "Accounting Software",
    subject: "General ledger sync error with central ERP",
    description: "General ledger sync error with central ERP system. Nightly sync job fails with error code GL-4021 and last night's entries are missing from the consolidated report. Urgent — month-end closing is in 2 days.",
    category: "software", priority: "urgent", status: "open", assignee: null,
    createdAgo: 2 * D, slaBreached: true,
    adminNote: "مرفوعة للمتابعة المباشرة من مدير الدعم — عميل رئيسي وإغلاق شهري بعد يومين.",
    history: [["created", "user", 0], ["commented", "user", 90]],
    comments: [
      { by: "user", afterMin: 90, text: "الإغلاق الشهري بعد يومين — محتاجين اعتماد الأرقام قبل بكرة الصبح. في أي تحديث؟" },
    ],
  },
  {
    num: "TKT-2026-0019", employee: "Andrew Ehab", company: "Subway", product: "E-Receipt",
    subject: "SMS receipts failing to deliver to customers",
    description: "Digital receipt SMS failing to deliver to customer mobile numbers since Thursday. Provider dashboard shows the messages as accepted but customers never receive them.",
    category: "network", priority: "low", status: "resolved", assignee: "tarek.mostafa@example.com",
    createdAgo: 6 * D, firstResponseMin: 70, resolveMin: 3600,
    history: [["created", "user", 0], ["assigned", "admin", 45], ["status_changed", "agent", 75, { field: "status", oldValue: "open", newValue: "in-progress" }], ["commented", "agent", 3600], ["status_changed", "agent", 3610, { field: "status", oldValue: "in-progress", newValue: "resolved" }], ["csat_rated", "user", 3840]],
    comments: [
      { by: "agent", afterMin: 3600, text: "Root cause was the SMS provider's sender-name expiring. Renewed the sender registration with the provider; delivery reports confirm traffic is green again." },
    ],
    csat: { rating: 3, comment: "The fix worked, but it took two visits to the branch. A reply on WhatsApp would have been much faster.", afterMin: 3840 },
  },
  {
    num: "TKT-2026-0020", employee: "Mohamed Elseify", company: "Subway", product: "POS System",
    subject: "Card reader timeout during contactless payments",
    description: "Card reader timeout during contactless payments — Apple Pay transactions take 20+ seconds then fail. Chip payments work fine. Started after the last terminal update.",
    category: "hardware", priority: "high", status: "resolved", assignee: "agent.karim@example.com",
    createdAgo: 4 * D, firstResponseMin: 18, resolveMin: 480,
    history: [["created", "user", 0], ["assigned", "admin", 10], ["status_changed", "agent", 20, { field: "status", oldValue: "open", newValue: "in-progress" }], ["commented", "agent", 480], ["status_changed", "agent", 485, { field: "status", oldValue: "in-progress", newValue: "resolved" }], ["csat_rated", "user", 600]],
    comments: [
      { by: "agent", afterMin: 40, text: "Internal: reader firmware 3.1.7 has a known NFC timeout bug — swapping unit with a 3.2.0 spare from the Maadi stock.", internal: true },
      { by: "agent", afterMin: 480, text: "تم استبدال القارئ بوحدة محدثة والتجربة نجحت على أربع عمليات متتالية. مفعلنا مراقبة إضافية على الفرع لمدة يوم." },
    ],
    csat: { rating: 4, comment: "استجابة سريعة وتم استبدال القارئ في نفس اليوم، شكرًا.", afterMin: 600 },
  },
  {
    num: "TKT-2026-0021", employee: "Ahmed Hassan", company: "McDonald's", product: "Inventory Management",
    subject: "Stock adjustment discrepancy between warehouse and branch",
    description: "Stock adjustment discrepancy between warehouse and branch app. Yesterday's transfer note shows 40 units received at the branch, but the branch app still lists the old quantity. Both show sync as 'active'.",
    category: "software", priority: "medium", status: "open", assignee: null,
    createdAgo: 30 * H,
    history: [["created", "user", 0], ["commented", "user", 25]],
    comments: [
      { by: "user", afterMin: 25, text: "أرفقت لقطة من شاشة المخزن وبنفس التوقيت شاشة الفرع — الفرق واضح في صنف البيف برجر." },
    ],
  },
  {
    num: "TKT-2026-0022", employee: "Mostafa Majed", company: "Starbucks", product: "E-Invoice",
    subject: "Tax invoice QR code not generating during checkout",
    description: "Tax invoice QR code not generating properly during checkout. The invoice completes but the printed receipt has an empty square where the QR should be, so the invoice is not legally valid.",
    category: "software", priority: "urgent", status: "in-progress", assignee: "agent.laila@example.com",
    createdAgo: 150 * M, firstResponseMin: 14,
    history: [["created", "user", 0], ["assigned", "admin", 8], ["status_changed", "agent", 16, { field: "status", oldValue: "open", newValue: "in-progress" }], ["commented", "user", 30], ["commented", "agent", 40]],
    comments: [
      { by: "agent", afterMin: 20, text: "Internal: QR service cert expires today — auto-renewal failed overnight. Manual renewal takes ~30 min, starting now.", internal: true },
      { by: "user", afterMin: 30, text: "الفرع مزدحم حاليًا والعملاء بيرفضوا الفاتورة بدون كود. ممكن حل مؤقت؟" },
      { by: "agent", afterMin: 40, text: "بنجدد شهادة التوقيع الآن — المدة المتوقعة ٣٠ دقيقة. الحل المؤقت: طباعة الفاتورة من خادم الفرع الآخر إن أمكن." },
    ],
  },
  {
    num: "TKT-2026-0023", employee: "Mohamed Elseify", company: "Domino's Pizza", product: "E-Receipt",
    subject: "Thermal printer disconnected from cashier terminal #2",
    description: "Thermal printer disconnected from cashier terminal #2. Windows shows the printer offline, no error on the printer itself. Terminal reboot did not help. Error log attached.",
    category: "hardware", priority: "high", status: "in-progress", assignee: "agent.karim@example.com",
    createdAgo: 30 * H, firstResponseMin: 30, slaBreached: true, attachments: ["error-screenshot.png", "pos-error-log.txt"],
    history: [["created", "user", 0], ["assigned", "admin", 15], ["status_changed", "agent", 32, { field: "status", oldValue: "open", newValue: "in-progress" }], ["commented", "user", 35], ["commented", "agent", 50]],
    comments: [
      { by: "user", afterMin: 35, text: "أرفقت لقطة شاشة للخطأ وملف اللوج من الكاشير — نفس الرسالة بتتكرر كل ما نشغل الطباعة." },
      { by: "agent", afterMin: 50, text: "Internal: 0x80070035 = network path not found. The printer is on the branch LAN via a tiny USB-Ethernet adapter that fails after power cuts. Bringing a replacement adapter tomorrow 10 AM.", internal: true },
    ],
  },
  {
    num: "TKT-2026-0024", employee: "Sara Mohamed", company: "Burger King", product: "CRM System",
    subject: "Quarterly report export too slow / times out",
    description: "Report generation taking too long when exporting quarterly data — the export spinner runs for 5+ minutes then times out with error 504. Monthly exports still work normally.",
    category: "software", priority: "medium", status: "in-progress", assignee: "nour.sabry@example.com",
    createdAgo: 26 * H, firstResponseMin: 60,
    history: [["created", "user", 0], ["assigned", "admin", 35], ["status_changed", "agent", 65, { field: "status", oldValue: "open", newValue: "in-progress" }], ["commented", "user", 50], ["commented", "agent", 75]],
    comments: [
      { by: "user", afterMin: 50, text: "Trial: quarter export = 41k rows. Monthly (13k rows) finishes in 40 seconds. Let me know if you need a DB dump." },
      { by: "agent", afterMin: 75, text: "وجدنا أن الاستعلام بيعمل تجميع صف بصف على مستوى السنة. بنحول التجميع لجدول ملخص مجمع — التسليم المتوقع بكرة الصبح." },
      { by: "agent", afterMin: 80, text: "Internal: needs the aggregate table migration on prod — scheduled tonight 01:00, no downtime window conflict.", internal: true },
    ],
  },
  {
    num: "TKT-2026-0025", employee: "Omar Khaled", company: "Subway", product: "CRM System",
    subject: "CRM emails not sending after lead generation",
    description: "Email notifications not being sent automatically after lead generation. The automation rule shows as active and the activity log says 'queued' but nothing leaves the queue.",
    category: "software", priority: "high", status: "resolved", assignee: "agent.laila@example.com",
    createdAgo: 3 * D, firstResponseMin: 18, resolveMin: 420,
    history: [["created", "user", 0], ["assigned", "admin", 12], ["status_changed", "agent", 20, { field: "status", oldValue: "open", newValue: "in-progress" }], ["commented", "user", 30], ["commented", "agent", 45], ["status_changed", "agent", 420, { field: "status", oldValue: "in-progress", newValue: "resolved" }], ["csat_rated", "user", 510]],
    comments: [
      { by: "user", afterMin: 30, text: "المشكلة متكررة كل يوم صباحًا — هل له علاقة بالتحديث الأخير للنظام؟" },
      { by: "agent", afterMin: 45, text: "تم تحديث وحدة الإرسال وربطها بخادم بريد احتياطي. جرّب توليد عميل جديد وستصلك الرسالة خلال دقيقة." },
    ],
    csat: { rating: 5, comment: "خدمة ممتازة وحل سريع، تم حل المشكلة قبل الموعد المحدد.", afterMin: 510 },
  },

  // ---- NEW tickets 0026-0040 ----------------------------------------------
  {
    num: "TKT-2026-0026", employee: "Omar Khaled", company: "KFC", product: "POS System",
    subject: "انقطاع الإنترنت بالكاشير الثالث — فرع المعادي",
    description: "الكاشير الثالث بفرع المعادي انقطع عن الشبكة فجأة منذ عشرين دقيقة بينما بقية الأجهزة تعمل بشكل طبيعي. أعدنا تشغيل الجهاز أكثر من مرة دون فائدة. الذروة قادمة بعد ساعة ونحتاج الكاشير الثالث بالضرورة.",
    category: "network", priority: "urgent", status: "open", assignee: null,
    createdAgo: 20 * M, tags: ["wifi", "فرع-المعادي", "pos"],
    history: [["created", "user", 0]],
  },
  {
    num: "TKT-2026-0027", employee: "Mona Adel", company: "McDonald's", product: "POS System",
    subject: "Touch screen unresponsive on terminal 1",
    description: "Touch screen on terminal 1 is unresponsive in the bottom-right corner — the 'pay now' button cannot be pressed. Staff are using the keyboard as a workaround. Started this morning after a power flicker.",
    category: "hardware", priority: "high", status: "open", assignee: null,
    createdAgo: 3 * H, tags: ["hardware", "touch"],
    history: [["created", "user", 0]],
  },
  {
    num: "TKT-2026-0028", employee: "Mona Adel", company: "Starbucks", product: "E-Receipt",
    subject: "Receipt printer printing blank receipts",
    description: "Receipt printer printing blank receipts — paper advances and cuts normally but the receipt comes out empty. Changed the paper roll and cleaned the print head per the KB guide, still blank.",
    category: "hardware", priority: "medium", status: "in-progress", assignee: "agent.karim@example.com",
    createdAgo: 8 * H, firstResponseMin: 35,
    history: [["created", "user", 0], ["assigned", "admin", 20], ["status_changed", "agent", 36, { field: "status", oldValue: "open", newValue: "in-progress" }], ["commented", "user", 30], ["commented", "agent", 40], ["commented", "user", 55]],
    comments: [
      { by: "user", afterMin: 30, text: "جربت الخطوات في مقال قاعدة المعرفة وغيرت الورق الحراري برول جديد — نفس المشكلة." },
      { by: "agent", afterMin: 40, text: "الرول الجديد هل هو من نفس المورد؟ الحراريات القديمة أحيانًا بتحتاج حرارة أعلى. جرّب رفع إعداد الكثافة من قائمة الطابعة." },
      { by: "user", afterMin: 55, text: "رفعنا الكثافة للدرجة الثامنة والطباعة ظهرت باهتة لكن مقروءة — مستنيين الزيارة بكرة الصبح.", editedAfterMin: 25 },
    ],
  },
  {
    num: "TKT-2026-0029", employee: "Hossam Ali", company: "Papa John's", product: "Other",
    subject: "طلب كرسي مكتبي جديد لمنطقة الكاشير",
    description: "طلب تجهيزات: كرسي المكتبي الخاص بمنطقة الكاشير الرئيسية تالف تمامًا والمسند مكسور. نطلب استبداله بكرسي مكتبي مريح بظهر عالي نظرًا لطول الورديات (١٠ ساعات يوميًا). الميزانية معتمدة من مدير المنطقة.",
    category: "other", priority: "low", status: "open", assignee: null,
    createdAgo: 2 * D, tags: ["تجهيزات", "فرن-شرم"],
    history: [["created", "user", 0]],
  },
  {
    num: "TKT-2026-0030", employee: "Hossam Ali", company: "Subway", product: "POS System",
    subject: "POS app crashes when opening daily summary",
    description: "POS app crashes when opening the daily summary screen — it freezes for 5 seconds then closes completely. Happens on both terminals at the branch. Reinstalling did not help. Other screens work fine.",
    category: "software", priority: "medium", status: "closed", assignee: "nour.sabry@example.com",
    createdAgo: 5 * D, firstResponseMin: 30, resolveMin: 1730, closeMin: 1930,
    history: [["created", "user", 0], ["assigned", "admin", 18], ["status_changed", "agent", 32, { field: "status", oldValue: "open", newValue: "in-progress" }], ["status_changed", "agent", 1730, { field: "status", oldValue: "in-progress", newValue: "resolved" }], ["status_changed", "user", 1930, { field: "status", oldValue: "resolved", newValue: "closed" }], ["csat_rated", "user", 1970]],
    comments: [
      { by: "agent", afterMin: 1730, text: "التحديث 4.1.3 بيصلح انهيار شاشة الملخص — تم تثبيته عن بُعد على الكاشيرين. جرّب فتح الملخص قبل الإغلاق الليلة." },
    ],
    csat: { rating: 4, comment: "تم حل المشكلة بتحديث الإصدار، والتنسيق كان ممتاز خلال العطلة.", afterMin: 1970 },
  },
  {
    num: "TKT-2026-0031", employee: "Sara Mohamed", company: "Costa Coffee", product: "POS System",
    subject: "Branch network drops every evening around 7 PM",
    description: "Branch network drops every evening around 7 PM for 3-5 minutes. All terminals disconnect from the POS server at once, then reconnect on their own. Happens like clockwork for the past four evenings.",
    category: "network", priority: "high", status: "in-progress", assignee: "tarek.mostafa@example.com",
    createdAgo: 22 * H, firstResponseMin: 40,
    history: [["created", "user", 0], ["assigned", "admin", 25], ["status_changed", "agent", 42, { field: "status", oldValue: "open", newValue: "in-progress" }], ["commented", "agent", 55]],
    comments: [
      { by: "agent", afterMin: 55, text: "Internal: 7 PM = ISP nightly line test on the branch router. Requesting a static business profile from the ISP — 24h turnaround. Interim: failover SIM ordered.", internal: true },
    ],
  },
  {
    num: "TKT-2026-0032", employee: "Ahmed Hassan", company: "Domino's Pizza", product: "Accounting Software",
    subject: "Ledger export shows wrong currency rounding",
    description: "Ledger export shows wrong currency rounding — totals are off by 1-2 piasters per hundred entries. Our accountant flagged it during reconciliation. It looks like the export rounds each row instead of the total.",
    category: "software", priority: "high", status: "resolved", assignee: "nour.sabry@example.com",
    createdAgo: 4 * D, firstResponseMin: 28, resolveMin: 360,
    history: [["created", "user", 0], ["assigned", "admin", 15], ["status_changed", "agent", 30, { field: "status", oldValue: "open", newValue: "in-progress" }], ["commented", "agent", 360], ["status_changed", "agent", 365, { field: "status", oldValue: "in-progress", newValue: "resolved" }], ["csat_rated", "user", 420]],
    comments: [
      { by: "agent", afterMin: 360, text: "Confirmed: per-row rounding. The export now sums exact values and rounds only the grand total — matches your accountant's sheet to the piaster. Backfill script corrected the last 3 months of exports." },
    ],
    csat: { rating: 5, comment: "Fixed within hours and the rounding rule now matches our accountant's expectation. Great work.", afterMin: 420 },
  },
  {
    num: "TKT-2026-0033", employee: "Mona Adel", company: "KFC", product: "E-Invoice",
    subject: "طلب صلاحية مدير للفاتورة الإلكترونية",
    description: "بعد ترقية مركز الفرع أحتاج صلاحية مدير على شاشة الفاتورة الإلكترونية لاعتماد الفواتير المرتجعة. حاليًا الصلاحية مع مدير المنطقة فقط وهذا يعطل العمل مساءً. اعتماد مدير المنطقة مرفق بالبريد.",
    category: "access", priority: "medium", status: "open", assignee: "nour.sabry@example.com",
    createdAgo: 5 * H, tags: ["صلاحيات", "اعتماد"],
    history: [["created", "user", 0], ["assigned", "admin", 22]],
  },
  {
    num: "TKT-2026-0034", employee: "Omar Khaled", company: "Pizza Hut", product: "E-Receipt",
    subject: "[بريد] تأخر إرسال الإيصالات الإلكترونية عبر البريد",
    description: "رسالة وردت عبر البريد الإلكتروني: العملاء بيشتكوا إن إيصالات الشراء الإلكترونية بتوصل متأخرة بأكثر من ساعة، وبعض الأحيان لا توصل نهائيًا. المرفق عينة إيصال وصلت متأخرة من فرع مدينة نصر.",
    category: "software", priority: "low", status: "open", assignee: null, source: "email",
    createdAgo: 9 * H, attachments: ["receipt-sample.png"], tags: ["email", "إيصالات"],
    history: [["created", "user", 0]],
  },
  {
    num: "TKT-2026-0035", employee: "Andrew Ehab", company: "McDonald's", product: "POS System",
    subject: "Kitchen display froze mid-rush — restart loop",
    description: "Kitchen display froze during the dinner rush and now keeps restarting in a loop — it reaches the loading spinner then goes black. Three orders were lost before we switched to paper slips. This is the second occurrence this week.",
    category: "hardware", priority: "urgent", status: "in-progress", assignee: "agent.karim@example.com",
    createdAgo: 3 * H, firstResponseMin: 10,
    history: [["created", "user", 0], ["assigned", "admin", 6], ["status_changed", "agent", 12, { field: "status", oldValue: "open", newValue: "in-progress" }], ["commented", "agent", 30]],
    comments: [
      { by: "agent", afterMin: 30, text: "Internal: display power brick reads 11.9V under load (spec 12V ±5%) — brownouts under heat. Dispatching a technician with a spare brick + display within the hour; dinner rush criticality.", internal: true },
    ],
  },
  {
    num: "TKT-2026-0036", employee: "Omar Khaled", company: "Starbucks", product: "POS System",
    subject: "فصل متكرر لجلسة الواي فاي في الوردية المسائية",
    description: "أجهزة الكاشير بتفقد اتصال الواي فاي كل عشر دقائق تقريبًا في الوردية المسائية فقط، وتعود بعد ثوانٍ. المشكلة بتظهر من أسبوع وتأخر إغلاق الفواتير. بقية الورديات تعمل بلا مشاكل.",
    category: "network", priority: "medium", status: "resolved", assignee: "tarek.mostafa@example.com",
    createdAgo: 4 * D, firstResponseMin: 35, resolveMin: 2160,
    history: [["created", "user", 0], ["assigned", "admin", 20], ["status_changed", "agent", 38, { field: "status", oldValue: "open", newValue: "in-progress" }], ["commented", "agent", 2160], ["status_changed", "agent", 2165, { field: "status", oldValue: "in-progress", newValue: "resolved" }], ["csat_rated", "user", 2460]],
    comments: [
      { by: "agent", afterMin: 2160, text: "السبب كان تزاحم القنوات مع شبكة المول المجاور اللي بيشتغل مساءً. غيرنا قناة نقطة الوصول للقناة الثابتة الخامسة وتوقف الفصل تمامًا من الأمس." },
    ],
    csat: { rating: 4, comment: "تحسن كبير بعد تغيير إعدادات القناة، لكن نتمنى متابعة أسبوعًا إضافيًا للاطمئنان.", afterMin: 2460 },
  },
  {
    num: "TKT-2026-0037", employee: "Sara Mohamed", company: "Subway", product: "CRM System",
    subject: "تعطل تزامن البيانات مع الفروع",
    description: "مزامنة بيانات العملاء بين الفروع والفرع الرئيسي متوقفة تمامًا منذ الصباح. الفروع الأربعة بتشتغل على نسخ قديمة من قاعدة العملاء، والمبيعات بتتسجل محليًا. لا توجد رسالة خطأ على الشاشة لكن آخر مزامنة ناجحة كانت الساعة السابعة صباحًا.",
    category: "software", priority: "urgent", status: "open", assignee: null,
    createdAgo: 45 * M, tags: ["sync", "urgent", "branches"],
    history: [["created", "user", 0]],
  },
  {
    num: "TKT-2026-0038", employee: "Mona Adel", company: "Hardee's", product: "POS System",
    subject: "Card reader damaging customer cards on insert",
    description: "Card reader at the drive-thru window is scratching customer cards badly on insert — three customers complained this week and one demanded a card replacement fee. The reader slot feels rough when inserting a test card.",
    category: "hardware", priority: "high", status: "closed", assignee: "agent.karim@example.com",
    createdAgo: 6 * D, firstResponseMin: 25, resolveMin: 1440, closeMin: 3060,
    history: [["created", "user", 0], ["assigned", "admin", 14], ["status_changed", "agent", 28, { field: "status", oldValue: "open", newValue: "in-progress" }], ["status_changed", "agent", 1440, { field: "status", oldValue: "in-progress", newValue: "resolved" }], ["reopened", "user", 2760, { oldValue: "resolved", newValue: "open" }], ["commented", "user", 2765], ["status_changed", "agent", 2900, { field: "status", oldValue: "open", newValue: "in-progress" }], ["status_changed", "agent", 3000, { field: "status", oldValue: "in-progress", newValue: "resolved" }], ["status_changed", "user", 3060, { field: "status", oldValue: "resolved", newValue: "closed" }], ["csat_rated", "user", 3100]],
    comments: [
      { by: "user", afterMin: 2765, text: "للأسف الخدوش رجعت تظهر بعد أسبوع من الاستبدال — العملاء غاضبين والمشكلة نفسها." },
      { by: "agent", afterMin: 2900, text: "Internal: not the reader — the drive-thru card guide bracket was bent and grinding cards. Replaced the whole fascia assembly with a metal one this time.", internal: true },
      { by: "agent", afterMin: 3000, text: "تم استبدال مجمع مدخل البطاقة بالكامل بوحدة معدنية بدل البلاستيك. فحصنا مرور ثلاثين بطاقة تجريبية بدون أي أثر." },
    ],
    csat: { rating: 3, comment: "استجابة سريعة لكن المشكلة عادت مرة واحدة قبل الحل النهائي.", afterMin: 3100 },
  },
  {
    num: "TKT-2026-0039", employee: "Hossam Ali", company: "Domino's Pizza", product: "Other",
    subject: "استفسار عن جدولة تدريب على النظام الجديد",
    description: "طلب تنسيق: محتاجين جدولة جلسة تدريب لفريق الفرع (ستة أفراد) على شاشات الطلب الذاتي الجديدة قبل التشغيل الرسمي بعد أسبوعين. يفضل تكون الجلسة بعد الحادية عشرة صباحًا أو قبل الذروة المسائية.",
    category: "other", priority: "medium", status: "open", assignee: null,
    createdAgo: 26 * H, tags: ["تدريب", "تنسيق"],
    history: [["created", "user", 0]],
  },
  {
    // Historical ticket by the SUSPENDED user — visible to staff only now
    num: "TKT-2026-0040", employee: "Samir Fathi", company: "Domino's Pizza", product: "Inventory Management",
    subject: "طلب صلاحيات إضافية على نظام المخزون",
    description: "طوال أثناء إعداد الجرد الشهري أحتاج صلاحية التعديل على أرصدة الأصناف بدلًا من صلاحية العرض فقط، حتى لا أنتظر مدير المخزن كل مرة. المبرر: تسريع معالجة الفروقات الصغيرة ليلة الجرد.",
    category: "access", priority: "low", status: "closed", assignee: "agent.laila@example.com",
    createdAgo: 10 * D, firstResponseMin: 50, resolveMin: 1440, closeMin: 1560,
    history: [["created", "user", 0], ["assigned", "admin", 30], ["status_changed", "agent", 55, { field: "status", oldValue: "open", newValue: "in-progress" }], ["status_changed", "agent", 1440, { field: "status", oldValue: "in-progress", newValue: "resolved" }], ["status_changed", "user", 1560, { field: "status", oldValue: "resolved", newValue: "closed" }]],
    comments: [],
    csat: "unratedClosed",
  },
];

// ---------------------------------------------------------------------------
// 6. NOTIFICATIONS — unread badges for every role, read + unread mix
//    (email/ticket fields resolved at runtime)
// ---------------------------------------------------------------------------
const notificationSpecs = [
  { to: "admin@jameel-it.com", type: "ticket_created", title: "تم إنشاء تذكرة عاجلة جديدة",
    message: "TKT-2026-0037 — تعطل تزامن البيانات مع الفروع (Sara Mohamed, Subway)", from: "sara.mohamed@example.com", ticketNum: "TKT-2026-0037", agoMs: 40 * M, read: false },
  { to: "admin@jameel-it.com", type: "sla_breached", title: "تجاوز اتفاقية مستوى الخدمة",
    message: "التذكرة TKT-2026-0018 تجاوزت مهلة الاستجابة العاجلة (٤ ساعات) دون تعيين.", ticketNum: "TKT-2026-0018", agoMs: 40 * H, read: false },
  { to: "admin@jameel-it.com", type: "system", title: "تحديث سياسات اتفاقية مستوى الخدمة",
    message: "تم تحديث السياسات الافتراضية: عاجل ٤ ساعات، عالية ٢٤ ساعة، متوسطة ٤٨ ساعة، منخفضة ٧٢ ساعة.", agoMs: 3 * D, read: false },
  { to: "admin@jameel-it.com", type: "ticket_status_changed", title: "تم حل التذكرة TKT-2026-0025",
    message: "قام Laila Agent بحل التذكرة — بانتظار تقييم العميل.", from: "agent.laila@example.com", ticketNum: "TKT-2026-0025", agoMs: 2.5 * D, read: true },
  { to: "agent.laila@example.com", type: "ticket_assigned", title: "تم تعيين تذكرة جديدة لك",
    message: "TKT-2026-0022 — Mostafa Majed (Starbucks) — عاجلة", from: "admin@jameel-it.com", ticketNum: "TKT-2026-0022", agoMs: 2.3 * H, read: false },
  { to: "agent.laila@example.com", type: "ticket_commented", title: "رد جديد على تذكرة مُسندة إليك",
    message: "Mostafa Majed: الفرع مزدحم حاليًا والعملاء بيرفضوا الفاتورة بدون كود. ممكن حل مؤقت؟", from: "mostafa.majed@example.com", ticketNum: "TKT-2026-0022", agoMs: 2 * H, read: false },
  { to: "agent.karim@example.com", type: "ticket_assigned", title: "تم تعيين تذكرة جديدة لك",
    message: "TKT-2026-0035 — Andrew Ehab (McDonald's) — عاجلة", from: "admin@jameel-it.com", ticketNum: "TKT-2026-0035", agoMs: 2.8 * H, read: false },
  { to: "agent.karim@example.com", type: "ticket_assigned", title: "تم تعيين تذكرة جديدة لك",
    message: "TKT-2026-0028 — Mona Adel (Starbucks) — متوسطة", from: "admin@jameel-it.com", ticketNum: "TKT-2026-0028", agoMs: 7.5 * H, read: false },
  { to: "nour.sabry@example.com", type: "ticket_assigned", title: "تم تعيين تذكرة جديدة لك",
    message: "TKT-2026-0033 — Mona Adel (KFC) — صلاحيات", from: "admin@jameel-it.com", ticketNum: "TKT-2026-0033", agoMs: 4.5 * H, read: false },
  { to: "tarek.mostafa@example.com", type: "ticket_assigned", title: "تم تعيين تذكرة جديدة لك",
    message: "TKT-2026-0031 — Sara Mohamed (Costa Coffee) — عالية", from: "admin@jameel-it.com", ticketNum: "TKT-2026-0031", agoMs: 21 * H, read: false },
  { to: "omar.khaled@example.com", type: "ticket_status_changed", title: "تم حل تذكرتك TKT-2026-0025",
    message: "تم حل التذكرة الخاصة بك. يمكنك الآن تقييم جودة الدعم من صفحة التذكرة.", from: "agent.laila@example.com", ticketNum: "TKT-2026-0025", agoMs: 2.4 * D, read: false },
  { to: "omar.khaled@example.com", type: "ticket_commented", title: "رد جديد على تذكرتك TKT-2026-0025",
    message: "Laila Agent: تم تحديث وحدة الإرسال وربطها بخادم بريد احتياطي.", from: "agent.laila@example.com", ticketNum: "TKT-2026-0025", agoMs: 2.9 * D, read: false },
  { to: "sara.mohamed@example.com", type: "ticket_status_changed", title: "تحديث حالة التذكرة TKT-2026-0024",
    message: "تم استلام تذكرتك وجارٍ العمل عليها من فريق الدعم.", from: "nour.sabry@example.com", ticketNum: "TKT-2026-0024", agoMs: 25 * H, read: true },
];

// ---------------------------------------------------------------------------
// Attachment templates — REAL files written to Backend/uploads so the
// authenticated streaming endpoint serves working previews + downloads
// ---------------------------------------------------------------------------
const TXT_ATTACHMENT_CONTENT = [
  "POS Terminal #2 — Domino's Pizza (Maadi) error log",
  "Collected: yesterday 18:30 — 19:15",
  "===================================================",
  "[18:30:02] WARN  spooler: job #8841 queued (receipt 7x11)",
  "[18:30:44] ERROR printer: 0x80070035 — network path not found (\\\\BRANCH-PRINT\\THERMAL2)",
  "[18:31:03] WARN  retry 1/5 ... failed (timeout 3000ms)",
  "[18:32:15] ERROR printer: 0x80070035 — network path not found",
  "[18:35:47] WARN  USB-Ethernet adapter link down (re-associating...)",
  "[18:36:02] INFO  adapter re-associated, DHCP lease 10.20.4.52",
  "[18:40:11] ERROR printer: 0x80070035 — network path not found",
  "[18:52:29] ERROR printer: 0x80070035 — network path not found",
  "[19:01:58] INFO  operator rebooted terminal",
  "[19:03:10] ERROR printer: 0x80070035 — network path not found",
  "===================================================",
  "Conclusion: adapter drops link under load after power cuts.",
].join("\n");

function makeGradientPng() {
  // Build a real 160x120 PNG (zlib, no external deps)
  const zlib = require("zlib");
  // IMG_H (not H) — the outer scope already has H = "one hour" for SLA math;
  // shadowing it here made the two H's dangerously easy to confuse.
  const W = 160, IMG_H = 120;
  const raw = Buffer.alloc(IMG_H * (1 + W * 3)); // filter byte + RGB per pixel
  let p = 0;
  for (let y = 0; y < IMG_H; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < W; x++) {
      raw[p++] = Math.round(40 + (x / W) * 160); // R gradient
      raw[p++] = Math.round(60 + (y / IMG_H) * 120); // G gradient
      raw[p++] = 200;                             // B
    }
  }
  const crc32 = (buf) => {
    let c, table = [];
    for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
    let crc = 0xffffffff;
    for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(IMG_H, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit, truecolor RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------
async function seedDemo() {
  if (env.isProd && process.env.SEED_FORCE !== "true") {
    console.error("❌ Refusing to seed in production. Set SEED_FORCE=true to override.");
    process.exit(1);
  }
  await mongoose.connect(env.dbUrl);
  console.log("✅ Connected to MongoDB (demo seed)");

  // ---- resolve base users ------------------------------------------------
  const U = {}; // email → user
  for (const email of ["admin@jameel-it.com", "agent.laila@example.com", "agent.karim@example.com",
    "omar.khaled@example.com", "sara.mohamed@example.com", "mohamed.elseify@example.com",
    "mostafa.majed@example.com", "ahmed.hassan@example.com", "andrew.ehab@example.com",
    "mo.jameel.official@gmail.com", "admin@example.com"]) {
    const u = await User.findOne({ email });
    if (u) U[email] = u;
  }
  const admin = U["admin@jameel-it.com"] || U["admin@example.com"];
  if (!admin) throw new Error("Base admin missing — run `node seedUsers.js` first");

  // ---- new users (idempotent) --------------------------------------------
  const byName = {}; // name → user (for ticket specs)
  Object.values(U).forEach((u) => (byName[u.name] = u));
  for (const nu of newUsers) {
    let u = await User.findOne({ email: nu.email });
    if (!u) {
      const hash = await bcrypt.hash(DEMO_PASSWORD, env.bcryptSaltRounds);
      const { unverified, suspended, ...rest } = nu;
      u = await User.create({
        ...rest, password: hash,
        emailVerifiedAt: unverified ? null : new Date(),
        status: suspended ? "suspended" : "active",
      });
      console.log(`✓ demo user: ${u.name} (${u.role}${suspended ? ", suspended" : ""}${unverified ? ", unverified" : ""})`);
    }
    U[nu.email] = u;
    byName[u.name] = u;
  }
  // enrich existing users (partial $set, keeps everything else)
  for (const [email, patch] of Object.entries(userEnrichment)) {
    if (U[email]) await User.updateOne({ _id: U[email]._id }, { $set: patch });
  }
  console.log(`✓ user profiles enriched (${Object.keys(userEnrichment).length})`);

  // ---- companies (new + enrichment) --------------------------------------
  const companyIdByName = {};
  for (const c of await Company.find({})) companyIdByName[c.name] = c._id;
  for (const c of newCompanies) {
    if (!companyIdByName[c.name]) {
      const created = await Company.create(c);
      companyIdByName[c.name] = created._id;
      console.log(`✓ demo company: ${c.name}${c.active === false ? " (inactive)" : ""}`);
    }
  }
  for (const [name, patch] of Object.entries(companyEnrichment)) {
    if (companyIdByName[name]) await Company.updateOne({ _id: companyIdByName[name] }, { $set: patch });
  }

  // ---- canned responses ----------------------------------------------------
  for (const cr of newCannedResponses) {
    if (!(await CannedResponse.findOne({ title: cr.title }))) {
      await CannedResponse.create({ ...cr, createdBy: admin._id });
      console.log(`✓ demo canned response: ${cr.title}`);
    }
  }

  // ---- KB articles ---------------------------------------------------------
  for (const kb of newKbArticles) {
    const slug = slugify(kb.title);
    if (!(await KBArticle.findOne({ slug }))) {
      const author = kb.authorKey === "nour" ? U["nour.sabry@example.com"]._id : admin._id;
      await KBArticle.create({
        title: kb.title, slug, excerpt: kb.excerpt, content: kb.content,
        category: kb.category, tags: kb.tags, author, published: kb.published,
        viewCount: kb.viewCount, helpfulCount: kb.helpfulCount, notHelpfulCount: kb.notHelpfulCount,
      });
      console.log(`✓ demo KB: ${kb.title}${kb.published ? "" : " (DRAFT)"}`);
    }
  }
  for (const [title, stats] of Object.entries(kbStatsEnrichment)) {
    await KBArticle.updateOne({ slug: slugify(title) }, { $set: stats });
  }
  console.log("✓ KB stats back-filled on starter articles");

  // ---- attachment template files (write ONCE per run, shared) -------------
  const UPLOAD_DIR = require("./services/storageService").UPLOAD_DIR;
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const fileStore = {}; // logical name → {storedName, mimetype, size}
  for (const logical of ["error-screenshot.png", "receipt-sample.png"]) {
    const storedName = `${crypto.randomUUID()}.png`;
    const buf = makeGradientPng();
    fs.writeFileSync(path.join(UPLOAD_DIR, storedName), buf);
    fileStore[logical] = { storedName, mimetype: "image/png", size: buf.length };
  }
  const txtBuf = Buffer.from(TXT_ATTACHMENT_CONTENT, "utf8");
  const txtStored = `${crypto.randomUUID()}.txt`;
  fs.writeFileSync(path.join(UPLOAD_DIR, txtStored), txtBuf);
  fileStore["pos-error-log.txt"] = { storedName: txtStored, mimetype: "text/plain", size: txtBuf.length };

  // ---- tickets (upsert by number) ------------------------------------------
  const ticketsByNum = {};
  for (const spec of ticketSpecs) {
    const creator = byName[spec.employee] || admin;
    const assignee = spec.assignee ? U[spec.assignee] : null;
    const createdAt = new Date(NOW - spec.createdAgo);
    const slaDueDate = await slaPolicyService.computeSlaDueDate(spec.priority, createdAt);

    // history (resolve actors, absolute timestamps, sort ascending)
    const history = spec.history.map(([action, byRole, offsetMin, extra]) => {
      const by = byRole === "user" ? creator : byRole === "agent" ? (assignee || admin) : admin;
      return {
        action, by: by._id, createdAt: new Date(createdAt.getTime() + offsetMin * M),
        ...(extra || {}),
      };
    }).sort((a, b) => a.createdAt - b.createdAt);

    // attachments
    const attachments = (spec.attachments || []).map((logical) => {
      const f = fileStore[logical];
      return { url: `REPLACED_BELOW/${f.storedName}`, filename: logical, mimetype: f.mimetype, size: f.size, uploadedAt: createdAt };
    });

    // csat
    let csat = { rating: null, comment: "", ratedAt: null };
    let resolvedBy = null, endDate = null;
    if (spec.status === "resolved" || spec.status === "closed") {
      resolvedBy = assignee ? assignee._id : null;
      endDate = new Date(createdAt.getTime() + (spec.closeMin || spec.resolveMin) * M);
    }
    if (spec.csat && typeof spec.csat === "object") {
      csat = { rating: spec.csat.rating, comment: spec.csat.comment, ratedAt: new Date(createdAt.getTime() + spec.csat.afterMin * M) };
    }

    const team = assignee ? assignee.team || "" : "";
    const lastAt = history.length ? history[history.length - 1].createdAt : createdAt;

    const doc = {
      product: spec.product, subject: spec.subject, employee: spec.employee,
      company: spec.company, companyId: companyIdByName[spec.company] || null,
      category: spec.category, priority: spec.priority, status: spec.status,
      user: creator._id, assignedTo: assignee ? assignee._id : null, team,
      source: spec.source || "web", tags: spec.tags || [spec.category],
      startDate: createdAt, endDate, description: spec.description,
      adminNote: spec.adminNote || "", csat, resolvedBy,
      firstResponseAt: spec.firstResponseMin ? new Date(createdAt.getTime() + spec.firstResponseMin * M) : null,
      slaDueDate, slaBreached: !!spec.slaBreached,
      history, attachments,
      createdAt, updatedAt: lastAt,
    };

    let t = await Ticket.findOne({ ticketNumber: spec.num });
    if (t) {
      // Native driver update — mongoose 9 marks createdAt/updatedAt immutable
      // in updates, silently STRIPPING them from $set even with
      // {timestamps:false}, which would poison FRT metrics (negative diffs).
      await Ticket.collection.updateOne({ _id: t._id }, { $set: doc });
    } else {
      t = await Ticket.create({ ticketNumber: spec.num, ...doc });
    }
    // fix attachment URLs now that we know the ticket id
    const fixedAttachments = attachments.map((a) => ({ ...a, url: `/api/tickets/${t._id}/attachments/${a.url.split("/").pop()}` }));
    if (fixedAttachments.length) await Ticket.collection.updateOne({ _id: t._id }, { $set: { attachments: fixedAttachments } });
    ticketsByNum[spec.num] = { ticket: t, spec, creator, assignee, createdAt };
  }
  console.log(`✓ tickets upserted: ${Object.keys(ticketsByNum).length} (TKT-2026-0016 → ${ticketSpecs[ticketSpecs.length - 1].num})`);

  // ---- comments (rebuild for demo tickets — idempotent) ---------------------
  let nComments = 0, nInternal = 0, nEdited = 0;
  for (const { spec, creator, assignee, createdAt } of Object.values(ticketsByNum)) {
    const t = await Ticket.findOne({ ticketNumber: spec.num });
    await Comment.deleteMany({ ticket: t._id });
    for (const c of spec.comments || []) {
      const by = c.by === "user" ? creator : c.by === "agent" ? (assignee || admin) : admin;
      const cAt = new Date(createdAt.getTime() + c.afterMin * M);
      await Comment.create({
        ticket: t._id, user: by._id, text: c.text, isInternal: !!c.internal,
        editedAt: c.editedAfterMin ? new Date(cAt.getTime() + c.editedAfterMin * M) : null,
        createdAt: cAt, updatedAt: cAt,
      });
      nComments++; if (c.internal) nInternal++; if (c.editedAfterMin) nEdited++;
    }
  }
  console.log(`✓ comments: ${nComments} total (${nInternal} internal notes, ${nEdited} edited)`);

  // ---- notifications (skip-if-exists by recipient+title+createdAt) ----------
  let nNotifs = 0;
  for (const ns of notificationSpecs) {
    const recipient = U[ns.to];
    if (!recipient) continue;
    const exists = await Notification.findOne({ recipient: recipient._id, title: ns.title, createdAt: new Date(NOW - ns.agoMs) });
    if (exists) continue;
    const sender = ns.from ? U[ns.from] : null;
    const ticket = ns.ticketNum ? ticketsByNum[ns.ticketNum].ticket : null;
    await Notification.create({
      recipient: recipient._id, sender: sender ? sender._id : null, type: ns.type,
      title: ns.title, message: ns.message, ticket: ticket ? ticket._id : null,
      read: !!ns.read, readAt: ns.read ? new Date(NOW - ns.agoMs + 3600e3) : null,
      createdAt: new Date(NOW - ns.agoMs),
    });
    nNotifs++;
  }
  console.log(`✓ notifications: ${nNotifs} new (badges: admin 3, laila 2, karim 2, nour 1, tarek 1, omar 2)`);

  // ---- counter sync — UI-created tickets continue at TKT-2026-0041 -----------
  await Counter.findByIdAndUpdate("ticket-2026", { $set: { seq: 40 } }, { upsert: true, new: true });
  console.log("✓ ticket counter synced (next ticket = TKT-2026-0041)");

  // ---- summary ---------------------------------------------------------------
  const [nT, nU, nKb, nCanned, nComp] = await Promise.all([
    Ticket.countDocuments({}), User.countDocuments({}), KBArticle.countDocuments({}),
    CannedResponse.countDocuments({}), Company.countDocuments({}),
  ]);
  const byStatus = await Ticket.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]);
  const byPriority = await Ticket.aggregate([{ $group: { _id: "$priority", n: { $sum: 1 } } }]);
  const rated = await Ticket.countDocuments({ "csat.rating": { $gte: 1 } });
  console.log("\n✅ DEMO SEED COMPLETE");
  console.log(`   Tickets: ${nT}  | Users: ${nU}  | KB: ${nKb} (incl. 1 draft)  | Canned: ${nCanned}  | Companies: ${nComp}`);
  console.log(`   By status: ${byStatus.map((s) => `${s._id}=${s.n}`).join(", ")}`);
  console.log(`   By priority: ${byPriority.map((s) => `${s._id}=${s.n}`).join(", ")}`);
  console.log(`   CSAT-rated: ${rated} tickets | SLA breached: 2 | breaching-soon: 3`);
  console.log("\n📋 Demo logins (password Demo@1234 unless noted):");
  console.log("   admin@jameel-it.com / password123        (admin — 3 unread notifications)");
  console.log("   agent.laila@example.com / Demo@1234          (agent — Network team)");
  console.log("   agent.karim@example.com / Demo@1234          (agent — Hardware team)");
  console.log("   nour.sabry@example.com / Demo@1234           (agent — Software team)");
  console.log("   tarek.mostafa@example.com / Demo@1234        (agent — Network team)");
  console.log("   omar.khaled@example.com / Demo@1234          (user — 4 tickets, 2 rated, 2 unread)");
  console.log("   mona.adel@example.com / Demo@1234            (user — 4 tickets incl. reopened)");
  console.log("   dina.hassan@example.com / Demo@1234          (user — UNVERIFIED email)");
  console.log("   samir.suspended@example.com / Demo@1234      (user — SUSPENDED, login blocked)");
  await mongoose.disconnect();
}

if (require.main === module) {
  seedDemo().catch((err) => {
    console.error("❌ Demo seed failed:", err.message);
    process.exit(1);
  });
}
module.exports = seedDemo;
