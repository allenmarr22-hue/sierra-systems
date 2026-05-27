const fs = require('fs');
const transcriptPath = 'C:\\Users\\Allenmar\\.gemini\\antigravity\\brain\\2fe7c9a4-3511-4a4e-9810-101c69e8dd7a\\.system_generated\\logs\\transcript.jsonl';

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

const views = [];

for (const line of lines) {
    if (!line.trim()) continue;
    try {
        const step = JSON.parse(line);
        if (step.type === 'VIEW_FILE' && step.content && step.content.includes('app.js')) {
            views.push({
                stepIndex: step.step_index,
                length: step.content.length,
                preview: step.content.substring(0, 100)
            });
        }
        if (step.tool_calls) {
            for (const call of step.tool_calls) {
                if (call.name === 'view_file' && call.args && call.args.AbsolutePath && call.args.AbsolutePath.includes('app.js')) {
                    views.push({
                        stepIndex: step.step_index,
                        type: 'tool_call',
                        args: call.args
                    });
                }
            }
        }
    } catch (e) {
        // ignore
    }
}

console.log(`Found ${views.length} views related to app.js:`);
views.forEach(v => {
    if (v.type === 'tool_call') {
        console.log(`Step ${v.stepIndex} CALL: view_file lines ${v.args.StartLine}-${v.args.EndLine}`);
    } else {
        console.log(`Step ${v.stepIndex} CONTENT: length ${v.length}, preview: ${v.preview}`);
    }
});
