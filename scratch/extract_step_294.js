const fs = require('fs');

const transcriptPath = 'C:\\Users\\Allenmar\\.gemini\\antigravity\\brain\\2fe7c9a4-3511-4a4e-9810-101c69e8dd7a\\.system_generated\\logs\\transcript.jsonl';

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (!line.trim()) continue;
    try {
        const step = JSON.parse(line);
        if (step.step_index === 294) {
            console.log(`Found Step 294! Type: ${step.type}`);
            if (step.tool_calls) {
                console.log(`Step 294 has ${step.tool_calls.length} tool calls.`);
                for (const call of step.tool_calls) {
                    console.log(`Tool Call Name: ${call.name}`);
                    const str = JSON.stringify(call.args, null, 2);
                    console.log(`Args length: ${str.length}`);
                    console.log(`Is truncated in log: ${str.includes('truncated')}`);
                    fs.writeFileSync(`scratch/step_294.json`, str, 'utf8');
                    console.log(`Wrote step_294.json!`);
                }
            }
        }
        if (step.step_index === 414) {
            console.log(`Found Step 414! Type: ${step.type}`);
            if (step.tool_calls) {
                console.log(`Step 414 has ${step.tool_calls.length} tool calls.`);
                for (const call of step.tool_calls) {
                    console.log(`Tool Call Name: ${call.name}`);
                    const str = JSON.stringify(call.args, null, 2);
                    console.log(`Args length: ${str.length}`);
                    console.log(`Is truncated in log: ${str.includes('truncated')}`);
                    fs.writeFileSync(`scratch/step_414.json`, str, 'utf8');
                    console.log(`Wrote step_414.json!`);
                }
            }
        }
    } catch (e) {
        // ignore
    }
}
