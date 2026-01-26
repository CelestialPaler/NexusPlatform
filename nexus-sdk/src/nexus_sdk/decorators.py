from typing import Callable, Optional, Dict, Type, Any
from functools import wraps
from pydantic import BaseModel, Field

class InputType(BaseModel):
    name: str
    type_hint: Any
    default: Any = None
    description: str = ""

class CheckResult(BaseModel):
    """Result of a dependency check."""
    passed: bool
    missing: list[str] = Field(default_factory=list)

class NodeMetadata(BaseModel):
    """Metadata container stored on the decorated function."""
    id: str
    category: str
    label: Optional[str] = None
    icon: Optional[str] = None
    inputs: Dict[str, Any] = Field(default_factory=dict)
    outputs: Dict[str, Any] = Field(default_factory=dict)
    description: str = ""

def nexus_node(
    id: str,
    category: str,
    inputs: Dict[str, Any],
    outputs: Dict[str, Any],
    label: Optional[str] = None,
    icon: Optional[str] = "api",
    description: str = ""
):
    """
    Decorator to mark a Python function as a Nexus Blueprint Node.
    
    Args:
        id: Unique identifier for the node (e.g., "nexus.tools.rtp_analyzer").
        category: Group name for UI side menu (e.g., "Network", "Analysis").
        inputs: Dictionary mapping argument names to types (e.g., {"file": NXPath}).
        outputs: Dictionary mapping output keys to types (e.g., {"report": NXReport}).
        label: Human-readable name (defaults to function name).
        icon: Icon name (Material Design / AntD icon name).
        description: Tooltip description.
    """
    def decorator(func: Callable):
        meta = NodeMetadata(
            id=id,
            category=category,
            label=label or func.__name__.replace("_", " ").title(),
            icon=icon,
            inputs=inputs,
            outputs=outputs,
            description=description or func.__doc__ or ""
        )
        
        # Attach metadata to the function wrapper
        setattr(func, "_nexus_meta", meta)
        
        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
            
        return wrapper
    return decorator
