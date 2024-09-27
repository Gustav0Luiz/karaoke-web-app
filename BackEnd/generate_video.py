# generate_video.py

import os
import subprocess
import whisper
from pydub import AudioSegment
from pydub.silence import detect_nonsilent
import noisereduce as nr
import warnings

# Variáveis globais de progresso
progress = 0
last_progress = -1  # Armazena o último valor de progresso exibido

def update_progress(percentage):
    global progress, last_progress
    progress = percentage
    if int(progress) != int(last_progress):  # Só exibe se o valor for diferente do anterior
        print(f"{int(progress)}%", flush=True)
        last_progress = progress

thumb_file = 'thumb.png'
karaoke_audio_file = 'no_vocals.wav'
blurred_video_file = 'blurred_video.mp4'
vocals_audio_file = 'vocals.wav'
output_video_file = 'output_video_with_lyrics.mp4'
ass_output_file = 'lyrics.ass'

# Função para executar subprocessos e atualizar o progresso em tempo real
def run_command(command, step_start_progress, step_end_progress):
    global progress
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    # Monitorando a execução do processo
    while True:
        output = process.stderr.readline()
        if process.poll() is not None:
            break
        if output:
            step_progress = (step_end_progress - step_start_progress) / 100.0
            progress = min(step_end_progress, progress + step_progress)  # Garantir que não ultrapasse 100%
            if int(progress) != int(last_progress):
                print(f"{int(progress)}%", flush=True)
    process.wait()

# Primeira parte: Geração da imagem com blur (50% de progresso)
print("Iniciando geração da imagem com blur...")
if os.path.exists(thumb_file):
    blur_command = [
        'ffmpeg',
        '-loop', '1',
        '-i', thumb_file,
        '-i', karaoke_audio_file,
        '-filter_complex', '[0:v]gblur=sigma=20[v]',
        '-map', '[v]',
        '-map', '1:a',
        '-shortest',
        '-y', blurred_video_file
    ]
else:
    blur_command = [
        'ffmpeg',
        '-f', 'lavfi',
        '-i', 'color=c=black:s=1280x720',
        '-i', karaoke_audio_file,
        '-shortest',
        '-y', blurred_video_file
    ]

run_command(blur_command, 0, 50)  # Primeira parte até 50%

# Segunda parte: Transcrição da voz isolada (75% de progresso)
print("Iniciando transcrição da voz isolada...")
audio = AudioSegment.from_wav(vocals_audio_file)
low_pass_filter = audio.low_pass_filter(3000)

reduced_noise = nr.reduce_noise(y=low_pass_filter.get_array_of_samples(), sr=low_pass_filter.frame_rate)
cleaned_audio = AudioSegment(
    reduced_noise.tobytes(),
    frame_rate=low_pass_filter.frame_rate,
    sample_width=low_pass_filter.sample_width,
    channels=low_pass_filter.channels
)

nonsilent_ranges = detect_nonsilent(cleaned_audio, min_silence_len=300, silence_thresh=-40)

if nonsilent_ranges:
    first_voice_start = nonsilent_ranges[0][0] / 1000.0
else:
    first_voice_start = 0.0

model = whisper.load_model("base")
result = model.transcribe(vocals_audio_file)

update_progress(75)  # Atualiza o progresso para 75% ao final da transcrição

# Terceira parte: Geração do vídeo final (100% de progresso)
print("Iniciando geração do vídeo final...")

def generate_ass(segments, output_path, start_offset):
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("[Script Info]\n")
        f.write("Title: Karaoke Subtitles\n")
        f.write("Original Script: Subtitle Script\n")
        f.write("ScriptType: v4.00+\n")
        f.write("Collisions: Normal\n\n")

        f.write("[V4+ Styles]\n")
        f.write("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n")
        f.write("Style: Default,Arial,24,&H00FFFFFF,&H00000000,&H00000000,&H00000000,-1,0,1,1,1,5,10,10,30,1\n\n")

        f.write("[Events]\n")
        f.write("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
        
        for i, segment in enumerate(segments):
            start_time = segment['start']
            end_time = segment['end']
            
            if i == 0:
                start_time = start_offset

            if i + 1 < len(segments):
                next_start_time = segments[i + 1]['start']
                end_time = min(end_time, next_start_time - 0.1)

            text = segment['text'].replace('\n', ' ')
            f.write(f"Dialogue: 0,{format_time_ass(start_time)},{format_time_ass(end_time)},Default,,0,0,0,,{text}\n")

def format_time_ass(seconds):
    ms = int((seconds % 1) * 100)
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    seconds = seconds % 60
    return f"{hours:01}:{minutes:02}:{seconds:02}.{ms:02}"

generate_ass(result['segments'], ass_output_file, first_voice_start)

add_ass_command = [
    'ffmpeg',
    '-i', blurred_video_file,
    '-vf', f"subtitles={ass_output_file}",
    '-c:a', 'copy',
    '-y', output_video_file
]

run_command(add_ass_command, 75, 100)  # Finalizando até 100%

print("Processo concluído.")
