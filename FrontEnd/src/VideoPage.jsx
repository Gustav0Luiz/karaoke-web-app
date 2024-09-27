import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function VideoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { url } = location.state || {};
  const [videoInfo, setVideoInfo] = useState(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [progress, setProgress] = useState(0); // Progresso atual
  const [totalProgress, setTotalProgress] = useState(0); // Progresso total
  const [error, setError] = useState('');
  const eventSourceRef = useRef(null);
  const [videoGenerated, setVideoGenerated] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [startedProcessing, setStartedProcessing] = useState(false); // Para controlar quando o processo de karaoke começou

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
          body: JSON.stringify({ url }),
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

    if (url) {
      fetchVideoInfo();
    }
  }, [url]);

  const handleDeleteTemporaryFiles = async () => {
    try {
      // Chamada para deletar os arquivos temporários antes de iniciar o processo
      const response = await fetch('http://localhost:8000/api/video/delete-temp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        //console.log('Arquivos temporários deletados');
      } else {
        console.error('Erro ao deletar arquivos temporários');
      }
    } catch (error) {
      console.error('Erro ao deletar arquivos temporários:', error);
    }
  };

  const handleGenerateKaraoke = async () => {
    setLoadingVideo(true);
    setStartedProcessing(true); // Marca que o processo de geração começou
    setProgress(0);
    setTotalProgress(0);
    setError('');

    // Deletar arquivos temporários antes de iniciar o processo
    await handleDeleteTemporaryFiles();

    try {
      const eventSource = new EventSource('http://localhost:8000/api/progress');
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const log = data.log;

        const extractProgressFromLog = (log) => {
          const progressRegex = /(\d+)%/;
          const match = log.match(progressRegex);
          if (match) {
            return parseInt(match[1], 10);
          }
          return null;
        };

        const extractedProgress = extractProgressFromLog(log);
        if (extractedProgress !== null) {
          // Ajustar o progresso com base em onde estamos no processo
          if (extractedProgress <= 50) {
            setTotalProgress(extractedProgress); // Primeiro script: progresso vai de 0 a 50%
          } else {
            setTotalProgress(50 + (extractedProgress - 50)); // Segundo script: progresso vai de 50 a 100%
          }
        }

        if (log.includes('Vídeo gerado com sucesso')) {
          setVideoGenerated(true);
          setVideoUrl('http://localhost:8000/api/video/final');
          eventSource.close(); // Fechar conexão SSE
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
        throw new Error('Erro ao processar o vídeo.');
      }

    } catch (error) {
      setError(error.message);
    } finally {
      setLoadingVideo(false);
    }
  };

  const handleDeleteVideo = async () => {
    try {
      // Chamada para deletar o vídeo ao clicar no botão "Voltar"
      const response = await fetch('http://localhost:8000/api/video/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        //console.log('Vídeo deletado');
      }
    } catch (error) {
      console.error('Erro ao deletar o vídeo:', error);
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col font-jetbrains">
      <header className="p-4 flex items-center">
        <img src="/icone.png" alt="Microphone" className="h-8 w-8 mr-2" />
        <h1 className="text-2xl font-bold">FeudoKe</h1>
      </header>

      {videoGenerated ? (
        <div className="flex-grow flex flex-col justify-center items-center">
          <video
            controls
            className="w-full max-w-4xl h-auto rounded-lg"
            src={videoUrl}
            autoPlay
          />

          <button
            className="mt-4 p-2 bg-gray-300 text-black rounded hover:bg-gray-400"
            onClick={handleDeleteVideo} // Função que deleta o vídeo ao clicar no botão "Voltar"
          >
            Voltar
          </button>
        </div>
      ) : (
        <div className="flex-grow flex flex-col md:flex-row p-8 justify-center items-center mt-[-5%]">
          <div className="flex-1 flex justify-center items-center mb-6 md:mb-0">
            {videoInfo ? (
              <img
                src={videoInfo.thumbnail}
                alt="Thumbnail do vídeo"
                loading="lazy"
                className={`w-full max-w-lg md:max-w-2xl h-auto rounded-lg shadow-lg object-cover transition-all duration-700 ease-in-out ${
                  isImageLoaded ? 'blur-0 opacity-100' : 'blur-md opacity-50'
                }`}
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

              <div className="mt-4 flex flex-col items-center w-full">
                {!loadingVideo && !error && (
                  <button
                    className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={handleGenerateKaraoke}
                    disabled={loadingVideo}
                  >
                    Iniciar Karaoke
                  </button>
                )}

                {loadingVideo && totalProgress < 100 && (
                  <div className="w-full max-w-3xl bg-gray-200 mt-4 rounded-2xl h-5">
                    <div
                      className="bg-blue-500 text-xs leading-none py-1 text-center rounded-2xl text-white h-full"
                      style={{ width: `${totalProgress}%` }}
                    >
                      {totalProgress.toFixed(0)}%
                    </div>
                  </div>
                )}

                {startedProcessing && totalProgress < 100 && progress < 100 ? (
                  <div className="mt-4 text-lg font-bold text-center flex flex-col items-center gap-1">
                    <p>Seu vídeo está sendo gerado, prepare-se para cantar 🎤</p>
                    <p className='text-sm'>Essa etapa pode demorar alguns minutos</p>
                  </div>
                ) : (totalProgress === 100 && !videoGenerated) ? (
                  <div className="mt-4 flex flex-col items-center">
                    <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mt-4"></div>
                    <p className='mt-2 text-lg'>Carregando o vídeo...</p>
                  </div>
                ) : null}

                <button
                  className="mt-4 p-2 bg-gray-300 text-black rounded hover:bg-gray-400"
                  onClick={handleDeleteVideo}
                >
                  Voltar
                </button>

                {error && <p className="text-red-500 mt-2">{error}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VideoPage;
