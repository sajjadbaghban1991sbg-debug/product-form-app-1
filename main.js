
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = path.join(app.getPath('userData'), 'data.db');

function ensureDB() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.prepare(`CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product TEXT,
    train TEXT,
    route TEXT,
    quantity REAL,
    classType TEXT,
    date TEXT
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    value TEXT
  )`).run();
  return db;
}

let db;

function createWindow () {
  const win = new BrowserWindow({
    width: 1100,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const indexPath = path.join(__dirname, 'index.html');
  if (fs.existsSync(indexPath)) {
    win.loadFile(indexPath);
  } else {
    // In dev, load Vite dev server
    win.loadURL('http://localhost:5173');
  }
}

app.whenReady().then(() => {
  db = ensureDB();

  ipcMain.handle('lists-get', (e, type) => {
    const stmt = db.prepare('SELECT id, value FROM lists WHERE type = ? ORDER BY id');
    return stmt.all(type);
  });

  ipcMain.handle('lists-add', (e, type, value) => {
    const stmt = db.prepare('INSERT INTO lists (type, value) VALUES (?, ?)');
    const info = stmt.run(type, value);
    return { id: info.lastInsertRowid, value };
  });

  ipcMain.handle('lists-update', (e, id, value) => {
    const stmt = db.prepare('UPDATE lists SET value = ? WHERE id = ?');
    stmt.run(value, id);
    return { id, value };
  });

  ipcMain.handle('lists-delete', (e, id) => {
    const stmt = db.prepare('DELETE FROM lists WHERE id = ?');
    stmt.run(id);
    return true;
  });

  ipcMain.handle('entry-add', (e, entry) => {
    const stmt = db.prepare('INSERT INTO entries (product, train, route, quantity, classType, date) VALUES (?, ?, ?, ?, ?, ?)');
    const info = stmt.run(entry.product, entry.train, entry.route, entry.quantity, entry.classType, entry.date);
    return { id: info.lastInsertRowid };
  });

  ipcMain.handle('entry-query', (e, start, end) => {
    let q = 'SELECT * FROM entries WHERE 1=1';
    const params = [];
    if (start) { q += ' AND date >= ?'; params.push(start); }
    if (end) { q += ' AND date <= ?'; params.push(end); }
    q += ' ORDER BY date';
    const stmt = db.prepare(q);
    return stmt.all(...params);
  });

  ipcMain.handle('export-xlsx', async (e, rows) => {
    const { writeFile } = require('xlsx');
    const XLSX = require('xlsx');
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    const savePath = dialog.showSaveDialogSync({ filters: [{ name: 'Excel', extensions: ['xlsx'] }], defaultPath: 'export.xlsx' });
    if (!savePath) return { saved: false };
    XLSX.writeFile(wb, savePath);
    return { saved: true, path: savePath };
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
