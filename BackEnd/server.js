require('dotenv').config(); 
const express = require('express');
const ytdl = require('@distube/ytdl-core');
const { spawn } = require('child_process');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const port = process.env.PORT;

// Usar variáveis de ambiente para os caminhos
const BACKEND_DIR = process.env.BACKEND_DIR;
const TEMP_AUDIO = path.join(BACKEND_DIR, 'yt_temp.wav');
const NO_VOCALS_AUDIO = path.join(BACKEND_DIR, 'no_vocals.wav');
const VOCALS_AUDIO = path.join(BACKEND_DIR, 'vocals.wav');

let clients = [];

app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

app.get('/api/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.push(res);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

function sendLogsToClients(log) {
  clients.forEach(client => {
    client.write(`data: ${JSON.stringify({ log })}\n\n`);
  });
}

function deleteFiles(files) {
  files.forEach(file => {
    fs.unlink(file, (err) => {
      if (err) {
        console.error(`Erro ao deletar ${file}:`, err);
      } else {
        console.log(`${file} deletado com sucesso.`);
      }
    });
  });
}

app.post('/api/video/info', async (req, res) => {
  const { url } = req.body;

  try {
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid URL.' });
    }

    const videoInfo = await ytdl.getInfo(url);
    const durationInSeconds = videoInfo.videoDetails.lengthSeconds;

    res.json({
      title: videoInfo.videoDetails.title,
      channel: videoInfo.videoDetails.author.name,
      thumbnail: videoInfo.videoDetails.thumbnails[0].url,
      duration: durationInSeconds,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching video info.' });
  }
});

app.post('/api/video/karaoke', async (req, res) => {
  const { url } = req.body;

  try {
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid URL.' });
    }

    const audioStream = ytdl(url, {
      filter: 'audioonly',
      quality: 'highestaudio',
    });

    const ffmpegProcess = spawn('ffmpeg', [
      '-y', '-i', 'pipe:0', '-f', 'wav', '-q:a', '0', TEMP_AUDIO
    ], { stdio: ['pipe', 'inherit', 'inherit'] });

    audioStream.pipe(ffmpegProcess.stdin);

    ffmpegProcess.on('close', (code) => {
      if (code === 0 && fs.existsSync(TEMP_AUDIO)) {

        const pythonProcess = spawn('python', [path.join(BACKEND_DIR, 'separate_audio.py')], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        pythonProcess.stdout.setEncoding('utf8');
        pythonProcess.stdout.on('data', (data) => {
          sendLogsToClients(data);
        });

        pythonProcess.stderr.setEncoding('utf8');
        pythonProcess.stderr.on('data', (data) => {
          sendLogsToClients(data);
        });

        pythonProcess.on('close', (code) => {
          if (code === 0) {
            if (fs.existsSync(NO_VOCALS_AUDIO)) {
              res.setHeader('Content-Type', 'audio/wav');
              const fileStream = fs.createReadStream(NO_VOCALS_AUDIO);

              fileStream.pipe(res);
              fileStream.on('close', () => {
                deleteFiles([NO_VOCALS_AUDIO, VOCALS_AUDIO, TEMP_AUDIO]);
              });
            } else {
              res.status(500).json({ error: 'No vocals file not found.' });
            }
          } else {
            res.status(500).json({ error: 'Demucs processing failed.' });
          }
        });

      } else {
        res.status(500).json({ error: 'FFmpeg audio processing failed.' });
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Error processing video.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
