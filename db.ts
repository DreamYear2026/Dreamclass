import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const dbPath = process.env.DATABASE_URL || 'school.db';
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    role TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    expiresAt TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS campuses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    status TEXT DEFAULT 'active',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'parent',
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar TEXT,
    permissions TEXT DEFAULT '[]',
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    level TEXT,
    parentName TEXT,
    parentPhone TEXT,
    avatar TEXT,
    remainingHours INTEGER DEFAULT 0,
    userId TEXT,
    campusId TEXT,
    status TEXT DEFAULT 'active',
    tags TEXT,
    notes TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (campusId) REFERENCES campuses(id)
  );

  CREATE TABLE IF NOT EXISTS hours_change_records (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    changeAmount INTEGER NOT NULL,
    previousHours INTEGER NOT NULL,
    newHours INTEGER NOT NULL,
    reason TEXT,
    operatorId TEXT NOT NULL,
    operatorName TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (studentId) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    specialization TEXT,
    avatar TEXT,
    status TEXT DEFAULT 'active',
    userId TEXT,
    campusId TEXT,
    FOREIGN KEY (userId) REFERENCES users(id),
    FOREIGN KEY (campusId) REFERENCES campuses(id)
  );

  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    teacherId TEXT,
    teacherName TEXT,
    studentId TEXT,
    studentName TEXT,
    room TEXT,
    status TEXT DEFAULT 'scheduled',
    campusId TEXT,
    FOREIGN KEY (studentId) REFERENCES students(id),
    FOREIGN KEY (teacherId) REFERENCES teachers(id),
    FOREIGN KEY (campusId) REFERENCES campuses(id)
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    courseId TEXT NOT NULL,
    studentId TEXT NOT NULL,
    status TEXT NOT NULL,
    date TEXT NOT NULL,
    FOREIGN KEY (courseId) REFERENCES courses(id),
    FOREIGN KEY (studentId) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS feedbacks (
    id TEXT PRIMARY KEY,
    courseId TEXT NOT NULL,
    studentId TEXT NOT NULL,
    teacherId TEXT NOT NULL,
    content TEXT NOT NULL,
    homework TEXT,
    rating INTEGER DEFAULT 5,
    date TEXT NOT NULL,
    FOREIGN KEY (courseId) REFERENCES courses(id),
    FOREIGN KEY (studentId) REFERENCES students(id),
    FOREIGN KEY (teacherId) REFERENCES teachers(id)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    amount REAL NOT NULL,
    hours INTEGER DEFAULT 0,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'paid',
    description TEXT,
    FOREIGN KEY (studentId) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    senderId TEXT NOT NULL,
    senderRole TEXT NOT NULL,
    receiverId TEXT NOT NULL,
    receiverRole TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    read INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    read INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    level TEXT,
    description TEXT,
    filename TEXT,
    size TEXT,
    uploadDate TEXT NOT NULL,
    uploadedBy TEXT
  );

  CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    courseId TEXT NOT NULL,
    studentId TEXT NOT NULL,
    studentName TEXT NOT NULL,
    type TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    requestDate TEXT NOT NULL,
    preferredDate TEXT,
    preferredTime TEXT,
    processedBy TEXT,
    processedDate TEXT,
    response TEXT
  );

  CREATE TABLE IF NOT EXISTS homeworks (
    id TEXT PRIMARY KEY,
    courseId TEXT,
    studentId TEXT NOT NULL,
    studentName TEXT NOT NULL,
    teacherId TEXT NOT NULL,
    teacherName TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    dueDate TEXT,
    status TEXT DEFAULT 'pending',
    submittedContent TEXT,
    submittedAt TEXT,
    reviewComment TEXT,
    rating INTEGER,
    reviewedAt TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    age INTEGER,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    notes TEXT DEFAULT '',
    interests TEXT,
    tags TEXT,
    assignedTo TEXT,
    assignedName TEXT,
    studentId TEXT,
    nextFollowUp TEXT,
    trialDate TEXT,
    lastContacted TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS follow_ups (
    id TEXT PRIMARY KEY,
    leadId TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    result TEXT NOT NULL,
    scheduledDate TEXT,
    createdBy TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (leadId) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    description TEXT,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    targetAudience TEXT,
    budget REAL,
    conversionGoal INTEGER,
    actualConversions INTEGER,
    createdBy TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    value REAL NOT NULL,
    minPurchase REAL,
    maxDiscount REAL,
    status TEXT NOT NULL,
    validFrom TEXT NOT NULL,
    validUntil TEXT NOT NULL,
    usageLimit INTEGER,
    usedCount INTEGER DEFAULT 0,
    applicableCourses TEXT,
    campaignId TEXT,
    createdBy TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (campaignId) REFERENCES marketing_campaigns(id)
  );

  CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id TEXT PRIMARY KEY,
    couponId TEXT NOT NULL,
    code TEXT NOT NULL,
    leadId TEXT,
    studentId TEXT,
    redeemedBy TEXT NOT NULL,
    redeemedAt TEXT NOT NULL,
    FOREIGN KEY (couponId) REFERENCES coupons(id),
    FOREIGN KEY (leadId) REFERENCES leads(id),
    FOREIGN KEY (studentId) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    referrerId TEXT NOT NULL,
    referrerName TEXT NOT NULL,
    referrerPhone TEXT,
    referredName TEXT NOT NULL,
    referredPhone TEXT,
    status TEXT NOT NULL,
    rewardType TEXT NOT NULL,
    rewardValue REAL NOT NULL,
    rewardClaimed INTEGER DEFAULT 0,
    leadId TEXT,
    studentId TEXT,
    createdAt TEXT NOT NULL,
    completedAt TEXT,
    FOREIGN KEY (leadId) REFERENCES leads(id),
    FOREIGN KEY (studentId) REFERENCES students(id)
  );
