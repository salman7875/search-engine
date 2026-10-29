import natural from "natural"
import {eng} from "./stopwords/stopword_eng.js"

const tokenizer = new natural.WordTokenizer()
const dm = new natural.DoubleMetaphone()
const hasWord = new Set(eng.map(e => e))

const stemCache = new Map()
const phoneticCache = new Map()

const stem = (token: string) => {
    let cache = stemCache.get(token);
    if (!cache) {
        cache = natural.PorterStemmer.stem(token)
        stemCache.set(token, cache)
    }
    return cache
}

const generateTokens = (text: string) => {
    let tokens = []

    for (const token of tokenizer.tokenize(text.toLowerCase())) {
        if (hasWord.has(token)) continue;
        tokens.push(stem(token))
    }
    return tokens
}

const generatePhoneticTokens = (token: string) => {
    let cache = phoneticCache.get(token)
    if (!cache) {
        cache = []
        if (token.length >= 3 && /^[a-z]+$/.test(token)){
            const [primary = "", secondary = ""] = dm.process(token, 6)
            cache.push(primary)
            if (secondary && secondary !== primary) {
                cache.push(secondary)
            }
        }
        phoneticCache.set(token, cache)
    }
    return cache
}

export const quicker = { generateTokens, generatePhoneticTokens }