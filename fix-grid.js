const fs = require('fs');
const path = require('path');

function fixGridComponents(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Remove Grid imports
  content = content.replace(/Grid,\s*/g, '');
  content = content.replace(/,\s*Grid/g, '');
  
  // Replace Grid container with Box
  content = content.replace(/<Box container spacing=\{(\d+)\} alignItems="center">/g, '<Box sx={{ display: "flex", flexWrap: "wrap", gap: $1, alignItems: "center" }}>');
  content = content.replace(/<Box container spacing=\{(\d+)\}>/g, '<Box sx={{ display: "flex", flexWrap: "wrap", gap: $1 }}>');
  
  // Replace Grid item with Box
  content = content.replace(/<Box item xs=\{(\d+)\} sm=\{(\d+)\} md=\{(\d+)\}>/g, '<Box sx={{ flex: "1 1 300px", minWidth: "250px" }}>');
  content = content.replace(/<Box item xs=\{(\d+)\} sm=\{(\d+)\}>/g, '<Box sx={{ flex: "1 1 250px", minWidth: "200px" }}>');
  content = content.replace(/<Box item xs=\{(\d+)\}>/g, '<Box sx={{ flex: "1 1 100%" }}>');
  
  // Fix malformed syntax
  content = content.replace(/sx=\{\{ flex: "1 1 100%" \}\}\}\{(\d+)\} md=\{(\d+)\}>/g, 'sx={{ flex: "1 1 300px", minWidth: "250px" }}>');
  content = content.replace(/sx=\{\{ flex: "1 1 100%" \}\}\}\{(\d+)\}>/g, 'sx={{ flex: "1 1 100%" }}>');
  
  // Replace Grid with Box
  content = content.replace(/<Grid/g, '<Box');
  content = content.replace(/<\/Grid>/g, '</Box>');
  
  fs.writeFileSync(filePath, content);
}

// Get all TypeScript files
const srcDir = path.join(__dirname, 'src');
const files = [];

function walkDir(dir) {
  const filesInDir = fs.readdirSync(dir);
  for (const file of filesInDir) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.tsx')) {
      files.push(filePath);
    }
  }
}

walkDir(srcDir);

// Fix all files
files.forEach(fixGridComponents);

console.log('Fixed Grid components in', files.length, 'files');
