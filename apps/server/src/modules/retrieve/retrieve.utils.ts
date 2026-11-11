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

const openFile = (filename: string): number => {
    return fs.openSync(path.join(STORE_PATH, filename), "r")
}

const fileRead = (filename: string) => {
    return fs.readFileSync(path.join(STORE_PATH, filename))
}

const readSlice = (data: Buffer, off: number, len: number) => {
    return data.toString('utf-8', off, off + len);
}

const readSliceDescriptor = (fd: number, off: number, len: number) => {
    const buf = Buffer.allocUnsafe(len);
    const bytesRead = fs.readSync(fd, buf, 0, len, off);
    if (bytesRead !== len) {
        throw new Error(`Failed to read ${len} bytes from file descriptor ${fd} at offset ${off}`);
    }
    return buf.toString('utf-8');
}


export const retrieveUtils = {
    openFile,
    parseJSON,
    fileRead,
    readSlice,
    readSliceDescriptor
}