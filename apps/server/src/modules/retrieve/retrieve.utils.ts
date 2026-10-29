import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORE_PATH = path.join(__dirname, '../../../../../store');

const parseJSON = <T>(data: Buffer): T => {
    return JSON.parse(data.toString('utf-8')) as T
};

const fileRead = (filename: string) => {
    return fs.readFileSync(path.join(STORE_PATH, filename))
}

const readSlice = (data: Buffer, off: number, len: number) => {
    return data.toString('utf-8', off, off + len);
}

export const retrieveUtils = {
    parseJSON,
    fileRead,
    readSlice
}