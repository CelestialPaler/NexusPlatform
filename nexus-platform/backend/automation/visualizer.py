import win32gui
import win32ui
import win32con
import win32api
import ctypes
import time
import threading

class ActionVisualizer:
    """
    Helper class to draw overlays on the screen to visualize automation actions.
    Uses low-level Win32 GDI to draw directly on the screen DC to avoid focus stealing.
    """
    
    def __init__(self, enabled=True):
        self.enabled = enabled
        self._set_dpi_awareness()

    def _set_dpi_awareness(self):
        try:
            # Force Per-Monitor DPI Awareness (2)
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
        except Exception:
            try:
                # Fallback to System DPI Aware (1)
                ctypes.windll.shcore.SetProcessDpiAwareness(1)
            except Exception:
                pass

    def highlight_click(self, x: int, y: int, duration: float = 0.5):
        print(f"[Visualizer] Request Click Highlight at ({x}, {y})")
        if not self.enabled:
            print("[Visualizer] Disabled")
            return
        
        # Draw in a separate thread/async is nice, but we want it to be visible exactly when action happens
        # So we might block briefly or spawn a fire-and-forget thread
        t = threading.Thread(target=self._draw_marker_sequence, args=(x, y, duration))
        t.daemon = True
        t.start()

    def highlight_drag(self, start_x, start_y, end_x, end_y, duration: float = 1.0):
        print(f"[Visualizer] Request Drag Highlight from ({start_x}, {start_y}) to ({end_x}, {end_y})")
        if not self.enabled:
            return
        
        t = threading.Thread(target=self._draw_drag_sequence, args=(start_x, start_y, end_x, end_y, duration))
        t.daemon = True
        t.start()

    def _draw_marker_sequence(self, x, y, duration):
        """Draws a shrinking circle to indicate a click."""
        # print(f"[Visualizer] Drawing thread started for ({x}, {y})") 
        # Flash a few times
        try:
            for i in range(3):
                self._draw_circle(x, y, 50 - (i*10), 0x0000FF) # Red, larger radius
                time.sleep(0.05)
                # We rely on OS repaint to clear usually, or we can explicit invalidate
                # But explicit invalidating full screen is heavy.
                # Drawing on screen is dirty. 
                # Better approach: Invalidate just the rect we drew on.
                self._invalidate_rect(x, y, 60)
                time.sleep(0.05)
            
            # Final mark
            self._draw_circle(x, y, 20, 0x0000FF)
            time.sleep(duration)
            self._invalidate_rect(x, y, 60)
        except Exception as e:
            print(f"Visualizer Error: {e}")

    def _draw_drag_sequence(self, sx, sy, ex, ey, duration):
        try:
            # Draw Start
            self._draw_circle(sx, sy, 5, 0x00FF00) # Green
            
            # Draw Line
            self._draw_line(sx, sy, ex, ey, 0x00FF00, 2)
            
            # Draw End
            self._draw_circle(ex, ey, 5, 0x0000FF) # Red
            
            time.sleep(duration)
            
            # Cleanup
            left = min(sx, ex) - 20
            top = min(sy, ey) - 20
            right = max(sx, ex) + 20
            bottom = max(sy, ey) + 20
            win32gui.InvalidateRect(0, (left, top, right, bottom), True)
            
        except Exception as e:
            print(f"Visualizer Drag Error: {e}")

    def _draw_circle(self, x, y, radius, color_ref):
        # color_ref is 0xBBGGRR
        # Use HWND 0 (NULL) to get the DC for the entire screen, on top of all windows
        hwnd = 0 
        hdc = win32gui.GetWindowDC(hwnd)
        if not hdc:
            print("[Visualizer] Failed to get DC for screen")
            return
        
        try:
            dc = win32ui.CreateDCFromHandle(hdc)
            
            # Create Pen
            pen = win32ui.CreatePen(win32con.PS_SOLID, 3, color_ref)
            # Create Brush (Null means transparent inside)
            brush = win32ui.CreateBrush(win32con.BS_NULL, 0, 0)
            
            old_pen = dc.SelectObject(pen)
            old_brush = dc.SelectObject(brush)
            
            dc.Ellipse((x - radius, y - radius, x + radius, y + radius))
            
            # Restore
            dc.SelectObject(old_pen)
            dc.SelectObject(old_brush)
        finally:
            win32gui.ReleaseDC(hwnd, hdc)

    def _draw_line(self, x1, y1, x2, y2, color_ref, width=2):
        # Use HWND 0 (NULL) to get the DC for the entire screen
        hwnd = 0
        hdc = win32gui.GetWindowDC(hwnd)
        if not hdc: return
        
        try:
            dc = win32ui.CreateDCFromHandle(hdc)
            pen = win32ui.CreatePen(win32con.PS_SOLID, width, color_ref)
            old_pen = dc.SelectObject(pen)
            
            dc.MoveTo(x1, y1)
            dc.LineTo(x2, y2)
            
            dc.SelectObject(old_pen)
        finally:
            win32gui.ReleaseDC(hwnd, hdc)

    def _invalidate_rect(self, x, y, radius):
        # Force a repaint of the area to clear artifacts
        rect = (x - radius - 5, y - radius - 5, x + radius + 5, y + radius + 5)
        # HWND 0 = Desktop
        win32gui.InvalidateRect(0, rect, True)
