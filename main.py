import webview
from pathlib import Path

# 1. Get the directory where main.py actually lives
# .parent gives you the folder, .resolve() gives the full absolute path
BASE_DIR = Path(__file__).parent.resolve()

# 2. Join the path to your HTML file
# This is equivalent to: BASE_DIR / "Webassets" / "index.html"
html_file = BASE_DIR / "Webassets" / "index.html"

# 3. Launch the window using the dynamic path
window = webview.create_window(
    title='GamePage',
    url=str(html_file) # pywebview expects a string
)

webview.start()