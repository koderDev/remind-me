const path = require('path');
const fs = require('fs');

function parseRemindLine(line) {
  const match = line.match(/\/\/\s*#REMIND\s+(\d*\.?\d+)\s*([smh])\s+(.+)/i); //example chahi yo ho: // #REMIND 1m ek minute update
  if (!match) return null;

  const value=parseFloat(match[1])
  const unit=match[2].toLowerCase();
  const topic = match[3].trim();

  let durn_ms;
  if(unit==='s'){
    durn_ms=value*1000;    
  } else if(unit==='m'){
    durn_ms=value*60000;
  } else {
    durn_ms=value*3600000;
  }

  return {
    topic: topic,
    triggerAt: Date.now()+durn_ms,
    displayTime: `${value}${unit}`
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
  const dir=path.dirname(file)
  if(!fs.existsSync(dir)){
    fs.mkdirSync(dir,{recursive:true})
  }
  fs.writeFileSync(file, JSON.stringify(reminders, null, 2),'utf8');
}

module.exports = { parseRemindLine, loadReminders, saveReminders };