"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.search = exports.setup = void 0;
const fs_1 = require("fs");
const classic_level_1 = require("classic-level");
__exportStar(require("./interfaces"), exports);
function setup(dbpath, filename = '') {
    return __awaiter(this, void 0, void 0, function* () {
        const db = new classic_level_1.ClassicLevel(dbpath);
        try {
            const [dictDate, version] = yield Promise.all([db.get('raw/dictDate'), db.get('raw/version')]);
            return { db, dictDate, version };
        }
        catch (_a) {
            // pass
        }
        if (!filename) {
            yield db.close();
            throw new Error('database not found but cannot create it if no `filename` given');
        }
        let contents = '';
        try {
            contents = yield fs_1.promises.readFile(filename, 'utf8');
        }
        catch (_b) {
            console.error(`Unable to find ${filename}, download it from https://github.com/scriptin/jmdict-simplified`);
            process.exit(1);
        }
        const raw = JSON.parse(contents);
        try {
            const maxBatches = 10000;
            let batch = [];
            {
                // non-JSON, pure strings
                const keys = ['dictDate', 'version'];
                for (const key of keys) {
                    batch.push({ type: 'put', key: `raw/${key}`, value: raw[key] });
                }
            }
            for (const kanjiChar of raw.characters) {
                batch.push({ type: 'put', key: `raw/characters/${kanjiChar.literal}`, value: JSON.stringify(kanjiChar) });
            }
            if (batch.length) {
                yield db.batch(batch);
            }
        }
        catch (e) {
            yield db.close();
            throw e;
        }
        return { db, dictDate: raw.dictDate, version: raw.version };
    });
}
exports.setup = setup;
function search(db, kanji) {
    return __awaiter(this, void 0, void 0, function* () {
        return db.get(`raw/characters/${kanji}`).then((x) => JSON.parse(x));
    });
}
exports.search = search;
if (module === require.main) {
    (function () {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Download latest jmdict-eng JSON
            const DBNAME = 'test';
            const { db, dictDate, version } = yield setup(DBNAME, 'kanjidic2-en-3.5.0.json');
            console.log({ dictDate, version });
            const res = yield search(db, '食');
            console.log(res);
        });
    })();
}
