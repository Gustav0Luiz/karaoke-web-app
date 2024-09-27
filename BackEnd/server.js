require('dotenv').config();
const express = require('express');
const ytdl = require('@distube/ytdl-core');
const { spawn } = require('child_process');
const treeKill = require('tree-kill');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const app = express();
const port = process.env.PORT;

let currentProcesses = [];

const BACKEND_DIR = process.env.BACKEND_DIR;
const TEMP_AUDIO = path.join(BACKEND_DIR, 'yt_temp.wav');
const NO_VOCALS_AUDIO = path.join(BACKEND_DIR, 'no_vocals.wav');
const VOCALS_AUDIO = path.join(BACKEND_DIR, 'vocals.wav');
const THUMBNAIL_PATH = path.join(BACKEND_DIR, 'thumb.png');
const BLURRED_VIDEO_PATH = path.join(BACKEND_DIR, 'blurred_video.mp4');
const OUTPUT_VIDEO_PATH = path.join(BACKEND_DIR, 'output_video_with_lyrics.mp4');
const ASS_FILE_PATH = path.join(BACKEND_DIR, 'lyrics.ass');

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

async function downloadThumbnail(thumbnailUrl, filePath) {
  try {
    const response = await axios({
      url: thumbnailUrl,
      method: 'GET',
      responseType: 'stream',
      validateStatus: (status) => status < 500
    });

    return new Promise((resolve, reject) => {
      if (response.status === 200) {
        const writeStream = fs.createWriteStream(filePath);
        response.data.pipe(writeStream);

        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      } else {
        console.warn('Thumbnail not found, continuing with default YouTube image.');
        resolve();
      }
    });
  } catch (error) {
    console.error('Error downloading thumbnail:', error);
    throw error;
  }
}

app.post('/api/video/cancel', (req, res) => {
  if (currentProcesses.length > 0) {
    currentProcesses.forEach(pid => {
      try {
        process.kill(pid, 0);
        treeKill(pid, 'SIGKILL', () => {});
      } catch (error) {}
    });
    currentProcesses = [];
    res.json({ message: 'Processing successfully canceled.' });
  } else {
    res.json({ message: 'No process is currently running. Returning...' });
  }
});

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

    const videoInfo = await ytdl.getInfo(url);
    const videoId = videoInfo.videoDetails.videoId;
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    await downloadThumbnail(thumbnailUrl, THUMBNAIL_PATH);

    const audioStream = ytdl(url, {
      filter: 'audioonly',
      quality: 'highestaudio',
    });

    const ffmpegProcess = spawn('ffmpeg', [
      '-y', '-i', 'pipe:0', '-f', 'wav', '-q:a', '0', TEMP_AUDIO
    ], { stdio: ['pipe', 'inherit', 'inherit'] });

    currentProcesses.push(ffmpegProcess.pid);
    audioStream.pipe(ffmpegProcess.stdin);

    ffmpegProcess.on('close', (code) => {
      if (code === 0 && fs.existsSync(TEMP_AUDIO)) {
        executePythonScript('separate_audio.py', NO_VOCALS_AUDIO, res, () => {
          executePythonScript('generate_video.py', OUTPUT_VIDEO_PATH, res, () => {
            sendLogsToClients('Vídeo gerado com sucesso.');
            deleteTemporaryFiles(true);  // Exclui todos os arquivos menos o vídeo
            res.json({ videoUrl: `http://localhost:8000/api/video/final` });
          }, true);
        });
      } else {
        res.status(500).json({ error: 'FFmpeg audio processing failed.' });
      }
    });

    ffmpegProcess.on('close', () => {
      currentProcesses = currentProcesses.filter(p => p !== ffmpegProcess.pid);
    });

  } catch (error) {
    res.status(500).json({ error: 'Error processing video or downloading thumbnail.' });
  }
});

// Rota para deletar arquivos temporários ao enviar o formulário
app.post('/api/video/delete-temp', (req, res) => {
  try {
    deleteTemporaryFiles();  // Chama a função para excluir os arquivos temporários
    res.status(200).json({ message: 'Arquivos temporários deletados com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar arquivos temporários:', error);
    res.status(500).json({ error: 'Erro ao deletar arquivos temporários.' });
  }
});

// Função para deletar os arquivos temporários
function deleteTemporaryFiles() {
  const tempFiles = [
    TEMP_AUDIO,
    NO_VOCALS_AUDIO,
    VOCALS_AUDIO,
    THUMBNAIL_PATH,
    BLURRED_VIDEO_PATH,
    ASS_FILE_PATH,
    OUTPUT_VIDEO_PATH,
  ];

  tempFiles.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted: ${filePath}`);
    }
  });
}


// Função para executar scripts Python e enviar progresso ao cliente
function executePythonScript(scriptName, checkFilePath, res, callback, isSecondProcess = false) {
  const pythonProcess = spawn('python', [path.join(BACKEND_DIR, scriptName)], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  currentProcesses.push(pythonProcess.pid);

  pythonProcess.stdout.setEncoding('utf8');
  pythonProcess.stdout.on('data', (data) => {
    const progressRegex = /(\d+)%/;
    const match = data.match(progressRegex);

    if (match) {
      let progress = parseInt(match[1], 10);

      if (isSecondProcess) {
        progress = 50 + (progress / 2);
      } else {
        progress = progress / 2;
      }

      sendLogsToClients(`Progress: ${Math.round(progress)}%`);
    }
  });

  pythonProcess.stderr.setEncoding('utf8');
  pythonProcess.stderr.on('data', (data) => {
    sendLogsToClients(data);
  });

  pythonProcess.on('close', (code) => {
    currentProcesses = currentProcesses.filter(p => p !== pythonProcess.pid);

    if (code === 0 && fs.existsSync(checkFilePath)) {
      callback();
    } else {
      res.status(500).json({ error: `${scriptName} processing failed.` });
    }
  });
}

// Função para excluir os arquivos temporários exceto o vídeo
function deleteTemporaryFiles(excludeVideo = false) {
  const filesToDelete = [
    TEMP_AUDIO,
    NO_VOCALS_AUDIO,
    VOCALS_AUDIO,
    THUMBNAIL_PATH,
    BLURRED_VIDEO_PATH,
    ASS_FILE_PATH,
  ];

  if (!excludeVideo) {
    filesToDelete.push(OUTPUT_VIDEO_PATH);
  }

  filesToDelete.forEach((filePath) => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted: ${filePath}`);
    }
  });
}

// Rota para excluir apenas o vídeo quando o usuário clicar em "Voltar"
app.post('/api/video/delete', (req, res) => {
  if (fs.existsSync(OUTPUT_VIDEO_PATH)) {
    fs.unlinkSync(OUTPUT_VIDEO_PATH);
    console.log(`Deleted: ${OUTPUT_VIDEO_PATH}`);
    res.json({ message: 'Vídeo deletado com sucesso.' });
  } else {
    res.status(404).json({ error: 'Vídeo não encontrado.' });
  }
});

// Rota para fornecer o vídeo final ao frontend
app.get('/api/video/final', (req, res) => {
  const videoPath = OUTPUT_VIDEO_PATH;

  if (fs.existsSync(videoPath)) {
    res.setHeader('Content-Type', 'video/mp4');
    const videoStream = fs.createReadStream(videoPath);
    videoStream.pipe(res);
  } else {
    res.status(404).json({ error: 'Video not found.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
