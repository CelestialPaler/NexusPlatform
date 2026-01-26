from typing import TypeAlias, Dict, Any, Union
from pathlib import Path
import pandas as pd
import numpy as np

# --- Core Data Types (NDXP) ---

# File Path: Absolute path to a file (string or Path object in runtime)
# Used for passing large files like PCAP, Binaries without loading them into memory.
NXPath: TypeAlias = Path

# Tabular Data: Structured data for analysis results.
# Equivalent to pandas.DataFrame.
NXTable: TypeAlias = pd.DataFrame

# Image Data: Binary content of an image or path to image file.
NXImage: TypeAlias = Union[bytes, Path]

# Signal Data: Raw signal arrays (e.g., CSI data, Audio pcm).
NXSignal: TypeAlias = np.ndarray

# Report Data: Structured dictionary for hierarchical reporting.
NXReport: TypeAlias = Dict[str, Any]

# --- Protocols ---

class NXSerializable:
    """Protocol for objects that can be serialized for data exchange."""
    
    def to_dict(self) -> dict:
        raise NotImplementedError
    
    @classmethod
    def from_dict(cls, data: dict) -> "NXSerializable":
        raise NotImplementedError
