const imageInput = document.getElementById('imageInput');
const dialogueForm = document.getElementById('dialogueForm');
const languageInput = document.getElementById('language');
const durationInput = document.getElementById('duration');
const textInput = document.getElementById('text');
const dialogueList = document.getElementById('dialogueList');
const generateBtn = document.getElementById('generateBtn');
const downloadLink = document.getElementById('downloadLink');
const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');

let image = null;
let dialogues = [];
let currentVideoUrl = null;

const MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

function getRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const mimeType of MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  return '';
}

function drawFrame(currentDialogue = null) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (image) {
    const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    ctx.drawImage(image, x, y, w, h);
  } else {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, canvas.height - 170, canvas.width, 170);

  if (currentDialogue) {
    const label = currentDialogue.language.startsWith('hi') ? 'Hindi' : 'English';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(`${label}:`, 40, canvas.height - 115);
    ctx.font = '32px sans-serif';
    wrapText(currentDialogue.text, 40, canvas.height - 65, canvas.width - 80, 42);
  } else {
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '30px sans-serif';
    ctx.fillText('Add dialogues and click Generate video', 40, canvas.height - 80);
  }
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let cursorY = y;

  for (let i = 0; i < words.length; i += 1) {
    const testLine = `${line}${words[i]} `;
    const width = ctx.measureText(testLine).width;

    if (width > maxWidth && i > 0) {
      ctx.fillText(line, x, cursorY);
      line = `${words[i]} `;
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line, x, cursorY);
}

function renderDialogueList() {
  dialogueList.innerHTML = '';

  dialogues.forEach((item, index) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${index + 1}. [${item.language}] ${item.duration}s — ${item.text}</span>`;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      dialogues = dialogues.filter((_, i) => i !== index);
      renderDialogueList();
      drawFrame();
    });

    li.appendChild(removeBtn);
    dialogueList.appendChild(li);
  });
}

function speakDialogue(dialogue) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      setTimeout(resolve, dialogue.duration * 1000);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(dialogue.text);
    utterance.lang = dialogue.language;
    utterance.rate = 1;

    const voices = speechSynthesis.getVoices();
    const matchingVoice = voices.find((voice) => voice.lang === dialogue.language);
    if (matchingVoice) utterance.voice = matchingVoice;

    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);

    setTimeout(() => {
      speechSynthesis.cancel();
      finish();
    }, dialogue.duration * 1000);
  });
}

async function createVideo() {
  if (!image) {
    alert('Please upload an image first.');
    return;
  }

  if (!dialogues.length) {
    alert('Please add at least one dialogue.');
    return;
  }

  const mimeType = getRecorderMimeType();
  if (mimeType === null) {
    alert('MediaRecorder is not available in this browser.');
    return;
  }

  downloadLink.classList.add('hidden');
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';

  if (currentVideoUrl) {
    URL.revokeObjectURL(currentVideoUrl);
    currentVideoUrl = null;
  }

  const videoStream = canvas.captureStream(30);
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  gain.gain.value = 0.0001;
  osc.connect(gain).connect(dest);
  osc.start();

  const merged = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  const chunks = [];
  const recorder = new MediaRecorder(merged, mimeType ? { mimeType } : undefined);
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.start(200);

  for (const dialogue of dialogues) {
    drawFrame(dialogue);
    await speakDialogue(dialogue);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  drawFrame();
  await new Promise((resolve) => setTimeout(resolve, 400));

  await new Promise((resolve) => {
    recorder.onstop = resolve;
    recorder.stop();
  });

  speechSynthesis.cancel();
  osc.stop();
  audioCtx.close();
  merged.getTracks().forEach((track) => track.stop());

  const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
  currentVideoUrl = URL.createObjectURL(blob);

  downloadLink.href = currentVideoUrl;
  downloadLink.classList.remove('hidden');
  generateBtn.disabled = false;
  generateBtn.textContent = 'Generate .webm video';
}

imageInput.addEventListener('change', (e) => {
  const [file] = e.target.files;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    image = new Image();
    image.onload = () => drawFrame();
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

dialogueForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = textInput.value.trim();
  if (!text) return;

  dialogues.push({
    text,
    language: languageInput.value,
    duration: Math.max(1, Number(durationInput.value) || 4),
  });

  textInput.value = '';
  renderDialogueList();
  drawFrame();
});

generateBtn.addEventListener('click', createVideo);

drawFrame();
