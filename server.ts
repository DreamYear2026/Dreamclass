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

const ALLOWED_USER_FIELDS = ['name', 'email', 'phone', 'avatar'];
const ALLOWED_STUDENT_FIELDS = ['name', 'age', 'level', 'parentName', 'parentPhone', 'remainingHours', 'notes', 'status', 'tags', 'campusId'];
const ALLOWED_TEACHER_FIELDS = ['name', 'phone', 'email', 'specialization', 'status', 'campusId'];
const ALLOWED_LEAD_FIELDS = ['name', 'phone', 'email', 'address', 'age', 'source', 'status', 'notes', 'interests', 'tags', 'assignedTo', 'assignedName', 'studentId', 'nextFollowUp', 'trialDate', 'lastContacted'];
const ALLOWED_CAMPAIGN_FIELDS = ['name', 'type', 'status', 'description', 'startDate', 'endDate', 'targetAudience', 'budget', 'conversionGoal', 'actualConversions'];
const ALLOWED_COUPON_FIELDS = ['code', 'type', 'value', 'minPurchase', 'maxDiscount', 'status', 'validFrom', 'validUntil', 'usageLimit', 'usedCount', 'applicableCourses', 'campaignId'];
const ALLOWED_REFERRAL_FIELDS = ['referrerId', 'referrerName', 'referrerPhone', 'referredName', 'referredPhone', 'status', 'rewardType', 'rewardValue', 'rewardClaimed', 'leadId', 'studentId', 'completedAt'];

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
  if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    if (req.user.role === 'super_admin' && roles.includes('admin')) {
      return next();
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

function isAdmin(req: AuthRequest): boolean {
  return req.user?.role === 'admin' || req.user?.role === 'super_admin';
}

function isTeacher(req: AuthRequest): boolean {
  return req.user?.role === 'teacher';
}

function canAccessStudent(req: AuthRequest, studentId: string): boolean {
  if (isAdmin(req)) return true;
  if (!req.user) return false;
  if (req.user.role === 'parent') {
    const student = db.prepare('SELECT userId FROM students WHERE id = ?').get(studentId) as { userId: string | null } | undefined;
    return !!student && student.userId === req.user.userId;
  }
  if (req.user.role === 'teacher') {
    const teacherIds = teacherEntityIdsByUserId(req.user.userId);
    const allowedTeacherIds = Array.from(new Set([req.user.userId, ...teacherIds]));
    if (allowedTeacherIds.length === 0) return false;
    const placeholders = allowedTeacherIds.map(() => '?').join(', ');
    const query = `
      SELECT COUNT(1) as count FROM courses
      WHERE studentId = ?
      AND (${allowedTeacherIds.length > 0 ? `teacherId IN (${placeholders})` : '0=1'})
    `;
    const params: any[] = [studentId, ...allowedTeacherIds];
    const row = db.prepare(query).get(...params) as { count: number } | undefined;
    return (row?.count || 0) > 0;
  }
  return false;
}

function teacherEntityIdsByUserId(userId: string): string[] {
  const rows = db.prepare('SELECT id FROM teachers WHERE userId = ?').all(userId) as Array<{ id: string }>;
  return rows.map((r) => r.id);
}

function primaryTeacherByUserId(userId: string): { id: string; name: string } | null {
  const teacher = db.prepare('SELECT id, name FROM teachers WHERE userId = ? LIMIT 1').get(userId) as { id: string; name: string } | undefined;
  return teacher || null;
}

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
      { url: 'http://localhost:3006', description: '开发服务器' },
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
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3006;

  app.use(express.json());
  app.use(cookieParser());
  app.use(morgan('combined'));

  cleanExpiredSessions();

  app.use('/uploads', requireAuth, express.static(uploadsDir));

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  const isProductionEnv = process.env.NODE_ENV === 'production';
  const loginLimiter = rateLimit({
    windowMs: isProductionEnv ? 15 * 60 * 1000 : 5 * 60 * 1000,
    max: isProductionEnv ? 5 : 50,
    message: { error: '登录尝试次数过多，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
      const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : 'anonymous';
      return `${req.ip}:${username}`;
    },
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
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    
    if (!normalizedUsername || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(normalizedUsername) as any;
    
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
    const { name, email, phone, avatar } = req.body;
    const session = req.user!;
    
    const { updates, values } = validateFields({ name, email, phone, avatar }, ALLOWED_USER_FIELDS);
    
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
    let query = 'SELECT DISTINCT s.* FROM students s';
    const params: any[] = [];
    if (req.user?.role === 'parent') {
      query += ' WHERE s.userId = ?';
      params.push(req.user.userId);
    } else if (req.user?.role === 'teacher') {
      const teacherIds = teacherEntityIdsByUserId(req.user.userId);
      const allowedTeacherIds = Array.from(new Set([req.user.userId, ...teacherIds]));
      if (allowedTeacherIds.length > 0) {
        query += ` JOIN courses c ON c.studentId = s.id WHERE c.teacherId IN (${allowedTeacherIds.map(() => '?').join(', ')})`;
        params.push(...allowedTeacherIds);
      } else {
        query += ' WHERE 1 = 0';
      }
    }
    const students = db.prepare(query).all(...params) as any[];
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
    const users = db.prepare('SELECT id, username, name, role, permissions, createdAt FROM users ORDER BY createdAt DESC').all() as Array<any>;
    res.json(users.map((u) => ({
      ...u,
      permissions: u.permissions ? JSON.parse(u.permissions) : [],
    })));
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
    if (req.user?.role === 'admin' && (role === 'admin' || role === 'super_admin')) {
      return res.status(403).json({ error: 'Only super admin can manage admin accounts' });
    }
    if (role === 'super_admin') {
      return res.status(403).json({ error: 'Super admin account cannot be created via API' });
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
    if ((user as any).role === 'super_admin') {
      return res.status(403).json({ error: 'Super admin account cannot be modified' });
    }
    if (req.user?.role === 'admin') {
      if ((user as any).role === 'admin') {
        return res.status(403).json({ error: 'Only super admin can manage admin accounts' });
      }
      if (role === 'admin' || role === 'super_admin') {
        return res.status(403).json({ error: 'Only super admin can manage admin accounts' });
      }
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
    if (id === req.user?.userId) {
      return res.status(400).json({ error: '不能删除当前登录账号' });
    }
    if ((user as any).role === 'super_admin') {
      return res.status(403).json({ error: 'Super admin account cannot be deleted' });
    }
    if (req.user?.role === 'admin' && (user as any).role === 'admin') {
      return res.status(403).json({ error: 'Only super admin can manage admin accounts' });
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
    if (!canAccessStudent(req, req.params.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
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
   const { name, age, level, parentName, parentPhone, avatar, remainingHours, userId } = req.body;
    if (!name || !parentName || !parentPhone) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
   if (userId) {
     const parentUser = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId) as { id: string; role: string } | undefined;
     if (!parentUser || parentUser.role !== 'parent') {
       return res.status(400).json({ error: 'Invalid parent userId' });
     }
   }
    const id = uuidv4();
    const stmt = db.prepare(`
     INSERT INTO students (id, userId, name, age, level, parentName, parentPhone, avatar, remainingHours)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
   stmt.run(id, userId || null, name, age || 8, level || 'Beginner', parentName, parentPhone, avatar || `https://picsum.photos/seed/${id}/100/100`, remainingHours || 0);
   res.status(201).json({ id, userId: userId || null, ...req.body });
  });

  app.patch('/api/students/:id', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const { id } = req.params;
    if (!canAccessStudent(req, id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
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

  app.post('/api/students/:id/hours-change', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const { id } = req.params;
    if (!canAccessStudent(req, id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
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
    if (!canAccessStudent(req, id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
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
    const teachers = db.prepare('SELECT t.*, u.username FROM teachers t LEFT JOIN users u ON t.userId = u.id').all();
    res.json(teachers);
  });

  app.get('/api/teachers/:id', requireAuth, (req: AuthRequest, res) => {
    const teacher = db.prepare('SELECT t.*, u.username FROM teachers t LEFT JOIN users u ON t.userId = u.id WHERE t.id = ?').get(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json(teacher);
  });

 app.post('/api/teachers', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
    const { name, phone, email, specialization, avatar, status, campusId, userId, username, password } = req.body;
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!normalizedUsername && password) {
      return res.status(400).json({ error: 'Username is required when password is provided' });
    }
    if (userId && (username || password)) {
      return res.status(400).json({ error: 'userId and username/password cannot be used together' });
    }

    try {
      let finalUserId = userId || null;
      const teacherId = uuidv4();
      let hashedPassword = null;

      if (!finalUserId && normalizedUsername) {
        if (!password) {
          return res.status(400).json({ error: 'Password is required when username is provided' });
        }
        hashedPassword = await bcrypt.hash(password, 10);
      }

      const executeTransaction = db.transaction(() => {
        if (!finalUserId && normalizedUsername) {
          const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(normalizedUsername) as { id: string } | undefined;
          if (existingUser) {
            throw new Error('Username already exists');
          }
          const newUserId = uuidv4();
          db.prepare(`
            INSERT INTO users (id, username, password, role, name, email, phone, permissions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(newUserId, normalizedUsername, hashedPassword, 'teacher', name, email || null, phone || null, JSON.stringify([]));
          finalUserId = newUserId;
        } else if (finalUserId) {
          const teacherUser = db.prepare('SELECT id, role FROM users WHERE id = ?').get(finalUserId) as { id: string; role: string } | undefined;
          if (!teacherUser || teacherUser.role !== 'teacher') {
            throw new Error('Invalid teacher userId');
          }
        }

        const stmt = db.prepare(`
          INSERT INTO teachers (id, userId, name, phone, email, specialization, avatar, status, campusId)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(teacherId, finalUserId, name, phone, email, specialization, avatar || `https://picsum.photos/seed/${teacherId}/100/100`, status || 'active', campusId || null);
        
        return teacherId;
      });

      const id = executeTransaction();
      const created = db.prepare('SELECT t.*, u.username FROM teachers t LEFT JOIN users u ON t.userId = u.id WHERE t.id = ?').get(id);
      res.status(201).json(created);
    } catch (error: any) {
      console.error('Error creating teacher:', error);
      res.status(error.message === 'Username already exists' ? 400 : 500).json({ error: error.message || 'Internal server error' });
    }
  });

  app.patch('/api/teachers/:id', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { updates, values } = validateFields(req.body, ALLOWED_TEACHER_FIELDS);
    const normalizedUsername = typeof req.body.username === 'string' ? req.body.username.trim() : null;
    
    try {
      let hashedPassword = null;
      if (req.body.password) {
        hashedPassword = await bcrypt.hash(req.body.password, 10);
      }

      const executeTransaction = db.transaction(() => {
        // Fetch current teacher
        const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id) as any;
        if (!teacher) {
          throw new Error('Teacher not found');
        }
        
        // 1. Update teacher fields
        if (updates.length > 0) {
          const updateValues = [...values, id];
          db.prepare(`UPDATE teachers SET ${updates.join(', ')} WHERE id = ?`).run(...updateValues);
        }

        // 2. Handle Account Binding
        if (normalizedUsername !== null) {
          if (normalizedUsername === '') {
            // Unbind account
            db.prepare('UPDATE teachers SET userId = NULL WHERE id = ?').run(id);
          } else {
            // Check if username belongs to someone else
            const existingUser = db.prepare('SELECT id, role FROM users WHERE username = ?').get(normalizedUsername) as { id: string, role: string } | undefined;
            
            let targetUserId: string;
            
            if (existingUser) {
              // Username exists
              if (existingUser.role !== 'teacher') {
                throw new Error('Username already exists and is not a teacher account');
              }
              targetUserId = existingUser.id;
            } else {
              // Create new user
              targetUserId = uuidv4();
              if (!hashedPassword) {
                throw new Error('Password is required when creating a new account');
              }
              db.prepare(`
                INSERT INTO users (id, username, password, role, name, email, phone, permissions)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `).run(targetUserId, normalizedUsername, hashedPassword, 'teacher', req.body.name || teacher.name, req.body.email || teacher.email || null, req.body.phone || teacher.phone || null, JSON.stringify([]));
            }
            
            // Bind the user to the teacher
            db.prepare('UPDATE teachers SET userId = ? WHERE id = ?').run(targetUserId, id);
            
            // Update password if provided
            if (hashedPassword) {
              db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, targetUserId);
            }
            
            // Sync user details
            const currentTeacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id) as any;
            db.prepare('UPDATE users SET name = ?, phone = ?, email = ? WHERE id = ?').run(
              currentTeacher.name,
              currentTeacher.phone || null,
              currentTeacher.email || null,
              targetUserId
            );
          }
        } else if (teacher.userId) {
          // Username not provided in body, but teacher is already bound. 
          // Sync name/phone/email if they changed.
          const currentTeacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id) as any;
          db.prepare('UPDATE users SET name = ?, phone = ?, email = ? WHERE id = ?').run(
            currentTeacher.name,
            currentTeacher.phone || null,
            currentTeacher.email || null,
            teacher.userId
          );
          
          if (hashedPassword) {
            db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, teacher.userId);
          }
        }

        return id;
      });

      executeTransaction();
      const updated = db.prepare('SELECT t.*, u.username FROM teachers t LEFT JOIN users u ON t.userId = u.id WHERE t.id = ?').get(id);
      res.json(updated);
    } catch (error: any) {
      console.error('Error updating teacher:', error);
      res.status(error.message === 'Username already exists' || error.message.includes('exists') ? 400 : 
                 error.message === 'Teacher not found' ? 404 : 500)
         .json({ error: error.message || 'Internal server error' });
    }
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
    if (!canAccessStudent(req, studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const attendance = db.prepare('SELECT * FROM attendance WHERE studentId = ?').all(studentId);
    res.json(attendance);
  });

  app.post('/api/attendance', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const { courseId, studentId, status, date } = req.body;
    if (!courseId || !studentId || !status || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!canAccessStudent(req, studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (isTeacher(req)) {
      const course = db.prepare('SELECT teacherId FROM courses WHERE id = ?').get(courseId) as { teacherId: string } | undefined;
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      const allowedTeacherIds = new Set([req.user!.userId, ...teacherEntityIdsByUserId(req.user!.userId)]);
      if (!allowedTeacherIds.has(course.teacherId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
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
    let query = 'SELECT * FROM courses';
    const params: any[] = [];
    if (req.user?.role === 'parent') {
      query += ' WHERE studentId IN (SELECT id FROM students WHERE userId = ?)';
      params.push(req.user.userId);
    } else if (req.user?.role === 'teacher') {
      const teacherIds = teacherEntityIdsByUserId(req.user.userId);
      const allowedTeacherIds = Array.from(new Set([req.user.userId, ...teacherIds]));
      if (allowedTeacherIds.length > 0) {
        query += ` WHERE teacherId IN (${allowedTeacherIds.map(() => '?').join(', ')})`;
        params.push(...allowedTeacherIds);
      } else {
        query += ' WHERE 1 = 0';
      }
    }
    const courses = db.prepare(query).all(...params);
    res.json(courses);
  });

  app.get('/api/courses/:id', requireAuth, (req: AuthRequest, res) => {
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (req.user?.role === 'parent') {
      const student = db.prepare('SELECT userId FROM students WHERE id = ?').get((course as any).studentId) as { userId: string | null } | undefined;
      if (!student || student.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    if (req.user?.role === 'teacher') {
      const allowedTeacherIds = new Set([req.user.userId, ...teacherEntityIdsByUserId(req.user.userId)]);
      if (!allowedTeacherIds.has((course as any).teacherId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    res.json(course);
  });

  app.post('/api/courses', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const { title, date, startTime, endTime, teacherId, teacherName, studentId, studentName, room, campusId } = req.body;
    if (!title || !date || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    let finalTeacherId = teacherId;
    let finalTeacherName = teacherName;
    if (isTeacher(req)) {
      const teacher = primaryTeacherByUserId(req.user!.userId);
      finalTeacherId = teacher?.id || req.user!.userId;
      finalTeacherName = teacher?.name || teacherName;
    } else if (!finalTeacherId) {
      return res.status(400).json({ error: 'teacherId is required' });
    }
    if (studentId && !canAccessStudent(req, studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const stmt = db.prepare(`
      INSERT INTO courses (id, title, date, startTime, endTime, teacherId, teacherName, studentId, studentName, room, status, campusId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `);
    stmt.run(id, title, date, startTime, endTime, finalTeacherId, finalTeacherName, studentId, studentName, room, campusId || null);
    res.status(201).json({ id, ...req.body, teacherId: finalTeacherId, teacherName: finalTeacherName, status: 'scheduled', campusId: campusId || null });
  });

  app.post('/api/courses/batch', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const courses = req.body;
    if (!Array.isArray(courses) || courses.length === 0) {
      return res.status(400).json({ error: 'Invalid courses data' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO courses (id, title, date, startTime, endTime, teacherId, teacherName, studentId, studentName, room, status, campusId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `);
    
    const transaction = db.transaction((courses) => {
      const teacher = isTeacher(req) ? primaryTeacherByUserId(req!.user!.userId) : null;
      for (const course of courses) {
        if (course.studentId && !canAccessStudent(req!, course.studentId)) {
          throw new Error('Forbidden');
        }
        const finalTeacherId = isTeacher(req) ? (teacher?.id || req!.user!.userId) : course.teacherId;
        if (!finalTeacherId) {
          throw new Error('Missing teacherId');
        }
        stmt.run(
          uuidv4(),
          course.title,
          course.date,
          course.startTime,
          course.endTime,
          finalTeacherId,
          isTeacher(req) ? (teacher?.name || course.teacherName) : course.teacherName,
          course.studentId,
          course.studentName,
          course.room,
          course.campusId || null
        );
      }
    });
    
    try {
      transaction(courses);
    } catch {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.status(201).json({ success: true });
  });

  app.put('/api/courses/:id', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const { id } = req.params;
    const { title, date, startTime, endTime, teacherId, teacherName, room, campusId } = req.body;
    const existing = db.prepare('SELECT teacherId, studentId FROM courses WHERE id = ?').get(id) as { teacherId: string; studentId: string } | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (isTeacher(req)) {
      const allowedTeacherIds = new Set([req.user!.userId, ...teacherEntityIdsByUserId(req.user!.userId)]);
      if (!allowedTeacherIds.has(existing.teacherId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    db.prepare(`
      UPDATE courses SET title = ?, date = ?, startTime = ?, endTime = ?, teacherId = ?, teacherName = ?, room = ?, campusId = ?
      WHERE id = ?
    `).run(
      title,
      date,
      startTime,
      endTime,
      isTeacher(req) ? (primaryTeacherByUserId(req.user!.userId)?.id || req.user!.userId) : teacherId,
      isTeacher(req) ? (primaryTeacherByUserId(req.user!.userId)?.name || teacherName) : teacherName,
      room,
      campusId || null,
      id
    );
    res.json({ success: true });
  });

  app.delete('/api/courses/:id', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const { id } = req.params;
    if (isTeacher(req)) {
      const course = db.prepare('SELECT teacherId FROM courses WHERE id = ?').get(id) as { teacherId: string } | undefined;
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      const allowedTeacherIds = new Set([req.user!.userId, ...teacherEntityIdsByUserId(req.user!.userId)]);
      if (!allowedTeacherIds.has(course.teacherId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    
    const deleteTransaction = db.transaction(() => {
      db.prepare('DELETE FROM attendance WHERE courseId = ?').run(id);
      db.prepare('DELETE FROM feedbacks WHERE courseId = ?').run(id);
      db.prepare('DELETE FROM courses WHERE id = ?').run(id);
    });
    
    deleteTransaction();
    res.json({ success: true });
  });

  app.patch('/api/courses/:id', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const { id } = req.params;
    if (isTeacher(req)) {
      const course = db.prepare('SELECT teacherId FROM courses WHERE id = ?').get(id) as { teacherId: string } | undefined;
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      const allowedTeacherIds = new Set([req.user!.userId, ...teacherEntityIdsByUserId(req.user!.userId)]);
      if (!allowedTeacherIds.has(course.teacherId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    const { status } = req.body;
    if (status) {
      db.prepare('UPDATE courses SET status = ? WHERE id = ?').run(status, id);
    }
    res.json({ success: true });
  });

  // Feedbacks
  app.get('/api/feedbacks', requireAuth, (req: AuthRequest, res) => {
    const { studentId, teacherId } = req.query as { studentId?: string; teacherId?: string };
    let query = 'SELECT * FROM feedbacks';
    const conditions: string[] = [];
    const params: any[] = [];

    if (req.user?.role === 'parent') {
      conditions.push('studentId IN (SELECT id FROM students WHERE userId = ?)');
      params.push(req.user.userId);
    } else if (req.user?.role === 'teacher') {
      const teacherIds = teacherEntityIdsByUserId(req.user.userId);
      const allowedTeacherIds = Array.from(new Set([req.user.userId, ...teacherIds]));
      if (allowedTeacherIds.length > 0) {
        conditions.push(`teacherId IN (${allowedTeacherIds.map(() => '?').join(', ')})`);
        params.push(...allowedTeacherIds);
      } else {
        conditions.push('1 = 0');
      }
    }
    
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

  app.post('/api/feedbacks', requireAuth, requireRole('teacher', 'admin'), (req: AuthRequest, res) => {
    const { courseId, studentId, teacherId, content, homework, rating } = req.body;
    if (!courseId || !studentId || !teacherId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!isAdmin(req)) {
      if (teacherId !== req.user?.userId) {
        const teacherIds = teacherEntityIdsByUserId(req.user!.userId);
        if (!teacherIds.includes(teacherId)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
      if (courseId !== 'general') {
        const course = db.prepare('SELECT studentId, teacherId FROM courses WHERE id = ?').get(courseId) as { studentId: string; teacherId: string } | undefined;
        if (!course) {
          return res.status(404).json({ error: 'Course not found' });
        }
        const teacherIds = new Set([req.user!.userId, ...teacherEntityIdsByUserId(req.user!.userId)]);
        if (course.studentId !== studentId || !teacherIds.has(course.teacherId)) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
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
    const { studentId } = req.query as { studentId?: string };
    if (!isAdmin(req) && studentId && !canAccessStudent(req, studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user?.role === 'parent') {
      if (!studentId) {
        const payments = db.prepare(`
          SELECT p.* FROM payments p
          JOIN students s ON s.id = p.studentId
          WHERE s.userId = ?
          ORDER BY p.date DESC
        `).all(req.user.userId);
        return res.json(payments);
      }
      if (!canAccessStudent(req, studentId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    if (req.user?.role === 'teacher' && !studentId) {
      const teacherIds = teacherEntityIdsByUserId(req.user.userId);
      const allowedTeacherIds = Array.from(new Set([req.user.userId, ...teacherIds]));
      const idCondition = allowedTeacherIds.length > 0
        ? `c.teacherId IN (${allowedTeacherIds.map(() => '?').join(', ')})`
        : '0=1';
      const query = `
        SELECT DISTINCT p.* FROM payments p
        JOIN courses c ON c.studentId = p.studentId
        WHERE ${idCondition}
        ORDER BY p.date DESC
      `;
      const params: any[] = [...allowedTeacherIds];
      const payments = db.prepare(query).all(...params);
      return res.json(payments);
    }
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
    const { userId, role } = req.query as { userId?: string; role?: string };
    if (!userId || !role) {
      return res.status(400).json({ error: 'Missing required query params' });
    }
    if (!isAdmin(req) && userId !== req.user?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    let query = 'SELECT * FROM messages WHERE (receiverId = ? AND receiverRole = ?) OR (senderId = ? AND senderRole = ?)';
    const messages = db.prepare(query).all(userId, role, userId, role);
    res.json(messages);
  });

  app.post('/api/messages', requireAuth, (req: AuthRequest, res) => {
    const { senderId, senderRole, receiverId, receiverRole, content } = req.body;
    if (!senderId || !receiverId || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!isAdmin(req) && senderId !== req.user?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (!isAdmin(req) && senderRole !== req.user?.role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const receiverUser = db.prepare('SELECT id, role FROM users WHERE id = ?').get(receiverId) as { id: string; role: string } | undefined;
    if (!receiverUser || receiverUser.role !== receiverRole) {
      return res.status(400).json({ error: 'Invalid receiver' });
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
    if (isAdmin(req)) {
      const result = db.prepare('UPDATE messages SET read = 1 WHERE id = ?').run(req.params.id);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Message not found' });
      }
      const updated = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
      return res.json(updated);
    }
    const result = db.prepare('UPDATE messages SET read = 1 WHERE id = ? AND receiverId = ?').run(req.params.id, req.user!.userId);
    if (result.changes === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = db.prepare('SELECT * FROM messages WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Notifications
  app.get('/api/notifications/:userId', requireAuth, (req: AuthRequest, res) => {
    if (!isAdmin(req) && req.params.userId !== req.user?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const notifications = db.prepare('SELECT * FROM notifications WHERE userId = ? ORDER BY timestamp DESC').all(req.params.userId);
    res.json(notifications);
  });

  app.get('/api/notifications', requireAuth, (req: AuthRequest, res) => {
    const { userId } = req.query as { userId?: string };
    const targetUserId = userId || req.user!.userId;
    if (!isAdmin(req) && targetUserId !== req.user?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const notifications = db.prepare('SELECT * FROM notifications WHERE userId = ? ORDER BY timestamp DESC').all(targetUserId);
    res.json(notifications);
  });

  app.post('/api/notifications', requireAuth, (req: AuthRequest, res) => {
    const { userId, title, content } = req.body;
    if (!userId || !title || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!isAdmin(req) && userId !== req.user?.userId) {
      return res.status(403).json({ error: 'Forbidden' });
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
    if (isAdmin(req)) {
      const result = db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(req.params.id);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      const updated = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
      return res.json(updated);
    }
    const result = db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND userId = ?').run(req.params.id, req.user!.userId);
    if (result.changes === 0) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const updated = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Leave Requests
  app.get('/api/leave-requests', requireAuth, (req: AuthRequest, res) => {
    let query = 'SELECT * FROM leave_requests';
    const params: any[] = [];
    if (req.user?.role === 'parent') {
      query += ' WHERE studentId IN (SELECT id FROM students WHERE userId = ?)';
      params.push(req.user.userId);
    } else if (req.user?.role === 'teacher') {
      const teacherIds = teacherEntityIdsByUserId(req.user.userId);
      const allowedTeacherIds = Array.from(new Set([req.user.userId, ...teacherIds]));
      if (allowedTeacherIds.length > 0) {
        query += ` WHERE courseId IN (SELECT id FROM courses WHERE teacherId IN (${allowedTeacherIds.map(() => '?').join(', ')}))`;
        params.push(...allowedTeacherIds);
      } else {
        query += ' WHERE 1 = 0';
      }
    }
    query += ' ORDER BY requestDate DESC';
    const leaveRequests = db.prepare(query).all(...params);
    res.json(leaveRequests);
  });

  app.post('/api/leave-requests', requireAuth, (req: AuthRequest, res) => {
    const { courseId, studentId, studentName, type, reason, preferredDate, preferredTime } = req.body;
    if (!courseId || !studentId || !type || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!canAccessStudent(req, studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (isTeacher(req)) {
      const course = db.prepare('SELECT teacherId, studentId FROM courses WHERE id = ?').get(courseId) as { teacherId: string; studentId: string } | undefined;
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      const allowedTeacherIds = new Set([req.user!.userId, ...teacherEntityIdsByUserId(req.user!.userId)]);
      if (course.studentId !== studentId || !allowedTeacherIds.has(course.teacherId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
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
    const result = stmt.run(status, req.user?.userId, processedDate, response || null, req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Leave request not found' });
    }
    const updated = db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Homeworks
  app.get('/api/homeworks', requireAuth, (req: AuthRequest, res) => {
    let query = 'SELECT * FROM homeworks';
    const conditions: string[] = [];
    const params: any[] = [];
    if (req.user?.role === 'parent') {
      conditions.push('studentId IN (SELECT id FROM students WHERE userId = ?)');
      params.push(req.user.userId);
    } else if (req.user?.role === 'teacher') {
      const teacherIds = teacherEntityIdsByUserId(req.user.userId);
      const allowedTeacherIds = Array.from(new Set([req.user.userId, ...teacherIds]));
      if (allowedTeacherIds.length > 0) {
        conditions.push(`teacherId IN (${allowedTeacherIds.map(() => '?').join(', ')})`);
        params.push(...allowedTeacherIds);
      } else {
        conditions.push('1 = 0');
      }
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY createdAt DESC';
    const homeworks = db.prepare(query).all(...params);
    res.json(homeworks);
  });

  app.post('/api/homeworks', requireAuth, requireRole('teacher'), (req: AuthRequest, res) => {
    const { studentId, studentName, courseId, title, description, dueDate } = req.body;
    if (!studentId || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!canAccessStudent(req, studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const teacher = db.prepare('SELECT id, name FROM teachers WHERE userId = ?').get(req.user?.userId) as { id: string; name: string } | undefined;
    const allowedTeacherIds = new Set([req.user!.userId, ...teacherEntityIdsByUserId(req.user!.userId)]);
    if (courseId) {
      const course = db.prepare('SELECT teacherId, studentId FROM courses WHERE id = ?').get(courseId) as { teacherId: string; studentId: string } | undefined;
      if (!course) {
        return res.status(404).json({ error: 'Course not found' });
      }
      if (course.studentId !== studentId || !allowedTeacherIds.has(course.teacherId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    const stmt = db.prepare(`
      INSERT INTO homeworks (id, courseId, studentId, studentName, teacherId, teacherName, title, description, dueDate, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `);
   stmt.run(id, courseId || null, studentId, studentName, teacher?.id || req.user?.userId, teacher?.name || '', title, description || null, dueDate || null, createdAt);
   res.status(201).json({ id, ...req.body, teacherId: teacher?.id || req.user?.userId, teacherName: teacher?.name || '', status: 'pending', createdAt });
  });

  app.patch('/api/homeworks/:id/submit', requireAuth, (req: AuthRequest, res) => {
    const homework = db.prepare('SELECT studentId, teacherId FROM homeworks WHERE id = ?').get(req.params.id) as { studentId: string; teacherId: string } | undefined;
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }
    if (!canAccessStudent(req, homework.studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (isTeacher(req)) {
      const allowedTeacherIds = new Set([req.user!.userId, ...teacherEntityIdsByUserId(req.user!.userId)]);
      if (!allowedTeacherIds.has(homework.teacherId)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    const { submittedContent, submittedAt, status } = req.body;
    const stmt = db.prepare(`
      UPDATE homeworks SET submittedContent = ?, submittedAt = ?, status = ? WHERE id = ?
    `);
    stmt.run(submittedContent, submittedAt, status, req.params.id);
    const updated = db.prepare('SELECT * FROM homeworks WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  app.patch('/api/homeworks/:id/review', requireAuth, requireRole('teacher'), (req: AuthRequest, res) => {
    const homework = db.prepare('SELECT teacherId FROM homeworks WHERE id = ?').get(req.params.id) as { teacherId: string } | undefined;
    if (!homework) {
      return res.status(404).json({ error: 'Homework not found' });
    }
    const teacherIds = teacherEntityIdsByUserId(req.user!.userId);
    const allowedTeacherIds = new Set([req.user!.userId, ...teacherIds]);
    if (!allowedTeacherIds.has(homework.teacherId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { reviewComment, rating, reviewedAt, status } = req.body;
    const stmt = db.prepare(`
      UPDATE homeworks SET reviewComment = ?, rating = ?, reviewedAt = ?, status = ? WHERE id = ?
    `);
    stmt.run(reviewComment || null, rating || null, reviewedAt, status, req.params.id);
    const updated = db.prepare('SELECT * FROM homeworks WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  // Student Progress
  app.get('/api/student-progress/:studentId', requireAuth, (req: AuthRequest, res) => {
    if (!canAccessStudent(req, req.params.studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const progress = db.prepare('SELECT * FROM student_progress WHERE studentId = ?').all(req.params.studentId);
    res.json(progress);
  });

  app.get('/api/learning-goals/:studentId', requireAuth, (req: AuthRequest, res) => {
    if (!canAccessStudent(req, req.params.studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const goals = db.prepare('SELECT * FROM learning_goals WHERE studentId = ? ORDER BY createdAt DESC').all(req.params.studentId);
    res.json(goals);
  });

  app.post('/api/learning-goals', requireAuth, (req: AuthRequest, res) => {
    const { studentId, title, description, targetDate } = req.body;
    if (!studentId || !title) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!canAccessStudent(req, studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
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
    const goal = db.prepare('SELECT studentId FROM learning_goals WHERE id = ?').get(req.params.id) as { studentId: string } | undefined;
    if (!goal) {
      return res.status(404).json({ error: 'Learning goal not found' });
    }
    if (!canAccessStudent(req, goal.studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    db.prepare('UPDATE learning_goals SET status = ? WHERE id = ?').run(status, req.params.id);
    const updated = db.prepare('SELECT * FROM learning_goals WHERE id = ?').get(req.params.id);
    res.json(updated);
  });

  app.get('/api/practice-records/:studentId', requireAuth, (req: AuthRequest, res) => {
    if (!canAccessStudent(req, req.params.studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const records = db.prepare('SELECT * FROM practice_records WHERE studentId = ? ORDER BY date DESC').all(req.params.studentId) as Array<any>;
    const parsed = records.map((record) => ({
      ...record,
      pieces: record.pieces ? JSON.parse(record.pieces) : [],
    }));
    res.json(parsed);
  });

  app.post('/api/practice-records', requireAuth, (req: AuthRequest, res) => {
    const { studentId, date, duration, pieces, notes } = req.body;
    if (!studentId || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!canAccessStudent(req, studentId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO practice_records (id, studentId, date, duration, pieces, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, studentId, date, duration || 0, JSON.stringify(pieces || []), notes || null);
    res.status(201).json({ id, ...req.body, pieces: pieces || [] });
  });

  // Materials
  app.get('/api/materials', requireAuth, (req: AuthRequest, res) => {
    const materials = db.prepare('SELECT * FROM materials ORDER BY uploadDate DESC').all();
    res.json(materials);
  });

  app.post('/api/materials', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const { title, type, category, level, description, filename, size } = req.body;
    if (!title || !type || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    const uploadDate = new Date().toISOString().split('T')[0];
    const stmt = db.prepare(`
      INSERT INTO materials (id, title, type, category, level, description, filename, size, uploadDate, uploadedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, title, type, category, level || '', description || '', filename || '', size || '', uploadDate, req.user?.userId || '');
    res.status(201).json({ id, ...req.body, uploadedBy: req.user?.userId || '', uploadDate });
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

  app.get('/api/leads', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const leads = (req.user?.role === 'teacher'
      ? db.prepare('SELECT * FROM leads WHERE assignedTo = ? ORDER BY createdAt DESC').all(req.user.userId)
      : db.prepare('SELECT * FROM leads ORDER BY createdAt DESC').all()) as any[];
    const counts = db.prepare('SELECT leadId, COUNT(*) as count FROM follow_ups GROUP BY leadId').all() as any[];
    const countMap = new Map<string, number>(counts.map((r) => [r.leadId, r.count]));
    res.json(
      leads.map((l) => ({
        ...l,
        interests: l.interests ? JSON.parse(l.interests) : [],
        tags: l.tags ? JSON.parse(l.tags) : [],
        followUpCount: countMap.get(l.id) || 0,
      }))
    );
  });

  app.post('/api/leads', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const { name, phone, source } = req.body;
    if (!name || !phone || !source) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const interests = Array.isArray(req.body.interests) ? JSON.stringify(req.body.interests) : null;
    const tags = Array.isArray(req.body.tags) ? JSON.stringify(req.body.tags) : null;

    const currentUser = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user!.userId) as { name: string } | undefined;
    const assignedTo = req.user?.role === 'teacher' ? req.user.userId : (req.body.assignedTo || null);
    const assignedName = req.user?.role === 'teacher' ? (currentUser?.name || null) : (req.body.assignedName || null);

    db.prepare(`
      INSERT INTO leads (
        id, name, phone, email, address, age, source, status, notes, interests, tags,
        assignedTo, assignedName, studentId, nextFollowUp, trialDate, lastContacted, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      phone,
      req.body.email || null,
      req.body.address || null,
      req.body.age ?? null,
      source,
      req.body.status || 'new',
      req.body.notes || '',
      interests,
      tags,
      assignedTo,
      assignedName,
      req.body.studentId || null,
      req.body.nextFollowUp || null,
      req.body.trialDate || null,
      req.body.lastContacted || null,
      now,
      now
    );

    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as any;
    res.status(201).json({
      ...lead,
      interests: lead.interests ? JSON.parse(lead.interests) : [],
      tags: lead.tags ? JSON.parse(lead.tags) : [],
      followUpCount: 0,
    });
  });

  app.patch('/api/leads/:id', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id) as any;
    if (!lead) return res.status(404).json({ error: 'Not found' });
    if (req.user?.role === 'teacher' && lead.assignedTo !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(req.body || {})) {
      if (!ALLOWED_LEAD_FIELDS.includes(key) || value === undefined) continue;
      if (key === 'tags' || key === 'interests') {
        updates.push(`${key} = ?`);
        values.push(Array.isArray(value) ? JSON.stringify(value) : null);
      } else {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);

    db.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id) as any;
    const followUpCount = (db.prepare('SELECT COUNT(*) as count FROM follow_ups WHERE leadId = ?').get(req.params.id) as any)?.count || 0;
    res.json({
      ...updated,
      interests: updated.interests ? JSON.parse(updated.interests) : [],
      tags: updated.tags ? JSON.parse(updated.tags) : [],
      followUpCount,
    });
  });

  app.post('/api/leads/:id/trial', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const { trialDate } = req.body;
    if (!trialDate) return res.status(400).json({ error: 'Missing required fields' });

    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id) as any;
    if (!lead) return res.status(404).json({ error: 'Not found' });
    if (req.user?.role === 'teacher' && lead.assignedTo !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    db.prepare('UPDATE leads SET trialDate = ?, status = ?, updatedAt = ? WHERE id = ?').run(trialDate, 'trial', new Date().toISOString(), req.params.id);
    const updated = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id) as any;
    const followUpCount = (db.prepare('SELECT COUNT(*) as count FROM follow_ups WHERE leadId = ?').get(req.params.id) as any)?.count || 0;
    res.json({
      ...updated,
      interests: updated.interests ? JSON.parse(updated.interests) : [],
      tags: updated.tags ? JSON.parse(updated.tags) : [],
      followUpCount,
    });
  });

  app.get('/api/marketing/follow-ups', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const { leadId } = req.query as any;
    if (req.user?.role === 'teacher') {
      if (leadId) {
        const ownedLead = db.prepare('SELECT id FROM leads WHERE id = ? AND assignedTo = ?').get(leadId, req.user.userId) as { id: string } | undefined;
        if (!ownedLead) return res.status(403).json({ error: 'Forbidden' });
        const rows = db.prepare('SELECT * FROM follow_ups WHERE leadId = ? ORDER BY createdAt DESC').all(leadId);
        return res.json(rows);
      }
      const rows = db.prepare(`
        SELECT fu.* FROM follow_ups fu
        JOIN leads l ON l.id = fu.leadId
        WHERE l.assignedTo = ?
        ORDER BY fu.createdAt DESC
      `).all(req.user.userId);
      return res.json(rows);
    }
    const rows = leadId
      ? db.prepare('SELECT * FROM follow_ups WHERE leadId = ? ORDER BY createdAt DESC').all(leadId)
      : db.prepare('SELECT * FROM follow_ups ORDER BY createdAt DESC').all();
    res.json(rows);
  });

  app.get('/api/leads/:id/follow-ups', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const lead = db.prepare('SELECT id, assignedTo FROM leads WHERE id = ?').get(req.params.id) as any;
    if (!lead) return res.status(404).json({ error: 'Not found' });
    if (req.user?.role === 'teacher' && lead.assignedTo !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const rows = db.prepare('SELECT * FROM follow_ups WHERE leadId = ? ORDER BY createdAt DESC').all(req.params.id);
    res.json(rows);
  });

  app.post('/api/leads/:id/follow-ups', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const lead = db.prepare('SELECT id, assignedTo FROM leads WHERE id = ?').get(req.params.id) as any;
    if (!lead) return res.status(404).json({ error: 'Not found' });
    if (req.user?.role === 'teacher' && lead.assignedTo !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { type, content, result, scheduledDate } = req.body;
    if (!type || !content || !result) return res.status(400).json({ error: 'Missing required fields' });

    const id = uuidv4();
    const createdAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO follow_ups (id, leadId, type, content, result, scheduledDate, createdBy, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, type, content, result, scheduledDate || null, req.user!.userId, createdAt);

    db.prepare('UPDATE leads SET lastContacted = ?, nextFollowUp = ?, updatedAt = ? WHERE id = ?').run(
      createdAt,
      scheduledDate || null,
      createdAt,
      req.params.id
    );

    res.status(201).json({ id, leadId: req.params.id, type, content, result, scheduledDate: scheduledDate || null, createdBy: req.user!.userId, createdAt });
  });

  app.get('/api/marketing/campaigns', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const campaigns = db.prepare('SELECT * FROM marketing_campaigns ORDER BY createdAt DESC').all();
    res.json(campaigns);
  });

  app.post('/api/marketing/campaigns', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const { name, type, status, startDate, endDate } = req.body;
    if (!name || !type || !status || !startDate || !endDate) return res.status(400).json({ error: 'Missing required fields' });
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO marketing_campaigns (
        id, name, type, status, description, startDate, endDate, targetAudience, budget,
        conversionGoal, actualConversions, createdBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      type,
      status,
      req.body.description || '',
      startDate,
      endDate,
      req.body.targetAudience || null,
      req.body.budget ?? null,
      req.body.conversionGoal ?? null,
      req.body.actualConversions ?? 0,
      req.user!.userId,
      now,
      now
    );
    res.status(201).json(db.prepare('SELECT * FROM marketing_campaigns WHERE id = ?').get(id));
  });

  app.patch('/api/marketing/campaigns/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const row = db.prepare('SELECT * FROM marketing_campaigns WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Not found' });

    const updates: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(req.body || {})) {
      if (!ALLOWED_CAMPAIGN_FIELDS.includes(key) || value === undefined) continue;
      updates.push(`${key} = ?`);
      values.push(value);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    updates.push('updatedAt = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);
    db.prepare(`UPDATE marketing_campaigns SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    res.json(db.prepare('SELECT * FROM marketing_campaigns WHERE id = ?').get(req.params.id));
  });

  app.get('/api/marketing/coupons', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const today = new Date().toISOString().split('T')[0];
    db.prepare(`UPDATE coupons SET status = 'expired' WHERE status = 'active' AND validUntil < ?`).run(today);
    const coupons = db.prepare('SELECT * FROM coupons ORDER BY createdAt DESC').all() as any[];
    res.json(
      coupons.map((c) => ({
        ...c,
        applicableCourses: c.applicableCourses ? JSON.parse(c.applicableCourses) : [],
      }))
    );
  });

  app.post('/api/marketing/coupons', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const { code, type, value, status, validFrom, validUntil } = req.body;
    if (!code || !type || value === undefined || !status || !validFrom || !validUntil) return res.status(400).json({ error: 'Missing required fields' });
    const id = uuidv4();
    const now = new Date().toISOString();
    const applicableCourses = Array.isArray(req.body.applicableCourses) ? JSON.stringify(req.body.applicableCourses) : null;
    db.prepare(`
      INSERT INTO coupons (
        id, code, type, value, minPurchase, maxDiscount, status, validFrom, validUntil,
        usageLimit, usedCount, applicableCourses, campaignId, createdBy, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      code,
      type,
      value,
      req.body.minPurchase ?? null,
      req.body.maxDiscount ?? null,
      status,
      validFrom,
      validUntil,
      req.body.usageLimit ?? null,
      req.body.usedCount ?? 0,
      applicableCourses,
      req.body.campaignId || null,
      req.user!.userId,
      now
    );
    const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id) as any;
    res.status(201).json({ ...coupon, applicableCourses: coupon.applicableCourses ? JSON.parse(coupon.applicableCourses) : [] });
  });

  app.patch('/api/marketing/coupons/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const row = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Not found' });

    const updates: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(req.body || {})) {
      if (!ALLOWED_COUPON_FIELDS.includes(key) || value === undefined) continue;
      if (key === 'applicableCourses') {
        updates.push(`${key} = ?`);
        values.push(Array.isArray(value) ? JSON.stringify(value) : null);
      } else {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    values.push(req.params.id);
    db.prepare(`UPDATE coupons SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id) as any;
    res.json({ ...coupon, applicableCourses: coupon.applicableCourses ? JSON.parse(coupon.applicableCourses) : [] });
  });

  app.post('/api/marketing/coupons/redeem', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const { code, leadId, studentId } = req.body;
    if (!code) return res.status(400).json({ error: 'Missing required fields' });

    const today = new Date().toISOString().split('T')[0];
    const coupon = db.prepare('SELECT * FROM coupons WHERE code = ?').get(code) as any;
    if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
    if (coupon.status !== 'active') return res.status(400).json({ error: 'Coupon not active' });
    if (coupon.validFrom > today || coupon.validUntil < today) return res.status(400).json({ error: 'Coupon expired' });
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ error: 'Coupon usage limit reached' });

    const redemptionId = uuidv4();
    const redeemedAt = new Date().toISOString();

    db.transaction(() => {
      db.prepare(`
        INSERT INTO coupon_redemptions (id, couponId, code, leadId, studentId, redeemedBy, redeemedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(redemptionId, coupon.id, coupon.code, leadId || null, studentId || null, req.user!.userId, redeemedAt);

      const nextUsedCount = (coupon.usedCount || 0) + 1;
      const nextStatus = coupon.usageLimit !== null && nextUsedCount >= coupon.usageLimit ? 'used' : coupon.status;
      db.prepare('UPDATE coupons SET usedCount = ?, status = ? WHERE id = ?').run(nextUsedCount, nextStatus, coupon.id);
    })();

    const updated = db.prepare('SELECT * FROM coupons WHERE id = ?').get(coupon.id) as any;
    res.json({
      redemption: { id: redemptionId, couponId: coupon.id, code: coupon.code, leadId: leadId || null, studentId: studentId || null, redeemedBy: req.user!.userId, redeemedAt },
      coupon: { ...updated, applicableCourses: updated.applicableCourses ? JSON.parse(updated.applicableCourses) : [] },
    });
  });

  app.get('/api/marketing/referrals', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const rows = db.prepare('SELECT * FROM referrals ORDER BY createdAt DESC').all() as any[];
    res.json(rows.map((r) => ({ ...r, rewardClaimed: !!r.rewardClaimed })));
  });

  app.post('/api/marketing/referrals', requireAuth, requireRole('admin', 'teacher'), (req: AuthRequest, res) => {
    const { referrerId, referrerName, referredName, status, rewardType, rewardValue } = req.body;
    if (!referrerId || !referrerName || !referredName || !status || !rewardType || rewardValue === undefined) return res.status(400).json({ error: 'Missing required fields' });
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO referrals (
        id, referrerId, referrerName, referrerPhone, referredName, referredPhone,
        status, rewardType, rewardValue, rewardClaimed, leadId, studentId, createdAt, completedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      referrerId,
      referrerName,
      req.body.referrerPhone || null,
      referredName,
      req.body.referredPhone || null,
      status,
      rewardType,
      rewardValue,
      req.body.rewardClaimed ? 1 : 0,
      req.body.leadId || null,
      req.body.studentId || null,
      createdAt,
      req.body.completedAt || null
    );
    const row = db.prepare('SELECT * FROM referrals WHERE id = ?').get(id) as any;
    res.status(201).json({ ...row, rewardClaimed: !!row.rewardClaimed });
  });

  app.patch('/api/marketing/referrals/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const row = db.prepare('SELECT * FROM referrals WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Not found' });

    const updates: string[] = [];
    const values: any[] = [];
    const teacherBlockedFields = new Set(['rewardClaimed', 'status', 'completedAt', 'rewardValue']);
    for (const [key, value] of Object.entries(req.body || {})) {
      if (!ALLOWED_REFERRAL_FIELDS.includes(key) || value === undefined) continue;
      if (isTeacher(req) && teacherBlockedFields.has(key)) continue;
      if (key === 'rewardClaimed') {
        updates.push(`${key} = ?`);
        values.push(value ? 1 : 0);
      } else {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    values.push(req.params.id);
    db.prepare(`UPDATE referrals SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    const updated = db.prepare('SELECT * FROM referrals WHERE id = ?').get(req.params.id) as any;
    res.json({ ...updated, rewardClaimed: !!updated.rewardClaimed });
  });

  app.post('/api/marketing/referrals/:id/claim', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const row = db.prepare('SELECT * FROM referrals WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Not found' });
    const completedAt = new Date().toISOString();
    db.prepare(`UPDATE referrals SET rewardClaimed = 1, status = 'completed', completedAt = ? WHERE id = ?`).run(completedAt, req.params.id);
    const updated = db.prepare('SELECT * FROM referrals WHERE id = ?').get(req.params.id) as any;
    res.json({ ...updated, rewardClaimed: !!updated.rewardClaimed });
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
