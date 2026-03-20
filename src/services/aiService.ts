export class AIService {
  static async generateCourseRecommendation(
    studentData: any,
    context?: { courses?: any[]; feedbacks?: any[]; attendance?: any[]; payments?: any[] },
    options?: { windowDays?: number }
  ) {
    const age = typeof studentData?.age === 'number' ? studentData.age : undefined;
    const levelText = String(studentData?.level || '').toLowerCase();
    const interests: string[] = Array.isArray(studentData?.interests) ? studentData.interests : [];
    const tags: string[] = Array.isArray(studentData?.tags) ? studentData.tags : [];
    const notes = String(studentData?.notes || '');

    const interestText = `${interests.join(' ')} ${tags.join(' ')} ${notes}`.toLowerCase();
    const isPiano = interestText.includes('钢琴') || interestText.includes('piano');
    const isViolin = interestText.includes('小提琴') || interestText.includes('violin');
    const isVocal = interestText.includes('声乐') || interestText.includes('vocal') || interestText.includes('唱');
    const isBeginner = levelText.includes('初') || levelText.includes('beginner') || levelText.includes('入门');
    const isAdvanced = levelText.includes('高') || levelText.includes('advanced');
    const isChild = age !== undefined ? age <= 10 : true;

    const focus = isPiano ? '钢琴' : isViolin ? '小提琴' : isVocal ? '声乐' : '器乐';
    const baseDifficulty = isAdvanced ? '高级' : isBeginner ? '初级' : '中级';
    const habits = isChild ? '短时高频' : '规律练习';

    const windowDays = options?.windowDays ?? 30;
    const metrics = AIService.computeStudentMetrics(studentData, context, { windowDays });
    const weakSkills = AIService.pickWeakSkills(context?.feedbacks || [], studentData?.id, { windowDays });

    const recommendations = [
      {
        course: `${focus}${isBeginner ? '基础入门' : isAdvanced ? '高级演奏提升' : '综合提升'}`,
        reason: `围绕${focus}核心能力规划训练路径，保证学习目标清晰、可量化。${weakSkills.length ? `优先补齐：${weakSkills.join('、')}` : ''}`,
        difficulty: baseDifficulty,
        fitScore: 78,
      },
      {
        course: '视唱练耳与节奏训练',
        reason: `提升听辨与节奏稳定性，能显著改善练习效率与音乐表现。${weakSkills.includes('节奏') ? '（当前节奏维度偏弱，建议优先）' : ''}`,
        difficulty: isBeginner ? '初级' : '中级',
        fitScore: weakSkills.includes('节奏') ? 92 : 74,
      },
      {
        course: '音乐理论与读谱能力',
        reason: `夯实乐理与读谱，让孩子/学员更快掌握新曲目并减少依赖示范。`,
        difficulty: isBeginner ? '初级' : isAdvanced ? '中级' : '中级',
        fitScore: weakSkills.includes('读谱') ? 88 : 70,
      },
    ];

    const suggestions = [
      `每周建议：2-3节课 + ${habits}练习（每次15-30分钟起步）`,
      '用节拍器练习：先慢后快，保证节奏与音准优先',
      '每周录一次练习小视频，便于复盘与家长/老师沟通',
    ];

    const progress = isBeginner
      ? '预计6-8周建立基础手型与读谱习惯，3个月可完成2-3首入门曲目并稳定节奏。'
      : isAdvanced
      ? '预计6-8周在重点技巧上形成突破，3个月可完成一首较完整的舞台曲目与表现处理。'
      : '预计6-8周提升读谱与节奏稳定性，3个月可明显提升曲目完成度与音乐表达。';

    return { recommendations, suggestions, progress, metrics };
  }

  static async generateFeedbackTemplate(studentData: any, ratings: any) {
    const name = String(studentData?.name || '学员');
    const pitch = Number(ratings?.pitch ?? 0);
    const rhythm = Number(ratings?.rhythm ?? 0);
    const technique = Number(ratings?.technique ?? 0);
    const expression = Number(ratings?.expression ?? 0);
    const theory = Number(ratings?.theory ?? 0);
    const avg = (pitch + rhythm + technique + expression + theory) / 5;

    const strengths: string[] = [];
    const improvements: string[] = [];

    const scoreToText = (v: number) => (v >= 4 ? '表现突出' : v >= 3 ? '整体稳定' : '需要加强');
    const add = (arr: string[], text: string) => {
      if (!arr.includes(text)) arr.push(text);
    };

    add(strengths, `音准：${scoreToText(pitch)}`);
    add(strengths, `节奏：${scoreToText(rhythm)}`);
    add(strengths, `技巧：${scoreToText(technique)}`);
    add(strengths, `表现力：${scoreToText(expression)}`);
    add(strengths, `乐理：${scoreToText(theory)}`);

    if (pitch <= 3) add(improvements, '音准：建议分手慢练，重点听辨不稳定的音程与和弦');
    if (rhythm <= 3) add(improvements, '节奏：建议用节拍器从慢速开始，先稳定再提速');
    if (technique <= 3) add(improvements, '技巧：注意手型与放松，避免用力过猛导致速度受限');
    if (expression <= 3) add(improvements, '表现力：建议分句处理，做强弱对比与呼吸感');
    if (theory <= 3) add(improvements, '乐理：建议每天10分钟读谱/节奏卡片巩固基础');

    const overall =
      avg >= 4
        ? `本节课${name}状态很好，专注度高，吸收快，能够在老师提示下快速修正并完成目标。`
        : avg >= 3
        ? `本节课${name}整体表现稳定，基础能力逐步形成，课堂配合度与学习态度都很好。`
        : `本节课${name}态度认真，愿意尝试与配合；目前还处于基础建立阶段，需要更多巩固与重复练习。`;

    const homework = [
      '曲目：分手慢练2遍 → 合手慢练2遍（每天）',
      '节奏：节拍器60-72起步，稳定后再提升',
      '听力：跟唱/拍读一段节奏型（3分钟）',
    ];

    const encouragement =
      avg >= 4 ? `继续保持！${name}的进步很明显，稳定性越来越好了。` : `继续加油！只要按计划坚持练习，下一节课会更轻松、更有成就感。`;

    return [
      `## ${name}的课堂反馈`,
      '',
      '### 总体评价',
      overall,
      '',
      '### 优点',
      strengths.map((s) => `- ${s}`).join('\n'),
      '',
      '### 改进建议',
      (improvements.length ? improvements : ['- 继续巩固基础，保持练习节奏']).join('\n'),
      '',
      '### 回家作业',
      homework.map((h, i) => `${i + 1}. ${h}`).join('\n'),
      '',
      '### 鼓励的话',
      encouragement,
    ].join('\n');
  }

  static async generateMarketingScript(leadData: any, context?: { followUps?: any[] }) {
    const name = String(leadData?.name || '家长');
    const age = leadData?.age ? `${leadData.age}岁` : '未说明年龄';
    const interests: string[] = Array.isArray(leadData?.interests) ? leadData.interests : [];
    const interestText = interests.length ? interests.join('、') : '音乐学习';
    const source = String(leadData?.source || '');
    const notes = String(leadData?.notes || '');
    const sourceHint = source === 'wechat' ? '微信咨询' : source === 'referral' ? '转介绍' : source === 'website' ? '官网咨询' : source === 'offline' ? '线下咨询' : '咨询';
    const status = String(leadData?.status || '');
    const followUps = Array.isArray(context?.followUps) ? context!.followUps! : [];
    const lastFollowUp = followUps
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    const opening = `您好，我是梦年教务的课程顾问。看到您通过${sourceHint}留下了信息，想跟您确认一下孩子的情况，方便给到更合适的建议。`;
    const questions = [
      '孩子之前有接触过乐器/音乐启蒙吗？目前大概是什么水平？',
      '更看重哪方面：兴趣培养、考级、表演、还是综合能力？',
      '一周大概能保证几天练习？每次能练多久？',
      '方便了解一下上课时间偏好（周内/周末、白天/晚上）吗？',
    ];
    const value = [
      `我们会根据孩子年龄与基础，先把${interestText}的核心能力拆成可执行的小目标（节奏/音准/读谱/技巧/表现力）。`,
      '每节课都有清晰的当堂目标与可量化的家庭练习任务，家长能看得见进步。',
      '支持试听评估：老师会当场给出适配的学习路径与阶段目标。',
    ];

    const wechat = [
      `${name}您好～我把您关注的点记录下来了：${age}，兴趣方向：${interestText}。`,
      '为了给您更准确的建议，想再确认两个问题：1）孩子是否有基础？2）一周练习时间大概能保证多少？',
      '我们这边本周有试听评估名额，您希望安排在周内还是周末呢？',
    ].join('\n');

    const postTrial = [
      `感谢您带孩子来试听！今天老师重点看了孩子的节奏、听辨和手型基础，整体学习潜力不错。`,
      '如果您目标是“稳步进步 + 看得见的成果”，建议从“基础+曲目”双线推进：每周2节课，配合每天15-25分钟练习。',
      '我给您发一份本阶段学习目标与练习清单，方便您做决定；如需我也可以把不同课时包的性价比对比发给您。',
    ].join('\n');

    const faqs = [
      '价格：课程费用由课时包决定。建议先选小课时包验证效果，再逐步升级更划算的套餐。',
      '时间：可固定时段，也支持临时调课；我们优先保障孩子稳定上课节奏。',
      '效果：关键在“课堂目标 + 练习方法”。我们会把练习拆成可完成的步骤，家长只需按清单陪同即可。',
      '孩子不配合：先兴趣驱动，再建立习惯；课堂会用小游戏/成就反馈强化动力。',
    ];

    return [
      '## 招生沟通话术（本地生成）',
      '',
      `- 线索状态：${status || '未标记'}`,
      lastFollowUp?.createdAt ? `- 最近一次跟进：${String(lastFollowUp.createdAt).slice(0, 10)}（${lastFollowUp.type || ''}）` : '',
      '',
      '### 首次电话沟通',
      opening,
      '',
      questions.map((q, i) => `${i + 1}. ${q}`).join('\n'),
      '',
      '### 价值呈现（可穿插使用）',
      value.map((v) => `- ${v}`).join('\n'),
      notes ? `\n### 备注参考\n- ${notes}` : '',
      '',
      '### 微信跟进消息',
      wechat,
      '',
      '### 试听课后跟进',
      postTrial,
      '',
      '### 常见问题应对',
      faqs.map((f) => `- ${f}`).join('\n'),
    ]
      .filter(Boolean)
      .join('\n');
  }

  static async generateLearningPath(
    studentData: any,
    context?: { courses?: any[]; feedbacks?: any[]; attendance?: any[]; payments?: any[] },
    options?: { windowDays?: number }
  ) {
    const levelText = String(studentData?.level || '').toLowerCase();
    const isBeginner = levelText.includes('初') || levelText.includes('beginner') || levelText.includes('入门');
    const isAdvanced = levelText.includes('高') || levelText.includes('advanced');
    const baseHours = isAdvanced ? 20 : 16;
    const windowDays = options?.windowDays ?? 30;
    const metrics = AIService.computeStudentMetrics(studentData, context, { windowDays });
    const weakSkills = AIService.pickWeakSkills(context?.feedbacks || [], studentData?.id, { windowDays });
    const focus = weakSkills.length ? `（优先补齐：${weakSkills.join('、')}）` : '';

    return {
      months1_2: {
        goal: isBeginner ? `建立正确习惯与基础能力${focus}` : isAdvanced ? `查漏补缺，锁定突破点${focus}` : `巩固基础并提升稳定性${focus}`,
        content: `手型与放松、读谱/节奏、基础技巧分解、短曲目完成${metrics?.attendanceRateWindow !== null && metrics.attendanceRateWindow < 0.7 ? '；优先稳定上课与练习频率' : ''}`,
        hours: baseHours,
        milestone: isBeginner ? '能稳定完成2首入门曲目，节奏基本稳定' : '能稳定完成一首中等曲目，错误率下降',
      },
      months3_4: {
        goal: isBeginner ? '提升节奏与听辨，形成学习闭环' : isAdvanced ? '提升表现处理与速度/力度控制' : '提升技巧与音乐表达',
        content: `节拍器训练、视奏练习、听辨/音准、技巧组合训练${metrics?.avgFeedbackRating !== null && metrics.avgFeedbackRating < 3.5 ? '；每两周做一次小测评复盘' : ''}`,
        hours: baseHours,
        milestone: '能在较稳定速度下完成曲目，能自主发现并修正问题',
      },
      months5_6: {
        goal: isBeginner ? '完成一个小型展示目标' : isAdvanced ? '形成舞台版本与表现体系' : '综合应用与曲目积累',
        content: '完整曲目打磨、段落处理、舞台表现、阶段测评与复盘',
        hours: baseHours,
        milestone: '能独立完成一首较完整曲目展示，并具备持续提升的方法',
      },
      metrics,
    };
  }

  static async generateLessonPlan(
    teacherData: any,
    studentData: any,
    context?: { courses?: any[]; feedbacks?: any[]; attendance?: any[]; payments?: any[] },
    options?: { windowDays?: number }
  ) {
    const teacherName = String(teacherData?.name || '老师');
    const specialization = String(teacherData?.specialization || '音乐教育');
    const studentName = String(studentData?.name || '学员');
    const age = studentData?.age ? `${studentData.age}岁` : '年龄未知';
    const level = String(studentData?.level || '');
    const windowDays = options?.windowDays ?? 30;
    const metrics = AIService.computeStudentMetrics(studentData, context, { windowDays });
    const weakSkills = AIService.pickWeakSkills(context?.feedbacks || [], studentData?.id, { windowDays });
    const focusText = weakSkills.length ? `本节课优先：${weakSkills.join('、')}` : '本节课优先：节奏稳定与动作放松';

    const goals = [
      '复习上节课重点，检查练习质量与习惯',
      '围绕本周目标突破一个关键问题（节奏/音准/手型/读谱之一）',
      '完成本节课曲目/练习段落的可复现版本',
    ];

    const flow = [
      '热身与复习（8分钟）：手指热身 + 上周作业抽查（节拍器）',
      '问题定位（7分钟）：找出最影响进步的1个问题并示范纠正方法',
      '新内容教学（15分钟）：技巧拆解 + 分句练习 + 合并',
      '巩固与演练（10分钟）：带节拍器完整跑一遍，形成“可带走”的版本',
      '总结与作业（5分钟）：明确每日练习清单与注意点',
    ];

    const homework = [
      '每日：节拍器慢练（60-72）2遍 → 稳定后再加速',
      '曲目：分手/分段练习各2遍，录一段30秒视频自检',
      '听力：跟唱/拍读一条节奏型（3分钟）',
    ];

    const interaction = [
      '用“先做对再做快”的口令建立标准',
      '每完成一个小目标立即给予反馈（正确点 + 下一步）',
      '让学员用自己的话复述练习方法，确认理解',
    ];

    return [
      '## 本节课教案建议（本地生成）',
      '',
      `- 教师：${teacherName}（${specialization}）`,
      `- 学员：${studentName}（${age}，${level || '水平未填写'}）`,
      metrics?.lastCourseDate ? `- 最近上课：${metrics.lastCourseDate}${metrics.daysSinceLastCourse !== null ? `（距今${metrics.daysSinceLastCourse}天）` : ''}` : '',
      `- ${focusText}`,
      '',
      '### 本节课教学目标',
      goals.map((g, i) => `${i + 1}. ${g}`).join('\n'),
      '',
      '### 教学重点与难点',
      '- 重点：放松与稳定节奏、读谱准确、段落衔接',
      '- 难点：速度提升时保持音准与力度控制',
      '',
      '### 教学流程（45分钟）',
      flow.map((s, i) => `${i + 1}. ${s}`).join('\n'),
      '',
      '### 课堂互动建议',
      interaction.map((s) => `- ${s}`).join('\n'),
      '',
      '### 回家作业',
      homework.map((h, i) => `${i + 1}. ${h}`).join('\n'),
    ].join('\n');
  }

  static async predictRetentionRisk(
    studentData: any,
    context?: { courses?: any[]; feedbacks?: any[]; attendance?: any[]; payments?: any[] },
    options?: { windowDays?: number }
  ) {
    const name = String(studentData?.name || '学员');
    const status = String(studentData?.status || '');
    const notes = String(studentData?.notes || '');
    const windowDays = options?.windowDays ?? 30;
    const metrics = AIService.computeStudentMetrics(studentData, context, { windowDays });

    const reasons: string[] = [];
    const suggestions: string[] = [];
    const breakdown: Array<{ key: string; label: string; score: number; max: number; detail: string }> = [];

    const add = (key: string, label: string, score: number, max: number, detail: string) => breakdown.push({ key, label, score, max, detail });

    let score = 0;
    const remainingHours = Number(studentData?.remainingHours ?? 0);
    const hoursScore = remainingHours <= 2 ? 3 : remainingHours <= 5 ? 2 : remainingHours <= 8 ? 1 : 0;
    score += hoursScore;
    add('hours', '剩余课时', hoursScore, 3, `${remainingHours}小时`);

    const days = metrics?.daysSinceLastCourse;
    const activityScore = days === null ? 1 : days >= 21 ? 2 : days >= 14 ? 1 : 0;
    score += activityScore;
    add('activity', '上课活跃度', activityScore, 2, days === null ? '无上课记录' : `距今${days}天`);

    const att = metrics?.attendanceRateWindow;
    const attendanceScore = att === null ? 0 : att < 0.6 ? 2 : att < 0.8 ? 1 : 0;
    score += attendanceScore;
    add('attendance', `近${windowDays}天出勤`, attendanceScore, 2, att === null ? '无出勤数据' : `${Math.round(att * 100)}%`);

    const avgRating = metrics?.avgFeedbackRating;
    const ratingScore = avgRating === null ? 0 : avgRating < 3 ? 2 : avgRating < 4 ? 1 : 0;
    score += ratingScore;
    add('feedback', '课堂满意度', ratingScore, 2, avgRating === null ? '无点评数据' : `${avgRating.toFixed(1)}/5`);

    const paymentCount = metrics?.paymentsWindowCount;
    const payScore = paymentCount === null ? 0 : paymentCount === 0 ? 1 : 0;
    score += payScore;
    add('payment', `近${windowDays}天缴费`, payScore, 1, paymentCount === null ? '无缴费数据' : `${paymentCount}次`);

    const inactiveScore = status.toLowerCase().includes('inactive') ? 2 : 0;
    score += inactiveScore;
    add('status', '学员状态', inactiveScore, 2, status || '未标记');

    const noteScore = notes.includes('不') && (notes.includes('想') || notes.includes('喜欢') || notes.includes('配合')) ? 1 : 0;
    score += noteScore;
    add('notes', '备注信号', noteScore, 1, noteScore ? '存在消极关键词' : '无明显负面信号');

    const riskLevel = score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low';

    if (remainingHours <= 5) reasons.push('剩余课时偏少，容易进入流失窗口');
    if (days !== null && days >= 14) reasons.push('近期上课间隔较长，学习习惯可能中断');
    if (att !== null && att < 0.8) reasons.push('出勤不稳定，需要先恢复节奏');
    if (avgRating !== null && avgRating < 4) reasons.push('课堂满意度存在提升空间，需优化体验与目标一致性');
    if (paymentCount !== null && paymentCount === 0) reasons.push('近期缴费行为较少，需要增强价值呈现与触达频率');
    if (status.toLowerCase().includes('inactive')) reasons.push('学员状态非活跃，需要唤醒');
    if (reasons.length === 0) reasons.push('当前学习节奏稳定，暂无明显流失信号');

    if (riskLevel === 'high') {
      suggestions.push('24小时内电话/微信双渠道触达，确认本月上课安排并锁定固定课表');
      suggestions.push('发送阶段成果（视频/测评）+ 下一阶段目标，让家长看见可量化进步');
      suggestions.push('给出限时续费方案（赠课时/测评/公开课名额）并设置决策截止时间');
    } else if (riskLevel === 'medium') {
      suggestions.push('提前提醒课时与排课，推荐续费衔接避免中断学习习惯');
      suggestions.push('安排一次阶段测评/公开课，增强学习获得感与信心');
      suggestions.push('提供小课时包先续，降低决策门槛');
    } else {
      suggestions.push('常规课时提醒与排课建议，保持稳定学习节奏');
      suggestions.push('每月一次成长反馈，增强家长信心');
    }

    const retentionPlan =
      riskLevel === 'high'
        ? `给${name}制定“本周复课计划”：先锁定未来2周固定课表 + 发送阶段成果报告；同步给出续费优惠（赠课时/测评），48小时内完成确认。`
        : riskLevel === 'medium'
        ? `给${name}做“阶段复盘+目标共识”：一次测评课 + 1页学习计划；推荐小课时包续费衔接，降低顾虑。`
        : `维持正常续费节奏：课时到期前7天提醒 + 发送月度成长反馈，促成自然续费。`;

    return { riskLevel, reasons, suggestions, retentionPlan, metrics, breakdown, totalScore: score };
  }

  static computeStudentMetrics(
    studentData: any,
    context?: { courses?: any[]; feedbacks?: any[]; attendance?: any[]; payments?: any[] },
    options?: { windowDays?: number }
  ) {
    const studentId = studentData?.id;
    const courses = Array.isArray(context?.courses) ? context!.courses! : [];
    const feedbacks = Array.isArray(context?.feedbacks) ? context!.feedbacks! : [];
    const attendance = Array.isArray(context?.attendance) ? context!.attendance! : [];
    const payments = Array.isArray(context?.payments) ? context!.payments! : [];
    const windowDays = options?.windowDays ?? 30;

    const studentCourses = studentId ? courses.filter((c) => c.studentId === studentId) : courses;
    const completedCourses = studentCourses.filter((c) => c.status === 'completed');
    const lastCourse = completedCourses
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const lastCourseDate = lastCourse?.date || null;
    const daysSinceLastCourse = lastCourseDate ? Math.floor((Date.now() - new Date(lastCourseDate).getTime()) / 86400000) : null;

    const now = Date.now();
    const inDays = (d: string, days: number) => {
      const t = new Date(d).getTime();
      return !Number.isNaN(t) && now - t <= days * 86400000;
    };

    const aW = studentId
      ? attendance.filter((a) => a.studentId === studentId && a.date && inDays(a.date, windowDays))
      : attendance.filter((a) => a.date && inDays(a.date, windowDays));
    const present = aW.filter((a) => a.status === 'present').length;
    const counted = aW.filter((a) => a.status === 'present' || a.status === 'absent' || a.status === 'leave').length;
    const attendanceRateWindow = counted > 0 ? present / counted : null;

    const f = studentId ? feedbacks.filter((x) => x.studentId === studentId) : feedbacks;
    const avgFeedbackRating = f.length ? f.reduce((s, x) => s + (Number(x.rating) || 0), 0) / f.length : null;

    const p = studentId ? payments.filter((x) => x.studentId === studentId) : payments;
    const paymentsWindow = p.filter((x) => x.date && inDays(x.date, windowDays));
    const paymentsWindowCount = paymentsWindow.length;
    const lastPaymentDate = p.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date || null;

    return {
      windowDays,
      lastCourseDate,
      daysSinceLastCourse,
      attendanceRateWindow,
      avgFeedbackRating,
      paymentsWindowCount,
      lastPaymentDate,
    };
  }

  static pickWeakSkills(feedbacks: any[], studentId?: string, options?: { windowDays?: number }) {
    const windowDays = options?.windowDays ?? 30;
    const rows = studentId ? feedbacks.filter((f) => f.studentId === studentId) : feedbacks;
    const now = Date.now();
    const within = (d: string) => {
      const t = new Date(d).getTime();
      return !Number.isNaN(t) && now - t <= windowDays * 86400000;
    };

    const last = rows
      .filter((r) => r.date && within(r.date))
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    const agg: Record<string, { sum: number; count: number }> = {};
    for (const f of last) {
      const s = f.skillRatings;
      if (!s) continue;
      const entries: Array<[string, number]> = [
        ['音准', Number(s.pitch)],
        ['节奏', Number(s.rhythm)],
        ['技巧', Number(s.technique)],
        ['表现力', Number(s.expression)],
        ['乐理', Number(s.theory)],
        ['读谱', Number(s.sightReading)],
      ];
      for (const [k, v] of entries) {
        if (!v || Number.isNaN(v)) continue;
        agg[k] = agg[k] || { sum: 0, count: 0 };
        agg[k].sum += v;
        agg[k].count += 1;
      }
    }

    const scored = Object.entries(agg)
      .map(([k, v]) => ({ k, avg: v.sum / Math.max(1, v.count) }))
      .filter((x) => x.avg > 0)
      .sort((a, b) => a.avg - b.avg);

    return scored.filter((x) => x.avg < 3.5).slice(0, 2).map((x) => x.k);
  }
}

export default AIService;
