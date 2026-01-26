import sys
import os
import time
import win32gui
import win32api

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

try:
    from backend.automation.visualizer import ActionVisualizer
except ImportError:
    print("Could not import ActionVisualizer. Make sure you run this script from the project root or adjust path.")
    sys.exit(1)

def test_visuals():
    print("Initializing Visualizer...")
    viz = ActionVisualizer(enabled=True)
    
    # Get Screen Center
    width = win32api.GetSystemMetrics(0)
    height = win32api.GetSystemMetrics(1)
    
    cx, cy = width // 2, height // 2
    
    print(f"Screen resolution: {width}x{height}")
    print(f"Testing Click at center ({cx}, {cy})...")
    
    # Test Click Visualization
    viz.highlight_click(cx, cy, duration=1.0)
    time.sleep(1.5)
    
    print("Testing Drag Visualization from Top-Left to Center...")
    # Test Drag Visualization
    viz.highlight_drag(100, 100, cx, cy, duration=2.0)
    time.sleep(2.5)
    
    print("Done. Did you see the red circles?")

if __name__ == "__main__":
    import ctypes
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except:
        pass
    test_visuals()
