#library that let's us convert website coe to application
import webview
#relative location library
from pathlib import Path

WEBDIR = Path(__file__).parent.resolve()

html_file = WEBDIR / "Webassets" / "index.html"

window = webview.create_window(
    title="GameWebsiteApp",
    url=str(html_file)

)

webview.start()