import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa'; // Ícone de lupa
import VideoPage from './VideoPage';




function HomePage() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [videoInfo, setVideoInfo] = useState(null);
  const navigate = useNavigate();

  // Função de validação para checar se é um URL válido do YouTube
  const isValidYouTubeUrl = (url) => {
    const regex = /^(https?:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/;
    return regex.test(url);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidYouTubeUrl(url)) {
      setError('Por favor, insira um link válido do YouTube.');
      return;
    }

    try {
      setError('');
      //console.log('Enviando requisição para o servidor com a URL:', url); // Log de depuração

      // Navega para a página de vídeo
      navigate('/video', { state: { url } });
    } catch (err) {
      setError('Erro ao conectar com o servidor.');
      console.error('Erro:', err); // Log de depuração para erros
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-jetbrains">
      {/* Logo no canto superior esquerdo */}
      <header className="p-4 flex items-center">
        <img src="/icone.png" alt="Microphone" className="h-8 w-8 mr-2" />
        <h1 className="text-2xl font-bold">FeudoKe</h1>
      </header>

      {/* Formulário centralizado e ajustado um pouco mais para cima */}
      <div className="flex-grow flex justify-center items-center mt-[-10%]">
        <div className="w-1/2 max-w-lg">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              placeholder="video URL"
              className="w-full px-4 py-2 border border-gray-300 rounded-md outline-none"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button type="submit" className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer">
              <FaSearch />
            </button>
          </form>

          {/* Exibir mensagem de erro abaixo do formulário */}
          {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/video" element={<VideoPage />} />
      </Routes>
    </Router>
  );
}

export default App;
