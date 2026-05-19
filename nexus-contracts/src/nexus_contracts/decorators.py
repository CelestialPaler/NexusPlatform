from functools import wraps
from typing import Any, Callable, Dict, Optional

from pydantic import BaseModel, Field


class InputType(BaseModel):
    name: str
    type_hint: Any
    default: Any = None
    description: str = ""


class CheckResult(BaseModel):
    passed: bool
    missing: list[str] = Field(default_factory=list)


class NodeMetadata(BaseModel):
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
    description: str = "",
):
    def decorator(func: Callable):
        meta = NodeMetadata(
            id=id,
            category=category,
            label=label or func.__name__.replace("_", " ").title(),
            icon=icon,
            inputs=inputs,
            outputs=outputs,
            description=description or func.__doc__ or "",
        )

        setattr(func, "_nexus_meta", meta)

        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        return wrapper

    return decorator