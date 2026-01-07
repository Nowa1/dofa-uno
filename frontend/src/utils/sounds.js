import { Howl } from 'howler';

// Create a simple completion sound using Web Audio API
// This creates a pleasant "ding" sound without needing external audio files
const createCompletionSound = () => {
  return new Howl({
    src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGe77OeeSwwPUKXi8LdjHAU5k9jyzHksBSR3yPDdkEAKFF+16OuoVRQKRp/g8r5sIQUrgs/y2Ik2CBhnu+znm0sMD1Cl4vC3YxwFOZPY8sx5LAUkd8jw3ZBAChRftejrqFUUCkaf4PK+bCEFK4LP8tmJNggYZ7vs55tLDA9QpeLwt2McBTmT2PLMeSwFJHfI8N2QQAoUX7Xo66hVFApGn+DyvmwhBSuCz/LZiTYIGGe77OebSwwPUKXi8LdjHAU5k9jyzHksBSR3yPDdkEAKFF+16OuoVRQKRp/g8r5sIQUrgs/y2Yk2CBhnu+znm0sMD1Cl4vC3YxwFOZPY8sx5LAUkd8jw3ZBAChRftejrqFUUCkaf4PK+bCEFK4LP8tmJNggYZ7vs55tLDA9QpeLwt2McBTmT2PLMeSwFJHfI8N2QQAoUX7Xo66hVFApGn+DyvmwhBSuCz/LZiTYIGGe77OebSwwPUKXi8LdjHAU5k9jyzHksBSR3yPDdkEAKFF+16OuoVRQKRp/g8r5sIQUrgs/y2Yk2CBhnu+znm0sMD1Cl4vC3YxwFOZPY8sx5LAUkd8jw3ZBAChRftejrqFUUCkaf4PK+bCEFK4LP8tmJNggYZ7vs55tLDA9QpeLwt2McBTmT2PLMeSwFJHfI8N2QQAoUX7Xo66hVFApGn+DyvmwhBSuCz/LZiTYIGGe77OebSwwPUKXi8LdjHAU5k9jyzHksBSR3yPDdkEAKFF+16OuoVRQKRp/g8r5sIQUrgs/y2Yk2CBhnu+znm0sMD1Cl4vC3YxwFOZPY8sx5LAUkd8jw3ZBAChRftejrqFUUCkaf4PK+bCEFK4LP8tmJNggYZ7vs55tLDA9QpeLwt2McBTmT2PLMeSwFJHfI8N2QQAoUX7Xo66hVFApGn+DyvmwhBSuCz/LZiTYIGGe77OebSwwPUKXi8LdjHAU5k9jyzHksBSR3yPDdkEAKFF+16OuoVRQKRp/g8r5s'],
    volume: 0.5,
    sprite: {
      complete: [0, 300]
    }
  });
};

// Alternative: Create a more sophisticated completion sound
const createBetterCompletionSound = () => {
  // This will play a pleasant two-tone "ding" sound
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  return {
    play: () => {
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // First tone (higher)
      oscillator1.frequency.value = 800;
      oscillator1.type = 'sine';
      
      // Second tone (lower, for harmony)
      oscillator2.frequency.value = 600;
      oscillator2.type = 'sine';
      
      // Envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator1.start(audioContext.currentTime);
      oscillator2.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.3);
      oscillator2.stop(audioContext.currentTime + 0.3);
    }
  };
};

// Export the sound instance
let completionSound;

export const initSounds = () => {
  try {
    completionSound = createBetterCompletionSound();
  } catch (error) {
    console.warn('Could not initialize sounds:', error);
  }
};

export const playCompletionSound = () => {
  try {
    if (completionSound) {
      completionSound.play();
    }
  } catch (error) {
    console.warn('Could not play completion sound:', error);
  }
};
