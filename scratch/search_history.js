const fs = require('fs');
const path = require('path');

const historyDir = 'C:\\Users\\Allenmar\\AppData\\Roaming\\Code\\User\\History';

function searchDir(dir) {
    let results = [];
    if (!fs.existsSync(dir)) {
        return results;
    }
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        try {
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                results = results.concat(searchDir(fullPath));
            } else if (stat.isFile()) {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.includes('viewTicketDetails')) {
                    results.push({
                        path: fullPath,
                        size: stat.size,
                        mtime: stat.mtime
                    });
                }
            }
        } catch (e) {
            // ignore
        }
    }
    return results;
}

console.log('Searching VS Code history for viewTicketDetails...');
const matches = searchDir(historyDir);
matches.sort((a, b) => b.mtime - a.mtime);

console.log(`Found ${matches.length} matches:`);
matches.forEach((m, idx) => {
    console.log(`${idx + 1}: ${m.path} (${m.size} bytes) - Modified: ${m.mtime}`);
    if (idx < 5) {
        fs.copyFileSync(m.path, `scratch/app_js_backup_${idx}.js`);
        console.log(`Copied match to scratch/app_js_backup_${idx}.js`);
    }
});
