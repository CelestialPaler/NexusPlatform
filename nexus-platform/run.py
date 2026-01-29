import webview
import ctypes
from backend.app import Api, get_entrypoint

# Force High DPI Awareness at the very start of the process
try:
    ctypes.windll.shcore.SetProcessDpiAwareness(2) # Per Monitor DPI Aware
    print("Main Process DPI Set to Per-Monitor Aware (2)")
except Exception as e:
    print(f"Failed to set Main Process DPI: {e}")

if __name__ == '__main__':
    api = Api()
    entry = get_entrypoint()
    
    window = webview.create_window(
        'Network Analysis Platform', 
        url=entry,
        js_api=api,
        width=2560, 
        height=1440,
        frameless=True,
        easy_drag=False
    )
    api.set_window(window)
    webview.start(debug=False)
