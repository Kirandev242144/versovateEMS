const fs = require('fs');

const empFile = 'e:/antigravity/versovate/src/pages/Employees.tsx';
const indexFile = 'e:/antigravity/versovate/src/index.css';

const content = fs.readFileSync(empFile, 'utf8');
const lines = content.split('\n');

const startIdx = lines.findIndex(l => l.includes('<style>{`'));
const endIdx = lines.findIndex(l => l.includes('`}</style>'));

if (startIdx !== -1 && endIdx !== -1) {
    const cssLines = lines.slice(startIdx + 1, endIdx);

    // Append to index.css
    fs.appendFileSync(indexFile, '\n\n/* Global Component Styles Extracted from Employees.tsx */\n' + cssLines.join('\n'));

    // Remove from Employees.tsx
    const newLines = [...lines.slice(0, startIdx), ...lines.slice(endIdx + 1)];
    fs.writeFileSync(empFile, newLines.join('\n'));
    console.log("Success");
} else {
    console.log("Not found");
}
