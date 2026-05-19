# Nexus Contracts

The canonical contract package for Nexus Platform plugin interfaces, shared data types, and metadata decorators.

## Scope

- Shared data exchange types such as `NXPath`, `NXTable`, and `NXImage`
- Node metadata decorators such as `@nexus_node`
- Common exceptions used across plugins and platform runtime

## Installation

```bash
pip install -e .
```

## Usage

```python
from nexus_contracts import nexus_node, NXPath, NXTable
from pathlib import Path

@nexus_node(
    id="my_cool_tool",
    category="Utilities",
    inputs={"input_file": NXPath},
    outputs={"result_table": NXTable}
)
def process_file(input_file: Path) -> dict:
    return {"result_table": None}
```