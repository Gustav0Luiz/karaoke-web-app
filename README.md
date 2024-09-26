
# Projeto de Karaokê

Este projeto permite que você transforme vídeos do YouTube em faixas de karaokê, removendo a voz do áudio e mantendo apenas o instrumental. O projeto consiste em um backend Node.js e um frontend React.

## Pré-requisitos

Antes de começar, você precisará ter o seguinte instalado na sua máquina:

- **Node.js** (versão 12 ou superior)
- **Python** (versão 3.6 ou superior)
- **FFmpeg** (para processamento de áudio)
- **Git** (opcional, mas recomendado)

### 1. Instalação do FFmpeg

Para instalar o FFmpeg, siga as etapas abaixo:

#### Windows:

1. Faça o download da versão **Essentials** do FFmpeg: [FFmpeg Download](https://www.gyan.dev/ffmpeg/builds/)
2. Extraia o arquivo ZIP em um diretório de sua preferência.
3. Adicione o caminho do binário do FFmpeg (`ffmpeg.exe`) à variável de ambiente `PATH` do sistema.

#### Linux/Mac:

Você pode instalar o FFmpeg via o gerenciador de pacotes do seu sistema:

```bash
# Para Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# Para MacOS (via Homebrew)
brew install ffmpeg
```

### 2. Clonando o Repositório

Para clonar o projeto, execute o seguinte comando:

```bash
git clone https://github.com/seu-usuario/karaoke-web-app.git
cd karaoke-web-app
```

### 3. Configuração do Backend

#### Instalando as Dependências

Navegue até a pasta do backend e instale as dependências necessárias:

```bash
cd BackEnd
npm install
```

#### Configurando o Arquivo `.env`

Crie um arquivo `.env` no diretório `BackEnd`. Este arquivo conterá as variáveis de ambiente do projeto. Exemplo de configuração:

```env
# Caminho do diretório de backend
BACKEND_DIR=/path/to/your/backend/directory

# Porta onde o servidor será executado
PORT=8000
```

> **Nota**: Mude o caminho `BACKEND_DIR` de acordo com o local onde você armazenou o projeto na sua máquina.

### 4. Configuração do Frontend

Navegue até a pasta do frontend e instale as dependências:

```bash
cd ../FrontEnd
npm install
```

### 5. Executando o Projeto

#### Iniciando o Backend

Navegue até a pasta do backend e inicie o servidor:

```bash
cd BackEnd
node server.js
```

#### Iniciando o Frontend

Em outro terminal, navegue até a pasta do frontend e inicie o servidor de desenvolvimento:

```bash
cd ../FrontEnd
npm start
```

O frontend será executado em `http://localhost:5173`, enquanto o backend estará rodando em `http://localhost:8000`.

### 6. Como Usar

1. No frontend, cole o URL de um vídeo do YouTube que contenha música.
2. Clique em "Iniciar Karaokê".
3. O backend fará o download do áudio, removerá a voz e criará uma faixa de karaokê.
4. Quando o processo for concluído, o player de áudio será exibido com a faixa "no vocals".

### 7. Exclusão de Arquivos Temporários

Os arquivos temporários gerados durante o processamento (vocals, no_vocals e yt_temp) serão automaticamente excluídos do diretório backend após serem enviados ao frontend.

---

## Observações

- Certifique-se de configurar o FFmpeg corretamente no `PATH` do sistema.
- O projeto foi desenvolvido utilizando o Node.js e o Python para processamento de áudio via Demucs.
- Caso precise modificar o diretório onde os arquivos temporários são armazenados, você pode ajustar o valor da variável `BACKEND_DIR` no arquivo `.env`.

