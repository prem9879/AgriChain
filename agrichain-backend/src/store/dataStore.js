const fs = require("fs");
const path = require("path");
const { databaseFile } = require("../config");

const DEFAULT_STATE = {
  trades: [],
  proofs: [],
  settlements: [],
};

const clone = (value) => {
  if (typeof value === "undefined") {
    return undefined;
  }
  return JSON.parse(JSON.stringify(value));
};

class DataStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = this.load();
  }

  load() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });

    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify(DEFAULT_STATE, null, 2));
      return clone(DEFAULT_STATE);
    }

    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw);

      return {
        trades: Array.isArray(parsed.trades) ? parsed.trades : [],
        proofs: Array.isArray(parsed.proofs) ? parsed.proofs : [],
        settlements: Array.isArray(parsed.settlements) ? parsed.settlements : [],
      };
    } catch (error) {
      console.error("[store] Failed to parse database. Resetting file.", error.message);
      fs.writeFileSync(this.filePath, JSON.stringify(DEFAULT_STATE, null, 2));
      return clone(DEFAULT_STATE);
    }
  }

  snapshot() {
    return clone(this.state);
  }

  transaction(mutator) {
    const draft = clone(this.state);
    const result = mutator(draft);
    this.state = draft;
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
    return clone(result);
  }
}

module.exports = new DataStore(databaseFile);
