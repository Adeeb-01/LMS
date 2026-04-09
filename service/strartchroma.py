import subprocess
import sys

# تشغيل خادم Chroma عبر وحدة uvicorn التي تعتمد عليها المكتبة داخلياً
subprocess.run([sys.executable, "-m", "uvicorn", "chromadb.app:app", "--reload", "--port", "8000"])