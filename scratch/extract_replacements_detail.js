const fs = require('fs');
const transcriptPath = 'C:\\Users\\Allenmar\\.gemini\\antigravity\\brain\\2fe7c9a4-3511-4a4e-9810-101c69e8dd7a\\.system_generated\\logs\\transcript.jsonl';

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

for (const line of lines) {
    if (!line.trim()) continue;
    try {
        const step = JSON.parse(line);
        if (step.step_index === 396) {
            console.log("Found Step 396!");
            fs.writeFileSync('scratch/step_396.json', JSON.stringify(step, null, 2));
            console.log("Saved Step 396 details to scratch/step_396.json");
        }
        if (step.step_index === 270) {
            console.log("Found Step 270!");
            fs.writeFileSync('scratch/step_270.json', JSON.stringify(step, null, 2));
            console.log("Saved Step 270 details to scratch/step_270.json");
        }
        if (step.step_index === 561) {
            console.log("Found Step 561!");
            fs.writeFileSync('scratch/step_561.json', JSON.stringify(step, null, 2));
            console.log("Saved Step 561 details to scratch/step_561.json");
        }
    } catch (e) {}
}
