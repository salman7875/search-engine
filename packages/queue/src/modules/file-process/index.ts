import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { quicker } from "@repo/utils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUT_DIR = path.join(__dirname, "../../../../../store")
const TMP_DIR = `${OUT_DIR}.tmp`

const BUFFER = 1000;
const CHUNK = 300;
const OVERLAP = 50;
const STEPS = CHUNK - OVERLAP;

const writeLine = (fd: number, line: any) => fs.writeSync(fd, line.join(""))

const writeToFile = (name: string, data: any) => {
    fs.writeFileSync(path.join(TMP_DIR, name), JSON.stringify(data))
}

export const main = (docs: any) => {
    const startTime = Date.now();

    fs.rmSync(TMP_DIR, { recursive: true, force: true })
    fs.mkdirSync(TMP_DIR, { recursive: true })

    const unitFd = fs.openSync(path.join(TMP_DIR, "units.ndjson"), "w")
    const offsets = [];
    const lens = [];
    const invertedMap = new Map()
    let pos = 0;
    let buf = [];
    let unitId = 0;

    for (const doc of docs) {
        const docId = doc.id;
        const title = doc.title;
        const words = doc.text.split(/\s+/).filter(Boolean);

        for (let i = 0; i < words.length; i += STEPS) {
            const passageText = words.slice(i, i + CHUNK).join(" ")
            const stemTokens = quicker.generateTokens(passageText);

            const countMap = new Map();
            for (const stemToken of stemTokens) {
                countMap.set(stemToken, (countMap.get(stemToken) || 0) + 1);
            }

            for (const [stemToken, count] of countMap) {
                let passage = invertedMap.get(stemToken);
                if (!passage) invertedMap.set(stemToken, ( passage = { units: [], tf: [] } ))
                passage.units.push(unitId)
                passage.tf.push(count)
            }

            const payload = { id: unitId, docId, title, text: passageText, len: stemTokens.length }
            const line = JSON.stringify(payload) + "\n"
            buf.push(line)
            lens.push(stemTokens.length)
            offsets.push(pos)
            pos += Buffer.byteLength(line)

            if (buf.length >= BUFFER) {
                writeLine(unitFd, buf)
                buf = []
            }
            unitId += 1

            if (i + CHUNK >= words.length) break
        }
    }
    if (buf.length) writeLine(unitFd, buf) 
    fs.closeSync(unitFd)

    const postingsFd = fs.openSync(path.join(TMP_DIR, "postings.ndjson"), "w")
    const lexicon: any = {};
    const phoneticMap: any = {};
    let ppos = 0;
    buf = [];

    const invertedKeys = [...invertedMap.keys()].sort()

    for (const ikey of invertedKeys) {
        const { units, tf } = invertedMap.get(ikey);
        const pairs = units.map((unit: number, idx: number) => [unit, tf[idx]])
        const line = JSON.stringify(pairs);
        const len = Buffer.byteLength(line)
        buf.push(line + "\n");
        lexicon[ikey] = { df: units.length, off: ppos, len }
        ppos += len + 1

        if (buf.length >= BUFFER) {
            writeLine(postingsFd, buf)
            buf = []
        }

        for (const code of quicker.generatePhoneticTokens(ikey)) {
            if (!phoneticMap[code]) {
                phoneticMap[code] = []
            }
            phoneticMap[code].push(ikey)
        }
    }

    if (buf.length) writeLine(postingsFd, buf)
    fs.closeSync(postingsFd)

    const N = docs.length;
    const avgLen = N ? lens.reduce((a, c) => a + c, 0) / N : 0

    writeToFile("meta.json", { N, avgLen, lens, timestamp: new Date().toISOString() })
    writeToFile("units.offset.json", offsets);
    writeToFile("lexicon.json", lexicon);
    writeToFile("phonetic.json", phoneticMap)

    fs.rmSync(OUT_DIR, { recursive: true, force: true })
    fs.renameSync(TMP_DIR, OUT_DIR)

    console.log(`Built Index on ${docs.length} docs -> ${N} passages, ${invertedMap.size} unique tokens in ${Math.floor((Date.now() - startTime) / 1000)} sec`)
}
