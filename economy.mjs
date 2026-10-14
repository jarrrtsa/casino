import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const CATALOG = [
  { id: 'hoodie', name: 'Hoodie', level: 1, price: 0 },
  { id: 'cap', name: 'Canvas cap', level: 1, price: 50 },
  { id: 'beanie', name: 'Knit beanie', level: 2, price: 150 },
  { id: 'coat', name: 'Long coat', level: 3, price: 350 }
];
export const HOMES = [
  { id: 'bridge', name: 'Under the bridge', level: 1, wealth: -Infinity, asset: 'bridge.svg' },
  { id: 'rental', name: 'Rental apartment', level: 2, wealth: 1000, asset: 'home.svg' },
  { id: 'loft', name: 'City loft', level: 5, wealth: 10000, asset: 'loft.svg' },
  { id: 'mansion', name: 'Hillside residence', level: 10, wealth: 100000, asset: 'mansion.svg' }
];
const hash = token => createHash('sha256').update(token).digest('hex');
const amount = value => { if (!Number.isSafeInteger(value) || value <= 0 || value > 1000000) throw new Error('Enter a positive whole-dollar amount.'); return value; };
export function createEconomy(path = ':memory:', now = Date.now) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, token TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS leases (character TEXT PRIMARY KEY REFERENCES characters(id), session TEXT UNIQUE, chips INTEGER NOT NULL CHECK(chips >= 0));
    CREATE TABLE IF NOT EXISTS ledger (id INTEGER PRIMARY KEY, character TEXT, kind TEXT, delta INTEGER, created INTEGER);
    CREATE TABLE IF NOT EXISTS operations (character TEXT, operation TEXT, response TEXT, PRIMARY KEY(character, operation));
    CREATE TABLE IF NOT EXISTS recovery_keys (character TEXT PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE, digest TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS creation_tokens (digest TEXT PRIMARY KEY, character TEXT);`);
  // Preserve legacy creation credentials before any access-key rotation.
  db.exec('INSERT OR IGNORE INTO creation_tokens SELECT token,id FROM characters');
  const get = id => { const row = db.prepare('SELECT data FROM characters WHERE id=?').get(id); if (!row) throw new Error('Character not found.'); return JSON.parse(row.data); };
  const save = c => db.prepare('UPDATE characters SET data=? WHERE id=?').run(JSON.stringify(c), c.id);
  function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } }
  function log(c, kind, delta) { db.prepare('INSERT INTO ledger(character,kind,delta,created) VALUES(?,?,?,?)').run(c.id, kind, delta, now()); }
  function idle(c) { if (db.prepare('SELECT 1 FROM leases WHERE character=?').get(c.id)) throw new Error('Return home from your table before changing your character or wallet.'); }
  function view(id) {
    const c = get(id); const chips = db.prepare('SELECT chips FROM leases WHERE character=?').get(id)?.chips || 0;
    const level = Math.floor(c.xp / 100) + 1; const wealth = c.cash + chips - c.debt;
    const home = [...HOMES].reverse().find(h => level >= h.level && wealth >= h.wealth);
    return { ...c, level, xpInLevel: c.xp % 100, xpNext: 100, chips, inTable:Boolean(db.prepare('SELECT 1 FROM leases WHERE character=?').get(id)), wealth, home,
      nextHome: HOMES[HOMES.indexOf(home) + 1] || null, catalog: CATALOG,
      transactions: db.prepare('SELECT kind,delta,created FROM ledger WHERE character=? ORDER BY id DESC LIMIT 8').all(id) };
  }
  // Rooms are transient. Returning each player's pending stake refunds unfinished hands.
  transaction(() => { for (const lease of db.prepare('SELECT * FROM leases').all()) { const c=get(lease.character); c.cash+=lease.chips; save(c); log(c,'Interrupted table refund',lease.chips); } db.exec('DELETE FROM leases'); });
  return {
    authenticate(token) { if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null; return db.prepare('SELECT id FROM characters WHERE token=?').get(hash(token))?.id || null; },
    create(name, operation) {
      if (typeof operation !== 'string' || !/^[a-f0-9-]{36}$/.test(operation)) throw new Error('Missing creation key.');
      // A browser keeps this random key for retries until it receives its credential.
      const token = createHash('sha256').update(`character:${operation}`).digest('hex');
      const original = db.prepare('SELECT character FROM creation_tokens WHERE digest=?').get(hash(token));
      const existing = db.prepare('SELECT id FROM characters WHERE token=?').get(hash(token));
      if (existing) return { token, character: view(existing.id) };
      if (original) throw new Error('Creation key has expired. Restore your character instead.');
      name=typeof name==='string' ? name.trim().slice(0,24) : ''; if (!name) throw new Error('Enter a character name.');
      const c={ id:randomUUID(), name, cash:1000, debt:0, xp:0, hands:0, wins:0, earned:0, owned:['hoodie'], outfit:'hoodie', color:'blue', created:now(), lastJob:0 };
      transaction(()=>{db.prepare('INSERT INTO characters VALUES(?,?,?)').run(c.id,hash(token),JSON.stringify(c));db.prepare('INSERT INTO creation_tokens VALUES(?,?)').run(hash(token),c.id);log(c,'Starting funds',1000);});
      return {token,character:view(c.id)};
    },
    view,
    issueRecovery(id) {
      return transaction(() => {
        const c = get(id); idle(c);
        const recoveryKey = randomBytes(32).toString('hex');
        db.prepare('INSERT INTO recovery_keys VALUES(?,?) ON CONFLICT(character) DO UPDATE SET digest=excluded.digest').run(id,hash(recoveryKey));
        return { recoveryKey };
      });
    },
    recover(recoveryKey) {
      if (typeof recoveryKey !== 'string' || !/^[a-f0-9]{64}$/.test(recoveryKey)) return null;
      return transaction(() => {
        const row = db.prepare('SELECT character FROM recovery_keys WHERE digest=?').get(hash(recoveryKey));
        if (!row) return null;
        const c = get(row.character);
        if (db.prepare('SELECT 1 FROM leases WHERE character=?').get(c.id)) {
          const error = new Error('Return home from your table before restoring your character.');
          error.status = 409; throw error;
        }
        const token = randomBytes(32).toString('hex');
        db.prepare('UPDATE characters SET token=? WHERE id=?').run(hash(token),c.id);
        return { token, character: view(c.id) };
      });
    },
    mutate(id, operation, kind, data = {}) {
      if (typeof operation !== 'string' || operation.length < 16 || operation.length > 80) throw new Error('Missing operation key.');
      return transaction(()=>{
        const cached=db.prepare('SELECT response FROM operations WHERE character=? AND operation=?').get(id,operation);
        if(cached) return JSON.parse(cached.response);
        const c=get(id);idle(c);
        if(kind==='borrow') { if(c.debt) throw new Error('Repay your current loan before taking another.'); if(c.cash>100) throw new Error('Loans are available when your cash is $100 or less.'); c.debt=500;c.cash+=500;log(c,'Loan received',500); }
        else if(kind==='repay') { const sum=amount(data.amount);if(sum>c.debt||sum>c.cash)throw new Error('Repayment exceeds your debt or available cash.');c.cash-=sum;c.debt-=sum;log(c,'Loan repayment',-sum); }
        else if(kind==='customize') {
          const item=CATALOG.find(x=>x.id===data.outfit);if(!item)throw new Error('Unknown outfit.');
          if(Math.floor(c.xp/100)+1<item.level)throw new Error(`Unlocked at level ${item.level}.`);
          if(!c.owned.includes(item.id)){if(c.cash<item.price)throw new Error('Not enough cash.');c.cash-=item.price;c.owned.push(item.id);log(c,`Bought ${item.name}`,-item.price);}c.outfit=item.id;
          if(['blue','amber','plum','sage'].includes(data.color))c.color=data.color;
          const name=typeof data.name==='string'?data.name.trim().slice(0,24):c.name;if(!name)throw new Error('Enter a character name.');c.name=name;
        }
        else if(kind==='job') { if(now()-c.lastJob<15000)throw new Error('Wait a moment before your next delivery.');c.cash+=30;c.lastJob=now();log(c,'Delivery payment',30); }
        else throw new Error('Unknown wallet operation.');
        save(c);const result=view(id);db.prepare('INSERT INTO operations VALUES(?,?,?)').run(id,operation,JSON.stringify(result));return result;
      });
    },
    buyIn(id, session, value) { return transaction(()=>{const c=get(id);idle(c);const sum=amount(value);if(sum<100||sum>1000)throw new Error('Buy-in must be $100–$1,000.');if(c.cash<sum)throw new Error('Not enough cash for this buy-in.');c.cash-=sum;save(c);db.prepare('INSERT INTO leases VALUES(?,?,?)').run(id,session,sum);log(c,'Table buy-in',-sum);return sum;}); },
    sync(players, hand) {
      transaction(()=>{for(const p of players){if(!p.characterId)continue;const seat=hand?.seats.find(s=>s.id===p.id);const value=hand&&hand.stage!=='finished'&&seat ? seat.stack+seat.total : p.stack;
        db.prepare('UPDATE leases SET chips=? WHERE character=?').run(value,p.characterId);
      }});
    },
    settle(players, hand, key) {
      transaction(()=>{for(const p of players){if(!p.characterId||!hand.seats.some(s=>s.id===p.id))continue;
        if(db.prepare('SELECT 1 FROM operations WHERE character=? AND operation=?').get(p.characterId,key))continue;
        const c=get(p.characterId);const won=hand.results.some(r=>r.id===p.id);c.hands++;if(won)c.wins++;c.xp+=15+(won?25:0);
        c.earned+=Math.max(0,p.stack-(p.handStart ?? p.stack));
        db.prepare('UPDATE leases SET chips=? WHERE character=?').run(p.stack,p.characterId);save(c);
        log(c,won?'Hold’em win · +40 XP':'Hold’em played · +15 XP',0);
        db.prepare('INSERT INTO operations VALUES(?,?,?)').run(c.id,key,'null');
      }});
    },
    cashOut(id) { return transaction(()=>{const lease=db.prepare('SELECT chips FROM leases WHERE character=?').get(id);if(!lease)return view(id);const c=get(id);c.cash+=lease.chips;save(c);db.prepare('DELETE FROM leases WHERE character=?').run(id);log(c,'Table cash-out',lease.chips);return view(id);}); },
    remove(id, name) { return transaction(()=>{const c=get(id);idle(c);if(name!==c.name)throw new Error('Type your character name to confirm deletion.');db.prepare('DELETE FROM operations WHERE character=?').run(id);db.prepare('DELETE FROM ledger WHERE character=?').run(id);db.prepare('UPDATE creation_tokens SET character=NULL WHERE character=?').run(id);db.prepare('DELETE FROM characters WHERE id=?').run(id);}); },
    close() {db.close();}
  };
}
