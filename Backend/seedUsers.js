/*! Jameel IT — Help Desk & Ticketing Platform
 * © 2026 Mohammed Jameel · https://imohammedjameel.github.io/ · MIT License
 * Attribution notice — keep intact when copying/modifying (see LICENSE + NOTICE)
 * Signature: JMLIT-4FC9A6FEFD */
// Database seeder — must be invoked explicitly: `npm run seed`
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User");
const Ticket = require("./models/Ticket");
const Company = require("./models/Company");
const CannedResponse = require("./models/CannedResponse");
const KBArticle = require("./models/KBArticle");
const { slugify } = require("./controller/kbController");
const slaPolicyService = require("./services/slaPolicyService");
const env = require("./config/env");

const sampleUsers = [
  { name: "Mohammed Jameel", email: "mo.jameel.official@gmail.com", password: "password123", role: "user" },
  { name: "Jameel Admin", email: "admin@jameel-it.com", password: "password123", role: "admin" },
  { name: "Omar Khaled", email: "omar.khaled@example.com", password: "Demo@1234", role: "user" },
  { name: "Sara Mohamed", email: "sara.mohamed@example.com", password: "Demo@1234", role: "user" },
  { name: "Mohamed Elseify", email: "mohamed.elseify@example.com", password: "Demo@1234", role: "user" },
  { name: "Mostafa Majed", email: "mostafa.majed@example.com", password: "Demo@1234", role: "user" },
  { name: "Ahmed Hassan", email: "ahmed.hassan@example.com", password: "Demo@1234", role: "user" },
  { name: "Andrew Ehab", email: "andrew.ehab@example.com", password: "Demo@1234", role: "user" },
  // Support agents — the new middle role: work tickets WITHOUT admin powers
  { name: "Laila Agent", email: "agent.laila@example.com", password: "Demo@1234", role: "agent", team: "Network" },
  { name: "Karim Agent", email: "agent.karim@example.com", password: "Demo@1234", role: "agent", team: "Hardware" },
];

const sampleCompanies = [
  { name: "Subway", contactName: "Branch Manager", email: "ops@subway.example.com" },
  { name: "Burger King", contactName: "IT Supervisor", email: "it@burgerking.example.com" },
  { name: "KFC", contactName: "Store Support", email: "support@kfc.example.com" },
  { name: "McDonald's", contactName: "Shift Lead", email: "shift@mcd.example.com" },
  { name: "Pizza Hut", contactName: "Duty Manager", email: "duty@pizzahut.example.com" },
  { name: "Starbucks", contactName: "Store Manager", email: "store@starbucks.example.com" },
  { name: "Domino's Pizza", contactName: "Franchisee", email: "ops@dominos.example.com" },
];

const sampleCannedResponses = [
  {
    title: "Restart router / access point",
    content: "Could you please power-cycle the device (unplug 10 seconds, plug back in) and let us know if the issue persists after it fully boots?",
    category: "network",
  },
  {
    title: "Ticket resolved — please rate",
    content: "We believe this issue is now resolved. We're marking the ticket as resolved — if the problem reoccurs within 48h, simply reply here and we'll reopen it. You can also rate the support you received.",
    category: "general",
  },
  {
    title: "Password reset steps",
    content: "Please use the 'Forgot password' link on the login page. The reset email is valid for a limited time — check your spam folder if it doesn't arrive within a few minutes.",
    category: "access",
  },
  {
    title: "Need remote session",
    content: "To investigate further we need a remote session. Please confirm a time window and reply with the branch/PC identifier so we can prepare.",
    category: "hardware",
  },
];

