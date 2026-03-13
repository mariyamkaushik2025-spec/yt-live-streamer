const streamKeyInput = document.getElementById('stream-key');
const videoInput = document.getElementById('video-file');
const output = document.getElementById('command-output');
const button = document.getElementById('build-command');

button.addEventListener('click', () => {
  const streamKey = streamKeyInput.value.trim();
  const selectedFile = videoInput.files && videoInput.files[0];

  if (!streamKey || !selectedFile) {
    output.textContent = 'Please choose a video file and enter your YouTube stream key.';
    return;
  }

  const command = `ffmpeg -re -i "${selectedFile.name}" -c:v libx264 -preset veryfast -maxrate 3000k -bufsize 6000k -pix_fmt yuv420p -g 50 -c:a aac -b:a 128k -ar 44100 -f flv "rtmp://a.rtmp.youtube.com/live2/${streamKey}"`;
  output.textContent = command;
});
