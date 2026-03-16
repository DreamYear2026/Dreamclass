import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import db from './db';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

interface SessionUser {
  userId: string;
  role: string;
}

interface AuthRequest extends Request {
  user?: SessionUser;
}

const ALLOWED_USER_FIELDS = ['name', 'email', 'phone'];
const ALLOWED_STUDENT_FIELDS = ['name', 'age', 'level', 'parentName', 'parentPhone', 'remainingHours', 'notes', 'status', 'tags', 'campusId'];
const ALLOWED_TEACHER_FIELDS = ['name', 'phone', 'email', 'specialization', 'status'];

const SESSION_EXPIRY_DAYS = 7;

function createSession(sessionId: string, userId: string, role: string): void {
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO sessions (id, userId, role, expiresAt)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, userId, role, expiresAt);
}

function getSession(sessionId: string): SessionUser | null {
  const session = db.prepare(`
    SELECT userId, role FROM sessions WHERE id = ? AND expiresAt > ?
  `).get(sessionId, new Date().toISOString()) as SessionUser | undefined;
  
  return session || null;
}

function deleteSession(sessionId: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

function cleanExpiredSessions(): void {
  db.prepare('DELETE FROM sessions WHERE expiresAt < ?').run(new Date().toISOString());
}

const requireAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const sessionId = req.cookies?.sessionId;
  
  if (!sessionId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const session = getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Session expired' });
  }

  req.user = session;
  next();
};

const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

function validateFields(fields: Record<string, any>, allowed: string[]): { updates: string[]; values: any[] } {
  const updates: string[] = [];
  const values: any[] = [];
  
  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key) && value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }
  
  return { updates, values };
}

