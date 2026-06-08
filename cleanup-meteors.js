const fs = require('fs');

const files = [
    'src/pages/LoggIn.tsx',
    'src/pages/Registration.tsx', 
    'src/pages/ManagerRegistration.tsx',
    'src/pages/WorkerOnboard.tsx'
];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    
    // Remove shootingStars array definition
    content = content.replace(/const shootingStars = \[[\s\S]*?\];\s*\n/g, '');
    
    // Remove meteor DOM div with stars
    content = content.replace(/\s*<div className="pointer-events-none absolute inset-0">[\s\S]*?<\/div>\s*/g, '');
    
    // Remove style tag with keyframes
    content = content.replace(/\s*<style>\{\`[\s\S]*?@keyframes \w+-shooting-star[\s\S]*?\`\}<\/style>\s*/g, '');
    
    fs.writeFileSync(file, content, 'utf-8');
    console.log('Cleaned ' + file);
});