// Knowledge base starter articles — 3 Arabic + 2 English, so the KB page has
// content on first run instead of an empty state (BUG-qa8/E: "KB ships 0
// articles"). Arabic titles also prove the unicode-aware slugify.
const sampleKbArticles = [
  {
    title: "كيفية إعادة تعيين كلمة المرور",
    excerpt: "خطوات استعادة كلمة المرور الخاصة بحسابك عبر رابط «نسيت كلمة المرور» ومدة صلاحية الرابط.",
    content:
      "يمكنك إعادة تعيين كلمة المرور بنفسك خلال دقيقة واحدة دون التواصل مع الدعم الفني. من صفحة تسجيل الدخول اضغط على رابط «نسيت كلمة المرور» ثم أدخل البريد الإلكتروني المسجل لحسابك. ستصلك رسالة تحتوي على رابط إعادة التعيين، وهو صالح لمدة محدودة لأسباب أمنية. إذا لم تصلك الرسالة خلال خمس دقائق فتفضل بفحص مجلد الرسائل غير المرغوبة (Spam). في حال عدم وصول الرسالة نهائيًا أو فقدان الوصول إلى البريد الإلكتروني، افتح تذكرة دعم بتصنيف «صلاحيات» وسيتولى الفريق التحقق من هويتك وإعادة ضبط الحساب.",
    category: "access",
    tags: ["كلمة المرور", "حساب", "password"],
  },
  {
    title: "حل مشاكل الاتصال بالشبكة",
    excerpt: "خطوات تشخيص أولية لانقطاع الإنترنت أو ضعف الشبكة قبل فتح تذكرة دعم.",
    content:
      "قبل فتح تذكرة، جرّب الخطوات التالية لأنها تحل معظم مشاكل الاتصال خلال دقائق. أولًا تأكد من أن كابل الشبكة موصل بإحكام بالجهاز والمقبس، أو أن الواي فاي مفعّل وأنك متصل بالشبكة الصحيحة. ثانيًا جرّب فتح موقع آخر للتأكد أن المشكلة ليست في خدمة بعينها. ثالثًا أعد تشغيل الموجّه (الراوتر) بفصل الكهرباء عنه لعشر ثوانٍ ثم إعادة توصيله وانتظار اكتمال الإقلاع. رابعًا جرّب الجهاز من شبكة أخرى أو من بيانات الهاتف لعزل مصدر المشكلة. إذا استمر الانقطاع بعد كل ذلك، افتح تذكرة بتصنيف «شبكات» موضحًا فيه اسم الفرع ورقم الجهاز ووقت بدء المشكلة حتى يستطيع الفريق تدقيق سجلات الشبكة.",
    category: "network",
    tags: ["شبكة", "واي فاي", "انقطاع"],
  },
  {
    title: "طلب صلاحيات جديدة على الأنظمة",
    excerpt: "كيفية طلب الوصول إلى نظام جديد أو صلاحية إضافية عبر تذكرة موجهة للمدير المباشر.",
    content:
      "منح الصلاحيات يتم عبر دورة اعتماد واضحة لضمان مبدأ أقل صلاحية ممكنة. افتح تذكرة جديدة واختر التصنيف «صلاحيات»، ثم اذكر اسم النظام المطلوب الوصول إليه ونوع الصلاحية المطلوبة (عرض فقط، إدخال، أو تعديل) والمبرر الوظيفي باختصار. يجب أن تتم الموافقة من مديرك المباشر قبل التنفيذ، لذا اذكر بريده الإلكتروني في التذكرة لتسريع الاعتماد. تستغرق المعالجة عادة يوم عمل واحد بعد الموافقة، وسوف تصلك إشعارات بتغييرات حالة التذكرة حتى التنفيذ. عند تركك للوظيفة أو انتقالك لقسم آخر تُسحب الصلاحيات تلقائيًا ضمن المراجعة الدورية.",
    category: "access",
    tags: ["صلاحيات", "أنظمة", "اعتماد"],
  },
  {
    title: "Printer Troubleshooting Guide",
    excerpt: "Quick first-line checks for printers: power, paper jams, drivers, and print queue.",
    content:
      "Most printer problems are solved by a few simple checks before you need a technician. First, confirm the printer is powered on and its status lights are normal — a red or blinking light usually points to the exact fault. Second, open all covers and clear any paper jams carefully, pulling in the direction the paper feeds to avoid tearing. Third, on the terminal go to the print queue and cancel stuck jobs, then restart the print spooler or simply reboot the terminal. Fourth, if Windows reports an offline printer, reinstall the driver from the shared IT drive and set the printer as default again. If receipts still fail to print after these steps, open a hardware ticket mentioning the branch, the terminal number, and the printer model so we can dispatch a replacement.",
    category: "hardware",
    tags: ["printer", "receipts", "hardware"],
  },
  {
    title: "Email Setup on Mobile",
    excerpt: "Add your work mailbox to a phone in a few minutes using the official mail app.",
    content:
      "You can read and send work email from your personal phone without a separate license. On your phone open the built-in Mail app (or Outlook) and choose to add an account, then enter your work email address and select the manual/advanced setup option. Use IMAP with your full email address as the username and your mailbox password; the incoming server is imap.company.example with SSL on port 993, and the outgoing server is smtp.company.example with TLS on port 587. Accept the certificate prompt when it appears — that is your mail server's normal security certificate. For security, set the phone to require a passcode, because mail access is revoked automatically if the device is reported lost.",
    category: "software",
    tags: ["email", "mobile", "setup"],
  },
];

