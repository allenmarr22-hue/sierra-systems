const fs = require('fs');
const path = require('path');

const clientAppPath = 'frontend/js/client-app.js';
let content = fs.readFileSync(clientAppPath, 'utf8');

const replacements = JSON.parse(fs.readFileSync('scratch/replacements.json', 'utf8'));

// Filter for client-app.js and sort by stepIndex ascending
const clientReplacements = replacements
    .filter(r => r.args && r.args.TargetFile && r.args.TargetFile.includes('client-app.js'))
    .sort((a, b) => a.stepIndex - b.stepIndex);

console.log(`Found ${clientReplacements.length} replacements targeting client-app.js.`);

function parseJSONRecursive(val) {
    if (val === null || val === undefined) return val;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
            try {
                const parsed = JSON.parse(trimmed);
                return parseJSONRecursive(parsed);
            } catch (e) {}
        }
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            try {
                const parsed = JSON.parse(trimmed);
                return parseJSONRecursive(parsed);
            } catch (e) {}
        }
    }
    if (Array.isArray(val)) {
        return val.map(item => parseJSONRecursive(item));
    }
    if (typeof val === 'object') {
        const obj = {};
        for (const key in val) {
            obj[key] = parseJSONRecursive(val[key]);
        }
        return obj;
    }
    return val;
}

function applyReplacement(target, replacement, stepInfo) {
    target = parseJSONRecursive(target);
    replacement = parseJSONRecursive(replacement);

    if (!target) return false;

    // Handle normalizations for CRLF / LF line endings
    const targetLF = target.replace(/\r?\n/g, '\n');
    const targetCRLF = target.replace(/\r?\n/g, '\r\n');
    const contentLF = content.replace(/\r?\n/g, '\n');

    if (content.includes(target)) {
        content = content.replace(target, replacement);
        console.log(`  - Success (direct match) -> ${stepInfo}`);
        return true;
    } else if (content.includes(targetCRLF)) {
        content = content.replace(targetCRLF, replacement.replace(/\r?\n/g, '\r\n'));
        console.log(`  - Success (CRLF match) -> ${stepInfo}`);
        return true;
    } else if (content.includes(targetLF)) {
        content = content.replace(targetLF, replacement.replace(/\r?\n/g, '\n'));
        console.log(`  - Success (LF match) -> ${stepInfo}`);
        return true;
    } else if (contentLF.includes(targetLF)) {
        let newContentLF = contentLF.replace(targetLF, replacement.replace(/\r?\n/g, '\n'));
        if (content.includes('\r\n')) {
            content = newContentLF.replace(/\n/g, '\r\n');
        } else {
            content = newContentLF;
        }
        console.log(`  - Success (LF normalized match) -> ${stepInfo}`);
        return true;
    } else {
        console.warn(`  - FAILED to find TargetContent -> ${stepInfo}`);
        console.log("Snippet we wanted to find:\n", target.substring(0, 150) + "...\n");
        return false;
    }
}

for (const r of clientReplacements) {
    console.log(`Step ${r.stepIndex} (${r.name}): ${r.args.Description || 'no desc'}`);
    
    if (r.name === 'replace_file_content') {
        applyReplacement(r.args.TargetContent, r.args.ReplacementContent, 'Single replace');
    } else if (r.name === 'multi_replace_file_content') {
        const chunks = parseJSONRecursive(r.args.ReplacementChunks);
        if (Array.isArray(chunks)) {
            console.log(`  Processing ${chunks.length} chunks...`);
            chunks.forEach((chunk, idx) => {
                applyReplacement(chunk.TargetContent, chunk.ReplacementContent, `Chunk ${idx + 1}/${chunks.length}`);
            });
        } else {
            console.error(`  Chunks is not an array for Step ${r.stepIndex}. Type is: ${typeof chunks}`);
        }
    }
}

fs.writeFileSync(clientAppPath, content, 'utf8');
console.log("Finished applying client-app.js replacements!");
