const path = require('path');
const fs = require('fs');

function parseRemindLine(line) {
  const match = line.match(/\/\/\s*#REMIND\s+(\d+)\s+HOURS?\s+<(.+)>/i);
  if (!match) return null;
  return {
    hours: parseInt(match[1]),
    topic: match[2].trim()
  };
}

function getStoragePath(context) {
  return path.join(context.globalStorageUri.fsPath, 'reminders.json');
}

function loadReminders(context) {
  const file = getStoragePath(context);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return [];
  }
}

function saveReminders(context, reminders) {
  const file = getStoragePath(context);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(reminders, null, 2));
}

module.exports = { parseRemindLine, loadReminders, saveReminders };