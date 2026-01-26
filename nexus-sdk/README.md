# Nexus SDK

The official Python SDK for developing plugins (tools/modules) for the Nexus Platform.

## Features

- **Standard Types**: `NXPath`, `NXTable`, `NXImage` for consistent data exchange.
- **Node Decorators**: `@nexus_node` to transform Python functions into Blueprint Nodes.
- **Error Handling**: `NexusPluginError` for robust failure management.

## Installation

```bash
pip install -e .
```

## Usage

```python
from nexus_sdk import nexus_node, NXPath, NXTable
from pathlib import Path

@nexus_node(
    id="my_cool_tool",
    category="Utilities",
    inputs={"input_file": NXPath},
    outputs={"result_table": NXTable}
)
def process_file(input_file: Path) -> dict:
    # ... logic ...
    return {"result_table": dataframe}
```
