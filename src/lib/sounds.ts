import { Howl } from 'howler';

const sounds = {
  click: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.5 }),
  win: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.6 }),
  lose: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.4, rate: 0.8 }),
  spin: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.3, loop: true }),
  chip: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1118/1118-preview.mp3'], volume: 0.4 }),
  coin: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1119/1119-preview.mp3'], volume: 0.5 }),
  plink: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1084/1084-preview.mp3'], volume: 0.3, rate: 1.5 }),
  mine_gem: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.4, rate: 1.2 }),
  mine_boom: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.5, rate: 0.6 }),
  scratch: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2311/2311-preview.mp3'], volume: 0.4, loop: true }),
  success: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.5 }),
  error: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.4, rate: 0.5 }),
  levelUp: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'], volume: 0.6 }),
  notify: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'], volume: 0.4 })
};

export const playSound = (soundName: keyof typeof sounds) => {
  if (sounds[soundName]) {
    if (soundName === 'spin' || soundName === 'scratch') {
      if (!sounds[soundName].playing()) sounds[soundName].play();
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
