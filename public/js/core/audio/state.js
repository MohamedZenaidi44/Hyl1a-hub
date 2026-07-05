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
    { name: 'Eshop January 2016', file: 'public/assets/audio/Eshop January 2016.m4a', cover: 'public/assets/icons/eshop.webp' },
    { name: 'Eshop July 2014', file: 'public/assets/audio/Eshop July 2014.m4a', cover: 'public/assets/icons/eshop.webp' },
    { name: 'Eshop June 2015', file: 'public/assets/audio/Eshop June 2015.m4a', cover: 'public/assets/icons/eshop.webp' },
    { name: 'BXNJI', file: 'public/assets/audio/bxnji.mp3', cover: 'public/assets/icons/nico.webp' },
    { name: 'Thoughtbody', file: 'public/assets/audio/thoughtbody.mp3', cover: 'public/assets/icons/nico.webp' },
    { name: 'OST 1', file: 'public/assets/icons/ost1.mp3', cover: 'public/assets/icons/miiplaza.webp' },
    { name: 'OST 2', file: 'public/assets/icons/ost2.mp3', cover: 'public/assets/icons/miiplaza.webp' }
  ]
};