const sampleTickets = [
  {
    ticketNumber: "TKT-2026-0025",
    employee: "Omar Khaled",
    company: "Subway",
    product: "CRM System",
    description: "Email notifications not being sent automatically after lead generation.",
    category: "software",
    priority: "high",
    status: "resolved",
  },
  {
    ticketNumber: "TKT-2026-0024",
    employee: "Sara Mohamed",
    company: "Burger King",
    product: "CRM System",
    description: "Report generation taking too long when exporting quarterly data.",
    category: "software",
    priority: "medium",
    status: "open",
  },
  {
    ticketNumber: "TKT-2026-0023",
    employee: "Mohamed Elseify",
    company: "Domino's Pizza",
    product: "E-Receipt",
    description: "Thermal printer disconnected from cashier terminal #2.",
    category: "hardware",
    priority: "high",
    status: "open",
  },
  {
    ticketNumber: "TKT-2026-0022",
    employee: "Mostafa Majed",
    company: "Starbucks",
    product: "E-Invoice",
    description: "Tax invoice QR code not generating properly during checkout.",
    category: "software",
    priority: "urgent",
    status: "in-progress",
  },
  {
    ticketNumber: "TKT-2026-0021",
    employee: "Ahmed Hassan",
    company: "McDonald's",
    product: "Inventory Management",
    description: "Stock adjustment discrepancy between warehouse and branch app.",
    category: "software",
    priority: "medium",
    status: "open",
  },
  {
    ticketNumber: "TKT-2026-0020",
    employee: "Mohamed Elseify",
    company: "Subway",
    product: "POS System",
    description: "Card reader timeout during contactless payments.",
    category: "hardware",
    priority: "high",
    status: "resolved",
  },
  {
    ticketNumber: "TKT-2026-0019",
    employee: "Andrew Ehab",
    company: "Subway",
    product: "E-Receipt",
    description: "Digital receipt SMS failing to deliver to customer mobile numbers.",
    category: "network",
    priority: "low",
    status: "resolved",
  },
  {
    ticketNumber: "TKT-2026-0018",
    employee: "Andrew Ehab",
    company: "KFC",
    product: "Accounting Software",
    description: "General ledger sync error with central ERP system.",
    category: "software",
    priority: "urgent",
    status: "open",
  },
  {
    ticketNumber: "TKT-2026-0017",
    employee: "Andrew Ehab",
    company: "Burger King",
    product: "E-Invoice",
    description: "Portal session expires prematurely during invoice upload.",
    category: "access",
    priority: "medium",
    status: "resolved",
  },
  {
    ticketNumber: "TKT-2026-0016",
    employee: "Andrew Ehab",
    company: "Pizza Hut",
    product: "E-Receipt",
    description: "Email receipt template alignment broken on mobile screens.",
    category: "software",
    priority: "low",
    status: "closed",
  },
];

