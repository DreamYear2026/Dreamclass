import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';

const PORT = 3901;
const BASE_URL = `http://127.0.0.1:${PORT}`;
let serverProcess: ChildProcessWithoutNullStreams | null = null;

async function waitForServerReady() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/me`, { method: 'GET' });
      if (res.status === 401) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Server did not start within 30s');
}

function getCookieFromResponse(res: Response): string {
  const cookie = res.headers.get('set-cookie') || '';
  return cookie.split(';')[0];
}

async function login(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  expect(res.status).toBe(200);
  const cookie = getCookieFromResponse(res);
  expect(cookie.startsWith('sessionId=')).toBe(true);
  return cookie;
}

async function request(path: string, init: RequestInit = {}, cookie?: string) {
  const headers = new Headers(init.headers || {});
  if (cookie) headers.set('Cookie', cookie);
  return fetch(`${BASE_URL}${path}`, { ...init, headers });
}

describe('权限回归集成测试', () => {
  let adminCookie = '';
  let teacherCookie = '';
  let parentCookie = '';
  let teacherOwnedLeadId = '';
  let adminOwnedLeadId = '';
  let referralId = '';
  let adminFollowUpLeadId = '';
  let parentMessageId = '';

  beforeAll(async () => {
    serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production', DATABASE_URL: 'test.db' },
      stdio: 'pipe',
    });
    await waitForServerReady();
    adminCookie = await login('admin', '123456');
    teacherCookie = await login('teacher1', '123456');
    parentCookie = await login('parent1', '123456');

    const teacherLeadRes = await request('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Teacher Owned Lead',
        phone: '18800000001',
        source: 'test',
      }),
    }, teacherCookie);
    expect(teacherLeadRes.status).toBe(201);
    teacherOwnedLeadId = (await teacherLeadRes.json()).id;

    const adminLeadRes = await request('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Admin Owned Lead',
        phone: '18800000002',
        source: 'test',
        assignedTo: 'u1',
        assignedName: '系统管理员',
      }),
    }, adminCookie);
    expect(adminLeadRes.status).toBe(201);
    adminOwnedLeadId = (await adminLeadRes.json()).id;

    const referralRes = await request('/api/marketing/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referrerId: 'u3',
        referrerName: 'David Chen',
        referredName: 'Referral Target',
        status: 'new',
        rewardType: 'cash',
        rewardValue: 100,
      }),
    }, adminCookie);
    expect(referralRes.status).toBe(201);
    referralId = (await referralRes.json()).id;

    const followupLeadRes = await request('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Admin Followup Lead',
        phone: '18800000003',
        source: 'test',
        assignedTo: 'u1',
        assignedName: '系统管理员',
      }),
    }, adminCookie);
    expect(followupLeadRes.status).toBe(201);
    adminFollowUpLeadId = (await followupLeadRes.json()).id;

    const adminFollowupRes = await request(`/api/leads/${adminFollowUpLeadId}/follow-ups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'call',
        content: 'admin follow up',
        result: 'pending',
      }),
    }, adminCookie);
    expect(adminFollowupRes.status).toBe(201);

    const messageRes = await request('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        senderId: 'u1',
        senderRole: 'admin',
        receiverId: 'u3',
        receiverRole: 'parent',
        content: 'message for parent',
      }),
    }, adminCookie);
    expect(messageRes.status).toBe(201);
    parentMessageId = (await messageRes.json()).id;
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      serverProcess = null;
    }
  });

  it('家长不能访问非自己学员进度', async () => {
    const res = await request('/api/student-progress/s2', { method: 'GET' }, parentCookie);
    expect(res.status).toBe(403);
  });

  it('教师只能看到自己负责线索', async () => {
    const res = await request('/api/leads', { method: 'GET' }, teacherCookie);
    expect(res.status).toBe(200);
    const leads = await res.json();
    const ids = new Set(leads.map((l: any) => l.id));
    expect(ids.has(teacherOwnedLeadId)).toBe(true);
    expect(ids.has(adminOwnedLeadId)).toBe(false);
  });

  it('教师不能修改非自己负责线索', async () => {
    const res = await request(`/api/leads/${adminOwnedLeadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: 'unauthorized change' }),
    }, teacherCookie);
    expect(res.status).toBe(403);
  });

  it('教师不能修改转介绍记录', async () => {
    const res = await request(`/api/marketing/referrals/${referralId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    }, teacherCookie);
    expect(res.status).toBe(403);
  });

  it('家长学生列表只能看到自己孩子', async () => {
    const res = await request('/api/students', { method: 'GET' }, parentCookie);
    expect(res.status).toBe(200);
    const students = await res.json();
    const ids = new Set(students.map((s: any) => s.id));
    expect(ids.has('s1')).toBe(true);
    expect(ids.has('s2')).toBe(false);
  });

  it('家长不能查看不属于自己的课程详情', async () => {
    const res = await request('/api/courses/c2', { method: 'GET' }, parentCookie);
    expect(res.status).toBe(403);
  });

  it('教师不能查看非自己负责线索跟进', async () => {
    const res = await request(`/api/leads/${adminFollowUpLeadId}/follow-ups`, { method: 'GET' }, teacherCookie);
    expect(res.status).toBe(403);
  });

  it('教师不能标记他人消息为已读', async () => {
    const res = await request(`/api/messages/${parentMessageId}/read`, { method: 'PATCH' }, teacherCookie);
    expect(res.status).toBe(403);
  });

  it('管理员创建教师账号后可正常登录', async () => {
    const username = `teacher_${Date.now()}`;
    const password = 'Abc123456';
    const createRes = await request('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Login Teacher',
        specialization: 'Piano',
        username: ` ${username} `,
        password,
      }),
    }, adminCookie);
    expect(createRes.status).toBe(201);

    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
      }),
    });
    expect(loginRes.status).toBe(200);
    const body = await loginRes.json();
    expect(body.role).toBe('teacher');
  });

  it('管理员可为已有教师创建账号并正常登录', async () => {
    // 1. 先创建一个没有账号的教师
    const createRes = await request('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'No Account Teacher',
        specialization: 'Violin',
      }),
    }, adminCookie);
    expect(createRes.status).toBe(201);
    const teacher = await createRes.json();
    const teacherId = teacher.id;

    // 2. 通过 PATCH 为其添加账号
    const username = `edit_teacher_${Date.now()}`;
    const password = 'Password123';
    const patchRes = await request(`/api/teachers/${teacherId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
      }),
    }, adminCookie);
    expect(patchRes.status).toBe(200);
    const updatedTeacher = await patchRes.json();
    expect(updatedTeacher.username).toBe(username);
    expect(updatedTeacher.userId).toBeDefined();

    // 3. 测试登录
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        password,
      }),
    });
    expect(loginRes.status).toBe(200);
  });

  it('未登录不能访问上传目录', async () => {
    const res = await request('/uploads/not-exists.png', { method: 'GET' });
    expect(res.status).toBe(401);
  });
});
