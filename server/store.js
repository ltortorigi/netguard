import {randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const copy = (value) => JSON.parse(JSON.stringify(value));

/** Local file persistence is for the first classroom demo, without database credentials. */
export class FileStore {
  mode = 'local file';
  constructor(filename = path.resolve('data/netguard.json')) {
    this.filename = filename;
    this.state = {services: [], checks: [], events: [], reports: []};
    this.writes = Promise.resolve();
  }
  async init() {
    try {
      this.state = JSON.parse(await fs.readFile(this.filename, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    this.state.reports ??= [];
    await fs.mkdir(path.dirname(this.filename), {recursive: true});
  }
  async save() {
    // Serialize writes; each write snapshots the latest in-memory state.
    this.writes = this.writes.then(async () => {
      const temporary = `${this.filename}.tmp`;
      await fs.writeFile(temporary, JSON.stringify(this.state, null, 2));
      await fs.rename(temporary, this.filename);
    });
    return this.writes;
  }
  async listServices() { return copy(this.state.services); }
  async getService(id) { return copy(this.state.services.find((item) => item.id === id) ?? null); }
  async addService(service) {
    const added = {...service, id: randomUUID(), createdAt: new Date().toISOString()};
    this.state.services.push(added);
    await this.save();
    return copy(added);
  }
  async updateService(id, changes) {
    const item = this.state.services.find((item) => item.id === id);
    if (!item) return null;
    Object.assign(item, changes, {updatedAt: new Date().toISOString()});
    await this.save();
    return copy(item);
  }
  async deleteService(id) {
    const before = this.state.services.length;
    this.state.services = this.state.services.filter((item) => item.id !== id);
    this.state.checks = this.state.checks.filter((item) => item.serviceId !== id);
    await this.save();
    return before > this.state.services.length;
  }
  async addCheck(check) {
    this.state.checks.push({...check, id: randomUUID()});
    // Keep a reasonable bound for a small personal monitoring project.
    if (this.state.checks.length > 10000) this.state.checks.splice(0, this.state.checks.length - 10000);
    await this.save();
  }
  async getChecks(serviceId, limit = 25) {
    return copy(this.state.checks.filter((item) => item.serviceId === serviceId)
        .slice(-limit).reverse());
  }
  async logEvent(action, details) {
    this.state.events.push({id: randomUUID(), action, details, at: new Date().toISOString()});
    if (this.state.events.length > 500) this.state.events.shift();
    await this.save();
  }
  async getEvents(limit = 25) { return copy(this.state.events.slice(-limit).reverse()); }
  async addReport(report) {
    if (this.state.reports.some(item => item.id === report.id)) return false;
    this.state.reports = this.state.reports.filter(item => Date.parse(item.at) > Date.now() - 7 * 86400000);
    this.state.reports.push(report);
    if (this.state.reports.length > 5000) this.state.reports.splice(0, this.state.reports.length - 5000);
    await this.save();
    return true;
  }
  async getReports(serviceId) {
    return copy(this.state.reports.filter(item => item.serviceId === serviceId && Date.parse(item.at) > Date.now() - 86400000));
  }
  async close() { await this.writes; }
}

/** MongoDB adapter: enable by configuring MONGODB_URI in .env. */
export class MongoStore {
  mode = 'MongoDB';
  constructor(uri, dbName = 'netguard') { this.uri = uri; this.dbName = dbName; }
  async init() {
    const {MongoClient} = await import('mongodb');
    this.client = new MongoClient(this.uri, {serverSelectionTimeoutMS: 5000});
    await this.client.connect();
    const db = this.client.db(this.dbName);
    await db.command({ping: 1});
    this.services = db.collection('services');
    this.checks = db.collection('checks');
    this.events = db.collection('events');
    this.reports = db.collection('reports');
    await this.reports.createIndex({createdAt: 1}, {expireAfterSeconds: 604800});
    await this.reports.createIndex({serviceId: 1, at: -1});
    await this.checks.createIndex({serviceId: 1, checkedAt: -1});
  }
  async listServices() { return this.services.find({}, {projection: {_id: 0}}).toArray(); }
  async getService(id) { return this.services.findOne({id}, {projection: {_id: 0}}); }
  async addService(service) {
    const added = {...service, id: randomUUID(), createdAt: new Date().toISOString()};
    await this.services.insertOne(added);
    delete added._id;
    return added;
  }
  async updateService(id, changes) {
    await this.services.updateOne({id}, {$set: {...changes, updatedAt: new Date().toISOString()}});
    return this.getService(id);
  }
  async deleteService(id) {
    const result = await this.services.deleteOne({id});
    if (result.deletedCount) await this.checks.deleteMany({serviceId: id});
    return Boolean(result.deletedCount);
  }
  async addCheck(check) { await this.checks.insertOne({...check, id: randomUUID()}); }
  async getChecks(serviceId, limit = 25) {
    return this.checks.find({serviceId}, {projection: {_id: 0}}).sort({checkedAt: -1}).limit(limit).toArray();
  }
  async logEvent(action, details) {
    await this.events.insertOne({id: randomUUID(), action, details, at: new Date().toISOString()});
  }
  async getEvents(limit = 25) {
    return this.events.find({}, {projection: {_id: 0}}).sort({at: -1}).limit(limit).toArray();
  }
  async addReport(report) {
    try {
      await this.reports.insertOne({...report, _id: report.id, createdAt: new Date(report.at)});
      return true;
    } catch (error) {
      if (error.code === 11000) return false;
      throw error;
    }
  }
  async getReports(serviceId) {
    return this.reports.find({serviceId, at: {$gt: new Date(Date.now() - 86400000).toISOString()}},
      {projection: {_id: 0, id: 0}}).toArray();
  }
  async close() { await this.client?.close(); }
}

export function createStore(env = process.env) {
  return env.MONGODB_URI ? new MongoStore(env.MONGODB_URI, env.MONGODB_DB || 'netguard') : new FileStore(env.DATA_FILE || undefined);
}
