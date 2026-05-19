from pathlib import Path
from typing import Any, Dict, TypeAlias, Union

import numpy as np
import pandas as pd

NXPath: TypeAlias = Path
NXTable: TypeAlias = pd.DataFrame
NXImage: TypeAlias = Union[bytes, Path]
NXSignal: TypeAlias = np.ndarray
NXReport: TypeAlias = Dict[str, Any]


class NXSerializable:
    def to_dict(self) -> dict:
        raise NotImplementedError

    @classmethod
    def from_dict(cls, data: dict) -> "NXSerializable":
        raise NotImplementedError