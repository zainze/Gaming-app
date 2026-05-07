import { Howl } from 'howler';

const sounds = {
  click: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.5 }),
  win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.6 }),
  lose: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.4, rate: 0.8 }),
  spin: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.3, loop: true }),
  chip: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1118/1118-preview.mp3'], volume: 0.4 }),
  coin: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1119/1119-preview.mp3'], volume: 0.5 }),
  success: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.5 }),
  error: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.4, rate: 0.5 }),
  levelUp: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.6 }),
  notify: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.4 })
};

export const playSound = (soundName: keyof typeof sounds) => {
  if (sounds[soundName]) {
    if (soundName === 'spin') {
      if (!sounds.spin.playing()) sounds.spin.play();
    } else {
      sounds[soundName].play();
    }
  }
};

export const stopSound = (soundName: keyof typeof sounds) => {
  if (sounds[soundName]) {
    sounds[soundName].stop();
  }
};
