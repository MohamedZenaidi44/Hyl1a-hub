export const AudioState = {
  sounds: {},
  isMuted: false,
  isPlayingMusic: false,
  currentMusicAudio: null,
  currentTrackIndex: -1,
  isExternalMusicPlaying: false,
  _pendingConnectSuccess: false,
  _hasSetupFallback: false,
  _initialized: false,
  ctx: null,
  analyser: null,
  _sourceNode: null,
  appBgm: null,
  activeLaunchSFX: null,
  _savedVolume: 0.3,

  soundFiles: {
    click: 'public/assets/audio/click_survol_tuile.m4a',
    pop: 'public/assets/audio/pop_interaction.m4a',
    windowOpen: 'public/assets/audio/ouverture_fenetre.m4a',
    windowClose: 'public/assets/audio/fermeture_fenetre.m4a',
    connectSuccess: 'public/assets/audio/CONNECT_SUCCESS.m4a',
    miiLaunch: 'public/assets/audio/MiiSF.m4a',
    gbaLaunch: 'public/assets/audio/EmuSF.m4a',
    gbaBgm: 'public/assets/audio/GbaSF.mp3',
    defaultLaunch: 'public/assets/audio/launchD.mp3'
  },

  playlist: [
    { name: 'DSi Camera Album', file: 'public/assets/OST/DSi  Camera Album.mp3', cover: 'public/assets/icons/miiplaza.webp' },
    { name: 'Home Menu', file: 'public/assets/OST/Home Menu.mp3', cover: 'public/assets/icons/miiplaza.webp' },
    { name: 'Wii U Home Menu', file: 'public/assets/OST/Wii U Home Menu.mp3', cover: 'public/assets/icons/miiplaza.webp' }
  ]
};