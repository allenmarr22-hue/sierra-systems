const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:\\Users\\Allenmar\\.gemini\\antigravity\\brain\\2fe7c9a4-3511-4a4e-9810-101c69e8dd7a\\.system_generated\\logs\\transcript.jsonl';

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

const replacements = [];

for (const line of lines) {
    if (!line.trim()) continue;
    try {
        const step = JSON.parse(line);
        if (step.tool_calls) {
            for (const call of step.tool_calls) {
                if ((call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') && 
                    call.args && call.args.TargetFile && call.args.TargetFile.includes('app.js')) {
                    replacements.push({
                        stepIndex: step.step_index,
                        name: call.name,
                        args: call.args
                    });
                }
            }
        }
    } catch (e) {
        // ignore parsing errors
    }
}

console.log(`Found ${replacements.length} replacements targeting app.js:`);
replacements.forEach(r => {
    console.log(`Step ${r.stepIndex}: ${r.name} lines ${r.args.StartLine}-${r.args.EndLine} -> ${r.args.Description || 'no desc'}`);
});

fs.writeFileSync('scratch/replacements.json', JSON.stringify(replacements, null, 2));
