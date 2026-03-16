import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('school.db');
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
    INSERT INTO students (id, name, age, level, parentName, parentPhone, avatar, remainingHours, userId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStudent.run('s1', 'Emma Chen', 8, 'Intermediate', 'David Chen', '138-0013-8000', 'https://picsum.photos/seed/emma/100/100', 12, 'u3');
  insertStudent.run('s2', 'Liam Wang', 6, 'Beginner', 'Sarah Wang', '139-1122-3344', 'https://picsum.photos/seed/liam/100/100', 4, null);
  insertStudent.run('s3', 'Sophia Li', 10, 'Advanced', 'Michael Li', '137-5566-7788', 'https://picsum.photos/seed/sophia/100/100', 25, null);

  const insertTeacher = db.prepare(`
    INSERT INTO teachers (id, name, phone, email, specialization, avatar, status, userId)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertTeacher.run('t1', 'Ms. Sarah', '138-0000-1111', 'sarah@pianoedu.com', 'Piano', 'https://picsum.photos/seed/sarah/100/100', 'active', 'u2');
  insertTeacher.run('t2', 'Mr. Zhang', '138-0000-2222', 'zhang@pianoedu.com', 'Music Theory', 'https://picsum.photos/seed/zhang/100/100', 'active', null);

  const insertCourse = db.prepare(`
    INSERT INTO courses (id, title, date, startTime, endTime, teacherId, teacherName, studentId, studentName, room, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const today = new Date().toISOString().split('T')[0];
  insertCourse.run('c1', 'Piano Private Lesson', today, '10:00', '11:00', 't1', 'Ms. Sarah', 's1', 'Emma Chen', 'Room 102', 'scheduled');
  insertCourse.run('c2', 'Music Theory Group', today, '14:00', '15:30', 't2', 'Mr. Zhang', 's2', 'Liam Wang', 'Hall A', 'scheduled');

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

export default db;
