
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const db = new Database('school.db');

const ALLOWED_TEACHER_FIELDS = ['name', 'phone', 'email', 'specialization', 'status', 'campusId'];

function validateFields(fields, allowed) {
  const updates = [];
  const values = [];
  for (const [key, value] of Object.entries(fields)) {
    if (allowed.includes(key) && value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  }
  return { updates, values };
}

async function testPatch() {
  const id = 'aba03bdf-d3eb-41dc-bb40-a33db76d4695'; // "周某人"
  const body = {
    name: "周某人-updated",
    username: "zhoumouren",
    campusId: "campus1"
  };

  const { updates, values } = validateFields(body, ALLOWED_TEACHER_FIELDS);
  const normalizedUsername = body.username;

  console.log('Updates:', updates);
  console.log('Values:', values);

  const executeTransaction = db.transaction(() => {
    let teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id);
    if (!teacher) throw new Error('Not found');

    if (updates.length > 0) {
      const updateValues = [...values, id];
      db.prepare(`UPDATE teachers SET ${updates.join(', ')} WHERE id = ?`).run(...updateValues);
      teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id);
    }

    if (normalizedUsername !== null) {
      // ... skip user logic for now as it's complex ...
    }
    return id;
  });

  executeTransaction();

  const updated = db.prepare('SELECT t.*, u.username FROM teachers t LEFT JOIN users u ON t.userId = u.id WHERE t.id = ?').get(id);
  console.log('Updated record:', updated);
}

testPatch().catch(console.error);
