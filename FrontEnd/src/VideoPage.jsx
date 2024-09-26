import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function VideoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { url } = location.state || {};
  const [videoInfo, setVideoInfo] = useState(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const getHighQualityThumbnail = (videoId) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  const extractVideoId = (url) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const matches = url.match(regex);
    return matches ? matches[1] : null;
  };

  const formatDuration = (duration) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    const fetchVideoInfo = async () => {
      try {
        const videoId = extractVideoId(url);
        const response = await fetch('http://localhost:8000/api/video/info', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url })
        });

        const data = await response.json();
        setVideoInfo({
          title: data.title,
          thumbnail: getHighQualityThumbnail(videoId),
          channel: data.channel,
          duration: data.duration,
        });
      } catch (error) {
        console.error('Erro ao buscar informações do vídeo:', error);
      }
    };

    fetchVideoInfo();
  }, [url]);

  const handleGenerateKaraoke = async () => {
    setLoadingAudio(true);
    setProgress(0);
    setError('');
    setAudioUrl(null); 

    try {
      const eventSource = new EventSource('http://localhost:8000/api/progress');

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const log = data.log;

        const extractProgressFromLog = (log) => {
          const progressRegex = /(\d+)%\|/; 
          const match = log.match(progressRegex);
          if (match) {
            return parseInt(match[1], 10); 
          }
          return null;
        };

        const extractedProgress = extractProgressFromLog(log);
        if (extractedProgress !== null) {
          setProgress(extractedProgress); 
        }

        if (extractedProgress === 100) {
          eventSource.close();
        }
      };

      const response = await fetch('http://localhost:8000/api/video/karaoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error('Erro ao processar o áudio.');
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      setAudioUrl(audioUrl);  // Define o áudio "no_vocals" no player
      setProgress(100); 
    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingAudio(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-jetbrains">
      <header className="p-4 flex items-center">
        <img src="/mic_icon.png" alt="Microphone" className="h-8 w-8 mr-2" />
        <h1 className="text-2xl font-bold">FeudoKe</h1>
      </header>
      <div className="flex-grow flex flex-col md:flex-row p-8 justify-center items-center mt-[-5%]">
        <div className="flex-1 flex justify-center items-center mb-6 md:mb-0">
          {videoInfo ? (
            <img
              src={videoInfo.thumbnail}
              alt="Thumbnail do vídeo"
              loading="lazy"
              className={`w-full max-w-lg md:max-w-2xl h-auto rounded-lg shadow-lg object-cover transition-all duration-700 ease-in-out ${isImageLoaded ? 'blur-0 opacity-100' : 'blur-md opacity-50'}`}
              onLoad={() => setIsImageLoaded(true)}
            />
          ) : (
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          )}
        </div>

        {videoInfo && (
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <h1 className="text-3xl font-bold mb-4">{videoInfo.title}</h1>
            <p className="text-lg mb-2">{videoInfo.channel}</p>
            <p className="text-lg mb-2">Duração: {formatDuration(videoInfo.duration)}</p>

            {!loadingAudio && !audioUrl && (
              <button
                className="mt-4 p-2 bg-blue-500 text-white rounded"
                onClick={handleGenerateKaraoke}
                disabled={loadingAudio}
              >
                {loadingAudio ? 'Processando...' : 'Iniciar Karaoke'}
              </button>
            )}

            {loadingAudio && (
              <div className="w-full max-w-3xl bg-gray-200 mt-4 rounded-lg">
                <div className="bg-blue-500 text-xs leading-none py-1 text-center rounded-lg text-white" style={{ width: `${progress}%` }}>
                  {progress}%
                </div>
              </div>
            )}

            {audioUrl && (
              <div className="mt-4">
                <audio controls src={audioUrl} />
              </div>
            )}

            {error && <p className="text-red-500 mt-2">{error}</p>}

            <div className="mt-4 flex space-x-4">
              <button
                className="p-2 bg-gray-200 hover:bg-gray-300 rounded"
                onClick={() => navigate('/')}
              >
                Voltar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoPage;
