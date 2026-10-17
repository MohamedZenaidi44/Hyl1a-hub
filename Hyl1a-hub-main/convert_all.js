const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const targetDir = 'c:\\laragon\\www\\hyl1a-plaza-main';

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const extsToWebp = ['.webp', '.webp', '.webp'];
const extsToWebm = ['.webm'];
const extsToM4a = ['.m4a'];

console.log('Starting Asset Conversion with FFmpeg at:', ffmpegPath);

walkDir(targetDir, (filePath) => {
  if (filePath.includes('node_modules') || filePath.includes('.git') || filePath.includes('tests')) return;

  const ext = path.extname(filePath).toLowerCase();
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, ext);

  try {
    if (extsToWebp.includes(ext)) {
      const out = path.join(dir, `${base}.webp`);
      console.log(`Converting to WebP: ${filePath}`);
      execSync(`"${ffmpegPath}" -y -i "${filePath}" -vcodec libwebp -lossless 0 -q:v 75 "${out}"`, { stdio: 'ignore' });
      fs.unlinkSync(filePath);
    } 
    else if (extsToWebm.includes(ext)) {
      const out = path.join(dir, `${base}.webm`);
      console.log(`Converting to WebM: ${filePath}`);
      execSync(`"${ffmpegPath}" -y -i "${filePath}" -c:v libvpx-vp9 -b:v 0 -crf 30 -an "${out}"`, { stdio: 'ignore' });
      fs.unlinkSync(filePath);
    }
    else if (extsToM4a.includes(ext)) {
      const out = path.join(dir, `${base}.m4a`);
      console.log(`Converting to M4A: ${filePath}`);
      execSync(`"${ffmpegPath}" -y -i "${filePath}" -c:a aac -b:a 128k "${out}"`, { stdio: 'ignore' });
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Error converting ${filePath}:`, err.message);
  }
});

console.log('Finished File Conversion. Starting String Replacement in Codebase...');

const codeExts = ['.js', '.php', '.html', '.css'];

walkDir(targetDir, (filePath) => {
  if (filePath.includes('node_modules') || filePath.includes('.git') || filePath.includes('tests')) return;

  const ext = path.extname(filePath).toLowerCase();
  if (!codeExts.includes(ext)) return;

  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Convert <video autoplay loop muted playsinline src="file.webm"></video> to <video autoplay loop muted playsinline src="file.webm"></video>
  content = content.replace(/<img([^>]*)src="([^"]+)\.webm"([^>]*)>/gi, '<video autoplay loop muted playsinline$1src="$2.webm"$3></video>');
  // Sometimes gif is inside single quotes in JS innerHTML
  content = content.replace(/<img([^>]*)src='([^']+)\.webm'([^>]*)>/gi, "<video autoplay loop muted playsinline$1src='$2.webm'$3></video>");

  // 2. Mass replace extensions inside logic where generic strings exist
  content = content.replace(/\.webp/gi, '.webp')
                   .replace(/\.webp/gi, '.webp')
                   .replace(/\.webp/gi, '.webp')
                   .replace(/\.webm/gi, '.webm')
                   .replace(/\.m4a/gi, '.m4a');
                   
  // 3. Prevent broken audio files
  content = content.replace(/MiiSF\.webm/g, 'MiiSF.m4a');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated paths in ${filePath}`);
  }
});

console.log('Conversion and Code Update Completed!');
