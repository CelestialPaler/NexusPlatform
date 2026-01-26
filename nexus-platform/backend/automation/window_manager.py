import ctypes
import pygetwindow as gw
import win32gui
import win32con
import time
import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

class WindowManager:
    def __init__(self, window_title: str, dpi_awareness: bool = True):
        self.window_title = window_title
        self.window = None
        self.target_hwnd = None # Store specific HWND if known
        if dpi_awareness:
            self._set_dpi_awareness()

    def _set_dpi_awareness(self):
        """Sets the process to be DPI aware to ensure correct coordinate handling."""
        try:
            # Try Per-Monitor DPI Awareness (2) first
            ctypes.windll.shcore.SetProcessDpiAwareness(2)
            print("DPI Awareness set to Per-Monitor Aware (2)")
        except Exception as e:
            try:
                # Fallback to System DPI Aware (1)
                ctypes.windll.shcore.SetProcessDpiAwareness(1)
                print("DPI Awareness set to System Aware (1)")
            except Exception as e2:
                print(f"Warning: Could not set DPI awareness: {e2}")
                try:
                    ctypes.windll.user32.SetProcessDPIAware()
                    print("DPI Awareness set to Legacy Aware")
                except Exception as e3:
                    print(f"Warning: Could not set legacy DPI awareness: {e3}")

    def find_window(self) -> bool:
        """Finds the window by title or HWND."""
        # If we have a specific HWND, verify it still exists and use it
        if self.target_hwnd and win32gui.IsWindow(self.target_hwnd):
            # We have a valid HWND. Try to map it to a pygetwindow object for compatibility,
            # but even if we can't, we consider the window "found".
            
            # Try to find it in pygetwindow list
            try:
                # Get title from HWND to help search
                current_title = win32gui.GetWindowText(self.target_hwnd)
                if current_title:
                    windows = gw.getWindowsWithTitle(current_title)
                    for w in windows:
                        if w._hWnd == self.target_hwnd:
                            self.window = w
                            return True
            except Exception:
                pass
            
            # If we couldn't find a pygetwindow object, we can still proceed if we rely on target_hwnd
            # We return True because we have a valid handle to operate on.
            print(f"DEBUG: find_window - Valid HWND {self.target_hwnd} found, but pygetwindow object not created. Proceeding anyway.")
            return True

        windows = gw.getWindowsWithTitle(self.window_title)
        if not windows:
            print(f"DEBUG: find_window - No windows found with title '{self.window_title}' via pygetwindow. Trying win32gui fallback...")
            
            # Fallback: Use win32gui directly
            found_hwnds = []
            def enum_handler(hwnd, ctx):
                if win32gui.IsWindowVisible(hwnd):
                    title = win32gui.GetWindowText(hwnd)
                    if self.window_title and self.window_title in title:
                        found_hwnds.append((hwnd, title))
            
            try:
                win32gui.EnumWindows(enum_handler, None)
            except Exception as e:
                logger.debug(f"win32gui EnumWindows failed: {e}")

            if found_hwnds:
                # Pick the first one, or maybe the one with exact match?
                # Let's prefer exact match
                best_match = None
                for h, t in found_hwnds:
                    if t == self.window_title:
                        best_match = (h, t)
                        break
                
                if not best_match:
                    best_match = found_hwnds[0]
                
                self.target_hwnd = best_match[0]
                logger.debug(f"find_window - Found via win32gui fallback: '{best_match[1]}' (HWND: {self.target_hwnd})")
                return True

            logger.debug(f"find_window - No windows found with title '{self.window_title}'")
            return False
        
        # Find exact match or best match
        for w in windows:
            if w.title == self.window_title:
                self.window = w
                # Only update target_hwnd if it wasn't set manually
                if not self.target_hwnd:
                    self.target_hwnd = w._hWnd
                logger.debug(f"find_window - Found exact match: '{w.title}' (HWND: {w._hWnd})")
                return True
        
        # Fallback to first match if exact match not found
        if windows:
            self.window = windows[0]
            if not self.target_hwnd:
                self.target_hwnd = windows[0]._hWnd
            logger.debug(f"find_window - Found partial match: '{windows[0].title}' (HWND: {windows[0]._hWnd})")
            return True
            
        return False

    def activate_window(self) -> bool:
        """Brings the window to front and sets focus."""
        if not self.window and not self.target_hwnd:
            if not self.find_window():
                return False

        try:
            hwnd = self.target_hwnd if self.target_hwnd else self.window._hWnd
            
            # Restore if minimized (requires pygetwindow object or win32gui logic)
            if self.window and self.window.isMinimized:
                self.window.restore()
            elif win32gui.IsIconic(hwnd):
                win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
            
            # Bring to front logic
            win32gui.ShowWindow(hwnd, win32con.SW_SHOW)
            
            # Try to set foreground
            try:
                win32gui.SetForegroundWindow(hwnd)
            except Exception:
                # Sometimes fails if another window has focus, try a trick
                win32gui.SendMessage(hwnd, win32con.WM_SYSCOMMAND, win32con.SC_RESTORE, 0)
                win32gui.SetForegroundWindow(hwnd)
            
            time.sleep(0.5) # Wait for window to settle
            return True
        except Exception as e:
            print(f"Error activating window: {e}")
            return False

    def get_window_rect(self) -> Optional[Tuple[int, int, int, int]]:
        """Returns the window rect (left, top, width, height)."""
        hwnd = self.target_hwnd if self.target_hwnd else (self.window._hWnd if self.window else None)
        
        if not hwnd:
            return None
        
        try:
            # Use win32gui for more reliable coordinates with DPI awareness
            rect = win32gui.GetWindowRect(hwnd)
            x, y, r, b = rect
            w = r - x
            h = b - y
            return (x, y, w, h)
        except Exception as e:
            print(f"Error getting window rect: {e}")
            return None

    def screen_to_client(self, screen_x: int, screen_y: int) -> Optional[Tuple[int, int]]:
        """Converts screen coordinates to client area coordinates."""
        hwnd = self.target_hwnd or (self.window._hWnd if self.window else None)
        if hwnd:
            try:
                return win32gui.ScreenToClient(hwnd, (screen_x, screen_y))
            except Exception as e:
                print(f"Error converting ScreenToClient: {e}")
        return None

    def client_to_screen(self, client_x: int, client_y: int) -> Optional[Tuple[int, int]]:
        """Converts client area coordinates to screen coordinates."""
        hwnd = self.target_hwnd
        if not hwnd and self.window:
             hwnd = self.window._hWnd
             
        # Last ditch attempt to find window if we don't have a handle yet
        if not hwnd:
             if self.find_window():
                 hwnd = self.target_hwnd or (self.window._hWnd if self.window else None)

        if hwnd:
            try:
                return win32gui.ClientToScreen(hwnd, (client_x, client_y))
            except Exception as e:
                print(f"Error converting ClientToScreen: {e}")
        return None

    def get_client_rect(self) -> Optional[Tuple[int, int, int, int]]:
        """Returns the client rect (left, top, width, height). Left/Top are usually 0."""
        hwnd = self.target_hwnd or (self.window._hWnd if self.window else None)
        if hwnd:
            try:
                l, t, r, b = win32gui.GetClientRect(hwnd)
                return (l, t, r-l, b-t)
            except Exception as e:
                print(f"Error getting client rect: {e}")
        return None

    def is_foreground(self) -> bool:
        """Checks if the window is currently the foreground window."""
        hwnd = self.target_hwnd if self.target_hwnd else (self.window._hWnd if self.window else None)
        if not hwnd:
            return False
        return win32gui.GetForegroundWindow() == hwnd

    def get_absolute_coordinates(self, rel_x: int, rel_y: int) -> Optional[Tuple[int, int]]:
        """Converts relative coordinates to absolute screen coordinates."""
        # Try to find window if handle is missing
        if not self.target_hwnd and not self.window:
            self.find_window()
            
        rect = self.get_window_rect()
        if not rect:
            return None
        
        x, y, _, _ = rect
        return (x + rel_x, y + rel_y)

    @staticmethod
    def get_window_details_at_mouse() -> Tuple[Optional[str], Optional[int]]:
        """Returns the (title, hwnd) of the window under the mouse cursor."""
        try:
            # Ensure DPI awareness is set for accurate coordinates
            try:
                ctypes.windll.shcore.SetProcessDpiAwareness(2) # Per monitor
            except:
                try:
                    ctypes.windll.shcore.SetProcessDpiAwareness(1)
                except:
                    pass

            x, y = win32gui.GetCursorPos()
            
            hwnd = win32gui.WindowFromPoint((x, y))
            
            # Try to find the "Main" window that has a title
            root_hwnd = win32gui.GetAncestor(hwnd, win32con.GA_ROOT)
            title = win32gui.GetWindowText(root_hwnd)
            
            # Check if root_hwnd actually contains the mouse point
            try:
                rx, ry, rr, rb = win32gui.GetWindowRect(root_hwnd)
                if not (rx <= x <= rr and ry <= y <= rb):
                    # Don't clear title immediately, just mark that we want a better one if possible
                    pass
            except:
                pass

            final_hwnd = root_hwnd
            
            # Always try to find the most specific window that has a title
            curr = hwnd
            while curr:
                t = win32gui.GetWindowText(curr)
                if t:
                    title = t
                    final_hwnd = curr
                    break
                curr = win32gui.GetParent(curr)
                if curr == 0 or curr == root_hwnd: break
            
            return title, final_hwnd
        except Exception as e:
            print(f"Error getting window at mouse: {e}")
            return None, None

    @staticmethod
    def get_window_at_mouse() -> Optional[str]:
        title, _ = WindowManager.get_window_details_at_mouse()
        return title