async function seedUsers() {
  if (env.isProd && process.env.SEED_FORCE !== "true") {
    console.error("❌ Refusing to seed in production. Set SEED_FORCE=true to override.");
    process.exit(1);
  }

  // NOTE: keep ADMIN_EMAIL aligned with the demo admin below (Jameel) — a
  // mismatched bootstrap email creates a SECOND admin and breaks the demo
  // dataset contract of exactly 16 users / 1 admin (seed_audit verifies this).
  let adminEmail = process.env.ADMIN_EMAIL || "admin@jameel-it.com";
  let adminPassword = process.env.ADMIN_PASSWORD || "password123";

  try {
    // FIX(QA-rec-5b / seed-audit): only manage the connection when we are
    // the host. If a test harness (or any embedder) already connected
    // mongoose, reuse THAT connection — and don't disconnect it at the end
    // (our old disconnect() killed the host's in-memory DB mid-suite).
    const wasConnected = mongoose.connection.readyState === 1;
    if (!wasConnected) {
      await mongoose.connect(env.dbUrl);
      console.log("✅ Connected to MongoDB");
    }

    // Clear existing tickets & users if requested or ensure missing ones created
    const existingAdmin = await User.findOne({ email: adminEmail });
    let adminUserObj = existingAdmin;
    if (!existingAdmin) {
      // If the bootstrap email matches a sampleUsers entry, inherit its
      // name/role so the demo admin stays "Jameel Admin" (not "System Admin").
      const bootstrapSample = sampleUsers.find((u) => u.email === adminEmail);
      const hash = await bcrypt.hash(adminPassword, env.bcryptSaltRounds);
      adminUserObj = await User.create({
        name: bootstrapSample ? bootstrapSample.name : "System Admin",
        email: adminEmail,
        password: hash,
        role: bootstrapSample ? bootstrapSample.role : "admin",
        emailVerifiedAt: new Date(),
      });
      console.log(`✓ Created admin: ${adminEmail}`);
    }

    const createdUsers = {};
    // Keyed by NAME — sampleTickets reference creators by name
    createdUsers[adminUserObj.name] = adminUserObj;

    // FIX(QA-rec-5): was findOne PER sample user (N sequential round-trips).
    // One $in batch fetch now; the loop only creates what's missing.
    const existingUsersByEmail = {};
    for (const u of await User.find({ email: { $in: sampleUsers.map((s) => s.email) } })) {
      existingUsersByEmail[u.email] = u;
    }
    for (const u of sampleUsers) {
      let userObj = existingUsersByEmail[u.email];
      if (!userObj) {
        const hash = await bcrypt.hash(u.password, env.bcryptSaltRounds);
        userObj = await User.create({
          ...u,
          password: hash,
          emailVerifiedAt: new Date(),
        });
        console.log(`✓ Created user: ${u.name} (${u.role})`);
      }
      createdUsers[userObj.name] = userObj;
    }

    // Seed the company directory (links tickets to real customer entities)
    // FIX(QA-rec-5): same batch pattern for companies — one $in lookup.
    const companyIdByName = {};
    const existingCompanies = {};
    for (const c of await Company.find({ name: { $in: sampleCompanies.map((s) => s.name) } })) {
      existingCompanies[c.name] = c;
    }
    for (const c of sampleCompanies) {
      let companyObj = existingCompanies[c.name];
      if (!companyObj) {
        companyObj = await Company.create(c);
        console.log(`✓ Created company: ${c.name}`);
      }
      companyIdByName[c.name] = companyObj._id;
    }

    // Seed default SLA policies (idempotent)
    await slaPolicyService.ensureDefaultPolicies();

    // Seed canned responses
    for (const cr of sampleCannedResponses) {
      const exists = await CannedResponse.findOne({ title: cr.title });
      if (!exists) {
        await CannedResponse.create({ ...cr, createdBy: adminUserObj._id });
        console.log(`✓ Created canned response: ${cr.title}`);
      }
    }

    // Seed KB articles (idempotent — keyed on the computed slug, same
    // unicode-aware slugify the admin create endpoint uses)
    for (const kb of sampleKbArticles) {
      const slug = slugify(kb.title);
      const exists = await KBArticle.findOne({ slug });
      if (!exists) {
        await KBArticle.create({
          ...kb,
          slug,
          author: adminUserObj._id,
          published: true,
        });
        console.log(`✓ Created KB article: ${kb.title} (slug: ${slug})`);
      }
    }

    // Seed Tickets (with company links + tags)
    for (const t of sampleTickets) {
      const exists = await Ticket.findOne({ ticketNumber: t.ticketNumber });
      if (!exists) {
        const creator = createdUsers[t.employee] || createdUsers["Jameel Admin"] || adminUserObj;
        await Ticket.create({
          ...t,
          user: creator._id,
          companyId: companyIdByName[t.company] || null,
          tags: [t.category],
          startDate: new Date(),
          slaDueDate: await slaPolicyService.computeSlaDueDate(t.priority),
          history: [{ action: "created", by: creator._id, note: "Initial ticket creation" }],
        });
        console.log(`✓ Created ticket: ${t.ticketNumber} (${t.company} - ${t.product})`);
      }
    }

    console.log("\n✅ Database Seeding Completed!");
    console.log(`\n📋 Login Credentials:`);
    console.log(`   Admin : ${adminEmail} / ${adminPassword}`);
    console.log(`   Agent : agent.laila@example.com / Demo@1234`);
    console.log(`   User  : mo.jameel.official@gmail.com / password123`);
    console.log(`   User  : ahmed.hassan@example.com / Demo@1234`);
    // FIX(QA-env): never process.exit() inside an exported function — it
    // kills any host process that required this module (e.g. test harness)
    // and can truncate pending stdout writes. Only disconnect when WE opened
    // the connection — a host-provided connection stays open for its owner.
    if (!wasConnected) await mongoose.disconnect();
  } catch (err) {
    // FIX(QA-env): rethrow instead of exit(1) so callers can handle it.
    throw new Error(`Seeding failed: ${err.message}`);
  }
}

if (require.main === module) {
  seedUsers().catch((err) => {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  });
}

module.exports = seedUsers;
