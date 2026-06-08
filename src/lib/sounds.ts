import { Howl } from 'howler';

// Store the currently active game ID so we can dynamically play themed sounds!
let activeGameId: string | null = null;

// Define complete sound map with highly detailed categories
const sounds = {
  // Global/Default standard casino sounds
  click: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.5 }),
  win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.6 }),
  lose: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.4, rate: 0.8 }),
  spin: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.3, loop: true }),
  chip: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1118/1118-preview.mp3'], volume: 0.4 }),
  coin: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1119/1119-preview.mp3'], volume: 0.5 }),
  plink: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1084/1084-preview.mp3'], volume: 0.3, rate: 1.5 }),
  mine_gem: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.4, rate: 1.2 }),
  mine_boom: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1600/1600-preview.mp3'], volume: 0.6 }), // Real explosive blast
  success: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.5 }),
  error: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.4, rate: 0.5 }),
  levelUp: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.6 }),
  notify: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.4 }),

  // 1. Crash & Space themed games (Aviator, Rocket Crash, Moon Crash)
  crash_spin: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1779/1779-preview.mp3', 'https://assets.mixkit.co/active_storage/sfx/1722/1722-preview.mp3'], volume: 0.35, loop: true, rate: 0.85 }), // Realistic roaring jet turbine engine rumble
  crash_win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.6, rate: 1.5 }), // Fast warp speed chimes
  crash_lose: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1600/1600-preview.mp3'], volume: 0.75, rate: 1.2 }), // Catastrophic hull explosion!

  // 2. Dojo / Traditional Martial Card themes (Dojo Cards, Dragon Tiger, Card slipper, Teen Patti)
  dojo_spin: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1341/1341-preview.mp3'], volume: 0.4, rate: 0.8 }), // Wind/sweep of cards/swords
  dojo_win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.65, rate: 0.85 }), // Gong ring chime
  dojo_lose: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1600/1600-preview.mp3'], volume: 0.5, rate: 0.5 }), // Heavy dramatic slam downward

  // 3. Retro Arcade Slots & Luck Wheels (Fruit Slots, Spin Wheel, Wheel of Fortune)
  slots_spin: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1118/1118-preview.mp3'], volume: 0.35, loop: true }), // mechanical rolling gear ticks
  slots_win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1124/1124-preview.mp3'], volume: 0.6 }), // casino jackpot fanfare celebration
  slots_lose: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2635/2635-preview.mp3'], volume: 0.5, rate: 0.95 }), // arcade crash fall down whimper

  // 4. Decryption / Cyber hacking themes (Cyber Flip, Coin Flip)
  cyber_spin: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3'], volume: 0.4, loop: true, rate: 1.35 }), // Retro matrix terminal scanning
  cyber_win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2195/2195-preview.mp3'], volume: 0.65, rate: 1.4 }), // Uplink secure bypass chime Beep
  cyber_lose: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2635/2635-preview.mp3'], volume: 0.5, rate: 0.65 }), // System lock error signal buzz

  // 5. Sports Stadium Themes (Goal Kick, Swipe Master)
  sports_ready: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3'], volume: 0.45 }), // Sharp professional referee whistle
  sports_win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1659/1659-preview.mp3'], volume: 0.65 }), // Stadium brass fanfares
  sports_lose: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/270/270-preview.mp3'], volume: 0.5, rate: 0.7 }), // Foul drone whistle

  // 6. Plinko & Bouncy Physics (Plinko Pro, Color Match)
  bounce_plink: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1084/1084-preview.mp3'], volume: 0.35, rate: 1.7 }), // high tone bouncy pop
  bounce_win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1119/1119-preview.mp3'], volume: 0.6, rate: 1.1 }), // coin fountain fall rain
  bounce_lose: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.4, rate: 0.6 }), // soft flat impact thud

  // Master ready cue (Pre-Play alert chime)
  ready: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2195/2195-preview.mp3'], volume: 0.5, rate: 1.1 })
};

// Map each of the 23 games into their precise sound themes
const gameSoundThemes: Record<string, 'crash' | 'dojo' | 'slots' | 'cyber' | 'sports' | 'bounce' | 'default'> = {
  aviator: 'crash',
  rocket_crash: 'crash',

  dojo_cards: 'dojo',
  dragon_tiger: 'dojo',
  teen_patti: 'dojo',
  slipper: 'dojo',

  fruit_slots: 'slots',
  spin: 'slots',
  wheel_fortune: 'slots',

  coin: 'cyber',
  cyber_dice: 'cyber',

  goal_kick: 'sports',
  swipe: 'sports',

  plinko: 'bounce',
  color_match: 'bounce',

  // Fall back to clean defaults for other games
  chests: 'default',
  treasure_hunt: 'default',
  fruit_ninja: 'default',
  sushi_strike: 'default',
  mines: 'default'
};

// High quality background music instrumental loop tracks
export const bgmTracks: Record<string, { name: string; url: string }> = {
  synthwave: {
    name: "Neon Synthwave",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
  },
  electro: {
    name: "Cyber Electro",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3"
  },
  retro8bit: {
    name: "8-Bit Arcade",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3"
  },
  zen: {
    name: "Mystical Dojo Zen",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3"
  },
  stadium: {
    name: "Epic Sports Stadium",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3"
  },
  chill: {
    name: "Ambient Lounge Chill",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3"
  }
};

export interface SoundSettings {
  sfxEnabled: boolean;
  bgmEnabled: boolean;
  bgmVolume: number;
  gameThemes: Record<string, string>;
  gameBgms: Record<string, string>;
}

