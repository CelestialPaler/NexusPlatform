try:
    from backend.ba_analysis.core import BaAnalyzer
except ImportError:
    # Fallback for direct execution
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    from backend.ba_analysis.core import BaAnalyzer
