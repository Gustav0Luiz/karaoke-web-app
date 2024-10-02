
# Karaoke Project

This project allows you to transform YouTube videos into karaoke tracks by removing the voice from the audio and keeping only the instrumental. The project consists of a Node.js backend and a React frontend.

## Demo

![gif_preview](https://github.com/user-attachments/assets/4bac30d6-d4ae-46b6-a9c1-f8124fda6b04)


## Prerequisites

Before getting started, you will need to have the following installed on your machine:

- **Node.js** (version 12 or higher)
- **Python** (version 3.6 or higher)
- **FFmpeg** (for audio processing)
- **Git** (optional, but recommended)

### 1. FFmpeg Installation

To install FFmpeg, follow the steps below:

#### Windows:

1. Download the **Essentials** version of FFmpeg: [FFmpeg Download](https://www.gyan.dev/ffmpeg/builds/)
2. Extract the ZIP file to a directory of your choice.
3. Add the path of the FFmpeg binary (`ffmpeg.exe`) to the system `PATH` environment variable.

#### Linux/Mac:

You can install FFmpeg via your system's package manager:

```bash
# For Ubuntu/Debian
sudo apt update
sudo apt install ffmpeg

# For Mac (via Homebrew)
brew install ffmpeg
```

### 2. Project Setup

To set up the project on your machine, follow these steps:

1. Clone the repository:

```bash
git clone https://github.com/Gustav0Luiz/karaoke-web-app.git
cd karaoke-web-app
```

2. Install the dependencies:

```bash
npm install
pip install -r requirements.txt
```

3. Set up environment variables:

Create a `.env` file at the project root and configure the following variables:

```bash
NODE_ENV=development
PORT=5000
```

### 3. Running the Project

To start the backend server, run:

```bash
npm run server
```

To start the frontend server, run:

```bash
npm start
```

Access the project at `http://localhost:3000`.

### 4. Audio Separation and Karaoke Generation

The backend uses **Demucs** to separate the audio into different stems (vocals, drums, bass, etc.). The instrumental stem is used to generate the karaoke track. The entire process is managed by the backend.

### 5. Contributing

If you'd like to contribute to the project, feel free to submit a pull request. Please follow the code of conduct and ensure all tests pass before submitting.
