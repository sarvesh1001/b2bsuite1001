import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('prayantra.db');

export interface EmployeeRecord {
  id: string;
  name: string;
  department: string;
  embedding: Float32Array;
}

export interface AttendanceRecord {
  id: number;
  employee_id: string;
  timestamp: string;
  sync_status: 0 | 1;
}

export const initDatabase = async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      name TEXT,
      department TEXT,
      embedding BLOB
    );
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT,
      timestamp TEXT,
      sync_status INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS device_metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
};

export const getEmployees = async (): Promise<EmployeeRecord[]> => {
  const rows = await db.getAllAsync<{ id: string; name: string; department: string; embedding: Uint8Array }>(
    'SELECT id, name, department, embedding FROM employees'
  );
  return rows.map(row => ({
    ...row,
    embedding: new Float32Array(row.embedding.buffer),
  }));
};

export const getEmployeeById = async (id: string): Promise<EmployeeRecord | null> => {
  const row = await db.getFirstAsync<{ id: string; name: string; department: string; embedding: Uint8Array }>(
    'SELECT * FROM employees WHERE id = ?', id
  );
  if (!row) return null;
  return { ...row, embedding: new Float32Array(row.embedding.buffer) };
};

export const insertEmployee = async (emp: EmployeeRecord) => {
  const buffer = new Uint8Array(emp.embedding.buffer);
  await db.runAsync(
    'INSERT OR REPLACE INTO employees (id, name, department, embedding) VALUES (?, ?, ?, ?)',
    emp.id, emp.name, emp.department, buffer
  );
};

export const deleteEmployee = async (id: string) => {
  await db.runAsync('DELETE FROM employees WHERE id = ?', id);
};

export const clearEmployees = async () => {
  await db.runAsync('DELETE FROM employees');
};

export const logAttendance = async (employeeId: string, timestamp: Date = new Date()) => {
  await db.runAsync(
    'INSERT INTO attendance (employee_id, timestamp) VALUES (?, ?)',
    employeeId, timestamp.toISOString()
  );
};

export const getPendingAttendance = async (): Promise<AttendanceRecord[]> => {
  return db.getAllAsync<AttendanceRecord>('SELECT * FROM attendance WHERE sync_status = 0');
};

export const markSynced = async (id: number) => {
  await db.runAsync('UPDATE attendance SET sync_status = 1 WHERE id = ?', id);
};

export const getAttendanceHistory = async (limit = 100): Promise<AttendanceRecord[]> => {
  return db.getAllAsync<AttendanceRecord>(
    'SELECT * FROM attendance ORDER BY timestamp DESC LIMIT ?',
    limit
  );
};

export const getDeviceMetadata = async (key: string): Promise<string | null> => {
  const result = await db.getFirstAsync<{ value: string }>('SELECT value FROM device_metadata WHERE key = ?', key);
  return result?.value ?? null;
};

export const setDeviceMetadata = async (key: string, value: string) => {
  await db.runAsync('INSERT OR REPLACE INTO device_metadata (key, value) VALUES (?, ?)', key, value);
};