# Flow Studio

Create a simple video from one image with timed English/Hindi dialogue captions. Built for browser-first compatibility (including Chromebooks) using Canvas + MediaRecorder.

## Run

```bash
npm install
npm run run
```

Open `http://localhost:3000`.

## Notes

- Video export format: `.webm`.
- The app picks the best available browser codec (VP9, VP8, then generic WebM).
- On some browsers/devices, speech voices are available for playback but may not be embedded into the exported video stream due to browser audio routing limits.