`);

const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  const hashedPassword = bcrypt.hashSync('123456', 10);
  
  const insertCampus = db.prepare(`
    INSERT INTO campuses (id, name, address, phone, status, createdAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  insertCampus.run('campus1', '总部校区', '北京市朝阳区建国路88号', '010-88888888', 'active', new Date().toISOString());
  insertCampus.run('campus2', '海淀分校', '北京市海淀区中关村大街1号', '010-66666666', 'active', new Date().toISOString());
  
  const insertUser = db.prepare(`
    INSERT INTO users (id, username, password, role, name, email, phone, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('u1', 'admin', hashedPassword, 'admin', '系统管理员', 'admin@pianoedu.com', '138-0000-0000', 'https://picsum.photos/seed/admin/100/100');
  insertUser.run('u2', 'teacher1', hashedPassword, 'teacher', 'Ms. Sarah', 'sarah@pianoedu.com', '138-0000-1111', 'https://picsum.photos/seed/sarah/100/100');
  insertUser.run('u3', 'parent1', hashedPassword, 'parent', 'David Chen', 'david@example.com', '138-0013-8000', 'https://picsum.photos/seed/david/100/100');

  const insertStudent = db.prepare(`
    INSERT INTO students (id, name, age, level, parentName, parentPhone, avatar, remainingHours, userId, campusId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStudent.run('s1', 'Emma Chen', 8, 'Intermediate', 'David Chen', '138-0013-8000', 'https://picsum.photos/seed/emma/100/100', 12, 'u3', 'campus1');
  insertStudent.run('s2', 'Liam Wang', 6, 'Beginner', 'Sarah Wang', '139-1122-3344', 'https://picsum.photos/seed/liam/100/100', 4, null, 'campus1');
  insertStudent.run('s3', 'Sophia Li', 10, 'Advanced', 'Michael Li', '137-5566-7788', 'https://picsum.photos/seed/sophia/100/100', 25, null, 'campus2');

  const insertTeacher = db.prepare(`
    INSERT INTO teachers (id, name, phone, email, specialization, avatar, status, userId, campusId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTeacher.run('t1', 'Ms. Sarah', '138-0000-1111', 'sarah@pianoedu.com', 'Piano', 'https://picsum.photos/seed/sarah/100/100', 'active', 'u2', 'campus1');
  insertTeacher.run('t2', 'Mr. Zhang', '138-0000-2222', 'zhang@pianoedu.com', 'Music Theory', 'https://picsum.photos/seed/zhang/100/100', 'active', null, 'campus2');

  const insertCourse = db.prepare(`
    INSERT INTO courses (id, title, date, startTime, endTime, teacherId, teacherName, studentId, studentName, room, status, campusId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date().toISOString().split('T')[0];
  insertCourse.run('c1', 'Piano Private Lesson', today, '10:00', '11:00', 't1', 'Ms. Sarah', 's1', 'Emma Chen', 'Room 102', 'scheduled', 'campus1');
  insertCourse.run('c2', 'Music Theory Group', today, '14:00', '15:30', 't2', 'Mr. Zhang', 's2', 'Liam Wang', 'Hall A', 'scheduled', 'campus1');

  const insertFeedback = db.prepare(`
    INSERT INTO feedbacks (id, courseId, studentId, teacherId, content, homework, rating, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertFeedback.run('f1', 'c1', 's1', 't1', 'Great progress this week! Keep practicing the scales.', 'Practice C major scale 10 times daily.', 5, today);

  const insertPayment = db.prepare(`
    INSERT INTO payments (id, studentId, amount, hours, date, status, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertPayment.run('p1', 's1', 1200, 10, '2024-01-15', 'paid', '10 hours package');
  insertPayment.run('p2', 's2', 600, 5, '2024-02-01', 'paid', '5 hours package');

  const insertMaterial = db.prepare(`
    INSERT INTO materials (id, title, type, category, level, description, filename, size, uploadDate, uploadedBy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMaterial.run('m1', '钢琴基础教程 - 第一册', 'pdf', '教材', 'Beginner', '适合零基础学员的入门教材', 'piano_basics_1.pdf', '15.2 MB', today, 'u1');
  insertMaterial.run('m2', '音阶练习视频教程', 'video', '视频', 'Intermediate', '详细讲解各大调音阶的演奏技巧', 'scales_tutorial.mp4', '256 MB', today, 'u1');
}

const superAdminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('Dreamyear') as { id: string } | undefined;
if (!superAdminExists) {
  const superAdminPassword = bcrypt.hashSync('mengnian888', 10);
  db.prepare(`
    INSERT INTO users (id, username, password, role, name, email, phone, avatar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'u_super_admin',
    'Dreamyear',
    superAdminPassword,
    'super_admin',
    'DreamYear 超级管理员',
    'dreamyear@admin.local',
    '',
    'https://picsum.photos/seed/superadmin/100/100'
  );
}

const defaultCampusRow = db.prepare(`SELECT id FROM campuses ORDER BY createdAt ASC LIMIT 1`).get() as any;
const defaultCampusId = defaultCampusRow?.id as string | undefined;
if (defaultCampusId) {
  db.prepare(`UPDATE students SET campusId = ? WHERE campusId IS NULL OR campusId = ''`).run(defaultCampusId);
  db.prepare(`UPDATE teachers SET campusId = ? WHERE campusId IS NULL OR campusId = ''`).run(defaultCampusId);

  db.prepare(`
    UPDATE courses
    SET campusId = (SELECT campusId FROM students s WHERE s.id = courses.studentId)
    WHERE (campusId IS NULL OR campusId = '')
  `).run();

  db.prepare(`UPDATE courses SET campusId = ? WHERE campusId IS NULL OR campusId = ''`).run(defaultCampusId);
}

const leadCount = db.prepare('SELECT count(*) as count FROM leads').get() as { count: number };
if (leadCount.count === 0) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const inTwoDays = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

  const insertLead = db.prepare(`
    INSERT INTO leads (
      id, name, phone, email, address, age, source, status, notes, interests, tags,
      assignedTo, assignedName, studentId, nextFollowUp, trialDate, lastContacted, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const leads = [
    ['l1', '王小明', '138-0001-0001', null, null, 8, 'wechat', 'new', '对钢琴课程很感兴趣', JSON.stringify(['钢琴']), JSON.stringify(['钢琴', '儿童']), 't1', '张老师', null, null, null, null, now.toISOString(), now.toISOString()],
    ['l2', '李小红', '138-0002-0002', null, null, 6, 'referral', 'contacted', '已联系，约定试听', null, null, null, null, null, tomorrow, null, now.toISOString(), new Date(Date.now() - 5 * 86400000).toISOString(), now.toISOString()],
    ['l3', '张小华', '138-0003-0003', null, null, 10, 'offline', 'trial', '试听课已安排', null, null, null, null, null, null, inTwoDays, now.toISOString(), new Date(Date.now() - 7 * 86400000).toISOString(), now.toISOString()],
    ['l4', '赵小芳', '138-0004-0004', null, null, 7, 'wechat', 'converted', '已报名', null, null, null, null, 's1', null, null, now.toISOString(), new Date(Date.now() - 14 * 86400000).toISOString(), now.toISOString()],
    ['l5', '孙小强', '138-0005-0005', null, null, 9, 'website', 'lost', '价格太高', null, null, null, null, null, null, null, now.toISOString(), new Date(Date.now() - 30 * 86400000).toISOString(), now.toISOString()],
  ] as const;

  leads.forEach((l) => insertLead.run(...l));

  const insertCampaign = db.prepare(`
    INSERT INTO marketing_campaigns (
      id, name, type, status, description, startDate, endDate,
      targetAudience, budget, conversionGoal, actualConversions, createdBy, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCampaign.run(
    'c1',
    '春季招生特惠',
    'discount',
    'active',
    '春季课程9折优惠',
    '2026-03-01',
    '2026-04-30',
    '新学员',
    5000,
    50,
    32,
    'admin',
    now.toISOString(),
    now.toISOString()
  );

  insertCampaign.run(
    'c2',
    '好友转介绍',
    'referral',
    'active',
    '推荐好友各得2课时',
    '2026-01-01',
    '2026-12-31',
    '全体学员',
    null,
    100,
    45,
    'admin',
    now.toISOString(),
    now.toISOString()
  );

  const insertCoupon = db.prepare(`
    INSERT INTO coupons (
      id, code, type, value, minPurchase, maxDiscount, status, validFrom, validUntil,
      usageLimit, usedCount, applicableCourses, campaignId, createdBy, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertCoupon.run(
    'cp1',
    'SPRING2026',
    'percentage',
    10,
    null,
    null,
    'active',
    '2026-03-01',
    '2026-04-30',
    100,
    32,
    null,
    'c1',
    'admin',
    now.toISOString()
  );

  insertCoupon.run(
    'cp2',
    'FREETRIAL',
    'free_trial',
    1,
    null,
    null,
    'active',
    '2026-01-01',
    '2026-12-31',
    null,
    0,
    null,
    'c2',
    'admin',
    now.toISOString()
  );

  const insertReferral = db.prepare(`
    INSERT INTO referrals (
      id, referrerId, referrerName, referrerPhone, referredName, referredPhone,
      status, rewardType, rewardValue, rewardClaimed, leadId, studentId, createdAt, completedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertReferral.run(
    'r1',
    's1',
    '王小明妈妈',
    '138-0001-0001',
    '李小红',
    '138-0002-0002',
    'paid',
    'free_lesson',
    2,
    0,
    'l2',
    null,
    now.toISOString(),
    null
  );

  const insertFollowUp = db.prepare(`
    INSERT INTO follow_ups (id, leadId, type, content, result, scheduledDate, createdBy, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertFollowUp.run(
    'f1',
    'l2',
    'call',
    '已联系，约定试听时间',
    'scheduled',
    inTwoDays,
    't1',
    now.toISOString()
  );
}

export default db;
