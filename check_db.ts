import Database from 'better-sqlite3';
const db = new Database('school.db');
const teacher = db.prepare('SELECT t.*, u.username FROM teachers t LEFT JOIN users u ON t.userId = u.id LIMIT 1').get();
console.log(JSON.stringify(teacher, null, 2));
db.close();
