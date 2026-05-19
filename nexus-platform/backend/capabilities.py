import sys


def get_platform_capabilities():
    platform = sys.platform
    is_windows = platform == 'win32'

    return {
        'platform': platform,
        'features': {
            'automation': is_windows,
            'customWindowChrome': is_windows,
            'adminElevation': is_windows,
            'wirelessCaptureLocalControl': is_windows,
            'wirelessCaptureRemoteControl': True,
            'toolMultiWindow': True,
        },
    }