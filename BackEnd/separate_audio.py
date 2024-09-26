import os
import subprocess
import shutil
from dotenv import load_dotenv

# Carregar variáveis do .env
load_dotenv()

# Defina o caminho para o diretório do backend e arquivos de áudio
backend_dir = os.getenv('BACKEND_DIR')
input_audio_path = os.path.join(backend_dir, 'yt_temp.wav')
output_dir = os.path.join(backend_dir, 'stems_output')

# Verifique se o arquivo de entrada existe
if not os.path.exists(input_audio_path):
    raise FileNotFoundError(f"O arquivo {input_audio_path} não foi encontrado.")

os.makedirs(output_dir, exist_ok=True)

# Comando para rodar o Demucs
command = [
    'demucs', input_audio_path,
    '--two-stems', 'vocals',
    '--out', output_dir
]

# Execute o comando capturando a saída
try:
    subprocess.run(command, check=True, text=True)
    print(f"Separação concluída com sucesso. Arquivos salvos temporariamente em: {output_dir}")

    temp_htdemucs_dir = os.path.join(output_dir, 'htdemucs', 'yt_temp')

    if os.path.exists(temp_htdemucs_dir):
        final_output_dir = backend_dir
        files = os.listdir(temp_htdemucs_dir)

        for file_name in files:
            file_path = os.path.join(temp_htdemucs_dir, file_name)
            destination_path = os.path.join(final_output_dir, file_name)

            if os.path.exists(destination_path):
                os.remove(destination_path)
                print(f"Arquivo existente {file_name} removido do diretório destino.")

            shutil.move(file_path, final_output_dir)
            print(f"Movido: {file_name} para {final_output_dir}")

        shutil.rmtree(output_dir)
        print(f"Pasta temporária {output_dir} removida com sucesso.")
    else:
        print(f"O diretório temporário {temp_htdemucs_dir} não foi encontrado.")

except subprocess.CalledProcessError as e:
    print(f"Erro no processo de separação: {e}")