const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|mp4|mp3|wav|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('不支持的文件类型'));
  },
});

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '梦年艺术教务系统 API',
      version: '1.0.0',
      description: '钢琴艺术培训教务管理系统 API 文档',
    },
    servers: [
      { url: 'http://localhost:3000', description: '开发服务器' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'sessionId',
        },
      },
    },
  },
  apis: ['./server.ts'],
};

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('combined'));

  cleanExpiredSessions();

  app.use('/uploads', express.static(uploadsDir));

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: '登录尝试次数过多，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: { error: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', apiLimiter);

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: 用户登录
   *     tags: [认证]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [username, password]
   *             properties:
   *               username:
   *                 type: string
   *               password:
   *                 type: string
   *     responses:
   *       200:
   *         description: 登录成功
   *       401:
   *         description: 用户名或密码错误
   */
  app.post('/api/auth/login', loginLimiter, (req: AuthRequest, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const sessionId = crypto.randomBytes(32).toString('hex');
    createSession(sessionId, user.id, user.role);

    res.cookie('sessionId', sessionId, { 
      httpOnly: true, 
      maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
    });
  });

  /**
   * @swagger
   * /api/auth/me:
   *   patch:
   *     summary: 更新当前用户信息
   *     tags: [认证]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               email:
   *                 type: string
   *               phone:
   *                 type: string
   *     responses:
   *       200:
   *         description: 更新成功
   */
  app.patch('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
    const { name, email, phone } = req.body;
    const session = req.user!;
    
    const { updates, values } = validateFields({ name, email, phone }, ALLOWED_USER_FIELDS);
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(session.userId);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId) as any;
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
    });
  });

  /**
   * @swagger
   * /api/auth/password:
   *   post:
   *     summary: 修改密码
   *     tags: [认证]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - currentPassword
   *               - newPassword
   *             properties:
   *               currentPassword:
   *                 type: string
   *               newPassword:
   *                 type: string
   *     responses:
   *       200:
   *         description: 密码修改成功
   *       400:
   *         description: 当前密码错误
   */
  app.post('/api/auth/password', requireAuth, async (req: AuthRequest, res) => {
    const { currentPassword, newPassword } = req.body;
    const session = req.user!;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: '当前密码错误' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, session.userId);
    
    res.json({ success: true });
  });

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: 用户登出
   *     tags: [认证]
   *     responses:
   *       200:
   *         description: 登出成功
   */
  app.post('/api/auth/logout', (req: AuthRequest, res) => {
    const sessionId = req.cookies?.sessionId;
    if (sessionId) {
      deleteSession(sessionId);
    }
    res.clearCookie('sessionId');
    res.json({ success: true });
  });

  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     summary: 获取当前用户信息
   *     tags: [认证]
   *     security:
   *       - cookieAuth: []
   *     responses:
   *       200:
   *         description: 用户信息
   *       401:
   *         description: 未认证
   */
  app.get('/api/auth/me', (req: AuthRequest, res) => {
    const sessionId = req.cookies?.sessionId;
    
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const session = getSession(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId) as any;
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
    });
  });

  /**
   * @swagger
   * /api/upload:
   *   post:
   *     summary: 上传文件
   *     tags: [文件]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *     responses:
   *       200:
   *         description: 文件上传成功
   */
  app.post('/api/upload', requireAuth, upload.single('file'), (req: AuthRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
    });
  });

  /**
   * @swagger
   * /api/students:
   *   get:
   *     summary: 获取所有学员
   *     tags: [学员]
   *     responses:
   *       200:
   *         description: 学员列表
   */
  app.get('/api/students', requireAuth, (req: AuthRequest, res) => {
    const students = db.prepare('SELECT * FROM students').all() as any[];
    const parsedStudents = students.map(s => ({
      ...s,
      tags: s.tags ? JSON.parse(s.tags) : []
    }));
    res.json(parsedStudents);
  });

  /**
   * @swagger
   * /api/campuses:
   *   get:
   *     summary: 获取所有校区
   *     tags: [校区]
   *     responses:
   *       200:
   *         description: 校区列表
   */
  app.get('/api/campuses', requireAuth, (req: AuthRequest, res) => {
    const campuses = db.prepare('SELECT * FROM campuses ORDER BY createdAt DESC').all();
    res.json(campuses);
  });

  // 用户管理 API
  app.get('/api/users', requireAuth, requireAdmin, (req: AuthRequest, res) => {
    const users = db.prepare('SELECT id, username, name, role, permissions, createdAt FROM users ORDER BY createdAt DESC').all();
    res.json(users);
  });

  app.post('/api/users', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    const { username, password, name, role, permissions } = req.body;
    
    if (!username || !password || !name || !role) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    
    db.prepare(`
      INSERT INTO users (id, username, password, name, role, permissions)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, username, hashedPassword, name, role, JSON.stringify(permissions || []));

    res.json({ id, username, name, role, permissions: permissions || [] });
  });

  app.put('/api/users/:id', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { name, role, permissions, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.prepare(`
        UPDATE users SET name = ?, role = ?, permissions = ?, password = ? WHERE id = ?
      `).run(name, role, JSON.stringify(permissions || []), hashedPassword, id);
    } else {
      db.prepare(`
        UPDATE users SET name = ?, role = ?, permissions = ? WHERE id = ?
      `).run(name, role, JSON.stringify(permissions || []), id);
    }

    res.json({ success: true });
  });

  app.delete('/api/users/:id', requireAuth, requireAdmin, (req: AuthRequest, res) => {
    const { id } = req.params;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  });

  /**
   * @swagger
   * /api/campuses:
   *   post:
   *     summary: 添加校区
   *     tags: [校区]
   *     security:
   *       - cookieAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *             properties:
   *               name:
   *                 type: string
   *               address:
   *                 type: string
   *               phone:
   *                 type: string
   *     responses:
   *       201:
   *         description: 校区创建成功
   */
  app.post('/api/campuses', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const { name, address, phone } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();
    
    db.prepare(`
      INSERT INTO campuses (id, name, address, phone, status, createdAt)
      VALUES (?, ?, ?, ?, 'active', ?)
    `).run(id, name, address || '', phone || '', createdAt);

    const campus = db.prepare('SELECT * FROM campuses WHERE id = ?').get(id);
    res.status(201).json(campus);
  });

  /**
   * @swagger
   * /api/campuses/{id}:
   *   put:
   *     summary: 更新校区
   *     tags: [校区]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               address:
   *                 type: string
   *               phone:
   *                 type: string
   *               status:
   *                 type: string
   *                 enum: [active, inactive]
   *     responses:
   *       200:
   *         description: 更新成功
   */
  app.put('/api/campuses/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const { name, address, phone, status } = req.body;
    const { id } = req.params;

    const campus = db.prepare('SELECT * FROM campuses WHERE id = ?').get(id);
    if (!campus) {
      return res.status(404).json({ error: 'Campus not found' });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name) { updates.push('name = ?'); values.push(name); }
    if (address !== undefined) { updates.push('address = ?'); values.push(address); }
    if (phone !== undefined) { updates.push('phone = ?'); values.push(phone); }
    if (status) { updates.push('status = ?'); values.push(status); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    db.prepare(`UPDATE campuses SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM campuses WHERE id = ?').get(id);
    res.json(updated);
  });

  /**
   * @swagger
   * /api/campuses/{id}:
   *   delete:
   *     summary: 删除校区
   *     tags: [校区]
   *     security:
   *       - cookieAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: 删除成功
   */
  app.delete('/api/campuses/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const { id } = req.params;

    const campus = db.prepare('SELECT * FROM campuses WHERE id = ?').get(id);
    if (!campus) {
      return res.status(404).json({ error: 'Campus not found' });
    }

    const studentsCount = db.prepare('SELECT count(*) as count FROM students WHERE campusId = ?').get(id) as { count: number };
    const teachersCount = db.prepare('SELECT count(*) as count FROM teachers WHERE campusId = ?').get(id) as { count: number };
    
    if (studentsCount.count > 0 || teachersCount.count > 0) {
      return res.status(400).json({ error: 'Cannot delete campus with associated students or teachers' });
    }

    db.prepare('DELETE FROM campuses WHERE id = ?').run(id);
    res.json({ message: 'Campus deleted successfully' });
  });

  /**
   * @swagger
   * /api/campuses/{id}/stats:
   *   get:
   *     summary: 获取校区统计
   *     tags: [校区]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: 校区统计数据
   */
  app.get('/api/campuses/:id/stats', requireAuth, (req: AuthRequest, res) => {
    const { id } = req.params;

    const studentsCount = db.prepare('SELECT count(*) as count FROM students WHERE campusId = ?').get(id) as { count: number };
    const teachersCount = db.prepare('SELECT count(*) as count FROM teachers WHERE campusId = ?').get(id) as { count: number };
    const coursesCount = db.prepare('SELECT count(*) as count FROM courses WHERE campusId = ?').get(id) as { count: number };

    res.json({
      students: studentsCount.count,
      teachers: teachersCount.count,
      courses: coursesCount.count,
    });
  });

  /**
   * @swagger
   * /api/students/{id}:
   *   get:
   *     summary: 获取单个学员
   *     tags: [学员]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: 学员信息
   *       404:
   *         description: 学员不存在
   */
  app.get('/api/students/:id', requireAuth, (req: AuthRequest, res) => {
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id) as any;
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({
      ...student,
      tags: student.tags ? JSON.parse(student.tags) : []
    });
  });

  /**
   * @swagger
   * /api/students:
   *   post:
   *     summary: 添加学员
   *     tags: [学员]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, parentName, parentPhone]
   *             properties:
   *               name:
   *                 type: string
   *               age:
   *                 type: integer
   *               level:
   *                 type: string
   *               parentName:
   *                 type: string
   *               parentPhone:
   *                 type: string
   *               remainingHours:
   *                 type: integer
   *     responses:
   *       201:
   *         description: 学员创建成功
   */
  app.post('/api/students', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const { name, age, level, parentName, parentPhone, avatar, remainingHours } = req.body;
    if (!name || !parentName || !parentPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO students (id, name, age, level, parentName, parentPhone, avatar, remainingHours)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, name, age || 8, level || 'Beginner', parentName, parentPhone, avatar || `https://picsum.photos/seed/${id}/100/100`, remainingHours || 0);
    res.status(201).json({ id, ...req.body });
  });

  app.patch('/api/students/:id', requireAuth, (req: AuthRequest, res) => {
    const { id } = req.params;
    const body = { ...req.body };
    
    if (body.tags && Array.isArray(body.tags)) {
      body.tags = JSON.stringify(body.tags);
    }
    
    const { updates, values } = validateFields(body, ALLOWED_STUDENT_FIELDS);
    
    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE students SET ${updates.join(', ')}, updatedAt = ? WHERE id = ?`).run(...values, new Date().toISOString());
    }
    res.json({ success: true });
  });

  app.delete('/api/students/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const { id } = req.params;
    
    const deleteTransaction = db.transaction(() => {
      db.prepare('DELETE FROM attendance WHERE studentId = ?').run(id);
      db.prepare('DELETE FROM feedbacks WHERE studentId = ?').run(id);
      db.prepare('DELETE FROM payments WHERE studentId = ?').run(id);
      db.prepare('DELETE FROM courses WHERE studentId = ?').run(id);
      db.prepare('DELETE FROM hours_change_records WHERE studentId = ?').run(id);
      db.prepare('DELETE FROM students WHERE id = ?').run(id);
    });
    
    deleteTransaction();
    res.json({ success: true });
  });

  app.post('/api/students/:id/hours-change', requireAuth, (req: AuthRequest, res) => {
    const { id } = req.params;
    const { changeAmount, reason } = req.body;
    const operatorId = req.user?.userId || '';
    
    const student = db.prepare('SELECT remainingHours, name FROM students WHERE id = ?').get(id) as { remainingHours: number; name: string } | undefined;
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    
    const previousHours = student.remainingHours;
    const newHours = Math.max(0, previousHours + changeAmount);
    
    const operator = db.prepare('SELECT name FROM users WHERE id = ?').get(operatorId) as { name: string } | undefined;
    const operatorName = operator?.name || 'System';
    
    const recordId = uuidv4();
    const now = new Date().toISOString();
    
    const transaction = db.transaction(() => {
      db.prepare('UPDATE students SET remainingHours = ?, updatedAt = ? WHERE id = ?').run(newHours, now, id);
      db.prepare(`
        INSERT INTO hours_change_records (id, studentId, changeAmount, previousHours, newHours, reason, operatorId, operatorName, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(recordId, id, changeAmount, previousHours, newHours, reason || '', operatorId, operatorName, now);
    });
    
    transaction();
    res.json({ success: true, previousHours, newHours, changeAmount });
  });

  app.get('/api/students/:id/hours-history', requireAuth, (req: AuthRequest, res) => {
    const { id } = req.params;
    const history = db.prepare('SELECT * FROM hours_change_records WHERE studentId = ? ORDER BY createdAt DESC').all(id);
    res.json(history);
  });

  app.post('/api/students/batch-delete', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No student IDs provided' });
    }
    
    const deleteTransaction = db.transaction(() => {
      for (const id of ids) {
        db.prepare('DELETE FROM attendance WHERE studentId = ?').run(id);
        db.prepare('DELETE FROM feedbacks WHERE studentId = ?').run(id);
        db.prepare('DELETE FROM payments WHERE studentId = ?').run(id);
        db.prepare('DELETE FROM courses WHERE studentId = ?').run(id);
        db.prepare('DELETE FROM hours_change_records WHERE studentId = ?').run(id);
        db.prepare('DELETE FROM students WHERE id = ?').run(id);
      }
    });
    
    deleteTransaction();
    res.json({ success: true, deletedCount: ids.length });
  });

  // Teachers
  app.get('/api/teachers', requireAuth, (req: AuthRequest, res) => {
    const teachers = db.prepare('SELECT * FROM teachers').all();
    res.json(teachers);
  });

  app.get('/api/teachers/:id', requireAuth, (req: AuthRequest, res) => {
    const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json(teacher);
  });

  app.post('/api/teachers', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const { name, phone, email, specialization, avatar, status } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO teachers (id, name, phone, email, specialization, avatar, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, name, phone, email, specialization, avatar || `https://picsum.photos/seed/${id}/100/100`, status || 'active');
    res.status(201).json({ id, ...req.body });
  });

  app.patch('/api/teachers/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const { id } = req.params;
    const { updates, values } = validateFields(req.body, ALLOWED_TEACHER_FIELDS);
    
    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE teachers SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }
    res.json({ success: true });
  });

  app.delete('/api/teachers/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const { id } = req.params;
    
    const deleteTransaction = db.transaction(() => {
      db.prepare('DELETE FROM feedbacks WHERE teacherId = ?').run(id);
      db.prepare('DELETE FROM courses WHERE teacherId = ?').run(id);
      db.prepare('DELETE FROM teachers WHERE id = ?').run(id);
    });
    
    deleteTransaction();
    res.json({ success: true });
  });

  // Attendance
  app.get('/api/attendance/:studentId', requireAuth, (req: AuthRequest, res) => {
    const { studentId } = req.params;
    const attendance = db.prepare('SELECT * FROM attendance WHERE studentId = ?').all(studentId);
    res.json(attendance);
  });

  app.post('/api/attendance', requireAuth, (req: AuthRequest, res) => {
    const { courseId, studentId, status, date } = req.body;
    if (!courseId || !studentId || !status || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO attendance (id, courseId, studentId, status, date)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, courseId, studentId, status, date);
    
    if (status === 'present') {
      db.prepare('UPDATE students SET remainingHours = remainingHours - 1 WHERE id = ?').run(studentId);
    }
    
    res.status(201).json({ id, ...req.body });
  });

  // Courses
  app.get('/api/courses', requireAuth, (req: AuthRequest, res) => {
    const courses = db.prepare('SELECT * FROM courses').all();
    res.json(courses);
  });

  app.get('/api/courses/:id', requireAuth, (req: AuthRequest, res) => {
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  });

  app.post('/api/courses', requireAuth, (req: AuthRequest, res) => {
    const { title, date, startTime, endTime, teacherId, teacherName, studentId, studentName, room } = req.body;
    if (!title || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO courses (id, title, date, startTime, endTime, teacherId, teacherName, studentId, studentName, room, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
    `);
    stmt.run(id, title, date, startTime, endTime, teacherId || 't1', teacherName, studentId, studentName, room);
    res.status(201).json({ id, ...req.body, status: 'scheduled' });
  });

  app.post('/api/courses/batch', requireAuth, (req: AuthRequest, res) => {
    const courses = req.body;
    if (!Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ error: 'Invalid courses data' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO courses (id, title, date, startTime, endTime, teacherId, teacherName, studentId, studentName, room, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled')
    `);
    
    const transaction = db.transaction((courses) => {
      for (const course of courses) {
        stmt.run(uuidv4(), course.title, course.date, course.startTime, course.endTime, course.teacherId || 't1', course.teacherName, course.studentId, course.studentName, course.room);
      }
    });
    
    transaction(courses);
    res.status(201).json({ success: true });
  });

  app.put('/api/courses/:id', requireAuth, (req: AuthRequest, res) => {
    const { id } = req.params;
    const { title, date, startTime, endTime, teacherId, teacherName, room } = req.body;
    db.prepare(`
      UPDATE courses SET title = ?, date = ?, startTime = ?, endTime = ?, teacherId = ?, teacherName = ?, room = ?
      WHERE id = ?
    `).run(title, date, startTime, endTime, teacherId, teacherName, room, id);
    res.json({ success: true });
  });

  app.delete('/api/courses/:id', requireAuth, (req: AuthRequest, res) => {
    const { id } = req.params;
    
    const deleteTransaction = db.transaction(() => {
      db.prepare('DELETE FROM attendance WHERE courseId = ?').run(id);
      db.prepare('DELETE FROM feedbacks WHERE courseId = ?').run(id);
      db.prepare('DELETE FROM courses WHERE id = ?').run(id);
    });
    
    deleteTransaction();
    res.json({ success: true });
  });

  app.patch('/api/courses/:id', requireAuth, (req: AuthRequest, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (status) {
      db.prepare('UPDATE courses SET status = ? WHERE id = ?').run(status, id);
    }
    res.json({ success: true });
  });

  // Feedbacks
  app.get('/api/feedbacks', requireAuth, (req: AuthRequest, res) => {
    const { studentId, teacherId } = req.query;
    let query = 'SELECT * FROM feedbacks';
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (studentId) {
      conditions.push('studentId = ?');
      params.push(studentId);
    }
    if (teacherId) {
      conditions.push('teacherId = ?');
      params.push(teacherId);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY date DESC';
    
    const feedbacks = db.prepare(query).all(...params);
    res.json(feedbacks);
  });

  app.post('/api/feedbacks', requireAuth, (req: AuthRequest, res) => {
    const { courseId, studentId, teacherId, content, homework, rating } = req.body;
    if (!courseId || !studentId || !teacherId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    const date = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      INSERT INTO feedbacks (id, courseId, studentId, teacherId, content, homework, rating, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, courseId, studentId, teacherId, content, homework || '', rating || 5, date);
    res.status(201).json({ id, ...req.body, date });
  });

  // Payments
  app.get('/api/payments', requireAuth, (req: AuthRequest, res) => {
    const { studentId } = req.query;
    let query = 'SELECT * FROM payments';
    const params: any[] = [];
    
    if (studentId) {
      query += ' WHERE studentId = ?';
      params.push(studentId);
    }
    query += ' ORDER BY date DESC';
    
    const payments = db.prepare(query).all(...params);
    res.json(payments);
  });

  app.post('/api/payments', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const { studentId, amount, hours, description } = req.body;
    if (!studentId || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    const date = new Date().toISOString().split('T')[0];
    
    const insertPayment = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO payments (id, studentId, amount, hours, date, status, description)
        VALUES (?, ?, ?, ?, ?, 'paid', ?)
      `);
      stmt.run(id, studentId, amount, hours || 0, date, description || '');
      
      if (hours && hours > 0) {
        db.prepare('UPDATE students SET remainingHours = remainingHours + ? WHERE id = ?').run(hours, studentId);
      }
    });
    
    insertPayment();
    res.status(201).json({ id, ...req.body, date, status: 'paid' });
  });

  // Messages
  app.get('/api/messages', requireAuth, (req: AuthRequest, res) => {
    const { userId, role } = req.query;
    let query = 'SELECT * FROM messages WHERE (receiverId = ? AND receiverRole = ?) OR (senderId = ? AND senderRole = ?)';
    const messages = db.prepare(query).all(userId, role, userId, role);
    res.json(messages);
  });

  app.post('/api/messages', requireAuth, (req: AuthRequest, res) => {
    const { senderId, senderRole, receiverId, receiverRole, content } = req.body;
    if (!senderId || !receiverId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO messages (id, senderId, senderRole, receiverId, receiverRole, content, timestamp, read)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);
    stmt.run(id, senderId, senderRole, receiverId, receiverRole, content, timestamp);
    res.status(201).json({ id, ...req.body, timestamp, read: false });
  });

  app.patch('/api/messages/:id/read', requireAuth, (req: AuthRequest, res) => {
    db.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Notifications
  app.get('/api/notifications/:userId', requireAuth, (req: AuthRequest, res) => {
    const notifications = db.prepare('SELECT * FROM notifications WHERE userId = ? ORDER BY timestamp DESC').all(req.params.userId);
    res.json(notifications);
  });

  app.post('/api/notifications', requireAuth, (req: AuthRequest, res) => {
    const { userId, title, content } = req.body;
    if (!userId || !title || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO notifications (id, userId, title, content, timestamp, read)
      VALUES (?, ?, ?, ?, ?, 0)
    `);
    stmt.run(id, userId, title, content, timestamp);
    res.status(201).json({ id, ...req.body, timestamp, read: false });
  });

  app.patch('/api/notifications/:id/read', requireAuth, (req: AuthRequest, res) => {
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Leave Requests
  app.get('/api/leave-requests', requireAuth, (req: AuthRequest, res) => {
    const leaveRequests = db.prepare('SELECT * FROM leave_requests ORDER BY requestDate DESC').all();
    res.json(leaveRequests);
  });

  app.post('/api/leave-requests', requireAuth, (req: AuthRequest, res) => {
    const { courseId, studentId, studentName, type, reason, preferredDate, preferredTime } = req.body;
    if (!courseId || !studentId || !type || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    const requestDate = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO leave_requests (id, courseId, studentId, studentName, type, reason, status, requestDate, preferredDate, preferredTime)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `);
    stmt.run(id, courseId, studentId, studentName, type, reason, requestDate, preferredDate || null, preferredTime || null);
    res.status(201).json({ id, ...req.body, status: 'pending', requestDate });
  });

  app.patch('/api/leave-requests/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const { status, response } = req.body;
    const processedDate = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE leave_requests 
      SET status = ?, processedBy = ?, processedDate = ?, response = ?
      WHERE id = ?
    `);
    stmt.run(status, req.user?.userId, processedDate, response || null, req.params.id);
    res.json({ success: true });
  });

  // Homeworks
  app.get('/api/homeworks', requireAuth, (req: AuthRequest, res) => {
    const homeworks = db.prepare('SELECT * FROM homeworks ORDER BY createdAt DESC').all();
    res.json(homeworks);
  });

  app.post('/api/homeworks', requireAuth, requireRole('teacher'), (req: AuthRequest, res) => {
    const { studentId, studentName, courseId, title, description, dueDate } = req.body;
    if (!studentId || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const teacher = db.prepare('SELECT name FROM teachers WHERE userId = ?').get(req.user?.userId) as { name: string } | undefined;
    const stmt = db.prepare(`
      INSERT INTO homeworks (id, courseId, studentId, studentName, teacherId, teacherName, title, description, dueDate, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `);
    stmt.run(id, courseId || null, studentId, studentName, req.user?.userId, teacher?.name || '', title, description || null, dueDate || null, createdAt);
    res.status(201).json({ id, ...req.body, status: 'pending', createdAt });
  });

  app.patch('/api/homeworks/:id/submit', requireAuth, (req: AuthRequest, res) => {
    const { submittedContent, submittedAt, status } = req.body;
    const stmt = db.prepare(`
      UPDATE homeworks SET submittedContent = ?, submittedAt = ?, status = ? WHERE id = ?
    `);
    stmt.run(submittedContent, submittedAt, status, req.params.id);
    res.json({ success: true });
  });

  app.patch('/api/homeworks/:id/review', requireAuth, requireRole('teacher'), (req: AuthRequest, res) => {
    const { reviewComment, rating, reviewedAt, status } = req.body;
    const stmt = db.prepare(`
      UPDATE homeworks SET reviewComment = ?, rating = ?, reviewedAt = ?, status = ? WHERE id = ?
    `);
    stmt.run(reviewComment || null, rating || null, reviewedAt, status, req.params.id);
    res.json({ success: true });
  });

  // Student Progress
  app.get('/api/student-progress/:studentId', requireAuth, (req: AuthRequest, res) => {
    const progress = db.prepare('SELECT * FROM student_progress WHERE studentId = ?').all(req.params.studentId);
    res.json(progress);
  });

  app.get('/api/learning-goals/:studentId', requireAuth, (req: AuthRequest, res) => {
    const goals = db.prepare('SELECT * FROM learning_goals WHERE studentId = ? ORDER BY createdAt DESC').all(req.params.studentId);
    res.json(goals);
  });

  app.post('/api/learning-goals', requireAuth, (req: AuthRequest, res) => {
    const { studentId, title, description, targetDate } = req.body;
    if (!studentId || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO learning_goals (id, studentId, title, description, targetDate, status, createdAt)
      VALUES (?, ?, ?, ?, ?, 'in_progress', ?)
    `);
    stmt.run(id, studentId, title, description || null, targetDate || null, createdAt);
    res.status(201).json({ id, ...req.body, status: 'in_progress', createdAt });
  });

  app.patch('/api/learning-goals/:id', requireAuth, (req: AuthRequest, res) => {
    const { status } = req.body;
    db.prepare('UPDATE learning_goals SET status = ? WHERE id = ?').run(status, req.params.id);
    res.json({ success: true });
  });

  app.get('/api/practice-records/:studentId', requireAuth, (req: AuthRequest, res) => {
    const records = db.prepare('SELECT * FROM practice_records WHERE studentId = ? ORDER BY date DESC').all(req.params.studentId);
    res.json(records);
  });

  app.post('/api/practice-records', requireAuth, (req: AuthRequest, res) => {
    const { studentId, date, duration, pieces, notes } = req.body;
    if (!studentId || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO practice_records (id, studentId, date, duration, pieces, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, studentId, date, duration || 0, JSON.stringify(pieces || []), notes || null);
    res.status(201).json({ id, ...req.body });
  });

  // Materials
  app.get('/api/materials', requireAuth, (req: AuthRequest, res) => {
    const materials = db.prepare('SELECT * FROM materials ORDER BY uploadDate DESC').all();
    res.json(materials);
  });

  app.post('/api/materials', requireAuth, (req: AuthRequest, res) => {
    const { title, type, category, level, description, filename, size, uploadedBy } = req.body;
    if (!title || !type || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    const uploadDate = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      INSERT INTO materials (id, title, type, category, level, description, filename, size, uploadDate, uploadedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, title, type, category, level || '', description || '', filename || '', size || '', uploadDate, uploadedBy || '');
    res.status(201).json({ id, ...req.body, uploadDate });
  });

  app.delete('/api/materials/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id) as any;
    if (material && material.filename) {
      const filePath = path.join(uploadsDir, material.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Backup and Restore
  app.get('/api/backup', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    try {
      const backup = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        students: db.prepare('SELECT * FROM students').all(),
        courses: db.prepare('SELECT * FROM courses').all(),
        teachers: db.prepare('SELECT * FROM teachers').all(),
        payments: db.prepare('SELECT * FROM payments').all(),
        feedbacks: db.prepare('SELECT * FROM feedbacks').all(),
        homeworks: db.prepare('SELECT * FROM homeworks').all(),
        leaveRequests: db.prepare('SELECT * FROM leave_requests').all(),
        campuses: db.prepare('SELECT * FROM campuses').all(),
      };
      
      backup.students = backup.students.map((s: any) => ({
        ...s,
        tags: s.tags ? JSON.parse(s.tags) : [],
      }));
      
      res.json(backup);
    } catch (error) {
      console.error('Backup failed:', error);
      res.status(500).json({ error: 'Backup failed' });
    }
  });

  app.post('/api/restore', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    try {
      const backup = req.body;
      
      if (!backup.version || !backup.createdAt) {
        return res.status(400).json({ error: 'Invalid backup file' });
      }

      db.transaction(() => {
        db.prepare('DELETE FROM students').run();
        db.prepare('DELETE FROM courses').run();
        db.prepare('DELETE FROM teachers').run();
        db.prepare('DELETE FROM payments').run();
        db.prepare('DELETE FROM feedbacks').run();
        db.prepare('DELETE FROM homeworks').run();
        db.prepare('DELETE FROM leave_requests').run();
        db.prepare('DELETE FROM campuses').run();

        backup.campuses?.forEach((campus: any) => {
          db.prepare(`
            INSERT INTO campuses (id, name, address, phone, status, createdAt)
            VALUES (?, ?, ?, ?, ?, ?)
          `).run(campus.id, campus.name, campus.address, campus.phone, campus.status, campus.createdAt);
        });

        backup.students?.forEach((student: any) => {
          db.prepare(`
            INSERT INTO students (id, name, age, level, parentName, parentPhone, remainingHours, avatar, userId, notes, status, tags, campusId, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            student.id, student.name, student.age, student.level, student.parentName, student.parentPhone,
            student.remainingHours, student.avatar, student.userId, student.notes, student.status,
            JSON.stringify(student.tags || []), student.campusId, student.createdAt, student.updatedAt
          );
        });

        backup.teachers?.forEach((teacher: any) => {
          db.prepare(`
            INSERT INTO teachers (id, name, phone, email, specialization, avatar, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(teacher.id, teacher.name, teacher.phone, teacher.email, teacher.specialization, teacher.avatar, teacher.status);
        });

        backup.courses?.forEach((course: any) => {
          db.prepare(`
            INSERT INTO courses (id, title, teacherId, teacherName, studentId, studentName, date, startTime, endTime, status, room)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            course.id, course.title, course.teacherId, course.teacherName, course.studentId,
            course.studentName, course.date, course.startTime, course.endTime, course.status, course.room
          );
        });

        backup.payments?.forEach((payment: any) => {
          db.prepare(`
            INSERT INTO payments (id, studentId, amount, hours, date, status, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(payment.id, payment.studentId, payment.amount, payment.hours, payment.date, payment.status, payment.description);
        });

        backup.feedbacks?.forEach((feedback: any) => {
          db.prepare(`
            INSERT INTO feedbacks (id, courseId, studentId, teacherId, content, homework, rating, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            feedback.id, feedback.courseId, feedback.studentId, feedback.teacherId,
            feedback.content, feedback.homework, feedback.rating, feedback.date
          );
        });

        backup.homeworks?.forEach((homework: any) => {
          db.prepare(`
            INSERT INTO homeworks (id, courseId, studentId, studentName, teacherId, teacherName, title, description, dueDate, status, submittedAt, submittedContent, reviewComment, rating, reviewedAt, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            homework.id, homework.courseId, homework.studentId, homework.studentName, homework.teacherId,
            homework.teacherName, homework.title, homework.description, homework.dueDate, homework.status,
            homework.submittedAt, homework.submittedContent, homework.reviewComment, homework.rating,
            homework.reviewedAt, homework.createdAt
          );
        });

        backup.leaveRequests?.forEach((leave: any) => {
          db.prepare(`
            INSERT INTO leave_requests (id, courseId, studentId, studentName, type, reason, status, requestDate, preferredDate, preferredTime, processedBy, processedDate, response)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            leave.id, leave.courseId, leave.studentId, leave.studentName, leave.type, leave.reason,
            leave.status, leave.requestDate, leave.preferredDate, leave.preferredTime,
            leave.processedBy, leave.processedDate, leave.response
          );
        });
      })();

      res.json({ success: true, message: 'Data restored successfully' });
    } catch (error) {
      console.error('Restore failed:', error);
      res.status(500).json({ error: 'Restore failed' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API Docs available at http://localhost:${PORT}/api-docs`);
  });
}

startServer();
