const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:\\Users\\Allenmar\\.gemini\\antigravity\\brain\\2fe7c9a4-3511-4a4e-9810-101c69e8dd7a\\.system_generated\\logs\\transcript.jsonl';

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

let viewCount = 0;

for (const line of lines) {
    if (!line.trim()) continue;
    try {
        const step = JSON.parse(line);
        
        // Find view_file tool execution results
        if (step.type === 'VIEW_FILE' && step.content && step.content.includes('File Path:')) {
            // Check if the previous step's tool call was for app.js
            const prevLine = lines[step.step_index - 1] || lines[step.step_index - 2];
            let isAppJs = false;
            let startLine = 'all';
            let endLine = 'all';
            
            try {
                const prevStep = JSON.parse(prevLine);
                if (prevStep.tool_calls) {
                    for (const call of prevStep.tool_calls) {
                        if (call.name === 'view_file' && call.args && call.args.AbsolutePath && call.args.AbsolutePath.includes('app.js')) {
                            isAppJs = true;
                            startLine = call.args.StartLine || '1';
                            endLine = call.args.EndLine || 'end';
                        }
                    }
                }
            } catch (err) {}
            
            // If it is app.js, save the content!
            if (isAppJs || step.content.includes('app.js')) {
                const outPath = `scratch/view_${step.step_index}_${startLine}_${endLine}.txt`;
                fs.writeFileSync(outPath, step.content);
                console.log(`Saved view step ${step.step_index} (${startLine}-${endLine}) to ${outPath}`);
                viewCount++;
            }
        }
    } catch (e) {
        // ignore
    }
}

console.log(`Extracted ${viewCount} view files.`);
