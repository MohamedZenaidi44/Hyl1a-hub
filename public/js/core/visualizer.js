/**
 * Modern Audio Visualizer (Equalizer)
 * Reacts to AudioManager analyzer data using HTML5 Canvas.
 * Fluid 60fps animations with lerping and mirrored horizontal bars.
 */

const ModernVisualizer = {
  canvas: null,
  ctx: null,
  container: null,
  animationId: null,
  bars: 80, // Number of frequency bars per side (mirrored)
  barData: [], // Store previous values for lerping
  lerpFactor: 0.15, // Smoothing factor for animation
  
  init: function() {
    this.container = document.getElementById('modern-visualizer-container');
    this.canvas = document.getElementById('visualizer-canvas');
    if (!this.canvas || !this.container) return;
    
    this.ctx = this.canvas.getContext('2d');
    
    // Initialize lerp array
    for (let i = 0; i < this.bars; i++) {
        this.barData.push(0);
    }

    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.setupControls();
    this.startLoop();
  },
  
  resize: function() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  },
  
  setupControls: function() {
    const playBtn = document.getElementById('vis-play');
    const nextBtn = document.getElementById('vis-next');
    const prevBtn = document.getElementById('vis-prev');

    if (!playBtn || typeof AudioManager === 'undefined') return;

    playBtn.addEventListener('click', () => {
      if (AudioManager.isPlayingMusic) {
        AudioManager.pauseMusic();
      } else {
        AudioManager.playNextMusic();
      }
    });

    nextBtn.addEventListener('click', () => {
      AudioManager.playNextMusic();
    });

    prevBtn.addEventListener('click', () => {
      if (AudioManager.currentTrackIndex <= 0) {
        AudioManager.currentTrackIndex = AudioManager.playlist.length - 1;
      } else {
        AudioManager.currentTrackIndex -= 2;
      }
      AudioManager.playNextMusic();
    });
  },
  
  startLoop: function() {
    const draw = () => {
      this.animationId = requestAnimationFrame(draw);
      this.render();
    };
    draw();
  },
  
  render: function() {
    if (!this.ctx || !this.canvas) return;

    const width = this.canvas.width;
    const height = this.canvas.height;
    this.ctx.clearRect(0, 0, width, height);

    // Update Time Display
    this.updateTimeUI();

    // Get frequency data if audio is playing
    let dataArray = null;
    let bufferLength = 0;
    
    // Check if AudioManager exists and has an analyser
    const isPlaying = typeof AudioManager !== 'undefined' && AudioManager.isPlayingMusic && AudioManager.analyser;
    
    if (isPlaying) {
        // Moderate internal API smoothing (default 0.8). 
        // 0.6 gives a great balance between zero-latency feel and fluid visual motion.
        if (AudioManager.analyser.smoothingTimeConstant !== 0.6) {
            AudioManager.analyser.smoothingTimeConstant = 0.6; 
        }
        
        bufferLength = AudioManager.analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        AudioManager.analyser.getByteFrequencyData(dataArray);
    }
    
    // Draw visualizer bars (Mirrored)
    const barSpacing = Math.max(2, (width / 2) / this.bars); // Half width for mirror
    const barWidth = Math.max(1, barSpacing - 1.5); // Slightly thicker bars
    
    const centerY = height; // Draw from bottom up
    
    // Idle animation offset calculation
    const timeOffset = Date.now() / 1000;
    
    // No dynamic hue binding, explicitly applying Wii/Wii U predefined gradient in the loop
    
    for (let i = 0; i < this.bars; i++) {
        let targetValue = 0;
        
        if (dataArray && isPlaying) {
            // Map index to focus on visually pleasing frequencies
            // Skip the first few bins (`minFreqIndex = 2`) to avoid constant maxed-out sub-bass/DC noise
            const minFreqIndex = 2; 
            const maxFreqRange = bufferLength * 0.35;
            
            // Distribute bars smoothly
            const positionRatio = Math.pow(i / this.bars, 1.15); // Smoothed curve
            const dataIdx = minFreqIndex + Math.floor(positionRatio * (maxFreqRange - minFreqIndex));
            
            targetValue = dataArray[dataIdx] || 0;
            
            // Very slight amplification to prevent center bars from sticking to the absolute ceiling
            targetValue = Math.min(255, targetValue * 1.05);
        }
        
        // Idle animation: small seamless sine wave when no music
        if (!isPlaying || targetValue < 5) {
            const idleWave = Math.sin(timeOffset * 2 + (i * 0.1)) * 5;
            targetValue = Math.max(2, idleWave + 5);
        }
        
        // Asymmetrical Lerp: 
        // Fast enough attack to feel reactive (0.35) without losing frame fluidity,
        // and a slightly softer decay (0.2) for a natural physical feel.
        const dynamicLerp = targetValue > this.barData[i] ? 0.35 : 0.2;
        this.barData[i] = this.barData[i] + (targetValue - this.barData[i]) * dynamicLerp;
        
        // Calculate clamped height to prevent overflowing the canvas
        // 255 is the absolute maximum value from getByteFrequencyData
        const normalizedValue = this.barData[i] / 255;
        
        // Max height restricted to 80% of the container to keep it cleanly in bounds
        const maxHeight = height * 0.8;
        
        // Calculate final height assuring a minimum dimension for dead zones (barWidth)
        const barHeight = Math.max(barWidth, Math.min(maxHeight, normalizedValue * maxHeight));
        
        // Use the exact soft blue requested: #6fd0ff (Hue ~200, Sat ~100%, Light ~72%)
        const color = `rgba(111, 208, 255, 0.85)`;
        this.ctx.fillStyle = color;
        
        // Performance optimization: Disable expensive shadowBlur if the bar is practically idle
        if (barHeight > barWidth * 2) {
            // Iconic bright soft blue/white glow, characteristic of Wii interfaces
            this.ctx.shadowColor = `rgba(111, 208, 255, 0.6)`;
            this.ctx.shadowBlur = width > 800 ? 12 : 8; // Refined blur
        } else {
            this.ctx.shadowBlur = 0; // Saves massive GPU cost on idle
        }

        // Draw Right side
        const xRight = (width / 2) + (i * barSpacing);
        this.drawRoundedVRect(xRight, centerY - barHeight, barWidth, barHeight, barWidth / 2);
        
        // Draw Left side (Mirror)
        const xLeft = (width / 2) - ((i + 1) * barSpacing);
        this.drawRoundedVRect(xLeft, centerY - barHeight, barWidth, barHeight, barWidth / 2);
    }
  },

  updateTimeUI: function() {
    const playBtn = document.getElementById('vis-play');
    const trackTitle = document.getElementById('vis-track-title');
    const curEl = document.getElementById('vis-time-current');
    const totEl = document.getElementById('vis-time-total');
    
    if (typeof AudioManager === 'undefined') return;

    const isPlaying = AudioManager.isPlayingMusic && AudioManager.currentMusicAudio;

    if (!isPlaying) {
        if (playBtn && playBtn.textContent !== '▶') playBtn.textContent = '▶';
        if (trackTitle && trackTitle.textContent !== 'Aucune musique') trackTitle.textContent = 'Aucune musique';
        if (curEl && curEl.textContent !== '00:00') curEl.textContent = '00:00';
        if (totEl && totEl.textContent !== '00:00') totEl.textContent = '00:00';
        return;
    }

    if (playBtn && playBtn.textContent !== '⏸') playBtn.textContent = '⏸';

    // Also ensure title is correct
    if (trackTitle && AudioManager.playlist[AudioManager.currentTrackIndex]) {
        const expected = AudioManager.playlist[AudioManager.currentTrackIndex].name;
        if (trackTitle.textContent !== expected) {
            trackTitle.textContent = expected;
        }
    }

    const audio = AudioManager.currentMusicAudio;
    if (curEl && totEl) {
        const curTimeStr = this.formatTime(audio.currentTime || 0);
        const totTimeStr = isNaN(audio.duration) ? "--:--" : this.formatTime(audio.duration);
        if (curEl.textContent !== curTimeStr) curEl.textContent = curTimeStr;
        if (totEl.textContent !== totTimeStr) totEl.textContent = totTimeStr;
    }
  },

  formatTime: function(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  },

  // Helper method to draw a rounded filled rectangle vertically aligned to the bottom
  drawRoundedVRect: function(x, y, width, height, radius) {
    if (height < radius * 2) radius = height / 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.arcTo(x + width, y, x + width, y + radius, radius);
    this.ctx.lineTo(x + width, y + height); // bottom flat
    this.ctx.lineTo(x, y + height); // bottom flat
    this.ctx.lineTo(x, y + radius);
    this.ctx.arcTo(x, y, x + radius, y, radius);
    this.ctx.closePath();
    this.ctx.fill();
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  ModernVisualizer.init();
});
