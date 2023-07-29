import {promises as pfs} from 'fs';

import {Simplified} from './interfaces';
import {ClassicLevel} from "classic-level";
import {AbstractBatchOperation} from "abstract-level";

export * from './interfaces';
type Db = ClassicLevel;
// Takes ~90 seconds on 2015-era MacBook Pro, producing 140 MB Leveldb directory ("jmdict-eng-3.1.0.json").
export type SetupType = {
    db: ClassicLevel,
    dictDate: string,
    version: string,
};

export async function setup(dbpath: string, filename = ''): Promise<SetupType> {
    const db = new ClassicLevel<string, string>(dbpath);
    try {
        const [dictDate, version] =
            await Promise.all([db.get('raw/dictDate'), db.get('raw/version')]) as string[];
        return {db, dictDate, version};
    } catch {
        // pass
    }

    if (!filename) {
        await db.close();
        throw new Error('database not found but cannot create it if no `filename` given');
    }
    let contents: string = '';
    try {
        contents = await pfs.readFile(filename, 'utf8')
    } catch {
        console.error(`Unable to find ${filename}, download it from https://github.com/scriptin/jmdict-simplified`);
        process.exit(1);
    }
    const raw: Simplified = JSON.parse(contents);
    try {
        let batch: AbstractBatchOperation<any, any, any>[] = [];

        {
            // non-JSON, pure strings
            const keys: (keyof Simplified)[] = ['dictDate', 'version'];
            for (const key of keys) {
                batch.push({type: 'put', key: `raw/${key}`, value: raw[key]})
            }
        }

        for (const kanjiChar of raw.characters) {
            batch.push({type: 'put', key: `raw/characters/${kanjiChar.literal}`, value: JSON.stringify(kanjiChar)});
        }
        if (batch.length) {
            await db.batch(batch);
        }
    } catch (e) {
        await db.close()
        throw e;
    }
    return {db, dictDate: raw.dictDate, version: raw.version};
}

export async function search(db: Db, kanji: string) {
    return db.get(`raw/characters/${kanji}`).then((x: string) => JSON.parse(x));
}

if (module === require.main) {
    (async function () {
        // TODO: Download latest jmdict-eng JSON
        const DBNAME = 'test';
        const {db, dictDate, version} = await setup(DBNAME, 'kanjidic2-en-3.5.0.json');

        console.log({dictDate, version});

        const res = await search(db, '食');
        console.log(res)
    })();
}