export const defaultSettings: SoundSettings = {
  sfxEnabled: true,
  bgmEnabled: true,
  bgmVolume: 0.12,
  gameThemes: { ...gameSoundThemes },
  gameBgms: {
    aviator: 'synthwave',
    rocket_crash: 'synthwave',
    dojo_cards: 'zen',
    dragon_tiger: 'zen',
    teen_patti: 'zen',
    slipper: 'zen',
    fruit_slots: 'retro8bit',
    spin: 'retro8bit',
    wheel_fortune: 'retro8bit',
    coin: 'electro',
    goal_kick: 'stadium',
    swipe: 'stadium',
    plinko: 'retro8bit',
    color_match: 'electro',
    chests: 'chill',
    treasure_hunt: 'zen',
    fruit_ninja: 'stadium',
    sushi_strike: 'zen',
    mines: 'electro',
    cyber_dice: 'electro'
  }
};

// Retrieve settings with full fallback coverage
export const getSoundSettings = (): SoundSettings => {
  try {
    const raw = localStorage.getItem('playhub_sound_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        sfxEnabled: parsed.sfxEnabled !== undefined ? parsed.sfxEnabled : defaultSettings.sfxEnabled,
        bgmEnabled: parsed.bgmEnabled !== undefined ? parsed.bgmEnabled : defaultSettings.bgmEnabled,
        bgmVolume: parsed.bgmVolume !== undefined ? parsed.bgmVolume : defaultSettings.bgmVolume,
        gameThemes: { ...defaultSettings.gameThemes, ...parsed.gameThemes },
        gameBgms: { ...defaultSettings.gameBgms, ...parsed.gameBgms }
      };
    }
  } catch (e) {
    console.error("Failed to parse sound settings:", e);
  }
  return { ...defaultSettings };
};

// Global variables for active tracker instances
let currentBgmHowl: Howl | null = null;
let currentBgmTrackKey: string | null = null;

export const applyBgm = () => {
  const settings = getSoundSettings();

  // If BGM is disabled or no game is active, turn off any playing track
  if (!settings.bgmEnabled || !activeGameId) {
    if (currentBgmHowl) {
      currentBgmHowl.stop();
      currentBgmHowl.unload();
      currentBgmHowl = null;
      currentBgmTrackKey = null;
    }
    return;
  }

  const selectedTrackKey = settings.gameBgms[activeGameId] || 'none';
  if (selectedTrackKey === 'none') {
    if (currentBgmHowl) {
      currentBgmHowl.stop();
      currentBgmHowl.unload();
      currentBgmHowl = null;
      currentBgmTrackKey = null;
    }
    return;
  }

  const track = bgmTracks[selectedTrackKey];
  if (!track) return;

  // Same track: just sync the volume changes
  if (currentBgmTrackKey === selectedTrackKey && currentBgmHowl) {
    currentBgmHowl.volume(settings.bgmVolume);
    return;
  }

  // Different track: clean dismantle
  if (currentBgmHowl) {
    currentBgmHowl.stop();
    currentBgmHowl.unload();
  }

  // Instantiate and stream new track via HTML5
  currentBgmTrackKey = selectedTrackKey;
  currentBgmHowl = new Howl({
    src: [track.url],
    volume: settings.bgmVolume,
    loop: true,
    html5: true // Long format MP3 should be streamed cleanly
  });

  try {
    currentBgmHowl.play();
  } catch (error) {
    console.warn("BGM autoplay delayed:", error);
  }
};

export const updateSoundSettings = (settings: Partial<SoundSettings>) => {
  const current = getSoundSettings();
  const updated = {
    ...current,
    ...settings,
    gameThemes: { ...current.gameThemes, ...(settings.gameThemes || {}) },
    gameBgms: { ...current.gameBgms, ...(settings.gameBgms || {}) }
  };
  localStorage.setItem('playhub_sound_settings', JSON.stringify(updated));
  applyBgm();
};

export const setSoundActiveGameId = (id: string | null) => {
  activeGameId = id;
  applyBgm();
};

// Interceptor function that routes generic playsounds to active-themed equivalents!
export const playSound = (soundName: keyof typeof sounds) => {
  const settings = getSoundSettings();
  if (!settings.sfxEnabled) return;

  let playTarget = soundName;

  if (activeGameId) {
    const theme = settings.gameThemes[activeGameId] || 'default';
    if (theme !== 'default') {
      if (soundName === 'win') {
        playTarget = `${theme}_win` as any;
      } else if (soundName === 'lose') {
        playTarget = `${theme}_lose` as any;
      } else if (soundName === 'spin') {
        playTarget = `${theme}_spin` as any;
      } else if (soundName === 'plink' && theme === 'bounce') {
        playTarget = 'bounce_plink' as any;
      }
    }
  }

  // Trigger the target sound
  const targetHowl = sounds[playTarget] || sounds[soundName];
  if (targetHowl) {
    // Only toggle/restart loop sounds once
    if (playTarget === 'spin' || playTarget === 'crash_spin' || playTarget === 'slots_spin' || playTarget === 'cyber_spin') {
      if (!targetHowl.playing()) {
        targetHowl.play();
      }
    } else {
      // For immediate sound alerts, stop previous one to support rapid succession
      targetHowl.stop();
      targetHowl.play();
    }
  }
};

export const stopSound = (soundName: keyof typeof sounds) => {
  const settings = getSoundSettings();
  if (!settings.sfxEnabled) return;

  let stopTarget = soundName;

  if (activeGameId) {
    const theme = settings.gameThemes[activeGameId] || 'default';
    if (theme !== 'default') {
      if (soundName === 'spin') {
        stopTarget = `${theme}_spin` as any;
      }
    }
  }

  const targetHowl = sounds[stopTarget] || sounds[soundName];
  if (targetHowl) {
    targetHowl.stop();
  }
};
